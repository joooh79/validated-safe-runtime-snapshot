import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { pathToFileURL } from 'node:url';
import { orchestrateRequest } from './api/orchestrateRequest.js';
import { verifyProxyRequest } from './auth/verifyProxyRequest.js';
import { resolveServerEnv, type ServerEnvConfig } from './config/env.js';
import { createMcpSseTransport, type McpToolCallInput } from './mcp/sseTransport.js';
import { createMcpSessionManager } from './mcp/sessionManager.js';
import type { ApiOrchestrationRequest, ApiOrchestrationResponse } from './types/api.js';
import { getUiPresets } from './ui/presets.js';
import { renderUiHtml } from './ui/renderUiHtml.js';

const HOST = '0.0.0.0';
const MAX_JSON_BODY_BYTES = 1024 * 1024;
const JSON_CONTENT_TYPE = 'application/json; charset=utf-8';
const HTML_CONTENT_TYPE = 'text/html; charset=utf-8';

export const SERVER_ROUTES = {
  root: '/',
  health: '/health',
  ready: '/ready',
  ui: '/ui',
  uiApiRuntimeInfo: '/ui/api/runtime-info',
  uiApiPresets: '/ui/api/presets',
  uiApiPreview: '/ui/api/preview',
  uiApiExecute: '/ui/api/execute',
  internalPreview: '/internal/preview',
  internalExecute: '/internal/execute',
  internalMcpSse: '/internal/mcp/sse',
  internalMcpMessage: '/internal/mcp/message',
} as const;

export interface AppServerInstance {
  server: Server;
  config: ServerEnvConfig;
  close(reason?: string): Promise<void>;
}

export function createAppServer(
  env: NodeJS.ProcessEnv = process.env,
): AppServerInstance {
  const config = resolveServerEnv(env);
  const sessionManager = createMcpSessionManager({
    sessionTtlMs: config.mcp.sessionTtlMs,
    heartbeatIntervalMs: config.mcp.heartbeatIntervalMs,
    onSessionCreated(session) {
      logStructured('info', 'mcp_session_created', {
        sessionId: session.id,
        createdAt: session.createdAt,
      });
    },
    onSessionClosed(session, reason) {
      logStructured('info', 'mcp_session_closed', {
        sessionId: session.id,
        createdAt: session.createdAt,
        lastSeenAt: session.lastSeenAt,
        initialized: session.initialized,
        reason,
      });
    },
  });

  const mcpTransport = createMcpSseTransport({
    serverName: 'smr-sender-rebuild-clean-package',
    serverVersion: '0.1.0',
    protocolVersion: '2025-06-18',
    messageEndpointPath: SERVER_ROUTES.internalMcpMessage,
    sessionManager,
    handleToolCall(input) {
      return handleMcpToolCall(input, config);
    },
    logEvent(event, fields) {
      logStructured('info', event, fields);
    },
  });

  const server = createServer(async (request, response) => {
    try {
      await routeRequest(request, response, {
        config,
        mcpTransport,
      });
    } catch (error) {
      if (error instanceof HttpError) {
        respondError(response, error.statusCode, error.code, error.message, error.details);
        return;
      }

      const message = error instanceof Error ? error.message : 'Unexpected server error.';
      logStructured('error', 'server_unexpected_error', {
        message,
      });
      respondError(response, 500, 'internal_server_error', message);
    }
  });

  return {
    server,
    config,
    async close(reason = 'server_shutdown'): Promise<void> {
      sessionManager.closeAll(reason);

      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });
    },
  };
}

export async function startServer(
  env: NodeJS.ProcessEnv = process.env,
): Promise<AppServerInstance> {
  const app = createAppServer(env);

  app.server.on('error', (error) => {
    logStructured('error', 'server_listen_error', {
      message: error.message,
    });
    process.exit(1);
  });

  await new Promise<void>((resolve) => {
    app.server.listen(app.config.port, HOST, () => {
      logStructured('info', 'server_listening', {
        host: HOST,
        port: app.config.port,
        defaultProviderMode: app.config.defaultProviderConfig.mode,
        trustProxyAuth: app.config.proxyAuth.trustProxyAuth,
      });
      resolve();
    });
  });

  const shutdown = async (signal: string) => {
    logStructured('info', 'server_shutdown_signal', { signal });
    await app.close(signal);
    process.exit(0);
  };

  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });

  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });

  return app;
}

