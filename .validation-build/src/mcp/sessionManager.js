import { randomUUID } from 'node:crypto';
export function createMcpSessionManager(config) {
    const sessions = new Map();
    const now = config.now ?? Date.now;
    const createSessionId = config.createSessionId ?? randomUUID;
    function createSession(response) {
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
        const session = {
            id: sessionId,
            createdAt,
            lastSeenAt: createdAt,
            initialized: false,
            response,
            heartbeatTimer,
        };
        sessions.set(sessionId, session);
        bindResponseLifecycle(sessionId, response);
        config.onSessionCreated?.(toSnapshot(session));
        return session;
    }
    function getSession(sessionId) {
        return sessions.get(sessionId) ?? null;
    }
    function touchSession(sessionId) {
        const session = sessions.get(sessionId);
        if (!session) {
            return null;
        }
        session.lastSeenAt = now();
        return session;
    }
    function markInitialized(sessionId) {
        const session = sessions.get(sessionId);
        if (!session) {
            return false;
        }
        session.initialized = true;
        session.lastSeenAt = now();
        return true;
    }
    function closeSession(sessionId, reason) {
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
    function closeAll(reason) {
        for (const sessionId of sessions.keys()) {
            closeSession(sessionId, reason);
        }
    }
    function getSessionSnapshot(sessionId) {
        const session = sessions.get(sessionId);
        return session ? toSnapshot(session) : null;
    }
    function getSessionCount() {
        return sessions.size;
    }
    function bindResponseLifecycle(sessionId, response) {
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
        closeSession,
        closeAll,
        getSessionSnapshot,
        getSessionCount,
    };
}
function toSnapshot(session) {
    return {
        id: session.id,
        createdAt: session.createdAt,
        lastSeenAt: session.lastSeenAt,
        initialized: session.initialized,
    };
}
