import assert from 'node:assert/strict';
import test from 'node:test';
import { computeProxyRequestSignature, verifyProxyRequest, } from '../../src/auth/verifyProxyRequest.js';
const SHARED_SECRET = 'test-proxy-secret';
const FIXED_NOW = 1_700_000_000_000;
test('verifyProxyRequest accepts a fresh valid signature', () => {
    const rawBody = JSON.stringify({ ok: true });
    const timestampMs = FIXED_NOW;
    const signature = computeProxyRequestSignature({
        method: 'POST',
        pathWithQuery: '/internal/execute',
        timestampMs,
        rawBody,
    }, SHARED_SECRET);
    const result = verifyProxyRequest({
        method: 'POST',
        pathWithQuery: '/internal/execute',
        headers: {
            'x-proxy-timestamp': String(timestampMs),
            'x-proxy-signature': signature,
        },
        rawBody,
    }, {
        sharedSecret: SHARED_SECRET,
        maxSkewMs: 30_000,
        now: () => FIXED_NOW,
    });
    assert.deepEqual(result, {
        ok: true,
        timestampMs,
    });
});
test('verifyProxyRequest rejects an invalid signature', () => {
    const result = verifyProxyRequest({
        method: 'GET',
        pathWithQuery: '/internal/mcp/sse',
        headers: {
            'x-proxy-timestamp': String(FIXED_NOW),
            'x-proxy-signature': 'sha256=not-valid',
        },
    }, {
        sharedSecret: SHARED_SECRET,
        maxSkewMs: 30_000,
        now: () => FIXED_NOW,
    });
    assert.equal(result.ok, false);
    assert.equal(result.statusCode, 403);
    assert.equal(result.errorCode, 'proxy_auth_invalid');
});
test('verifyProxyRequest rejects stale timestamps', () => {
    const rawBody = JSON.stringify({ ok: true });
    const staleTimestamp = FIXED_NOW - 60_000;
    const signature = computeProxyRequestSignature({
        method: 'POST',
        pathWithQuery: '/internal/preview',
        timestampMs: staleTimestamp,
        rawBody,
    }, SHARED_SECRET);
    const result = verifyProxyRequest({
        method: 'POST',
        pathWithQuery: '/internal/preview',
        headers: {
            'x-proxy-timestamp': String(staleTimestamp),
            'x-proxy-signature': signature,
        },
        rawBody,
    }, {
        sharedSecret: SHARED_SECRET,
        maxSkewMs: 10_000,
        now: () => FIXED_NOW,
    });
    assert.equal(result.ok, false);
    assert.equal(result.statusCode, 401);
    assert.equal(result.errorCode, 'proxy_auth_stale');
});