async function routeRequest(
  request: IncomingMessage,
  response: ServerResponse,
  context: {
    config: ServerEnvConfig;
    mcpTransport: ReturnType<typeof createMcpSseTransport>;
  },
): Promise<void> {
  const method = request.method ?? 'GET';
  const url = new URL(request.url ?? '/', 'http://127.0.0.1');

  if (method === 'GET' && url.pathname === SERVER_ROUTES.root) {
    respondJson(response, 200, {
      ok: true,
      service: 'smr-sender-rebuild-clean-package',
      topology: 'Client -> Worker proxy -> Node MCP backend',
      publicRoutes: [
        SERVER_ROUTES.root,
        SERVER_ROUTES.health,
        SERVER_ROUTES.ready,
        SERVER_ROUTES.ui,
      ],
      internalRoutes: [
        `GET ${SERVER_ROUTES.internalMcpSse}`,
        `POST ${SERVER_ROUTES.internalMcpMessage}`,
        `POST ${SERVER_ROUTES.internalPreview}`,
        `POST ${SERVER_ROUTES.internalExecute}`,
      ],
      workerFacingUiRoutes: [
        `GET ${SERVER_ROUTES.ui}`,
        `GET ${SERVER_ROUTES.uiApiRuntimeInfo}`,
        `GET ${SERVER_ROUTES.uiApiPresets}`,
        `POST ${SERVER_ROUTES.uiApiPreview}`,
        `POST ${SERVER_ROUTES.uiApiExecute}`,
      ],
      defaultProviderMode: context.config.defaultProviderConfig.mode,
      previewFirst: true,
      trustProxyAuth: context.config.proxyAuth.trustProxyAuth,
      port: context.config.port,
    });
    return;
  }

  if (method === 'GET' && url.pathname === SERVER_ROUTES.health) {
    respondJson(response, 200, { ok: true });
    return;
  }

  if (method === 'GET' && url.pathname === SERVER_ROUTES.ready) {
    respondJson(response, 200, { ok: true });
    return;
  }

  if (method === 'GET' && url.pathname === SERVER_ROUTES.ui) {
    respondHtml(
      response,
      200,
      renderUiHtml({
        runtimeInfoPath: SERVER_ROUTES.uiApiRuntimeInfo,
        presetsPath: SERVER_ROUTES.uiApiPresets,
        previewPath: SERVER_ROUTES.uiApiPreview,
        executePath: SERVER_ROUTES.uiApiExecute,
        healthPath: SERVER_ROUTES.health,
      }),
    );
    return;
  }

  if (method === 'GET' && url.pathname === SERVER_ROUTES.uiApiRuntimeInfo) {
    respondJson(response, 200, {
      ok: true,
      defaultProviderMode: context.config.defaultProviderConfig.mode,
      trustProxyAuth: context.config.proxyAuth.trustProxyAuth,
      topology: 'Client -> Worker proxy -> Node MCP backend',
      previewFirst: true,
      uiRoute: SERVER_ROUTES.ui,
      previewRoute: SERVER_ROUTES.uiApiPreview,
      executeRoute: SERVER_ROUTES.uiApiExecute,
    });
    return;
  }

  if (method === 'GET' && url.pathname === SERVER_ROUTES.uiApiPresets) {
    respondJson(response, 200, {
      ok: true,
      presets: getUiPresets(),
    });
    return;
  }

  if (
    url.pathname === SERVER_ROUTES.uiApiPreview ||
    url.pathname === SERVER_ROUTES.uiApiExecute
  ) {
    if (method !== 'POST') {
      response.setHeader('Allow', 'POST');
      throw new HttpError(
        405,
        'method_not_allowed',
        `Method ${method} not allowed for ${url.pathname}.`,
      );
    }

    const rawBody = await readRawBody(request);
    verifyInternalProxyRequest(request, url, rawBody, context.config);
    const body = parseJsonBody(rawBody);
    const orchestrationRequest = buildInternalOrchestrationRequest(
      url.pathname === SERVER_ROUTES.uiApiPreview
        ? SERVER_ROUTES.internalPreview
        : SERVER_ROUTES.internalExecute,
      body,
      context.config,
    );
    const orchestrationResponse = await orchestrateRequest(orchestrationRequest);
    const statusCode = orchestrationResponse.success ? 200 : 400;
    respondJson(response, statusCode, orchestrationResponse);
    return;
  }

  if (method === 'GET' && url.pathname === SERVER_ROUTES.internalMcpSse) {
    verifyInternalProxyRequest(request, url, '', context.config);
    context.mcpTransport.handleSseConnection(request, response);
    return;
  }

  if (method === 'POST' && url.pathname === SERVER_ROUTES.internalMcpMessage) {
    const rawBody = await readRawBody(request);
    verifyInternalProxyRequest(request, url, rawBody, context.config);
    await context.mcpTransport.handleMessage(request, response, parseJsonBody(rawBody));
    return;
  }

  if (
    url.pathname === SERVER_ROUTES.internalPreview ||
    url.pathname === SERVER_ROUTES.internalExecute
  ) {
    if (method !== 'POST') {
      response.setHeader('Allow', 'POST');
      throw new HttpError(
        405,
        'method_not_allowed',
        `Method ${method} not allowed for ${url.pathname}.`,
      );
    }

    const rawBody = await readRawBody(request);
    verifyInternalProxyRequest(request, url, rawBody, context.config);
    const body = parseJsonBody(rawBody);
    const orchestrationRequest = buildInternalOrchestrationRequest(
      url.pathname,
      body,
      context.config,
    );
    const orchestrationResponse = await orchestrateRequest(orchestrationRequest);
    const statusCode = orchestrationResponse.success ? 200 : 400;
    respondJson(response, statusCode, orchestrationResponse);
    return;
  }

  respondError(response, 404, 'route_not_found', `Route not found: ${method} ${url.pathname}`);
}

