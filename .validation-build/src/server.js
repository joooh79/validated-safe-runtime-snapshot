import { createServer } from 'node:http';
import { orchestrateRequest } from './api/orchestrateRequest.js';
import { createMcpSseTransport } from './mcp/sseTransport.js';
const DEFAULT_PORT = 10000;
const HOST = '0.0.0.0';
const MAX_JSON_BODY_BYTES = 1024 * 1024;
const JSON_CONTENT_TYPE = 'application/json; charset=utf-8';
const defaultProviderConfig = resolveDefaultProviderConfig();
const mcpTransport = createMcpSseTransport({
    serverName: 'smr-sender-rebuild-clean-package',
    serverVersion: '0.1.0',
    protocolVersion: '2025-06-18',
    handleToolCall: handleMcpToolCall,
});
const server = createServer(async (request, response) => {
    try {
        await routeRequest(request, response);
    }
    catch (error) {
        if (error instanceof HttpError) {
            respondJson(response, error.statusCode, {
                ok: false,
                error: error.message,
            });
            return;
        }
        const message = error instanceof Error ? error.message : 'Unexpected server error.';
        console.error('[server] unexpected error', error);
        respondJson(response, 500, {
            ok: false,
            error: message,
        });
    }
});
const port = resolvePort(process.env.PORT);
server.on('error', (error) => {
    console.error('[server] failed to start or crashed while listening.', error);
    process.exit(1);
});
server.listen(port, HOST, () => {
    console.log(`[server] listening on http://${HOST}:${port} (defaultProviderMode=${defaultProviderConfig.mode})`);
});
process.on('SIGTERM', () => {
    console.log('[server] received SIGTERM, shutting down.');
    server.close(() => process.exit(0));
});
process.on('SIGINT', () => {
    console.log('[server] received SIGINT, shutting down.');
    server.close(() => process.exit(0));
});
async function routeRequest(request, response) {
    const method = request.method ?? 'GET';
    const url = new URL(request.url ?? '/', 'http://127.0.0.1');
    if (method === 'GET' && url.pathname === '/') {
        respondJson(response, 200, {
            ok: true,
            service: 'smr-sender-rebuild-clean-package',
            endpoints: ['GET /', 'GET /health', 'POST /preview', 'POST /execute'],
            defaultProviderMode: defaultProviderConfig.mode,
            previewFirst: true,
            port,
        });
        return;
    }
    if (method === 'GET' && url.pathname === '/health') {
        respondJson(response, 200, { ok: true });
        return;
    }
    if (method === 'GET' && url.pathname === '/sse') {
        mcpTransport.handleSseConnection(request, response);
        return;
    }
    if (method === 'POST' && url.pathname === '/message') {
        const body = await readJsonBody(request);
        await mcpTransport.handleMessage(request, response, body);
        return;
    }
    if (url.pathname === '/preview' || url.pathname === '/execute') {
        if (method !== 'POST') {
            response.setHeader('Allow', 'POST');
            throw new HttpError(405, `Method ${method} not allowed for ${url.pathname}.`);
        }
        const body = await readJsonBody(request);
        const orchestrationRequest = buildOrchestrationRequest(url.pathname, body);
        const orchestrationResponse = await orchestrateRequest(orchestrationRequest);
        const statusCode = orchestrationResponse.success ? 200 : 400;
        respondJson(response, statusCode, orchestrationResponse);
        return;
    }
    respondJson(response, 404, {
        ok: false,
        error: `Route not found: ${method} ${url.pathname}`,
    });
}
function buildOrchestrationRequest(pathname, payload) {
    if (!isRecord(payload)) {
        throw new HttpError(400, 'Request body must be a JSON object.');
    }
    if ('provider' in payload || 'contractParser' in payload) {
        throw new HttpError(400, 'HTTP requests must use JSON-safe ApiOrchestrationRequest fields only. Use providerConfig and normalizedContract.');
    }
    if ('contractInput' in payload && !('normalizedContract' in payload)) {
        throw new HttpError(400, 'HTTP requests must provide normalizedContract. contractInput is not supported without an in-process contractParser.');
    }
    const request = {
        ...payload,
    };
    if (!request.providerConfig) {
        request.providerConfig = defaultProviderConfig;
    }
    if (pathname === '/preview') {
        request.interactionInput = {
            ...request.interactionInput,
            confirmation: {
                confirmed: false,
            },
        };
    }
    return request;
}
async function handleMcpToolCall(input) {
    const pathname = input.toolName === 'preview' ? '/preview' : '/execute';
    const request = buildOrchestrationRequest(pathname, input.payload);
    if (input.toolName === 'execute') {
        request.interactionInput = {
            ...request.interactionInput,
            confirmation: request.interactionInput?.confirmation ?? {
                confirmed: true,
            },
        };
    }
    return orchestrateRequest(request);
}
async function readJsonBody(request) {
    const contentType = request.headers['content-type'];
    if (contentType && !contentType.toLowerCase().includes('application/json')) {
        throw new HttpError(415, 'Content-Type must be application/json.');
    }
    const chunks = [];
    let totalBytes = 0;
    for await (const chunk of request) {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        totalBytes += buffer.byteLength;
        if (totalBytes > MAX_JSON_BODY_BYTES) {
            throw new HttpError(413, 'JSON body exceeds the 1 MB limit.');
        }
        chunks.push(buffer);
    }
    if (chunks.length === 0) {
        throw new HttpError(400, 'Request body is required.');
    }
    const rawBody = Buffer.concat(chunks).toString('utf8').trim();
    if (!rawBody) {
        throw new HttpError(400, 'Request body is required.');
    }
    try {
        return JSON.parse(rawBody);
    }
    catch {
        throw new HttpError(400, 'Request body must contain valid JSON.');
    }
}
function respondJson(response, statusCode, payload) {
    response.statusCode = statusCode;
    response.setHeader('Content-Type', JSON_CONTENT_TYPE);
    response.end(JSON.stringify(payload, null, 2));
}
function resolveDefaultProviderConfig() {
    const rawMode = process.env.AIRTABLE_MODE;
    if (rawMode !== undefined &&
        rawMode !== 'dryrun' &&
        rawMode !== 'mock' &&
        rawMode !== 'real') {
        throw new Error('AIRTABLE_MODE must be one of: dryrun, mock, real.');
    }
    if (rawMode === 'mock') {
        return {
            kind: 'airtable',
            mode: 'mock',
        };
    }
    const baseId = process.env.AIRTABLE_BASE_ID;
    const apiToken = process.env.AIRTABLE_API_TOKEN;
    if (rawMode === 'real') {
        if (!baseId || !apiToken) {
            throw new Error('AIRTABLE_MODE=real requires AIRTABLE_BASE_ID and AIRTABLE_API_TOKEN.');
        }
        return {
            kind: 'airtable',
            mode: 'real',
            baseId,
            apiToken,
        };
    }
    if (baseId && apiToken) {
        return {
            kind: 'airtable',
            mode: 'real',
            baseId,
            apiToken,
        };
    }
    return {
        kind: 'airtable',
        mode: 'dryrun',
    };
}
function resolvePort(rawPort) {
    if (!rawPort) {
        return DEFAULT_PORT;
    }
    const parsed = Number(rawPort);
    if (!Number.isInteger(parsed) || parsed <= 0) {
        throw new Error(`Invalid PORT value: ${rawPort}`);
    }
    return parsed;
}
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
class HttpError extends Error {
    statusCode;
    constructor(statusCode, message) {
        super(message);
        this.statusCode = statusCode;
        this.name = 'HttpError';
    }
}
