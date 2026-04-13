import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import test from 'node:test';
import { apiFixture_safeNewVisitPreviewRequest } from '../src/api/__fixtures__/exampleRequests.js';
import { resolveServerEnv } from '../src/config/env.js';
import { createMcpSseTransport } from '../src/mcp/sseTransport.js';
import { createMcpSessionManager } from '../src/mcp/sessionManager.js';
import { buildInternalOrchestrationRequest, SERVER_ROUTES, } from '../src/server.js';
class MockRequest extends EventEmitter {
    method;
    url;
    headers;
    constructor(method, url, headers = {}) {
        super();
        this.method = method;
        this.url = url;
        this.headers = headers;
    }
}
class MockResponse extends EventEmitter {
    statusCode = 200;
    writableEnded = false;
    headers = {};
    body = '';
    writeHead(statusCode, headers) {
        this.statusCode = statusCode;
        for (const [key, value] of Object.entries(headers)) {
            this.headers[key.toLowerCase()] = value;
        }
        return this;
    }
    flushHeaders() { }
    write(chunk) {
        this.body += chunk;
        return true;
    }
    setHeader(name, value) {
        this.headers[name.toLowerCase()] = value;
    }
    end(chunk) {
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
    transport.handleSseConnection(new MockRequest('GET', SERVER_ROUTES.internalMcpSse), firstSseResponse);
    transport.handleSseConnection(new MockRequest('GET', SERVER_ROUTES.internalMcpSse), secondSseResponse);
    const firstSessionId = extractSessionId(firstSseResponse.body);
    const secondSessionId = extractSessionId(secondSseResponse.body);
    assert.notEqual(firstSessionId, secondSessionId);
    const firstAck = new MockResponse();
    await transport.handleMessage(new MockRequest('POST', `${SERVER_ROUTES.internalMcpMessage}?sessionId=${firstSessionId}`), firstAck, {
        jsonrpc: '2.0',
        id: 1,
        method: 'ping',
    });
    assert.equal(firstAck.statusCode, 202);
    const firstMessage = extractLastSseEvent(firstSseResponse.body, 'message');
    assert.equal(firstMessage.id, 1);
    assert.deepEqual(firstMessage.result, {});
    assert.equal(countSseEvents(secondSseResponse.body, 'message'), 0);
    const secondAck = new MockResponse();
    await transport.handleMessage(new MockRequest('POST', `${SERVER_ROUTES.internalMcpMessage}?sessionId=${secondSessionId}`), secondAck, {
        jsonrpc: '2.0',
        id: 2,
        method: 'ping',
    });
    assert.equal(secondAck.statusCode, 202);
    const secondMessage = extractLastSseEvent(secondSseResponse.body, 'message');
    assert.equal(secondMessage.id, 2);
    assert.deepEqual(secondMessage.result, {});
});
test('session manager cleanup makes disconnected sessions unavailable', async () => {
    const { transport } = createTransportHarness();
    const sseResponse = new MockResponse();
    transport.handleSseConnection(new MockRequest('GET', SERVER_ROUTES.internalMcpSse), sseResponse);
    const sessionId = extractSessionId(sseResponse.body);
    sseResponse.end();
    const postResponse = new MockResponse();
    await transport.handleMessage(new MockRequest('POST', `${SERVER_ROUTES.internalMcpMessage}?sessionId=${sessionId}`), postResponse, {
        jsonrpc: '2.0',
        id: 3,
        method: 'ping',
    });
    const payload = JSON.parse(postResponse.body);
    assert.equal(postResponse.statusCode, 404);
    assert.equal(payload.error.code, 'mcp_session_not_found');
});
test('execute requests require explicit confirmation before orchestration', () => {
    const config = resolveServerEnv({
        AIRTABLE_MODE: 'dryrun',
        TRUST_PROXY_AUTH: 'false',
        PROXY_SHARED_SECRET: 'unused',
    });
    assert.throws(() => buildInternalOrchestrationRequest(SERVER_ROUTES.internalExecute, {
        normalizedContract: apiFixture_safeNewVisitPreviewRequest.normalizedContract,
        lookupBundle: apiFixture_safeNewVisitPreviewRequest.lookupBundle,
        providerConfig: {
            kind: 'airtable',
            mode: 'dryrun',
        },
    }, config), /interactionInput\.confirmation\.confirmed/);
});
test('MCP execute is blocked until preview succeeds in the same session', async () => {
    const { transport } = createTransportHarness();
    const sseResponse = new MockResponse();
    transport.handleSseConnection(new MockRequest('GET', SERVER_ROUTES.internalMcpSse), sseResponse);
    const sessionId = extractSessionId(sseResponse.body);
    const executeAck = new MockResponse();
    await transport.handleMessage(new MockRequest('POST', `${SERVER_ROUTES.internalMcpMessage}?sessionId=${sessionId}`), executeAck, {
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
    });
    const executeMessage = extractLastSseEvent(sseResponse.body, 'message');
    assert.equal(executeMessage.id, 4);
    assert.equal(executeMessage.result.isError, true);
    assert.match(executeMessage.result.structuredContent.message, /Preview is required before execute in this MCP session/);
});
test('MCP execute is allowed after preview for the same payload in the same session', async () => {
    const { transport } = createTransportHarness();
    const sseResponse = new MockResponse();
    transport.handleSseConnection(new MockRequest('GET', SERVER_ROUTES.internalMcpSse), sseResponse);
    const sessionId = extractSessionId(sseResponse.body);
    const previewAck = new MockResponse();
    await transport.handleMessage(new MockRequest('POST', `${SERVER_ROUTES.internalMcpMessage}?sessionId=${sessionId}`), previewAck, {
        jsonrpc: '2.0',
        id: 5,
        method: 'tools/call',
        params: {
            name: 'preview',
            arguments: {
                payload: apiFixture_safeNewVisitPreviewRequest,
            },
        },
    });
    const executeAck = new MockResponse();
    await transport.handleMessage(new MockRequest('POST', `${SERVER_ROUTES.internalMcpMessage}?sessionId=${sessionId}`), executeAck, {
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
    });
    const executeMessage = extractLastSseEvent(sseResponse.body, 'message');
    assert.equal(executeMessage.id, 6);
    assert.equal(executeMessage.result.isError, false);
    assert.equal(executeMessage.result.structuredContent.terminalStatus, 'executed');
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
        async handleToolCall(input) {
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
function extractSessionId(sseBody) {
    const endpoint = extractLastSseEvent(sseBody, 'endpoint');
    const sessionId = new URL(`http://127.0.0.1${endpoint}`).searchParams.get('sessionId');
    assert.ok(sessionId);
    return sessionId;
}
function countSseEvents(sseBody, eventName) {
    return parseSseEvents(sseBody).filter((event) => event.event === eventName).length;
}
function extractLastSseEvent(sseBody, eventName) {
    const matchingEvent = parseSseEvents(sseBody)
        .filter((event) => event.event === eventName)
        .at(-1);
    assert.ok(matchingEvent);
    if (eventName === 'endpoint') {
        return matchingEvent.data;
    }
    return JSON.parse(matchingEvent.data);
}
function parseSseEvents(sseBody) {
    return sseBody
        .replace(/\r/g, '')
        .split('\n\n')
        .filter(Boolean)
        .flatMap((chunk) => {
        if (chunk.startsWith(':')) {
            return [];
        }
        let event = 'message';
        const dataLines = [];
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
