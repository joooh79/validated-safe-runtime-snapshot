import type { IncomingMessage, ServerResponse } from 'node:http';
import type { McpSessionManager } from './sessionManager.js';

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

export interface McpToolCallInput {
  toolName: 'preview' | 'execute';
  payload: unknown;
}

export interface McpSseTransportConfig {
  serverName: string;
  serverVersion: string;
  protocolVersion: string;
  messageEndpointPath: string;
  sessionManager: McpSessionManager;
  handleToolCall(input: McpToolCallInput): Promise<unknown>;
  logEvent?: (
    event: string,
    fields: Record<string, unknown>,
  ) => void;
}

const TOOL_DEFINITIONS: McpToolDefinition[] = [
  {
    name: 'preview',
    description:
      'Send a request payload to the preview endpoint. Use this to preview what would happen without final execution.',
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
      'Send a request payload to the execute endpoint. Call this only after preview succeeds for the same payload in the current MCP session.',
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
  function handleSseConnection(
    _request: IncomingMessage,
    response: ServerResponse,
  ): void {
    response.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    response.flushHeaders?.();

    const session = config.sessionManager.createSession(response);

    writeSseEvent(
      response,
      'endpoint',
      `${config.messageEndpointPath}?sessionId=${encodeURIComponent(session.id)}`,
    );
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

  async function handleMessage(
    request: IncomingMessage,
    response: ServerResponse,
    payload: unknown,
  ): Promise<void> {
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

  async function dispatchMessage(
    message: JsonRpcRequest,
    sessionId: string,
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
        const result = await dispatchToolCall(sessionId, toolCall);

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
        const result = await dispatchToolCall(sessionId, {
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

  async function dispatchToolCall(
    sessionId: string,
    toolCall: McpToolCallInput,
  ): Promise<unknown> {
    if (toolCall.toolName === 'execute') {
      const executeGate = evaluateExecuteGate(
        config.sessionManager.getPreviewState(sessionId),
        toolCall.payload,
      );

      config.logEvent?.('mcp_execute_gate_checked', {
        sessionId,
        allowed: executeGate.ok,
        reason: executeGate.reason,
      });

      if (!executeGate.ok) {
        return buildPreviewFirstRequiredResult(executeGate.message);
      }
    }

    const result = await config.handleToolCall(toolCall);

    if (toolCall.toolName === 'preview') {
      const executeAllowed = getExecuteAllowedFromResult(result);
      config.sessionManager.setPreviewState(sessionId, {
        payloadFingerprint: buildPayloadFingerprint(toolCall.payload),
        executeAllowed,
        terminalStatus: getTerminalStatusFromResult(result),
        updatedAt: Date.now(),
      });

      config.logEvent?.('mcp_preview_proof_recorded', {
        sessionId,
        executeAllowed,
        terminalStatus: getTerminalStatusFromResult(result),
      });
    } else if (toolCall.toolName === 'execute' && shouldConsumePreviewProof(result)) {
      config.sessionManager.clearPreviewState(sessionId);

      config.logEvent?.('mcp_preview_proof_consumed', {
        sessionId,
        terminalStatus: getTerminalStatusFromResult(result),
      });
    }

    return result;
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
  const serialized = typeof data === 'string' ? data : JSON.stringify(data);

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
  return isRecord(value) && value.jsonrpc === '2.0' && typeof value.method === 'string';
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
  const structuredContent = isRecord(result) ? result : { value: result };
  const conversationText = buildConversationText(structuredContent);

  return {
    content: [
      {
        type: 'text',
        text: conversationText,
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

function buildPreviewFirstRequiredResult(message: string): Record<string, unknown> {
  return {
    requestId: 'mcp_preview_required',
    success: false,
    apiState: 'blocked',
    terminalStatus: 'hard_stop',
    interactionMode: 'hard_stop',
    readiness: 'blocked_unresolved',
    didWrite: false,
    warnings: [message],
    nextStepHint: 'Call preview with the current payload first. Execute is a second step only.',
    message,
    confirmed: false,
    requiresConfirmation: false,
    interaction: {
      mode: 'await_user_choice',
      uiKind: 'hard_stop',
      userMessage: message,
      assistantQuestion:
        'Preview is mandatory in MCP/chat mode.\n1. Call preview with the current payload\n2. Revise the payload, then call preview\n3. Cancel',
      requiredUserInput: {
        type: 'single_number_choice',
        field: 'preview_first_enforcement_choice',
        prompt: 'Choose one number.',
        choices: [
          {
            number: 1,
            label: 'Call preview with the current payload',
            value: 'call_preview',
          },
          {
            number: 2,
            label: 'Revise payload, then call preview',
            value: 'revise_and_preview_again',
          },
          {
            number: 3,
            label: 'Cancel',
            value: 'cancel',
          },
        ],
      },
      choiceMap: [
        {
          number: 1,
          meaning: 'call_preview',
          label: 'Call preview with the current payload',
          nextTool: 'preview',
          requiresPreviewAfterChoice: true,
        },
        {
          number: 2,
          meaning: 'revise_and_preview_again',
          label: 'Revise payload, then call preview',
          nextTool: 'preview',
          requiresPreviewAfterChoice: true,
        },
        {
          number: 3,
          meaning: 'cancel',
          label: 'Cancel',
          nextTool: 'none',
          requiresPreviewAfterChoice: false,
        },
      ],
      nextStepType: 'blocked',
      mustPreviewBeforeExecute: true,
      previewInvalidatedByPayloadChange: true,
      executeAllowed: false,
      executeLockedReason: message,
    },
  };
}

function evaluateExecuteGate(
  previewState: ReturnType<McpSessionManager['getPreviewState']>,
  payload: unknown,
): {
  ok: boolean;
  reason: 'missing_preview' | 'payload_changed' | 'preview_not_execute_ready';
  message: string;
} {
  if (!previewState) {
    return {
      ok: false,
      reason: 'missing_preview',
      message: 'Preview is required before execute in this MCP session.',
    };
  }

  if (!payloadMatchesPreviewFingerprint(previewState.payloadFingerprint, payload)) {
    return {
      ok: false,
      reason: 'payload_changed',
      message: 'The payload changed after preview. Preview again before execute.',
    };
  }

  if (!previewState.executeAllowed) {
    return {
      ok: false,
      reason: 'preview_not_execute_ready',
      message: 'Preview exists, but execution is not allowed from the current preview state.',
    };
  }

  return {
    ok: true,
    reason: 'preview_not_execute_ready',
    message: '',
  };
}

function payloadMatchesPreviewFingerprint(
  previewFingerprint: string,
  payload: unknown,
): boolean {
  return previewFingerprint === buildPayloadFingerprint(payload);
}

function buildPayloadFingerprint(payload: unknown): string {
  return JSON.stringify(sortDeep(sanitizePayloadForPreview(payload)));
}

function sanitizePayloadForPreview(payload: unknown): unknown {
  if (!isRecord(payload)) {
    return payload;
  }

  const cloned = sortDeep(payload) as Record<string, unknown>;
  const interactionInput = cloned.interactionInput;

  if (isRecord(interactionInput) && isRecord(interactionInput.confirmation)) {
    const sanitizedInteraction = { ...interactionInput };
    delete sanitizedInteraction.confirmation;

    if (Object.keys(sanitizedInteraction).length === 0) {
      delete cloned.interactionInput;
    } else {
      cloned.interactionInput = sanitizedInteraction;
    }
  }

  return cloned;
}

function sortDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sortDeep(item));
  }

  if (isRecord(value)) {
    return Object.keys(value)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = sortDeep(value[key]);
        return acc;
      }, {});
  }

  return value;
}

function getExecuteAllowedFromResult(result: unknown): boolean {
  return (
    isRecord(result) &&
    result.success === true &&
    result.terminalStatus === 'preview_pending_confirmation' &&
    result.requiresConfirmation === true &&
    result.readiness === 'execution_ready'
  );
}

function getTerminalStatusFromResult(result: unknown): string {
  if (isRecord(result) && typeof result.terminalStatus === 'string') {
    return result.terminalStatus;
  }

  return 'unknown';
}

function shouldConsumePreviewProof(result: unknown): boolean {
  return (
    isRecord(result) &&
    result.success === true &&
    (result.terminalStatus === 'executed' || result.didWrite === true)
  );
}

function buildConversationText(structuredContent: Record<string, unknown>): string {
  const sections: string[] = [];
  const terminalStatus = stringifyOptional(structuredContent.terminalStatus);
  const message = stringifyOptional(structuredContent.message);
  const nextStepHint = stringifyOptional(structuredContent.nextStepHint);
  const readablePreview = isRecord(structuredContent.readablePreview)
    ? structuredContent.readablePreview
    : null;
  const interaction = isRecord(structuredContent.interaction)
    ? structuredContent.interaction
    : null;

  if (terminalStatus) {
    sections.push(`Status: ${terminalStatus}`);
  }

  if (message) {
    sections.push(message);
  }

  if (readablePreview) {
    const patientSummary = getSummaryValue(readablePreview.patient_summary);
    const visitSummary = getSummaryValue(readablePreview.visit_summary);
    const caseSummary = getSummaryValue(readablePreview.case_summary);

    if (patientSummary) {
      sections.push(`Patient: ${patientSummary}`);
    }

    if (visitSummary) {
      sections.push(`Visit: ${visitSummary}`);
    }

    if (caseSummary) {
      sections.push(`Case: ${caseSummary}`);
    }

    const findings = Array.isArray(readablePreview.findings)
      ? readablePreview.findings
      : [];

    if (findings.length > 0) {
      const findingLines = findings.map((finding) => {
        if (!isRecord(finding)) {
          return null;
        }

        const branch = stringifyOptional(finding.branch_code);
        const tooth = stringifyOptional(finding.tooth_number);
        const reps = Array.isArray(finding.representative_fields)
          ? finding.representative_fields
              .filter(isRecord)
              .map((field) => {
                const label = stringifyOptional(field.field);
                const value = stringifyOptional(field.value);
                return label && value ? `${label}: ${value}` : null;
              })
              .filter(Boolean)
          : [];

        const suffix = reps.length > 0 ? ` (${reps.join('; ')})` : '';
        return `- ${branch || 'Finding'} tooth ${tooth || '?'}` + suffix;
      }).filter(Boolean);

      if (findingLines.length > 0) {
        sections.push(`Findings:\n${findingLines.join('\n')}`);
      }
    }
  }

  if (nextStepHint) {
    sections.push(`Next step: ${nextStepHint}`);
  }

  if (interaction) {
    const assistantQuestion = stringifyOptional(interaction.assistantQuestion);
    if (assistantQuestion) {
      sections.push(assistantQuestion);
    }
  }

  return sections.join('\n\n') || JSON.stringify(structuredContent, null, 2);
}

function getSummaryValue(value: unknown): string | null {
  if (!isRecord(value)) {
    return null;
  }

  const label = stringifyOptional(value.label);
  const mainValue = stringifyOptional(value.value);

  if (!label || !mainValue) {
    return null;
  }

  return `${label}: ${mainValue}`;
}

function stringifyOptional(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}
