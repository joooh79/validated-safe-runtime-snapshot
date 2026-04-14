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
  // INFINITE LOOP FIX: requestId-based preview state cache for session recovery
  // When preview and execute have different sessionIds (common in MCP Chat),
  // we can still recover the preview state using requestId
  const requestIdPreviewStateCache = new Map<string, {
    previewState: ReturnType<McpSessionManager['getPreviewState']>;
    timestamp: number;
  }>();
  const PREVIEW_STATE_TTL_MS = 5 * 60 * 1000; // 5 minute TTL

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
    // PHASE 2 DIAGNOSTIC: Log sessionId for every tool call
    console.log(`[MCP-PHASE-2] Tool call dispatch:`, {
      toolName: toolCall.toolName,
      sessionId,
      payloadKeys: isRecord(toolCall.payload) ? Object.keys(toolCall.payload as any) : 'not-a-record',
      timestamp: new Date().toISOString(),
    });
    
    if (toolCall.toolName === 'execute') {
      // Try to get preview state from current session first
      let previewStateBeforeGate = config.sessionManager.getPreviewState(sessionId);
      const requestId = isRecord(toolCall.payload) && typeof (toolCall.payload as any).requestId === 'string'
        ? (toolCall.payload as any).requestId
        : 'unknown';
      
      // INFINITE LOOP FIX: If not found and we have a requestId, try to recover from cache
      if (!previewStateBeforeGate && requestId !== 'unknown') {
        const cachedEntry = requestIdPreviewStateCache.get(requestId);
        if (cachedEntry && Date.now() - cachedEntry.timestamp < PREVIEW_STATE_TTL_MS) {
          previewStateBeforeGate = cachedEntry.previewState;
          console.log('[MCP-INFINITE-LOOP-FIX] Recovered preview state from requestId cache:', {
            sessionId,
            requestId,
            cacheAge: Date.now() - cachedEntry.timestamp,
          });
        }
      }
      
      // PHASE 2 DIAGNOSTIC: Log preview state before gate evaluation
      console.log('[MCP-PHASE-2] Before execute gate check:', {
        sessionId,
        requestId,
        hasPreviewState: previewStateBeforeGate !== null,
        previewStateSnapshot: previewStateBeforeGate ? {
          executeAllowed: previewStateBeforeGate.executeAllowed,
          terminalStatus: previewStateBeforeGate.terminalStatus,
          updatedAt: previewStateBeforeGate.updatedAt,
        } : null,
        timestamp: new Date().toISOString(),
      });
      
      const executeGate = evaluateExecuteGate(
        previewStateBeforeGate,
        toolCall.payload,
      );

      console.log('[MCP-PHASE-2] Execute gate result:', {
        sessionId,
        ok: executeGate.ok,
        reason: executeGate.reason,
        message: executeGate.message,
      });

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
      // PHASE 1 DIAGNOSTIC: Log preview result processing
      const executeAllowed = getExecuteAllowedFromResult(result);
      const requestId = isRecord(toolCall.payload) && typeof (toolCall.payload as any).requestId === 'string'
        ? (toolCall.payload as any).requestId
        : 'unknown';
      
      console.log('[MCP-PHASE-1] Preview result processing:', {
        sessionId,
        requestId,
        executeAllowedComputed: executeAllowed,
        resultSuccess: isRecord(result) ? result.success : 'not-record',
        resultTerminalStatus: isRecord(result) ? result.terminalStatus : undefined,
        resultRequiresConfirmation: isRecord(result) ? result.requiresConfirmation : undefined,
        resultReadiness: isRecord(result) ? result.readiness : undefined,
        timestamp: new Date().toISOString(),
      });
      
      const fingerprint = buildPayloadFingerprint(toolCall.payload);
      const previewState = {
        payloadFingerprint: fingerprint,
        executeAllowed,
        terminalStatus: getTerminalStatusFromResult(result),
        updatedAt: Date.now(),
      };

      config.sessionManager.setPreviewState(sessionId, previewState);
      
      // INFINITE LOOP FIX: Cache preview state by requestId for recovery
      if (requestId !== 'unknown') {
        requestIdPreviewStateCache.set(requestId, {
          previewState,
          timestamp: Date.now(),
        });
        console.log('[MCP-INFINITE-LOOP-FIX] Cached preview state for requestId:', {
          requestId,
          sessionId,
          executeAllowed,
        });
      }

      config.logEvent?.('mcp_preview_proof_recorded', {
        sessionId,
        executeAllowed,
        terminalStatus: getTerminalStatusFromResult(result),
      });
    } else if (toolCall.toolName === 'execute' && shouldConsumePreviewProof(result)) {
      // PHASE 2 DIAGNOSTIC: Log successful execute that consumes preview proof
      console.log('[MCP-PHASE-2] Execute succeeded - clearing preview state:', {
        sessionId,
        resultTerminalStatus: isRecord(result) ? result.terminalStatus : undefined,
        resultDidWrite: isRecord(result) ? result.didWrite : undefined,
        timestamp: new Date().toISOString(),
      });
      
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
  // PHASE 3 DIAGNOSTIC: Compare fingerprints
  const currentFingerprint = buildPayloadFingerprint(payload);
  const matches = previewFingerprint === currentFingerprint;
  
  if (!matches) {
    console.log('[MCP-PHASE-3] Payload fingerprint mismatch:', {
      previewFingerprint: previewFingerprint.substring(0, 100),
      currentFingerprint: currentFingerprint.substring(0, 100),
      matches,
      timestamp: new Date().toISOString(),
    });
  }
  
  return matches;
}

