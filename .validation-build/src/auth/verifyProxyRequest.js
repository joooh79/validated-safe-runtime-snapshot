import { createHash, createHmac } from 'node:crypto';
import { timingSafeEqualString } from '../utils/timingSafe.js';
export const PROXY_TIMESTAMP_HEADER = 'x-proxy-timestamp';
export const PROXY_SIGNATURE_HEADER = 'x-proxy-signature';
export function verifyProxyRequest(input, config) {
    const timestampHeader = getSingleHeaderValue(input.headers[PROXY_TIMESTAMP_HEADER]);
    const signatureHeader = getSingleHeaderValue(input.headers[PROXY_SIGNATURE_HEADER]);
    if (!timestampHeader || !signatureHeader) {
        return {
            ok: false,
            statusCode: 401,
            errorCode: 'proxy_auth_required',
            message: `Missing required proxy auth headers: ${PROXY_TIMESTAMP_HEADER}, ${PROXY_SIGNATURE_HEADER}.`,
        };
    }
    const timestampMs = Number(timestampHeader);
    if (!Number.isFinite(timestampMs)) {
        return {
            ok: false,
            statusCode: 401,
            errorCode: 'proxy_auth_invalid',
            message: `${PROXY_TIMESTAMP_HEADER} must be a unix timestamp in milliseconds.`,
        };
    }
    const now = config.now?.() ?? Date.now();
    if (Math.abs(now - timestampMs) > config.maxSkewMs) {
        return {
            ok: false,
            statusCode: 401,
            errorCode: 'proxy_auth_stale',
            message: 'Proxy request timestamp is outside the allowed skew window.',
        };
    }
    const expectedSignature = computeProxyRequestSignature({
        method: input.method,
        pathWithQuery: input.pathWithQuery,
        timestampMs,
        rawBody: input.rawBody ?? '',
    }, config.sharedSecret);
    if (!timingSafeEqualString(signatureHeader, expectedSignature)) {
        return {
            ok: false,
            statusCode: 403,
            errorCode: 'proxy_auth_invalid',
            message: 'Proxy request signature verification failed.',
        };
    }
    return {
        ok: true,
        timestampMs,
    };
}
export function computeProxyRequestSignature(input, sharedSecret) {
    const canonicalPayload = buildProxySigningPayload(input);
    const digest = createHmac('sha256', sharedSecret)
        .update(canonicalPayload)
        .digest('hex');
    return `sha256=${digest}`;
}
export function buildProxySigningPayload(input) {
    return [
        input.method.toUpperCase(),
        input.pathWithQuery,
        String(input.timestampMs),
        sha256Hex(input.rawBody ?? ''),
    ].join('\n');
}
function sha256Hex(value) {
    return createHash('sha256').update(value).digest('hex');
}
function getSingleHeaderValue(value) {
    if (typeof value === 'string') {
        return value;
    }
    if (Array.isArray(value)) {
        return value[0] ?? null;
    }
    return null;
}
