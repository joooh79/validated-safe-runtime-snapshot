/**
 * Case Action Payload Builder
 *
 * Stage 5 scope:
 * - create_case
 * - update_case_latest_synthesis for safe continuation on an existing case
 *
 * Still blocked:
 * - split_case
 * - close_case
 * - ambiguous reassignment
 * - explicit Case/Visit/Snapshot link writes beyond the minimal active scope
 */

import type { WriteAction } from '../../../types/write-plan.js';
import type { AirtableCreateRequest, AirtableUpdateRequest } from '../types.js';
import type { MappingRegistry } from '../mappingRegistry.js';
import type { AirtableAdapterError } from '../types.js';
import {
  canonConfirmRequiredError,
  unsupportedActionError,
} from '../errors.js';
import {
  normalizeDate,
  normalizeString,
} from './normalizeAirtableValue.js';
import { buildLinkedRecordCell } from './resolveLinkedRecordValue.js';

export interface MapCaseActionInput {
  action: WriteAction;
  registry: MappingRegistry;
  resolvedRefs?: Record<string, string>;
  requireRuntimeRefs?: boolean;
}

export type MapCaseActionOutput =
  | { success: true; request: AirtableCreateRequest | AirtableUpdateRequest }
  | { success: false; error: AirtableAdapterError };

export function mapCaseAction(input: MapCaseActionInput): MapCaseActionOutput {
  const {
    action,
    registry,
    resolvedRefs,
    requireRuntimeRefs = false,
  } = input;

  if (action.entityType !== 'case') {
    return {
      success: false,
      error: unsupportedActionError(action.actionType, 'not a case action'),
    };
  }

  switch (action.actionType) {
    case 'create_case':
      return mapCreateCase(
        action,
        registry,
        resolvedRefs,
        requireRuntimeRefs,
      );

    case 'update_case_latest_synthesis':
      return mapUpdateCaseLatestSynthesis(action, registry);

    case 'split_case':
    case 'close_case':
      return {
        success: false,
        error: canonConfirmRequiredError(
          `action_${action.actionType}`,
          'Cases',
          `${action.actionType} remains blocked pending explicit status-transition, lineage, and replay semantics`,
        ),
      };

    case 'no_op_case':
      return {
        success: true,
        request: {
          table: 'Cases',
          fields: {},
        },
      };

    default:
      return {
        success: false,
        error: unsupportedActionError(action.actionType, 'unknown case action'),
      };
  }
}

function mapCreateCase(
  action: WriteAction,
  registry: MappingRegistry,
  resolvedRefs?: Record<string, string>,
  requireRuntimeRefs = false,
): MapCaseActionOutput {
  const patientIdentity = normalizeString(action.target.patientId);
  if (isAdapterError(patientIdentity)) {
    return {
      success: false,
      error: canonConfirmRequiredError(
        'Cases.Patient ID',
        'Cases',
        'create_case currently requires a resolved patient identifier; create_case after unresolved/new patient creation remains blocked',
      ),
    };
  }

  if (patientIdentity === 'NEW') {
    return {
      success: false,
      error: canonConfirmRequiredError(
        'Cases.Patient ID',
        'Cases',
        'create_case currently requires an existing resolved patient identifier; chained create_patient -> create_case linking is still deferred',
      ),
    };
  }

  const toothNumber = normalizeString(action.target.toothNumber);
  if (isAdapterError(toothNumber)) {
    return {
      success: false,
      error: canonConfirmRequiredError(
        'Cases.Tooth number',
        'Cases',
        'create_case requires an exact single-tooth target',
      ),
    };
  }

  const episodeStartDate = normalizeDate(action.target.episodeStartDate);
  if (isAdapterError(episodeStartDate)) {
    return {
      success: false,
      error: canonConfirmRequiredError(
        'Cases.Episode start date',
        'Cases',
        'create_case requires an exact visit/episode start date in YYYY-MM-DD format',
      ),
    };
  }

  const patientLinkValue = buildLinkedRecordCell({
    dependencyActionId: action.dependsOnActionIds[0],
    resolvedRefs,
    requireRuntimeRefs,
    fallbackRef: action.target.patientId,
    canonField: 'Cases.Patient ID',
    table: 'Cases',
    missingRefMessage:
      'create_case requires a resolved patient record reference at execution time',
  });

  if (isAdapterError(patientLinkValue)) {
    return {
      success: false,
      error: patientLinkValue,
    };
  }

  const caseId = buildCaseId(patientIdentity, toothNumber, episodeStartDate);
  const latestVisitId = buildVisitId(patientIdentity, episodeStartDate);

  return {
    success: true,
    request: {
      table: 'Cases',
      fields: {
        [registry.caseFields.caseId.fieldName]: caseId,
        [registry.caseFields.patientId.fieldName]: patientLinkValue,
        [registry.caseFields.toothNumber.fieldName]: toothNumber,
        [registry.caseFields.episodeStartDate.fieldName]: episodeStartDate,
        [registry.caseFields.episodeStatus.fieldName]:
          registry.episodeStatusOptions.open,
        [registry.caseFields.latestVisitId.fieldName]: latestVisitId,
      },
    },
  };
}

function mapUpdateCaseLatestSynthesis(
  action: WriteAction,
  registry: MappingRegistry,
): MapCaseActionOutput {
  const recordId = action.target.caseId;
  if (!recordId || recordId === 'NEW') {
    return {
      success: false,
      error: canonConfirmRequiredError(
        'Cases.Case ID',
        'Cases',
        'case continuation update requires a resolved existing case identifier',
      ),
    };
  }

  const patientId = normalizeString(action.target.patientId);
  const visitDate = normalizeDate(action.target.visitDate);
  if (isAdapterError(patientId) || isAdapterError(visitDate)) {
    return {
      success: false,
      error: canonConfirmRequiredError(
        'Cases.Latest Visit ID',
        'Cases',
        'case continuation update requires resolved patient identity and visit date to derive the canonical latest visit id',
      ),
    };
  }

  const fields: Record<string, unknown> = {
    [registry.caseFields.latestVisitId.fieldName]: buildVisitId(patientId, visitDate),
    [registry.caseFields.episodeStatus.fieldName]:
      registry.episodeStatusOptions.open,
  };

  const intended = action.payloadIntent?.intendedChanges as Record<string, unknown> | undefined;

  if (typeof intended?.latestSummary === 'string' && intended.latestSummary.trim()) {
    fields[registry.caseFields.latestSummary.fieldName] = intended.latestSummary.trim();
  }

  if (
    typeof intended?.latestWorkingDiagnosis === 'string' &&
    intended.latestWorkingDiagnosis.trim()
  ) {
    fields[registry.caseFields.latestWorkingDiagnosis.fieldName] =
      intended.latestWorkingDiagnosis.trim();
  }

  if (typeof intended?.latestWorkingPlan === 'string' && intended.latestWorkingPlan.trim()) {
    fields[registry.caseFields.latestWorkingPlan.fieldName] = intended.latestWorkingPlan.trim();
  }

  return {
    success: true,
    request: {
      table: 'Cases',
      recordId,
      fields,
    },
  };
}

function buildCaseId(
  patientId: string,
  toothNumber: string,
  episodeStartDate: string,
): string {
  return `CASE-${patientId}-${toothNumber}-${compactDate(episodeStartDate)}`;
}

function buildVisitId(
  patientId: string,
  visitDate: string,
): string {
  return `VISIT-${patientId}-${compactDate(visitDate)}`;
}

function compactDate(date: string): string {
  return date.replaceAll('-', '');
}

function isAdapterError(value: unknown): value is AirtableAdapterError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value
  );
}
