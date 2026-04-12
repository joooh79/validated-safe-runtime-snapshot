/**
 * Minimal legacy MCP SSE transport for a single active client session.
 * It exposes initialize, tools/list, and tools/call over SSE + POST /message.
 */

import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

export type JsonRpcId = string | number | null;

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: JsonRpcId;
  method: string;
  params?: unknown;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: JsonRpcId;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

interface JsonRpcNotification {
  jsonrpc: '2.0';
  method: string;
  params?: unknown;
}

interface McpToolDefinition {
  name: 'preview' | 'execute';
  description: string;
  inputSchema: {
    type: 'object';
    properties: {
      payload: {
        type: 'object';
      };
    };
    required: ['payload'];
  };
}

interface McpSseSession {
  id: string;
  response: ServerResponse;
  initialized: boolean;
  heartbeat: NodeJS.Timeout;
}

export interface McpToolCallInput {
  toolName: 'preview' | 'execute';
  payload: unknown;
}

export interface McpSseTransportConfig {
  serverName: string;
  serverVersion: string;
  protocolVersion: string;
  handleToolCall(input: McpToolCallInput): Promise<unknown>;
}

const HEARTBEAT_INTERVAL_MS = 15000;

const TOOL_DEFINITIONS: McpToolDefinition[] = [
  {
    name: 'preview',
    description:
      'Send a request payload to the /preview endpoint. Use this to preview what would happen without final execution.',
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
    description:
      'Send a request payload to the /execute endpoint. Execution depends on confirmation rules.',
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

export function createMcpSseTransport(config: McpSseTransportConfig) {
  let activeSession: McpSseSession | null = null;

  function handleSseConnection(
    request: IncomingMessage,
    response: ServerResponse,
  ): void {
    closeActiveSession();

    const sessionId = randomUUID();
    response.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    response.flushHeaders?.();

    const heartbeat = setInterval(() => {
      if (!response.writableEnded) {
        response.write(': keep-alive\n\n');
      }
    }, HEARTBEAT_INTERVAL_MS);

    activeSession = {
      id: sessionId,
      response,
      initialized: false,
      heartbeat,
    };

    writeSseEvent(response, 'endpoint', `/message?sessionId=${encodeURIComponent(sessionId)}`);
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

    request.on('close', () => {
      if (activeSession?.id === sessionId) {
        clearInterval(heartbeat);
        activeSession = null;
      }
    });
  }

  async function handleMessage(
    request: IncomingMessage,
    response: ServerResponse,
    payload: unknown,
  ): Promise<void> {
    if (!activeSession || activeSession.response.writableEnded) {
      respondJson(response, 503, {
        ok: false,
        error: 'No active SSE client is connected.',
      });
      return;
    }

    const sessionId = getSessionIdFromRequest(request);
    if (sessionId && sessionId !== activeSession.id) {
      respondJson(response, 404, {
        ok: false,
        error: 'MCP session not found.',
      });
      return;
    }

    if (!isJsonRpcRequest(payload)) {
      respondJson(response, 400, {
        ok: false,
        error: 'POST /message requires a JSON-RPC 2.0 object.',
      });
      return;
    }

    const responseMessage = await dispatchMessage(payload, activeSession);
    if (responseMessage) {
      writeSseEvent(activeSession.response, 'message', responseMessage);
    }

    respondJson(response, 202, {
      ok: true,
      sessionId: activeSession.id,
    });
  }

  async function dispatchMessage(
    message: JsonRpcRequest,
    session: McpSseSession,
  ): Promise<JsonRpcResponse | null> {
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
      session.initialized = true;
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
      } catch (error) {
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
      } catch (error) {
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

  function closeActiveSession(): void {
    if (!activeSession) {
      return;
    }

    clearInterval(activeSession.heartbeat);
    if (!activeSession.response.writableEnded) {
      activeSession.response.end();
    }
    activeSession = null;
  }

  return {
    handleSseConnection,
    handleMessage,
  };
}

function writeSseEvent(
  response: ServerResponse,
  event: string,
  data: string | Record<string, unknown> | JsonRpcResponse,
): void {
  const serialized =
    typeof data === 'string' ? data : JSON.stringify(data);

  response.write(`event: ${event}\n`);
  for (const line of serialized.split('\n')) {
    response.write(`data: ${line}\n`);
  }
  response.write('\n');
}

function respondJson(
  response: ServerResponse,
  statusCode: number,
  payload: Record<string, unknown>,
): void {
  response.statusCode = statusCode;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(payload, null, 2));
}

function getSessionIdFromRequest(request: IncomingMessage): string | null {
  const url = new URL(request.url ?? '/', 'http://127.0.0.1');
  return url.searchParams.get('sessionId');
}

function isJsonRpcRequest(value: unknown): value is JsonRpcRequest {
  return (
    isRecord(value) &&
    value.jsonrpc === '2.0' &&
    typeof value.method === 'string'
  );
}

function parseToolCall(message: JsonRpcRequest): McpToolCallInput {
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

function extractDirectPayload(params: unknown): unknown {
  if (!isRecord(params)) {
    throw new Error('Direct preview/execute params must be an object.');
  }

  return 'payload' in params ? params.payload : params;
}

function buildToolResult(result: unknown): Record<string, unknown> {
  const structuredContent = isRecord(result)
    ? result
    : { value: result };

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

function buildErrorResponse(
  id: JsonRpcId,
  code: number,
  message: string,
  data?: unknown,
): JsonRpcResponse {
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