export function buildInternalOrchestrationRequest(
  pathname:
    | typeof SERVER_ROUTES.internalPreview
    | typeof SERVER_ROUTES.internalExecute,
  payload: unknown,
  config: ServerEnvConfig,
): ApiOrchestrationRequest {
  if (!isRecord(payload)) {
    throw new HttpError(400, 'invalid_request_body', 'Request body must be a JSON object.');
  }

  if ('provider' in payload || 'contractParser' in payload) {
    throw new HttpError(
      400,
      'invalid_request_body',
      'HTTP requests must use JSON-safe ApiOrchestrationRequest fields only. Use providerConfig and normalizedContract.',
    );
  }

  if ('contractInput' in payload && !('normalizedContract' in payload)) {
    throw new HttpError(
      400,
      'invalid_request_body',
      'HTTP requests must provide normalizedContract. contractInput is not supported without an in-process contractParser.',
    );
  }

  const request: ApiOrchestrationRequest = {
    ...(payload as ApiOrchestrationRequest),
  };

  request.providerConfig = resolveTrustedProviderConfig(
    request.providerConfig,
    config,
  );

  if (pathname === SERVER_ROUTES.internalPreview) {
    request.interactionInput = {
      ...request.interactionInput,
      confirmation: {
        confirmed: false,
      },
    };
  }

  if (
    pathname === SERVER_ROUTES.internalExecute &&
    request.interactionInput?.confirmation?.confirmed !== true
  ) {
    throw new HttpError(
      400,
      'explicit_confirmation_required',
      'Execute requests require interactionInput.confirmation.confirmed to be true.',
    );
  }

  return request;
}

function resolveTrustedProviderConfig(
  requestProviderConfig: ApiOrchestrationRequest['providerConfig'],
  config: ServerEnvConfig,
): NonNullable<ApiOrchestrationRequest['providerConfig']> {
  const defaultProviderConfig = config.defaultProviderConfig;

  if (
    requestProviderConfig &&
    requestProviderConfig.kind !== defaultProviderConfig.kind
  ) {
    return requestProviderConfig;
  }

  const finalMode = requestProviderConfig?.mode ?? defaultProviderConfig.mode;

  if (finalMode === 'real') {
    const baseId = requestProviderConfig?.baseId ?? defaultProviderConfig.baseId;
    const apiToken = requestProviderConfig?.apiToken ?? defaultProviderConfig.apiToken;
    const apiBaseUrl =
      requestProviderConfig?.apiBaseUrl ?? defaultProviderConfig.apiBaseUrl;

    if (!baseId || !apiToken) {
      throw new HttpError(
        500,
        'server_provider_config_missing',
        'Real Airtable mode requires AIRTABLE_BASE_ID and AIRTABLE_API_TOKEN on the server.',
      );
    }

    return {
      kind: 'airtable',
      mode: 'real',
      baseId,
      apiToken,
      ...(apiBaseUrl ? { apiBaseUrl } : {}),
    };
  }

  if (finalMode === 'mock') {
    return {
      kind: 'airtable',
      mode: 'mock',
    };
  }

  return {
    kind: 'airtable',
    mode: 'dryrun',
  };
}

