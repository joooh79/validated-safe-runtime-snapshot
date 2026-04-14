import { randomUUID } from 'node:crypto';
import type { ServerResponse } from 'node:http';

export interface McpSessionRecord {
  id: string;
  createdAt: number;
  lastSeenAt: number;
  initialized: boolean;
  response: ServerResponse;
  heartbeatTimer: NodeJS.Timeout;
  previewState: McpSessionPreviewState | null;
}

export interface McpSessionSnapshot {
  id: string;
  createdAt: number;
  lastSeenAt: number;
  initialized: boolean;
}

export interface McpSessionPreviewState {
  payloadFingerprint: string;
  executeAllowed: boolean;
  terminalStatus: string;
  updatedAt: number;
}

export interface McpSessionManagerConfig {
  sessionTtlMs: number;
  heartbeatIntervalMs: number;
  now?: () => number;
  createSessionId?: () => string;
  onSessionCreated?: (session: McpSessionSnapshot) => void;
  onSessionClosed?: (
    session: McpSessionSnapshot,
    reason: string,
  ) => void;
}

export interface McpSessionManager {
  createSession(response: ServerResponse): McpSessionRecord;
  getSession(sessionId: string): McpSessionRecord | null;
  touchSession(sessionId: string): McpSessionRecord | null;
  markInitialized(sessionId: string): boolean;
  setPreviewState(sessionId: string, previewState: McpSessionPreviewState): boolean;
  getPreviewState(sessionId: string): McpSessionPreviewState | null;
  clearPreviewState(sessionId: string): boolean;
  closeSession(sessionId: string, reason: string): boolean;
  closeAll(reason: string): void;
  getSessionSnapshot(sessionId: string): McpSessionSnapshot | null;
  getSessionCount(): number;
}

export function createMcpSessionManager(
  config: McpSessionManagerConfig,
): McpSessionManager {
  const sessions = new Map<string, McpSessionRecord>();
  const now = config.now ?? Date.now;
  const createSessionId = config.createSessionId ?? randomUUID;

  function createSession(response: ServerResponse): McpSessionRecord {
    const sessionId = createSessionId();
    const createdAt = now();
    const heartbeatTimer = setInterval(() => {
      const current = sessions.get(sessionId);
      if (!current) {
        return;
      }

      if (current.response.writableEnded) {
        closeSession(sessionId, 'response_closed');
        return;
      }

      if (now() - current.lastSeenAt > config.sessionTtlMs) {
        closeSession(sessionId, 'idle_ttl_expired');
        return;
      }

      current.response.write(': keep-alive\n\n');
    }, config.heartbeatIntervalMs);
    heartbeatTimer.unref?.();

    const session: McpSessionRecord = {
      id: sessionId,
      createdAt,
      lastSeenAt: createdAt,
      initialized: false,
      response,
      heartbeatTimer,
      previewState: null,
    };

    sessions.set(sessionId, session);
    bindResponseLifecycle(sessionId, response);
    config.onSessionCreated?.(toSnapshot(session));

    return session;
  }

  function getSession(sessionId: string): McpSessionRecord | null {
    return sessions.get(sessionId) ?? null;
  }

  function touchSession(sessionId: string): McpSessionRecord | null {
    const session = sessions.get(sessionId);
    if (!session) {
      return null;
    }

    session.lastSeenAt = now();
    return session;
  }

  function markInitialized(sessionId: string): boolean {
    const session = sessions.get(sessionId);
    if (!session) {
      return false;
    }

    session.initialized = true;
    session.lastSeenAt = now();
    return true;
  }

  function setPreviewState(
    sessionId: string,
    previewState: McpSessionPreviewState,
  ): boolean {
    // PHASE 4 DIAGNOSTIC: Log preview state storage
    const session = sessions.get(sessionId);
    if (!session) {
      console.log('[MCP-PHASE-4] setPreviewState failed - session not found:', {
        sessionId,
        sessionsMapSize: sessions.size,
        timestamp: new Date().toISOString(),
      });
      return false;
    }

    session.previewState = previewState;
    session.lastSeenAt = now();
    
    console.log('[MCP-PHASE-4] setPreviewState success:', {
      sessionId,
      executeAllowed: previewState.executeAllowed,
      terminalStatus: previewState.terminalStatus,
      payloadFingerprintLength: previewState.payloadFingerprint.length,
      sessionsMapSize: sessions.size,
      timestamp: new Date().toISOString(),
    });
    
    return true;
  }

  function getPreviewState(sessionId: string): McpSessionPreviewState | null {
    // PHASE 4 DIAGNOSTIC: Log preview state retrieval
    const session = sessions.get(sessionId);
    if (!session) {
      console.log('[MCP-PHASE-4] getPreviewState failed - session not found:', {
        sessionId,
        sessionsMapSize: sessions.size,
        availableSessionIds: Array.from(sessions.keys()),
        timestamp: new Date().toISOString(),
      });
      return null;
    }

    session.lastSeenAt = now();
    const previewState = session.previewState;
    
    console.log('[MCP-PHASE-4] getPreviewState success:', {
      sessionId,
      hasPreviewState: previewState !== null,
      previewStateSnapshot: previewState ? {
        executeAllowed: previewState.executeAllowed,
        terminalStatus: previewState.terminalStatus,
        payloadFingerprintLength: previewState.payloadFingerprint.length,
      } : null,
      sessionsMapSize: sessions.size,
      timestamp: new Date().toISOString(),
    });
    
    return previewState;
  }

  function clearPreviewState(sessionId: string): boolean {
    const session = sessions.get(sessionId);
    if (!session) {
      return false;
    }

    session.previewState = null;
    session.lastSeenAt = now();
    return true;
  }

  function closeSession(sessionId: string, reason: string): boolean {
    const session = sessions.get(sessionId);
    if (!session) {
      return false;
    }

    sessions.delete(sessionId);
    clearInterval(session.heartbeatTimer);

    if (!session.response.writableEnded) {
      session.response.end();
    }

    config.onSessionClosed?.(toSnapshot(session), reason);
    return true;
  }

  function closeAll(reason: string): void {
    for (const sessionId of sessions.keys()) {
      closeSession(sessionId, reason);
    }
  }

  function getSessionSnapshot(sessionId: string): McpSessionSnapshot | null {
    const session = sessions.get(sessionId);
    return session ? toSnapshot(session) : null;
  }

  function getSessionCount(): number {
    return sessions.size;
  }

  function bindResponseLifecycle(
    sessionId: string,
    response: ServerResponse,
  ): void {
    response.on('close', () => {
      closeSession(sessionId, 'response_close_event');
    });

    response.on('finish', () => {
      closeSession(sessionId, 'response_finish_event');
    });

    response.on('error', () => {
      closeSession(sessionId, 'response_error_event');
    });
  }

  return {
    createSession,
    getSession,
    touchSession,
    markInitialized,
    setPreviewState,
    getPreviewState,
    clearPreviewState,
    closeSession,
    closeAll,
    getSessionSnapshot,
    getSessionCount,
  };
}

function toSnapshot(session: McpSessionRecord): McpSessionSnapshot {
  return {
    id: session.id,
    createdAt: session.createdAt,
    lastSeenAt: session.lastSeenAt,
    initialized: session.initialized,
  };
}