function buildPayloadFingerprint(payload: unknown): string {
  // PHASE 3 DIAGNOSTIC: Log fingerprint generation
  const sanitized = sanitizePayloadForPreview(payload);
  const stringified = JSON.stringify(sortDeep(sanitized));
  
  console.log('[MCP-PHASE-3] buildPayloadFingerprint:', {
    fingerprintLength: stringified.length,
    fingerprintHash: stringified.substring(0, 80),
    payloadKeys: isRecord(payload) ? Object.keys(payload as any).slice(0, 5) : 'not-record',
    timestamp: new Date().toISOString(),
  });
  
  return stringified;
}

function sanitizePayloadForPreview(payload: unknown): unknown {
  if (!isRecord(payload)) {
    return payload;
  }

  const cloned = sortDeep(payload) as Record<string, unknown>;
  delete cloned.requestId;
  const interactionInput = cloned.interactionInput;
  const normalizedContract = cloned.normalizedContract;

  if (isRecord(normalizedContract)) {
    delete normalizedContract.requestId;
    delete normalizedContract.warnings;
  }

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
  // PHASE 1 DIAGNOSTIC: Log each condition for preview response validation
  const checks = {
    isRecord: isRecord(result),
    success: isRecord(result) ? result.success === true : false,
    terminalStatus: isRecord(result) ? result.terminalStatus === 'preview_pending_confirmation' : false,
    requiresConfirmation: isRecord(result) ? result.requiresConfirmation === true : false,
    readiness: isRecord(result) ? result.readiness === 'execution_ready' : false,
  };
  
  const allPass = checks.isRecord && checks.success && checks.terminalStatus && checks.requiresConfirmation && checks.readiness;
  
  console.log('[MCP-PHASE-1] getExecuteAllowedFromResult diagnostic:', {
    allPass,
    checks,
    resultKeys: isRecord(result) ? Object.keys(result as any).slice(0, 10) : 'not-a-record',
    timestamp: new Date().toISOString(),
  });
  
  return allPass;
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
  const display = isRecord(structuredContent.display) ? structuredContent.display : null;
  if (display) {
    return renderDisplayConversationText(display);
  }

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
        const fieldChanges = Array.isArray(finding.field_changes)
          ? finding.field_changes
              .filter(isRecord)
              .map((change) => {
                const field = stringifyOptional(change.field);
                const status = stringifyOptional(change.status_label);
                const before = stringifyOptional(change.before);
                const incoming = stringifyOptional(change.incoming);
                const after = stringifyOptional(change.after);

                if (!field) {
                  return null;
                }

                return [
                  `[finding] ${branch || 'Finding'} tooth ${tooth || '?'} ${field}`,
                  `- 상태: ${status || '(empty)'}`,
                  `- 현재값: ${before || '(empty)'}`,
                  `- 입력값: ${incoming || '(empty)'}`,
                  `- 적용 후: ${after || '(empty)'}`,
                ].join('\n');
              })
              .filter(Boolean)
          : [];

        if (fieldChanges.length > 0) {
          return fieldChanges.join('\n');
        }

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
    const userMessage = stringifyOptional(interaction.userMessage);
    if (userMessage && userMessage !== message) {
      sections.push(userMessage);
    }

    const assistantQuestion = stringifyOptional(interaction.assistantQuestion);
    if (assistantQuestion) {
      sections.push(assistantQuestion);
    }
  }

  return sections.join('\n\n') || JSON.stringify(structuredContent, null, 2);
}

