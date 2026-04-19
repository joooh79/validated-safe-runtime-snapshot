/**
 * Airtable Provider Factory
 *
 * Creates a DirectWriteProvider instance that translates provider-neutral
 * WriteActions to Airtable API requests through the mapping registry.
 *
 * Design:
 * - Fail-closed: errors on unmapped/unverified actions
 * - Dependency-injected: testable without real HTTP
 * - Provider-neutral boundary: keeps Airtable logic contained
 *
 * Canon-aware runtime boundary:
 * - the repo now has a broader target schema canon for future alignment
 * - this provider remains intentionally limited to the currently validated safe
 *   slice until activation work is done explicitly
 */
import { mapPatientAction } from './buildPayload/mapPatientAction.js';
import { mapVisitAction } from './buildPayload/mapVisitAction.js';
import { mapCaseAction } from './buildPayload/mapCaseAction.js';
import { mapLinkAction } from './buildPayload/mapLinkAction.js';
import { mapSnapshotAction } from './buildPayload/mapSnapshotAction.js';
import { mapFollowUpAction } from './buildPayload/mapFollowUpAction.js';
import { getUnsupportedActionError } from './buildPayload/handleUnsupportedAction.js';
import { createDefaultMappingRegistry } from './mappingRegistry.js';
import { getErrorMessage } from './errors.js';
/**
 * Create an Airtable provider
 */
