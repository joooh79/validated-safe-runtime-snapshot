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

import type {
  DirectWriteProvider,
  ProviderExecutionContext,
  ProviderPlanPreflightResult,
} from '../../types/provider.js';
import type { WriteAction } from '../../types/write-plan.js';
import type { ActionExecutionResult } from '../../types/execution.js';
import type { WritePlan } from '../../types/write-plan.js';
import { mapPatientAction } from './buildPayload/mapPatientAction.js';
import { mapVisitAction } from './buildPayload/mapVisitAction.js';
import { mapCaseAction } from './buildPayload/mapCaseAction.js';
import { mapLinkAction } from './buildPayload/mapLinkAction.js';
import { mapSnapshotAction } from './buildPayload/mapSnapshotAction.js';
import { mapFollowUpAction } from './buildPayload/mapFollowUpAction.js';
import { getUnsupportedActionError } from './buildPayload/handleUnsupportedAction.js';
import { createDefaultMappingRegistry } from './mappingRegistry.js';
import { getErrorMessage } from './errors.js';

export interface AirtableProviderConfig {
  baseId: string;
  apiToken: string;
  requestExecutor: 'real' | 'dryrun' | 'mock';
  apiBaseUrl?: string;
  mappingRegistry?: ReturnType<typeof createDefaultMappingRegistry>;
}

export interface RequestExecutor {
  execute(request: CreateRequest | UpdateRequest): Promise<ExecutorResponse>;
}

export interface CreateRequest {
  type: 'create';
  table: string;
  fields: Record<string, unknown>;
}

export interface UpdateRequest {
  type: 'update';
  table: string;
  recordId: string;
  fields: Record<string, unknown>;
}

export interface ExecutorResponse {
  success: boolean;
  recordId?: string;
  error?: string;
}

/**
 * Create an Airtable provider
 */
