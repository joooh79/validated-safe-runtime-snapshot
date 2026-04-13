import type { ApiProviderConfig } from '../types/api.js';

const DEFAULT_PORT = 10000;
const DEFAULT_PROXY_MAX_SKEW_MS = 5 * 60 * 1000;
const DEFAULT_MCP_SESSION_TTL_MS = 10 * 60 * 1000;
const DEFAULT_MCP_HEARTBEAT_INTERVAL_MS = 15 * 1000;

export interface ProxyAuthEnvConfig {
  trustProxyAuth: boolean;
  sharedSecret: string | null;
  maxSkewMs: number;
}

export interface McpEnvConfig {
  sessionTtlMs: number;
  heartbeatIntervalMs: number;
}

export interface ServerEnvConfig {
  port: number;
  defaultProviderConfig: ApiProviderConfig;
  proxyAuth: ProxyAuthEnvConfig;
  mcp: McpEnvConfig;
}

export function resolveServerEnv(
  env: NodeJS.ProcessEnv = process.env,
): ServerEnvConfig {
  const port = parsePositiveInteger(env.PORT, DEFAULT_PORT, 'PORT');
  const trustProxyAuth = parseBoolean(env.TRUST_PROXY_AUTH, true, 'TRUST_PROXY_AUTH');
  const proxySharedSecret = normalizeOptionalString(env.PROXY_SHARED_SECRET);
  const maxSkewMs = parsePositiveInteger(
    env.PROXY_MAX_SKEW_MS,
    DEFAULT_PROXY_MAX_SKEW_MS,
    'PROXY_MAX_SKEW_MS',
  );
  const sessionTtlMs = parsePositiveInteger(
    env.MCP_SESSION_TTL_MS,
    DEFAULT_MCP_SESSION_TTL_MS,
    'MCP_SESSION_TTL_MS',
  );
  const heartbeatIntervalMs = parsePositiveInteger(
    env.MCP_HEARTBEAT_INTERVAL_MS,
    DEFAULT_MCP_HEARTBEAT_INTERVAL_MS,
    'MCP_HEARTBEAT_INTERVAL_MS',
  );

  if (heartbeatIntervalMs >= sessionTtlMs) {
    throw new Error(
      'MCP_HEARTBEAT_INTERVAL_MS must be smaller than MCP_SESSION_TTL_MS.',
    );
  }

  if (trustProxyAuth && !proxySharedSecret) {
    throw new Error(
      'TRUST_PROXY_AUTH=true requires PROXY_SHARED_SECRET to be set.',
    );
  }

  return {
    port,
    defaultProviderConfig: resolveDefaultProviderConfig(env),
    proxyAuth: {
      trustProxyAuth,
      sharedSecret: proxySharedSecret,
      maxSkewMs,
    },
    mcp: {
      sessionTtlMs,
      heartbeatIntervalMs,
    },
  };
}

function resolveDefaultProviderConfig(
  env: NodeJS.ProcessEnv,
): ApiProviderConfig {
  const rawMode = env.AIRTABLE_MODE;

  if (
    rawMode !== undefined &&
    rawMode !== 'dryrun' &&
    rawMode !== 'mock' &&
    rawMode !== 'real'
  ) {
    throw new Error('AIRTABLE_MODE must be one of: dryrun, mock, real.');
  }

  if (rawMode === 'mock') {
    return {
      kind: 'airtable',
      mode: 'mock',
    };
  }

  const baseId = env.AIRTABLE_BASE_ID;
  const apiToken = env.AIRTABLE_API_TOKEN;

  if (rawMode === 'real') {
    if (!baseId || !apiToken) {
      throw new Error(
        'AIRTABLE_MODE=real requires AIRTABLE_BASE_ID and AIRTABLE_API_TOKEN.',
      );
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

function parsePositiveInteger(
  rawValue: string | undefined,
  defaultValue: number,
  envName: string,
): number {
  if (rawValue === undefined) {
    return defaultValue;
  }

  const parsed = Number(rawValue);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${envName} must be a positive integer.`);
  }

  return parsed;
}

function parseBoolean(
  rawValue: string | undefined,
  defaultValue: boolean,
  envName: string,
): boolean {
  if (rawValue === undefined) {
    return defaultValue;
  }

  if (rawValue === 'true') {
    return true;
  }

  if (rawValue === 'false') {
    return false;
  }

  throw new Error(`${envName} must be either "true" or "false".`);
}

function normalizeOptionalString(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}