export function createAirtableProvider(config, requestExecutor) {
    const registry = config.mappingRegistry || createDefaultMappingRegistry();
    const resolvedRequestExecutor = requestExecutor ??
        (config.requestExecutor === 'real'
            ? createFetchRequestExecutor(config)
            : undefined);
    return {
        async preflightPlan(plan, ctx) {
            const blockedActionIds = [];
            const reasons = [];
            for (const action of plan.actions) {
                if (action.actionType.startsWith('no_op')) {
                    continue;
                }
                const validationError = getActionMappingError(action, registry, config.requestExecutor !== 'real');
                if (!validationError) {
                    continue;
                }
                blockedActionIds.push(action.actionId);
                reasons.push(`${action.actionType}: ${getErrorMessage(validationError)}`);
            }
            if (blockedActionIds.length > 0) {
                return {
                    ok: false,
                    reason: reasons.join(' | '),
                    blockedActionIds,
                };
            }
            return { ok: true };
        },
        async executeAction(action, ctx) {
            try {
                // Handle no-op actions
                if (action.actionType.startsWith('no_op')) {
                    return {
                        actionId: action.actionId,
                        actionType: action.actionType,
                        status: 'no_op',
                    };
                }
                if (action.actionType === 'attach_existing_patient') {
                    return {
                        actionId: action.actionId,
                        actionType: action.actionType,
                        status: 'success',
                        providerRef: action.target.entityRef || action.target.patientId || action.actionId,
                    };
                }
                // Map action to Airtable request based on entity type.
                // The migrated Airtable schema is now known.
                // The runtime keeps snapshot updates narrow: PRE remains active, and
                // PLAN / DR / DX / RAD / OP updates are active only on same-date flows
                // with an explicit existing row target. Broader Case/link semantics
                // still stay fail-closed.
                const validationError = getActionMappingError(action, registry, config.requestExecutor !== 'real');
                if (validationError) {
                    const errorMsg = getErrorMessage(validationError);
                    return {
                        actionId: action.actionId,
                        actionType: action.actionType,
                        status: 'failed',
                        errorMessage: errorMsg,
                    };
                }
                let mapResult;
                if (action.entityType === 'patient') {
                    mapResult = mapPatientAction({ action, registry });
                }
                else if (action.entityType === 'visit') {
                    mapResult = mapVisitAction({
                        action,
                        registry,
                        resolvedRefs: ctx.resolvedRefs,
                        requireRuntimeRefs: true,
                    });
                }
                else if (action.entityType === 'case') {
                    mapResult = mapCaseAction({
                        action,
                        registry,
                        resolvedRefs: ctx.resolvedRefs,
                        requireRuntimeRefs: true,
                    });
                }
                else if (action.entityType === 'link') {
                    mapResult = mapLinkAction({
                        action,
                        registry,
                        resolvedRefs: ctx.resolvedRefs,
                        requireRuntimeRefs: true,
                    });
                }
                else if (action.entityType === 'follow_up') {
                    mapResult = mapFollowUpAction({
                        action,
                        registry,
                        resolvedRefs: ctx.resolvedRefs,
                        requireRuntimeRefs: true,
                    });
                }
                else {
                    mapResult = mapSnapshotAction({
                        action,
                        registry,
                        resolvedRefs: ctx.resolvedRefs,
                        requireRuntimeRefs: true,
                    });
                    if (!mapResult.success &&
                        canUseAbstractSameDateSnapshotUpdate(action, config.requestExecutor !== 'real')) {
                        mapResult = {
                            success: true,
                            request: {
                                // This dryrun/mock-only escape hatch preserves the validated
                                // same-date PRE update baseline using the migrated PRE table
                                // label. It is not a statement that broader snapshot or Case
                                // activation has happened.
                                table: 'Pre-op Clinical Findings',
                                fields: {},
                            },
                        };
                    }
                }
                // Check if mapping failed
                if (!mapResult.success) {
                    const mapError = mapResult.error ?? getUnsupportedActionError(action);
                    const errorMsg = getErrorMessage(mapError);
                    return {
                        actionId: action.actionId,
                        actionType: action.actionType,
                        status: 'failed',
                        errorMessage: errorMsg,
                    };
                }
                // In dry-run mode, return success without executing
                if (config.requestExecutor === 'dryrun') {
                    return {
                        actionId: action.actionId,
                        actionType: action.actionType,
                        status: 'success',
                        providerRef: `simulated_${action.actionId}`,
                    };
                }
                // In mock mode, return success without executing
                if (config.requestExecutor === 'mock') {
                    return {
                        actionId: action.actionId,
                        actionType: action.actionType,
                        status: 'success',
                        providerRef: `mock_${action.actionId}`,
                    };
                }
                // Execute through request executor if available
                if (!resolvedRequestExecutor) {
                    return {
                        actionId: action.actionId,
                        actionType: action.actionType,
                        status: 'failed',
                        errorMessage: 'No request executor configured',
                    };
                }
                // Build request
                const request = 'recordId' in mapResult.request
                    ? {
                        type: 'update',
                        table: mapResult.request.table,
                        recordId: mapResult.request.recordId,
                        fields: mapResult.request.fields,
                    }
                    : {
                        type: 'create',
                        table: mapResult.request.table,
                        fields: mapResult.request.fields,
                    };
                // Execute request
                const response = await resolvedRequestExecutor.execute(request);
                if (!response.success) {
                    return {
                        actionId: action.actionId,
                        actionType: action.actionType,
                        status: 'failed',
                        errorMessage: response.error || 'Unknown provider error',
                    };
                }
                return {
                    actionId: action.actionId,
                    actionType: action.actionType,
                    status: 'success',
                    providerRef: response.recordId || action.actionId,
                };
            }
            catch (err) {
                return {
                    actionId: action.actionId,
                    actionType: action.actionType,
                    status: 'failed',
                    errorMessage: err instanceof Error ? err.message : String(err),
                };
            }
        },
    };
}
function createFetchRequestExecutor(config) {
    const apiBaseUrl = (config.apiBaseUrl ?? 'https://api.airtable.com/v0').replace(/\/$/, '');
    return {
        async execute(request) {
            const url = request.type === 'update'
                ? `${apiBaseUrl}/${encodeURIComponent(config.baseId)}/${encodeURIComponent(request.table)}/${encodeURIComponent(request.recordId)}`
                : `${apiBaseUrl}/${encodeURIComponent(config.baseId)}/${encodeURIComponent(request.table)}`;
            try {
                const response = await fetch(url, {
                    method: request.type === 'update' ? 'PATCH' : 'POST',
                    headers: {
                        Authorization: `Bearer ${config.apiToken}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        fields: request.fields,
                    }),
                });
                const responseBody = await parseExecutorResponseBody(response);
                if (!response.ok) {
                    return {
                        success: false,
                        error: extractExecutorError(response, responseBody),
                    };
                }
                const recordId = isExecutorRecord(responseBody) && typeof responseBody.id === 'string'
                    ? responseBody.id
                    : undefined;
                return {
                    success: true,
                    ...(recordId ? { recordId } : {}),
                };
            }
            catch (error) {
                return {
                    success: false,
                    error: error instanceof Error ? error.message : String(error),
                };
            }
        },
    };
}
async function parseExecutorResponseBody(response) {
    const rawBody = await response.text();
    if (!rawBody.trim()) {
        return null;
    }
    try {
        return JSON.parse(rawBody);
    }
    catch {
        return rawBody;
    }
}
function extractExecutorError(response, responseBody) {
    if (isExecutorRecord(responseBody)) {
        const nestedError = responseBody.error;
        if (isExecutorRecord(nestedError) && typeof nestedError.message === 'string') {
            return nestedError.message;
        }
        if (typeof responseBody.message === 'string') {
            return responseBody.message;
        }
    }
    if (typeof responseBody === 'string' && responseBody.trim()) {
        return responseBody;
    }
    return `Airtable request failed with status ${response.status}.`;
}
function isExecutorRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
/**
 * Create a mock Airtable provider for testing
 */
export function createMockAirtableProvider() {
    return createAirtableProvider({
        baseId: 'mock_base_id',
        apiToken: 'mock_api_token',
        requestExecutor: 'mock',
    });
}
/**
 * Create a dry-run Airtable provider (validates but doesn't execute)
 */
export function createDryRunAirtableProvider() {
    return createAirtableProvider({
        baseId: 'dryrun_base_id',
        apiToken: 'dryrun_api_token',
        requestExecutor: 'dryrun',
    });
}
function getActionMappingError(action, registry, allowAbstractSameDateSnapshotUpdate) {
    if (action.actionType.startsWith('no_op')) {
        return null;
    }
    if (action.entityType === 'patient') {
        const mapResult = mapPatientAction({ action, registry });
        return mapResult.success ? null : mapResult.error;
    }
    if (action.entityType === 'visit') {
        const mapResult = mapVisitAction({
            action,
            registry,
            requireRuntimeRefs: false,
        });
        return mapResult.success ? null : mapResult.error;
    }
    if (action.entityType === 'case') {
        const mapResult = mapCaseAction({
            action,
            registry,
            requireRuntimeRefs: false,
        });
        return mapResult.success ? null : mapResult.error;
    }
    if (action.entityType === 'link') {
        const mapResult = mapLinkAction({
            action,
            registry,
            requireRuntimeRefs: false,
        });
        return mapResult.success ? null : mapResult.error;
    }
    if (action.entityType === 'follow_up') {
        const mapResult = mapFollowUpAction({
            action,
            registry,
            requireRuntimeRefs: false,
        });
        return mapResult.success ? null : mapResult.error;
    }
    if (action.entityType === 'snapshot') {
        const mapResult = mapSnapshotAction({
            action,
            registry,
            requireRuntimeRefs: false,
        });
        if (!mapResult.success &&
            canUseAbstractSameDateSnapshotUpdate(action, allowAbstractSameDateSnapshotUpdate)) {
            return null;
        }
        return mapResult.success ? null : mapResult.error;
    }
    return getUnsupportedActionError(action);
}
function canUseAbstractSameDateSnapshotUpdate(action, allowAbstractSameDateSnapshotUpdate) {
    // Keep this narrow. It exists only to preserve the current validated PRE
    // same-date correction path while broader target-canon activation remains
    // intentionally blocked.
    return (allowAbstractSameDateSnapshotUpdate &&
        action.actionType === 'update_snapshot' &&
        action.target.branch === 'PRE' &&
        (!action.target.entityRef || action.target.entityRef === 'NEW'));
}