async function handleMcpToolCall(
  input: McpToolCallInput,
  config: ServerEnvConfig,
): Promise<ApiOrchestrationResponse> {
  const pathname =
    input.toolName === 'preview'
      ? SERVER_ROUTES.internalPreview
      : SERVER_ROUTES.internalExecute;
  const request = buildInternalOrchestrationRequest(pathname, input.payload, config);
  return orchestrateRequest(request);
}

async function readRawBody(request: IncomingMessage): Promise<string> {
  const contentType = request.headers['content-type'];
  if (contentType && !contentType.toLowerCase().includes('application/json')) {
    throw new HttpError(415, 'unsupported_media_type', 'Content-Type must be application/json.');
  }

  const chunks: Buffer[] = [];
  let totalBytes = 0;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buffer.byteLength;

    if (totalBytes > MAX_JSON_BODY_BYTES) {
      throw new HttpError(413, 'payload_too_large', 'JSON body exceeds the 1 MB limit.');
    }

    chunks.push(buffer);
  }

  if (chunks.length === 0) {
    throw new HttpError(400, 'request_body_required', 'Request body is required.');
  }

  const rawBody = Buffer.concat(chunks).toString('utf8').trim();
  if (!rawBody) {
    throw new HttpError(400, 'request_body_required', 'Request body is required.');
  }

  return rawBody;
}

function parseJsonBody(rawBody: string): unknown {
  try {
    return JSON.parse(rawBody) as unknown;
  } catch {
    throw new HttpError(400, 'invalid_json', 'Request body must contain valid JSON.');
  }
}

function verifyInternalProxyRequest(
  request: IncomingMessage,
  url: URL,
  rawBody: string,
  config: ServerEnvConfig,
): void {
  if (!config.proxyAuth.trustProxyAuth) {
    return;
  }

  const verification = verifyProxyRequest(
    {
      method: request.method ?? 'GET',
      pathWithQuery: `${url.pathname}${url.search}`,
      headers: request.headers,
      rawBody,
    },
    {
      sharedSecret: config.proxyAuth.sharedSecret ?? '',
      maxSkewMs: config.proxyAuth.maxSkewMs,
    },
  );

  if (!verification.ok) {
    logStructured('warn', 'proxy_auth_failure', {
      method: request.method ?? 'GET',
      path: `${url.pathname}${url.search}`,
      statusCode: verification.statusCode,
      errorCode: verification.errorCode,
    });
    throw new HttpError(
      verification.statusCode,
      verification.errorCode,
      verification.message,
    );
  }
}

function respondJson(
  response: ServerResponse,
  statusCode: number,
  payload: ApiOrchestrationResponse | Record<string, unknown>,
): void {
  response.statusCode = statusCode;
  response.setHeader('Content-Type', JSON_CONTENT_TYPE);
  response.end(JSON.stringify(payload, null, 2));
}

function respondHtml(
  response: ServerResponse,
  statusCode: number,
  payload: string,
): void {
  response.statusCode = statusCode;
  response.setHeader('Content-Type', HTML_CONTENT_TYPE);
  response.end(payload);
}

function respondError(
  response: ServerResponse,
  statusCode: number,
  code: string,
  message: string,
  details?: unknown,
): void {
  respondJson(response, statusCode, {
    ok: false,
    error: {
      code,
      message,
      details,
    },
  });
}

function logStructured(
  level: 'info' | 'warn' | 'error',
  event: string,
  fields: Record<string, unknown>,
): void {
  const payload = JSON.stringify({
    level,
    event,
    timestamp: new Date().toISOString(),
    ...fields,
  });

  switch (level) {
    case 'warn':
      console.warn(payload);
      return;
    case 'error':
      console.error(payload);
      return;
    default:
      console.log(payload);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

class HttpError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void startServer();
}