function renderDisplayConversationText(display: Record<string, unknown>): string {
  const sections: string[] = [];
  const title = stringifyOptional(display.title);
  const message = stringifyOptional(display.message);
  const patient = isRecord(display.patient) ? display.patient : null;
  const visit = isRecord(display.visit) ? display.visit : null;
  const caseSection = isRecord(display.case) ? display.case : null;
  const findings = Array.isArray(display.findings) ? display.findings.filter(isRecord) : [];
  const warnings = Array.isArray(display.warnings)
    ? display.warnings.map((warning) => stringifyOptional(warning)).filter(Boolean)
    : [];
  const interaction = isRecord(display.interaction) ? display.interaction : null;
  const executionState = isRecord(display.executionState) ? display.executionState : null;

  if (title) {
    sections.push(title);
  }

  if (message) {
    sections.push(message);
  }

  for (const [sectionTitle, sectionValue] of [
    ['Patient', patient],
    ['Visit', visit],
    ['Case', caseSection],
  ] as const) {
    if (!sectionValue) {
      continue;
    }

    const lines: string[] = [];
    const label = stringifyOptional(sectionValue.label);
    const value = stringifyOptional(sectionValue.value);
    const details = Array.isArray(sectionValue.details)
      ? sectionValue.details.map((detail) => stringifyOptional(detail)).filter(Boolean)
      : [];
    const inputFields = Array.isArray(sectionValue.input_fields)
      ? sectionValue.input_fields.filter(isRecord)
      : [];

    if (label || value) {
      lines.push(`${label || sectionTitle}: ${value || '(empty)'}`);
    }

    if (details.length > 0) {
      lines.push(...details.map((detail) => `- ${detail}`));
    }

    if (inputFields.length > 0) {
      lines.push(
        ...inputFields.map((field) => {
          const fieldLabel = stringifyOptional(field.field);
          const fieldValue = stringifyOptional(field.value);
          return `- ${fieldLabel || 'Field'}: ${fieldValue ?? ''}`;
        }),
      );
    }

    if (lines.length > 0) {
      sections.push(lines.join('\n'));
    }
  }

  if (findings.length > 0) {
    const findingLines = findings.map((finding) => {
      const lines: string[] = [];
      const branch = stringifyOptional(finding.branch_code);
      const tooth = stringifyOptional(finding.tooth_number);
      const value = stringifyOptional(finding.value);
      lines.push(`[finding] ${branch || 'Finding'} tooth ${tooth || '?'}: ${value || '(empty)'}`);

      const inputFields = Array.isArray(finding.input_fields)
        ? finding.input_fields.filter(isRecord)
        : [];
      if (inputFields.length > 0) {
        lines.push(
          ...inputFields.map((field) => {
            const fieldLabel = stringifyOptional(field.field);
            const fieldValue = stringifyOptional(field.value);
            return `- ${fieldLabel || 'Field'}: ${fieldValue ?? ''}`;
          }),
        );
      }

      const fieldChanges = Array.isArray(finding.field_changes)
        ? finding.field_changes.filter(isRecord)
        : [];
      if (fieldChanges.length > 0) {
        lines.push(
          ...fieldChanges.map((change) => {
            const fieldLabel = stringifyOptional(change.field);
            const status = stringifyOptional(change.status_label);
            const before = stringifyOptional(change.before);
            const incoming = stringifyOptional(change.incoming);
            const after = stringifyOptional(change.after);
            return [
              `- 상태: ${status || '(empty)'}`,
              `- 필드: ${fieldLabel || '(empty)'}`,
              `- 현재값: ${before || '(empty)'}`,
              `- 입력값: ${incoming || '(empty)'}`,
              `- 적용 후: ${after || '(empty)'}`,
            ].join('\n');
          }),
        );
      }

      return lines.join('\n');
    });

    sections.push(`Findings:\n${findingLines.join('\n')}`);
  }

  if (warnings.length > 0) {
    sections.push(`Warnings:\n${warnings.map((warning) => `- ${warning}`).join('\n')}`);
  }

  if (interaction) {
    const interactionLines: string[] = [];
    const userMessage = stringifyOptional(interaction.userMessage);
    const assistantQuestion = stringifyOptional(interaction.assistantQuestion);
    const numericChoices = Array.isArray(interaction.numeric_choices)
      ? interaction.numeric_choices.filter(isRecord)
      : [];

    if (userMessage && userMessage !== message) {
      interactionLines.push(userMessage);
    }

    if (assistantQuestion) {
      interactionLines.push(assistantQuestion);
    }

    if (numericChoices.length > 0) {
      interactionLines.push(
        ...numericChoices.map((choice) => {
          const number = stringifyOptional(choice.number);
          const label = stringifyOptional(choice.label);
          const nextTool = stringifyOptional(choice.nextTool);
          return `${number || '?'}${label ? '. ' : ' '}${label || '(empty)'}${nextTool ? ` [next: ${nextTool}]` : ''}`;
        }),
      );
    }

    if (interactionLines.length > 0) {
      sections.push(interactionLines.join('\n'));
    }
  }

  if (executionState) {
    const lines = [
      `Execute allowed: ${stringifyOptional(executionState.executeAllowed) || 'false'}`,
      `Next step type: ${stringifyOptional(executionState.nextStepType) || '(empty)'}`,
    ];
    const nextTool = stringifyOptional(executionState.nextTool);
    if (nextTool) {
      lines.push(`Next tool: ${nextTool}`);
    }
    const nextStep = stringifyOptional(executionState.nextStep);
    if (nextStep) {
      lines.push(`Next step: ${nextStep}`);
    }
    const lockedReason = stringifyOptional(executionState.executeLockedReason);
    if (lockedReason) {
      lines.push(`Execute lock: ${lockedReason}`);
    }
    sections.push(lines.join('\n'));
  }

  return sections.join('\n\n') || JSON.stringify(display, null, 2);
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
  if (typeof value === 'string') {
    return value.length > 0 ? value : null;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return null;
}
