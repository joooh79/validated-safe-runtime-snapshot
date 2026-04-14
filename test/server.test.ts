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

test('MCP execute is blocked until preview succeeds in the same session', async () => {
  const { transport } = createTransportHarness();
  const sseResponse = new MockResponse();

  transport.handleSseConnection(
    new MockRequest('GET', SERVER_ROUTES.internalMcpSse) as any,
    sseResponse as any,
  );

  const sessionId = extractSessionId(sseResponse.body);
  const executeAck = new MockResponse();
  await transport.handleMessage(
    new MockRequest(
      'POST',
      `${SERVER_ROUTES.internalMcpMessage}?sessionId=${sessionId}`,
    ) as any,
    executeAck as any,
    {
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: {
        name: 'execute',
        arguments: {
          payload: {
            ...apiFixture_safeNewVisitPreviewRequest,
            interactionInput: {
              confirmation: {
                confirmed: true,
              },
            },
          },
        },
      },
    },
  );

  const executeMessage = extractLastSseEvent(sseResponse.body, 'message');
  assert.equal(executeMessage.id, 4);
  assert.equal(executeMessage.result.isError, true);
  assert.match(
    executeMessage.result.structuredContent.message,
    /Preview is required before execute in this MCP session/,
  );
});

test('MCP execute is allowed after preview for the same payload in the same session', async () => {
  const { transport } = createTransportHarness();
  const sseResponse = new MockResponse();

  transport.handleSseConnection(
    new MockRequest('GET', SERVER_ROUTES.internalMcpSse) as any,
    sseResponse as any,
  );

  const sessionId = extractSessionId(sseResponse.body);

  const previewAck = new MockResponse();
  await transport.handleMessage(
    new MockRequest(
      'POST',
      `${SERVER_ROUTES.internalMcpMessage}?sessionId=${sessionId}`,
    ) as any,
    previewAck as any,
    {
      jsonrpc: '2.0',
      id: 5,
      method: 'tools/call',
      params: {
        name: 'preview',
        arguments: {
          payload: apiFixture_safeNewVisitPreviewRequest,
        },
      },
    },
  );

  const executeAck = new MockResponse();
  await transport.handleMessage(
    new MockRequest(
      'POST',
      `${SERVER_ROUTES.internalMcpMessage}?sessionId=${sessionId}`,
    ) as any,
    executeAck as any,
    {
      jsonrpc: '2.0',
      id: 6,
      method: 'tools/call',
      params: {
        name: 'execute',
        arguments: {
          payload: {
            ...apiFixture_safeNewVisitPreviewRequest,
            interactionInput: {
              confirmation: {
                confirmed: true,
              },
            },
          },
        },
      },
    },
  );

  const executeMessage = extractLastSseEvent(sseResponse.body, 'message');
  assert.equal(executeMessage.id, 6);
  assert.equal(executeMessage.result.isError, false);
  assert.equal(
    executeMessage.result.structuredContent.terminalStatus,
    'executed',
  );
});

test('same-session execute stays allowed when only requestId and warnings differ from preview', async () => {
  const { transport } = createTransportHarness();
  const sseResponse = new MockResponse();

  transport.handleSseConnection(
    new MockRequest('GET', SERVER_ROUTES.internalMcpSse) as any,
    sseResponse as any,
  );

  const sessionId = extractSessionId(sseResponse.body);
  const previewPayload = apiFixture_safeNewVisitPreviewRequest;

  await transport.handleMessage(
    new MockRequest(
      'POST',
      `${SERVER_ROUTES.internalMcpMessage}?sessionId=${sessionId}`,
    ) as any,
    new MockResponse() as any,
    {
      jsonrpc: '2.0',
      id: 11,
      method: 'tools/call',
      params: {
        name: 'preview',
        arguments: {
          payload: previewPayload,
        },
      },
    },
  );

  const executePayload = {
    ...previewPayload,
    requestId: 'execute_same_effective_payload',
    normalizedContract: previewPayload.normalizedContract
      ? {
          ...previewPayload.normalizedContract,
          requestId: 'execute_same_effective_payload',
          warnings: ['execute follow-up request'],
        }
      : undefined,
    interactionInput: {
      confirmation: {
        confirmed: true,
      },
    },
  };

  await transport.handleMessage(
    new MockRequest(
      'POST',
      `${SERVER_ROUTES.internalMcpMessage}?sessionId=${sessionId}`,
    ) as any,
    new MockResponse() as any,
    {
      jsonrpc: '2.0',
      id: 12,
      method: 'tools/call',
      params: {
        name: 'execute',
        arguments: {
          payload: executePayload,
        },
      },
    },
  );

  const executeMessage = extractLastSseEvent(sseResponse.body, 'message');
  assert.equal(executeMessage.id, 12);
  assert.equal(executeMessage.result.isError, false);
  assert.equal(executeMessage.result.structuredContent.terminalStatus, 'executed');
});

