import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import test from 'node:test';
import { apiFixture_safeNewVisitPreviewRequest } from '../src/api/__fixtures__/exampleRequests.js';
import { resolveServerEnv } from '../src/config/env.js';
import { createMcpSseTransport } from '../src/mcp/sseTransport.js';
import { createMcpSessionManager } from '../src/mcp/sessionManager.js';
import {
  buildInternalOrchestrationRequest,
  SERVER_ROUTES,
} from '../src/server.js';

interface JsonErrorPayload {
  ok: false;
  error: {
    code: string;
    message: string;
  };
}

class MockRequest extends EventEmitter {
  constructor(
    readonly method: string,
    readonly url: string,
    readonly headers: Record<string, string> = {},
  ) {
    super();
  }
}

class MockResponse extends EventEmitter {
  statusCode = 200;
  writableEnded = false;
  headers: Record<string, string> = {};
  body = '';

  writeHead(
    statusCode: number,
    headers: Record<string, string>,
  ): this {
    this.statusCode = statusCode;
    for (const [key, value] of Object.entries(headers)) {
      this.headers[key.toLowerCase()] = value;
    }

    return this;
  }

  flushHeaders(): void {}

  write(chunk: string): boolean {
    this.body += chunk;
    return true;
  }

  setHeader(name: string, value: string): void {
    this.headers[name.toLowerCase()] = value;
  }

  end(chunk?: string): this {
    if (this.writableEnded) {
      return this;
    }

    if (chunk) {
      this.body += chunk;
    }

    this.writableEnded = true;
    this.emit('finish');
    this.emit('close');
    return this;
  }
}

test('multi-session MCP routing keeps sessions isolated', async () => {
  const { transport } = createTransportHarness();

  const firstSseResponse = new MockResponse();
  const secondSseResponse = new MockResponse();

  transport.handleSseConnection(
    new MockRequest('GET', SERVER_ROUTES.internalMcpSse) as any,
    firstSseResponse as any,
  );
  transport.handleSseConnection(
    new MockRequest('GET', SERVER_ROUTES.internalMcpSse) as any,
    secondSseResponse as any,
  );

  const firstSessionId = extractSessionId(firstSseResponse.body);
  const secondSessionId = extractSessionId(secondSseResponse.body);

  assert.notEqual(firstSessionId, secondSessionId);

  const firstAck = new MockResponse();
  await transport.handleMessage(
    new MockRequest(
      'POST',
      `${SERVER_ROUTES.internalMcpMessage}?sessionId=${firstSessionId}`,
    ) as any,
    firstAck as any,
    {
      jsonrpc: '2.0',
      id: 1,
      method: 'ping',
    },
  );

  assert.equal(firstAck.statusCode, 202);
  const firstMessage = extractLastSseEvent(firstSseResponse.body, 'message');
  assert.equal(firstMessage.id, 1);
  assert.deepEqual(firstMessage.result, {});
  assert.equal(countSseEvents(secondSseResponse.body, 'message'), 0);

  const secondAck = new MockResponse();
  await transport.handleMessage(
    new MockRequest(
      'POST',
      `${SERVER_ROUTES.internalMcpMessage}?sessionId=${secondSessionId}`,
    ) as any,
    secondAck as any,
    {
      jsonrpc: '2.0',
      id: 2,
      method: 'ping',
    },
  );

  assert.equal(secondAck.statusCode, 202);
  const secondMessage = extractLastSseEvent(secondSseResponse.body, 'message');
  assert.equal(secondMessage.id, 2);
  assert.deepEqual(secondMessage.result, {});
});

test('session manager cleanup makes disconnected sessions unavailable', async () => {
  const { transport } = createTransportHarness();
  const sseResponse = new MockResponse();

  transport.handleSseConnection(
    new MockRequest('GET', SERVER_ROUTES.internalMcpSse) as any,
    sseResponse as any,
  );

  const sessionId = extractSessionId(sseResponse.body);
  sseResponse.end();

  const postResponse = new MockResponse();
  await transport.handleMessage(
    new MockRequest(
      'POST',
      `${SERVER_ROUTES.internalMcpMessage}?sessionId=${sessionId}`,
    ) as any,
    postResponse as any,
    {
      jsonrpc: '2.0',
      id: 3,
      method: 'ping',
    },
  );

  const payload = JSON.parse(postResponse.body) as JsonErrorPayload;
  assert.equal(postResponse.statusCode, 404);
  assert.equal(payload.error.code, 'mcp_session_not_found');
});

test('execute requests require explicit confirmation before orchestration', () => {
  const config = resolveServerEnv({
    AIRTABLE_MODE: 'dryrun',
    TRUST_PROXY_AUTH: 'false',
    PROXY_SHARED_SECRET: 'unused',
  });

  assert.throws(
    () =>
      buildInternalOrchestrationRequest(
        SERVER_ROUTES.internalExecute,
        {
          normalizedContract: apiFixture_safeNewVisitPreviewRequest.normalizedContract,
          lookupBundle: apiFixture_safeNewVisitPreviewRequest.lookupBundle,
          providerConfig: {
            kind: 'airtable',
            mode: 'dryrun',
          },
        },
        config,
      ),
    /interactionInput\.confirmation\.confirmed/,
  );
});

function createTransportHarness() {
  const sessionManager = createMcpSessionManager({
    sessionTtlMs: 5_000,
    heartbeatIntervalMs: 250,
  });

  const transport = createMcpSseTransport({
    serverName: 'test-server',
    serverVersion: '0.1.0',
    protocolVersion: '2025-06-18',
    messageEndpointPath: SERVER_ROUTES.internalMcpMessage,
    sessionManager,
    async handleToolCall() {
      return {
        success: true,
      };
    },
  });

  return {
    sessionManager,
    transport,
  };
}

function extractSessionId(sseBody: string): string {
  const endpoint = extractLastSseEvent(sseBody, 'endpoint');
  const sessionId = new URL(`http://127.0.0.1${endpoint}`).searchParams.get('sessionId');
  assert.ok(sessionId);
  return sessionId;
}

function countSseEvents(sseBody: string, eventName: string): number {
  return parseSseEvents(sseBody).filter((event) => event.event === eventName).length;
}

function extractLastSseEvent(sseBody: string, eventName: string): any {
  const matchingEvent = parseSseEvents(sseBody)
    .filter((event) => event.event === eventName)
    .at(-1);

  assert.ok(matchingEvent);

  if (eventName === 'endpoint') {
    return matchingEvent.data;
  }

  return JSON.parse(matchingEvent.data);
}

function parseSseEvents(
  sseBody: string,
): Array<{ event: string; data: string }> {
  return sseBody
    .replace(/\r/g, '')
    .split('\n\n')
    .filter(Boolean)
    .flatMap((chunk) => {
      if (chunk.startsWith(':')) {
        return [];
      }

      let event = 'message';
      const dataLines: string[] = [];

      for (const line of chunk.split('\n')) {
        if (line.startsWith('event:')) {
          event = line.slice('event:'.length).trim();
          continue;
        }

        if (line.startsWith('data:')) {
          dataLines.push(line.slice('data:'.length).trimStart());
        }
      }

      return dataLines.length > 0
        ? [
            {
              event,
              data: dataLines.join('\n'),
            },
          ]
        : [];
    });
}
