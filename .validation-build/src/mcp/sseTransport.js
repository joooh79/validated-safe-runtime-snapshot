const TOOL_DEFINITIONS = [
    {
        name: 'preview',
        description: 'Send a request payload to the preview endpoint. Use this to preview what would happen without final execution.',
        inputSchema: {
            type: 'object',
            properties: {
                payload: {
                    type: 'object',
                },
            },
            required: ['payload'],
        },
    },
    {
        name: 'execute',
        description: 'Send a request payload to the execute endpoint. Execution requires explicit confirmation in the payload.',
        inputSchema: {
            type: 'object',
            properties: {
                payload: {
                    type: 'object',
                },
            },
            required: ['payload'],
        },
    },
];
export function createMcpSseTransport(config) {
    function handleSseConnection(_request, response) {
        response.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
            'X-Accel-Buffering': 'no',
        });
        response.flushHeaders?.();
        const session = config.sessionManager.createSession(response);
        writeSseEvent(response, 'endpoint', `${config.messageEndpointPath}?sessionId=${encodeURIComponent(session.id)}`);
        writeSseEvent(response, 'initialize', {
            protocolVersion: config.protocolVersion,
            capabilities: {
                tools: {
                    listChanged: false,
                },
            },
            serverInfo: {
                name: config.serverName,
                version: config.serverVersion,
            },
            tools: TOOL_DEFINITIONS,
        });
    }
    async function handleMessage(request, response, payload) {
        const sessionId = getSessionIdFromRequest(request);
        if (!sessionId) {
            respondJson(response, 400, {
                ok: false,
                error: {
                    code: 'mcp_session_required',
                    message: 'sessionId query parameter is required.',
                },
            });
            return;
        }
        const session = config.sessionManager.touchSession(sessionId);
        if (!session || session.response.writableEnded) {
            respondJson(response, 404, {
                ok: false,
                error: {
                    code: 'mcp_session_not_found',
                    message: 'MCP session not found.',
                },
            });
            return;
        }
        if (!isJsonRpcRequest(payload)) {
            respondJson(response, 400, {
                ok: false,
                error: {
                    code: 'invalid_json_rpc',
                    message: 'POST message requires a JSON-RPC 2.0 object.',
                },
            });
            return;
        }
        config.logEvent?.('mcp_method_dispatch', {
            sessionId,
            method: payload.method,
        });
        const responseMessage = await dispatchMessage(payload, sessionId);
        if (responseMessage && !session.response.writableEnded) {
            writeSseEvent(session.response, 'message', responseMessage);
        }
        respondJson(response, 202, {
            ok: true,
            sessionId,
        });
    }
    async function dispatchMessage(message, sessionId) {
        if (message.method === 'initialize') {
            if (message.id === undefined) {
                return buildErrorResponse(null, -32600, 'initialize requires an id.');
            }
            return {
                jsonrpc: '2.0',
                id: message.id,
                result: {
                    protocolVersion: config.protocolVersion,
                    capabilities: {
                        tools: {
                            listChanged: false,
                        },
                    },
                    serverInfo: {
                        name: config.serverName,
                        version: config.serverVersion,
                    },
                },
            };
        }
        if (message.method === 'notifications/initialized') {
            config.sessionManager.markInitialized(sessionId);
            return null;
        }
        if (message.method === 'ping') {
            if (message.id === undefined) {
                return null;
            }
            return {
                jsonrpc: '2.0',
                id: message.id,
                result: {},
            };
        }
        if (message.method === 'tools/list') {
            if (message.id === undefined) {
                return buildErrorResponse(null, -32600, 'tools/list requires an id.');
            }
            return {
                jsonrpc: '2.0',
                id: message.id,
                result: {
                    tools: TOOL_DEFINITIONS,
                },
            };
        }
        if (message.method === 'tools/call') {
            if (message.id === undefined) {
                return buildErrorResponse(null, -32600, 'tools/call requires an id.');
            }
            try {
                const toolCall = parseToolCall(message);
                const result = await config.handleToolCall(toolCall);
                return {
                    jsonrpc: '2.0',
                    id: message.id,
                    result: buildToolResult(result),
                };
            }
            catch (error) {
                return {
                    jsonrpc: '2.0',
                    id: message.id,
                    result: buildToolResult({
                        success: false,
                        error: error instanceof Error ? error.message : String(error),
                    }),
                };
            }
        }
        if (message.method === 'preview' || message.method === 'execute') {
            if (message.id === undefined) {
                return buildErrorResponse(null, -32600, `${message.method} requires an id.`);
            }
            try {
                const result = await config.handleToolCall({
                    toolName: message.method,
                    payload: extractDirectPayload(message.params),
                });
                return {
                    jsonrpc: '2.0',
                    id: message.id,
                    result: buildToolResult(result),
                };
            }
            catch (error) {
                return {
                    jsonrpc: '2.0',
                    id: message.id,
                    result: buildToolResult({
                        success: false,
                        error: error instanceof Error ? error.message : String(error),
                    }),
                };
            }
        }
        if (message.id === undefined) {
            return null;
        }
        return buildErrorResponse(message.id, -32601, `Method not found: ${message.method}`);
    }
    return {
        handleSseConnection,
        handleMessage,
    };
}
function writeSseEvent(response, event, data) {
    const serialized = typeof data === 'string' ? data : JSON.stringify(data);
    response.write(`event: ${event}\n`);
    for (const line of serialized.split('\n')) {
        response.write(`data: ${line}\n`);
    }
    response.write('\n');
}
function respondJson(response, statusCode, payload) {
    response.statusCode = statusCode;
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.end(JSON.stringify(payload, null, 2));
}
function getSessionIdFromRequest(request) {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1');
    return url.searchParams.get('sessionId');
}
function isJsonRpcRequest(value) {
    return isRecord(value) && value.jsonrpc === '2.0' && typeof value.method === 'string';
}
function parseToolCall(message) {
    if (!isRecord(message.params)) {
        throw new Error('tools/call params must be an object.');
    }
    const toolName = message.params.name;
    if (toolName !== 'preview' && toolName !== 'execute') {
        throw new Error('tools/call params.name must be "preview" or "execute".');
    }
    const argumentsValue = message.params.arguments;
    if (!isRecord(argumentsValue) || !('payload' in argumentsValue)) {
        throw new Error('tools/call params.arguments.payload is required.');
    }
    return {
        toolName,
        payload: argumentsValue.payload,
    };
}
function extractDirectPayload(params) {
    if (!isRecord(params)) {
        throw new Error('Direct preview/execute params must be an object.');
    }
    return 'payload' in params ? params.payload : params;
}
function buildToolResult(result) {
    const structuredContent = isRecord(result) ? result : { value: result };
    return {
        content: [
            {
                type: 'text',
                text: JSON.stringify(structuredContent, null, 2),
            },
        ],
        structuredContent,
        isError: structuredContent.success === false,
    };
}
function buildErrorResponse(id, code, message, data) {
    return {
        jsonrpc: '2.0',
        id,
        error: {
            code,
            message,
            data,
        },
    };
}
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