export function createAirtableProvider(
  config: AirtableProviderConfig,
  requestExecutor?: RequestExecutor,
): DirectWriteProvider {
  const registry = config.mappingRegistry || createDefaultMappingRegistry();
  const resolvedRequestExecutor =
    requestExecutor ??
    (config.requestExecutor === 'real'
      ? createFetchRequestExecutor(config)
      : undefined);

  return {
    async preflightPlan(
      plan: WritePlan,
      ctx: ProviderExecutionContext,
    ): Promise<ProviderPlanPreflightResult> {
      const blockedActionIds: string[] = [];
      const reasons: string[] = [];

      for (const action of plan.actions) {
        if (action.actionType.startsWith('no_op')) {
          continue;
        }

        const validationError = getActionMappingError(
          action,
          registry,
          config.requestExecutor !== 'real',
        );
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
    async executeAction(
      action: WriteAction,
      ctx: ProviderExecutionContext,
    ): Promise<ActionExecutionResult> {
      try {
        const hydratedAction = await hydrateActionTargetRefs(
          action,
          config,
          registry,
        );

        // Handle no-op actions
        if (hydratedAction.actionType.startsWith('no_op')) {
          return {
            actionId: hydratedAction.actionId,
            actionType: hydratedAction.actionType,
            status: 'no_op',
          };
        }

        if (hydratedAction.actionType === 'attach_existing_patient') {
          return {
            actionId: hydratedAction.actionId,
            actionType: hydratedAction.actionType,
            status: 'success',
            providerRef:
              hydratedAction.target.entityRef ||
              hydratedAction.target.patientId ||
              hydratedAction.actionId,
          };
        }

        if (
          hydratedAction.entityType === 'patient' &&
          hydratedAction.actionType === 'update_patient' &&
          (!hydratedAction.target.entityRef || hydratedAction.target.entityRef === 'NEW')
        ) {
          return {
            actionId: hydratedAction.actionId,
            actionType: hydratedAction.actionType,
            status: 'failed',
            errorMessage: `Unable to resolve Airtable patient record id for patient ${hydratedAction.target.patientId}.`,
          };
        }

        // Map action to Airtable request based on entity type.
        // The migrated Airtable schema is now known.
        // The runtime keeps snapshot updates narrow: PRE remains active, and
        // PLAN / DR / DX / RAD / OP updates are active only on same-date flows
        // with an explicit existing row target. Broader Case/link semantics
        // still stay fail-closed.
        const validationError = getActionMappingError(
          hydratedAction,
          registry,
          config.requestExecutor !== 'real',
        );
        if (validationError) {
          const errorMsg = getErrorMessage(validationError);
          return {
            actionId: hydratedAction.actionId,
            actionType: hydratedAction.actionType,
            status: 'failed',
            errorMessage: errorMsg,
          };
        }

        let mapResult;

        if (hydratedAction.entityType === 'patient') {
          mapResult = mapPatientAction({ action: hydratedAction, registry });
        } else if (hydratedAction.entityType === 'visit') {
          mapResult = mapVisitAction({
            action: hydratedAction,
            registry,
            resolvedRefs: ctx.resolvedRefs,
            requireRuntimeRefs: true,
          });
        } else if (hydratedAction.entityType === 'case') {
          mapResult = mapCaseAction({
            action: hydratedAction,
            registry,
            resolvedRefs: ctx.resolvedRefs,
            requireRuntimeRefs: true,
          });
        } else if (hydratedAction.entityType === 'link') {
          mapResult = mapLinkAction({
            action: hydratedAction,
            registry,
            resolvedRefs: ctx.resolvedRefs,
            requireRuntimeRefs: true,
          });
        } else if (hydratedAction.entityType === 'follow_up') {
          mapResult = mapFollowUpAction({
            action: hydratedAction,
            registry,
            resolvedRefs: ctx.resolvedRefs,
            requireRuntimeRefs: true,
          });
        } else {
          mapResult = mapSnapshotAction({
            action: hydratedAction,
            registry,
            resolvedRefs: ctx.resolvedRefs,
            requireRuntimeRefs: true,
          });
          if (
            !mapResult.success &&
            canUseAbstractSameDateSnapshotUpdate(
              hydratedAction,
              config.requestExecutor !== 'real',
            )
          ) {
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
          const mapError =
            mapResult.error ?? getUnsupportedActionError(hydratedAction);
          const errorMsg = getErrorMessage(mapError);
          return {
            actionId: hydratedAction.actionId,
            actionType: hydratedAction.actionType,
            status: 'failed',
            errorMessage: errorMsg,
          };
        }

        // In dry-run mode, return success without executing
        if (config.requestExecutor === 'dryrun') {
          return {
            actionId: hydratedAction.actionId,
            actionType: hydratedAction.actionType,
            status: 'success',
            providerRef: `simulated_${hydratedAction.actionId}`,
          };
        }

        // In mock mode, return success without executing
        if (config.requestExecutor === 'mock') {
          return {
            actionId: hydratedAction.actionId,
            actionType: hydratedAction.actionType,
            status: 'success',
            providerRef: `mock_${hydratedAction.actionId}`,
          };
        }

        // Execute through request executor if available
        if (!resolvedRequestExecutor) {
          return {
            actionId: hydratedAction.actionId,
            actionType: hydratedAction.actionType,
            status: 'failed',
            errorMessage: 'No request executor configured',
          };
        }

        // Build request
        const request =
          'recordId' in mapResult.request
            ? {
                type: 'update' as const,
                table: mapResult.request.table,
                recordId: mapResult.request.recordId,
                fields: mapResult.request.fields,
              }
            : {
                type: 'create' as const,
                table: mapResult.request.table,
                fields: mapResult.request.fields,
              };

        // Execute request
        const response = await resolvedRequestExecutor.execute(request);

        if (!response.success) {
          return {
            actionId: hydratedAction.actionId,
            actionType: hydratedAction.actionType,
            status: 'failed',
            errorMessage: response.error || 'Unknown provider error',
          };
        }

        return {
          actionId: hydratedAction.actionId,
          actionType: hydratedAction.actionType,
          status: 'success',
          providerRef: response.recordId || hydratedAction.actionId,
        };
      } catch (err) {
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

async function hydrateActionTargetRefs(
  action: WriteAction,
  config: AirtableProviderConfig,
  registry: ReturnType<typeof createDefaultMappingRegistry>,
): Promise<WriteAction> {
  if (
    config.requestExecutor !== 'real' ||
    action.entityType !== 'patient' ||
    action.actionType !== 'update_patient'
  ) {
    return action;
  }

  if (action.target.entityRef && action.target.entityRef !== 'NEW') {
    return action;
  }

  const patientId = action.target.patientId?.trim();
  if (!patientId || patientId === 'NEW') {
    return action;
  }

  const recordId = await resolveRecordIdByFieldValue({
    config,
    tableName: 'Patients',
    fieldName: registry.patientFields.patientId.fieldName,
    fieldValue: patientId,
  });

  if (!recordId) {
    return action;
  }

  return {
    ...action,
    target: {
      ...action.target,
      entityRef: recordId,
    },
  };
}

async function resolveRecordIdByFieldValue(input: {
  config: AirtableProviderConfig;
  tableName: string;
  fieldName: string;
  fieldValue: string;
}): Promise<string | undefined> {
  const { config, tableName, fieldName, fieldValue } = input;
  const apiBaseUrl = (config.apiBaseUrl ?? 'https://api.airtable.com/v0').replace(/\/$/, '');
  const url = new URL(
    `${apiBaseUrl}/${encodeURIComponent(config.baseId)}/${encodeURIComponent(tableName)}`,
  );
  url.searchParams.set('filterByFormula', `{${fieldName}}='${escapeFormulaString(fieldValue)}'`);
  url.searchParams.set('maxRecords', '1');
  url.searchParams.append('fields[]', fieldName);

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${config.apiToken}`,
    },
  });

  const responseBody = await parseExecutorResponseBody(response);
  if (!response.ok || !isExecutorRecord(responseBody)) {
    return undefined;
  }

  const records = responseBody.records;
  if (!Array.isArray(records)) {
    return undefined;
  }

  const firstRecord = records[0];
  if (!isExecutorRecord(firstRecord) || typeof firstRecord.id !== 'string') {
    return undefined;
  }

  return firstRecord.id;
}

function escapeFormulaString(value: string): string {
  return value.replaceAll('\\', '\\\\').replaceAll("'", "\\'");
}

function createFetchRequestExecutor(
  config: AirtableProviderConfig,
): RequestExecutor {
  const apiBaseUrl = (config.apiBaseUrl ?? 'https://api.airtable.com/v0').replace(/\/$/, '');

  return {
    async execute(request: CreateRequest | UpdateRequest): Promise<ExecutorResponse> {
      const url =
        request.type === 'update'
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

        const recordId =
          isExecutorRecord(responseBody) && typeof responseBody.id === 'string'
            ? responseBody.id
            : undefined;

        return {
          success: true,
          ...(recordId ? { recordId } : {}),
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
  };
}

async function parseExecutorResponseBody(
  response: Response,
): Promise<unknown> {
  const rawBody = await response.text();
  if (!rawBody.trim()) {
    return null;
  }

  try {
    return JSON.parse(rawBody) as unknown;
  } catch {
    return rawBody;
  }
}

function extractExecutorError(
  response: Response,
  responseBody: unknown,
): string {
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

function isExecutorRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Create a mock Airtable provider for testing
 */
export function createMockAirtableProvider(): DirectWriteProvider {
  return createAirtableProvider({
    baseId: 'mock_base_id',
    apiToken: 'mock_api_token',
    requestExecutor: 'mock',
  });
}

/**
 * Create a dry-run Airtable provider (validates but doesn't execute)
 */
export function createDryRunAirtableProvider(): DirectWriteProvider {
  return createAirtableProvider({
    baseId: 'dryrun_base_id',
    apiToken: 'dryrun_api_token',
    requestExecutor: 'dryrun',
  });
}

function getActionMappingError(
  action: WriteAction,
  registry: ReturnType<typeof createDefaultMappingRegistry>,
  allowAbstractSameDateSnapshotUpdate: boolean,
) {
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
    if (
      !mapResult.success &&
      canUseAbstractSameDateSnapshotUpdate(
        action,
        allowAbstractSameDateSnapshotUpdate,
      )
    ) {
      return null;
    }
    return mapResult.success ? null : mapResult.error;
  }

  return getUnsupportedActionError(action);
}

function canUseAbstractSameDateSnapshotUpdate(
  action: WriteAction,
  allowAbstractSameDateSnapshotUpdate: boolean,
): boolean {
  // Keep this narrow. It exists only to preserve the current validated PRE
  // same-date correction path while broader target-canon activation remains
  // intentionally blocked.
  return (
    allowAbstractSameDateSnapshotUpdate &&
    action.actionType === 'update_snapshot' &&
    action.target.branch === 'PRE' &&
    (!action.target.entityRef || action.target.entityRef === 'NEW')
  );
}