test('same payload plus confirmation bit only is allowed on the direct preview/execute MCP methods', async () => {
  const { transport } = createTransportHarness();
  const sseResponse = new MockResponse();

  transport.handleSseConnection(
    new MockRequest('GET', SERVER_ROUTES.internalMcpSse) as any,
    sseResponse as any,
  );

  const sessionId = extractSessionId(sseResponse.body);

  const previewAck = new MockResponse();
  await transport.handleMessage(
    new MockRequest(
      'POST',
      `${SERVER_ROUTES.internalMcpMessage}?sessionId=${sessionId}`,
    ) as any,
    previewAck as any,
    {
      jsonrpc: '2.0',
      id: 7,
      method: 'preview',
      params: apiFixture_safeNewVisitPreviewRequest,
    },
  );

  const executeAck = new MockResponse();
  await transport.handleMessage(
    new MockRequest(
      'POST',
      `${SERVER_ROUTES.internalMcpMessage}?sessionId=${sessionId}`,
    ) as any,
    executeAck as any,
    {
      jsonrpc: '2.0',
      id: 8,
      method: 'execute',
      params: {
        ...apiFixture_safeNewVisitPreviewRequest,
        interactionInput: {
          confirmation: {
            confirmed: true,
          },
        },
      },
    },
  );

  const executeMessage = extractLastSseEvent(sseResponse.body, 'message');
  assert.equal(executeMessage.id, 8);
  assert.equal(executeMessage.result.isError, false);
  assert.equal(executeMessage.result.structuredContent.terminalStatus, 'executed');
});

test('preview returns an MCP preview token for safer follow-up execute calls', async () => {
  const { transport } = createTransportHarness();
  const sseResponse = new MockResponse();

  transport.handleSseConnection(
    new MockRequest('GET', SERVER_ROUTES.internalMcpSse) as any,
    sseResponse as any,
  );

  const sessionId = extractSessionId(sseResponse.body);

  await transport.handleMessage(
    new MockRequest(
      'POST',
      `${SERVER_ROUTES.internalMcpMessage}?sessionId=${sessionId}`,
    ) as any,
    new MockResponse() as any,
    {
      jsonrpc: '2.0',
      id: 13,
      method: 'tools/call',
      params: {
        name: 'preview',
        arguments: {
          payload: apiFixture_safeNewVisitPreviewRequest,
        },
      },
    },
  );

  const previewMessage = extractLastSseEvent(sseResponse.body, 'message');
  assert.equal(typeof previewMessage.result.structuredContent.mcpPreviewToken, 'string');
  assert.ok(previewMessage.result.structuredContent.mcpPreviewToken.length > 0);
});

test('cross-session execute can resume from preview token without resending the full payload', async () => {
  const seenToolCalls: Array<{ toolName: string; payload: unknown }> = [];
  const { transport } = createTransportHarness({
    onToolCall(input) {
      seenToolCalls.push({
        toolName: input.toolName,
        payload: input.payload,
      });
    },
  });

  const previewSseResponse = new MockResponse();
  transport.handleSseConnection(
    new MockRequest('GET', SERVER_ROUTES.internalMcpSse) as any,
    previewSseResponse as any,
  );
  const previewSessionId = extractSessionId(previewSseResponse.body);

  await transport.handleMessage(
    new MockRequest(
      'POST',
      `${SERVER_ROUTES.internalMcpMessage}?sessionId=${previewSessionId}`,
    ) as any,
    new MockResponse() as any,
    {
      jsonrpc: '2.0',
      id: 14,
      method: 'tools/call',
      params: {
        name: 'preview',
        arguments: {
          payload: apiFixture_safeNewVisitPreviewRequest,
        },
      },
    },
  );

  const previewMessage = extractLastSseEvent(previewSseResponse.body, 'message');
  const previewToken = previewMessage.result.structuredContent.mcpPreviewToken;
  assert.equal(typeof previewToken, 'string');

  const executeSseResponse = new MockResponse();
  transport.handleSseConnection(
    new MockRequest('GET', SERVER_ROUTES.internalMcpSse) as any,
    executeSseResponse as any,
  );
  const executeSessionId = extractSessionId(executeSseResponse.body);

  await transport.handleMessage(
    new MockRequest(
      'POST',
      `${SERVER_ROUTES.internalMcpMessage}?sessionId=${executeSessionId}`,
    ) as any,
    new MockResponse() as any,
    {
      jsonrpc: '2.0',
      id: 15,
      method: 'tools/call',
      params: {
        name: 'execute',
        arguments: {
          payload: {
            mcpPreviewToken: previewToken,
            interactionInput: {
              confirmation: {
                confirmed: true,
              },
            },
          },
        },
      },
    },
  );

  const executeMessage = extractLastSseEvent(executeSseResponse.body, 'message');
  assert.equal(executeMessage.id, 15);
  assert.equal(executeMessage.result.isError, false);
  assert.equal(executeMessage.result.structuredContent.terminalStatus, 'executed');

  const executeCall = seenToolCalls.at(-1);
  assert.equal(executeCall?.toolName, 'execute');
  assert.deepEqual(executeCall?.payload, {
    ...apiFixture_safeNewVisitPreviewRequest,
    interactionInput: {
      confirmation: {
        confirmed: true,
      },
    },
  });
});

