/**
 * Build visit write actions from resolved visit state
 *
 * Requirements:
 * - create_visit: when new visit should be created
 * - update_visit: when same-date correction updates existing visit
 * - no_op_visit: when visit action is blocked or not applicable
 *
 * Rules:
 * - visit action depends on patient action completing
 * - if visit resolution is blocked, may generate no_op instead
 * - ordering position is 2 (after patient)
 */

import type { VisitResolution } from '../../types/resolution.js';
import type { WriteAction, ActionTarget } from '../../types/write-plan.js';
import { generateActionId } from '../helpers/idGen.js';

export interface BuildVisitActionsInput {
  planId: string;
  resolution: VisitResolution;
  patientActionId: string;
  hasVisitLevelChanges: boolean;
  hasDependentSnapshotWrites: boolean;
  claimedPatientId?: string | undefined;
  visitDate?: string | undefined;
  visitType?: string | undefined;
  chiefComplaint?: string | undefined;
  painLevel?: number | string | null | undefined;
}

export function buildVisitActions(
  input: BuildVisitActionsInput,
): WriteAction[] {
  const {
    planId,
    resolution,
    patientActionId,
    hasVisitLevelChanges,
    hasDependentSnapshotWrites,
    claimedPatientId,
    visitDate,
    visitType,
    chiefComplaint,
    painLevel,
  } = input;

  const actions: WriteAction[] = [];

  // Determine action type based on resolution status
  let actionType: WriteAction['actionType'];
  let targetMode: 'create_new' | 'update_existing' | 'no_op';

  switch (resolution.status) {
    case 'create_new_visit':
      if (hasVisitLevelChanges || hasDependentSnapshotWrites) {
        actionType = 'create_visit';
        targetMode = 'create_new';
      } else {
        actionType = 'no_op_visit';
        targetMode = 'no_op';
      }
      break;

    case 'update_existing_visit_same_date':
      if (hasVisitLevelChanges) {
        actionType = 'update_visit';
        targetMode = 'update_existing';
      } else {
        actionType = 'no_op_visit';
        targetMode = 'no_op';
      }
      break;

    case 'correction_needed_same_date_conflict':
    case 'hard_stop_same_date_keep_new_visit_claim':
    case 'unresolved_visit_ambiguity':
      // Blocked resolution => no executable visit action
      actionType = 'no_op_visit';
      targetMode = 'no_op';
      break;

    default:
      actionType = 'no_op_visit';
      targetMode = 'no_op';
  }

  const actionId = generateActionId(planId, 2, actionType, 'visit');

  const target: ActionTarget = {
    visitId: resolution.resolvedVisitId || 'NEW',
    sourceResolutionPath: resolution.status,
  };

  // Add context about same-date match if relevant
  if (resolution.matchedSameDateVisitId) {
    target.entityRef = resolution.matchedSameDateVisitId;
  }

  actions.push({
    actionId,
    actionOrder: 2,
    actionType,
    entityType: 'visit',
    targetMode,
    target,
    payloadIntent: actionType !== 'no_op_visit' ? {
      intendedChanges: buildVisitIntendedChanges({
        actionType,
        claimedPatientId,
        visitDate,
        visitType,
        chiefComplaint,
        painLevel,
      }),
      guardedFields: ['visit_id', 'visit_date'],
    } : { intendedChanges: {}, guardedFields: [] },
    dependsOnActionIds: [patientActionId],
    blockers:
      resolution.status === 'hard_stop_same_date_keep_new_visit_claim'
        ? ['hard_stop_same_date_conflict']
        : [],
    safety: {
      duplicateSafe: actionType === 'no_op_visit',
      replayEligibleIfFailed: actionType === 'create_visit',
      highRiskIdentityAction: actionType === 'create_visit' || actionType === 'update_visit',
    },
    previewVisible: true,
  });

  return actions;
}

function buildVisitIntendedChanges(input: {
  actionType: WriteAction['actionType'];
  claimedPatientId?: string | undefined;
  visitDate?: string | undefined;
  visitType?: string | undefined;
  chiefComplaint?: string | undefined;
  painLevel?: number | string | null | undefined;
}): Record<string, unknown> {
  if (
    input.actionType !== 'create_visit' &&
    input.actionType !== 'update_visit'
  ) {
    return {};
  }

  const intendedChanges: Record<string, unknown> = {};

  if (
    input.actionType === 'create_visit' &&
    typeof input.claimedPatientId === 'string' &&
    input.claimedPatientId.trim()
  ) {
    intendedChanges.patientId = input.claimedPatientId.trim();
  }

  if (
    input.actionType === 'create_visit' &&
    typeof input.visitDate === 'string' &&
    input.visitDate.trim()
  ) {
    intendedChanges.date = input.visitDate.trim();
  }

  if (typeof input.visitType === 'string' && input.visitType.trim()) {
    intendedChanges.visitType = input.visitType.trim();
  }

  if (typeof input.chiefComplaint === 'string' && input.chiefComplaint.trim()) {
    intendedChanges.chiefComplaint = input.chiefComplaint.trim();
  }

  if (
    input.painLevel !== undefined &&
    input.painLevel !== null &&
    String(input.painLevel) !== ''
  ) {
    intendedChanges.painLevel = input.painLevel;
  }

  return intendedChanges;
}