test('MCP execute stays blocked when the payload changed beyond the confirmation bit', async () => {
  const { transport } = createTransportHarness();
  const sseResponse = new MockResponse();

  transport.handleSseConnection(
    new MockRequest('GET', SERVER_ROUTES.internalMcpSse) as any,
    sseResponse as any,
  );

  const sessionId = extractSessionId(sseResponse.body);

  const previewAck = new MockResponse();
  await transport.handleMessage(
    new MockRequest(
      'POST',
      `${SERVER_ROUTES.internalMcpMessage}?sessionId=${sessionId}`,
    ) as any,
    previewAck as any,
    {
      jsonrpc: '2.0',
      id: 9,
      method: 'tools/call',
      params: {
        name: 'preview',
        arguments: {
          payload: apiFixture_safeNewVisitPreviewRequest,
        },
      },
    },
  );

  const executeAck = new MockResponse();
  await transport.handleMessage(
    new MockRequest(
      'POST',
      `${SERVER_ROUTES.internalMcpMessage}?sessionId=${sessionId}`,
    ) as any,
    executeAck as any,
    {
      jsonrpc: '2.0',
      id: 10,
      method: 'tools/call',
      params: {
        name: 'execute',
        arguments: {
          payload: {
            ...apiFixture_safeNewVisitPreviewRequest,
            metadata: {
              testCase: 'material_payload_change',
            },
            interactionInput: {
              confirmation: {
                confirmed: true,
              },
            },
          },
        },
      },
    },
  );

  const executeMessage = extractLastSseEvent(sseResponse.body, 'message');
  assert.equal(executeMessage.id, 10);
  assert.equal(executeMessage.result.isError, true);
  assert.match(
    executeMessage.result.structuredContent.message,
    /The payload changed after preview/,
  );
});

test('real mode provider config is resolved from trusted server env without payload secrets', () => {
  const config = resolveServerEnv({
    AIRTABLE_MODE: 'real',
    AIRTABLE_BASE_ID: 'app_server_env',
    AIRTABLE_API_TOKEN: 'pat_server_env',
    AIRTABLE_API_BASE_URL: 'http://127.0.0.1:9999',
    TRUST_PROXY_AUTH: 'false',
  });

  const request = buildInternalOrchestrationRequest(
    SERVER_ROUTES.internalPreview,
    {
      normalizedContract: apiFixture_safeNewVisitPreviewRequest.normalizedContract,
      lookupBundle: apiFixture_safeNewVisitPreviewRequest.lookupBundle,
      providerConfig: {
        kind: 'airtable',
        mode: 'real',
      },
    },
    config,
  );

  assert.deepEqual(request.providerConfig, {
    kind: 'airtable',
    mode: 'real',
    baseId: 'app_server_env',
    apiToken: 'pat_server_env',
    apiBaseUrl: 'http://127.0.0.1:9999',
  });
});

test('real mode without server env secrets fails with a server-config error, not a payload-shape error', () => {
  const config = resolveServerEnv({
    AIRTABLE_MODE: 'dryrun',
    TRUST_PROXY_AUTH: 'false',
  });

  assert.throws(
    () =>
      buildInternalOrchestrationRequest(
        SERVER_ROUTES.internalPreview,
        {
          normalizedContract: apiFixture_safeNewVisitPreviewRequest.normalizedContract,
          lookupBundle: apiFixture_safeNewVisitPreviewRequest.lookupBundle,
          providerConfig: {
            kind: 'airtable',
            mode: 'real',
          },
        },
        config,
      ),
    /AIRTABLE_BASE_ID and AIRTABLE_API_TOKEN on the server/,
  );
});

function createTransportHarness(options: {
  onToolCall?: (input: { toolName: string; payload: unknown }) => void;
} = {}) {
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
    async handleToolCall(input) {
      options.onToolCall?.(input);

      if (input.toolName === 'preview') {
        return {
          requestId: 'preview_req',
          success: true,
          apiState: 'preview_ready',
          terminalStatus: 'preview_pending_confirmation',
          interactionMode: 'preview_confirmation',
          readiness: 'execution_ready',
          didWrite: false,
          warnings: [],
          nextStepHint: 'Review the preview and confirm before execution.',
          message: 'Preview generated successfully.',
          confirmed: false,
          requiresConfirmation: true,
        };
      }

      return {
        requestId: 'execute_req',
        success: true,
        apiState: 'execution_complete',
        terminalStatus: 'executed',
        interactionMode: 'preview_confirmation',
        readiness: 'execution_ready',
        didWrite: true,
        warnings: [],
        nextStepHint: 'Execution completed from the confirmed preview.',
        message: 'Execution completed.',
        confirmed: true,
        requiresConfirmation: false,
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
