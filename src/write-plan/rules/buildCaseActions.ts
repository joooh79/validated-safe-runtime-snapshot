/**
 * Build case write actions from resolved case state
 *
 * Requirements:
 * - create_case: when new case/episode should be created
 * - continue_case: represented via a minimal latest-synthesis update on an existing case
 * - close_case: when case should be marked closed
 * - split_case: when case should be split (advanced)
 * - update_case_latest_synthesis: carries the minimal safe latest-case update slot
 * - no_op_case: when case action is blocked or not applicable
 *
 * Rules:
 * - case action depends on visit action completing
 * - ordering position is 3 (after visit)
 * - case action is "late" - scheduled after snapshots are known
 * - same-date correction typically does NOT create/split case
 * - later-date continuation typically continues or creates case
 *
 * Current runtime boundary:
 * - Stage 5 activates only a minimal safe Case subset
 * - create_case is limited to explicit, single-tooth, exact-identity scope
 * - continue_case is limited to an update on an already resolved case
 * - split_case and close_case remain blocked until later stages
 */

import type {
  CaseResolution,
  CaseResolutionTarget,
  PatientResolution,
} from '../../types/resolution.js';
import type { WriteAction, ActionTarget } from '../../types/write-plan.js';
import { generateActionId } from '../helpers/idGen.js';

function getExistingCaseTargetId(
  caseTarget: Pick<CaseResolutionTarget, 'resolvedCaseRecordRef' | 'resolvedCaseId'>,
): string | undefined {
  return caseTarget.resolvedCaseRecordRef || caseTarget.resolvedCaseId;
}

export interface BuildCaseActionsInput {
  planId: string;
  patientResolution: PatientResolution;
  resolution: CaseResolution;
  patientActionId: string;
  visitActionId: string;
  snapshotActionIds: string[];
  hasCaseContent: boolean;
  claimedPatientId?: string | undefined;
}

export function buildCaseActions(
  input: BuildCaseActionsInput,
): WriteAction[] {
  const {
    planId,
    patientResolution,
    resolution,
    patientActionId,
    visitActionId,
    snapshotActionIds,
    hasCaseContent,
    claimedPatientId,
  } = input;

  const actions: WriteAction[] = [];
  const caseTargets = getCaseTargets(resolution);

  if (
    resolution.status === 'none' ||
    resolution.status === 'unresolved_case_ambiguity' ||
    caseTargets.length === 0
  ) {
    return actions;
  }

  const resolvedOrClaimedPatientId =
    patientResolution.resolvedPatientId || claimedPatientId || 'NEW';

  for (const caseTarget of caseTargets) {
    const primaryAction = buildPrimaryCaseAction({
      planId,
      patientId: resolvedOrClaimedPatientId,
      patientActionId,
      visitActionId,
      resolution,
      target: caseTarget,
    });

    if (primaryAction) {
      actions.push(primaryAction);
    }

    const synthesisAction = buildCaseSynthesisAction({
      planId,
      patientId: resolvedOrClaimedPatientId,
      visitActionId,
      snapshotActionIds,
      hasCaseContent,
      target: caseTarget,
      primaryActionId: primaryAction?.actionId,
    });

    if (synthesisAction) {
      actions.push(synthesisAction);
    }
  }

  return actions;
}

function buildPrimaryCaseAction(input: {
  planId: string;
  patientId: string;
  patientActionId: string;
  visitActionId: string;
  resolution: CaseResolution;
  target: CaseResolutionTarget;
}): WriteAction | null {
  const { planId, patientId, patientActionId, visitActionId, resolution, target } = input;
  let primaryActionType: WriteAction['actionType'] | null = null;
  let primaryTargetMode: 'create_new' | 'update_existing' | 'no_op';

  switch (target.status) {
    case 'create_case':
      primaryActionType = 'create_case';
      primaryTargetMode = 'create_new';
      break;
    case 'close_case':
      primaryActionType = 'close_case';
      primaryTargetMode = 'update_existing';
      break;
    case 'split_case':
      primaryActionType = 'split_case';
      primaryTargetMode = 'create_new';
      break;
    case 'continue_case':
    default:
      primaryActionType = null;
      primaryTargetMode = 'no_op';
      break;
  }

  if (!primaryActionType) {
    return null;
  }

  const actionId = generateActionId(
    planId,
    3,
    primaryActionType,
    target.toothNumber || target.resolvedCaseId || 'case',
  );

  const primaryTarget: ActionTarget = {
    patientId,
    caseId:
      target.status === 'create_case'
        ? 'NEW'
        : getExistingCaseTargetId(target) || 'NEW',
    ...(target.visitDate ? { visitDate: target.visitDate } : {}),
    toothNumber: target.toothNumber,
    sourceResolutionPath: target.status,
  };

  if (target.status === 'create_case' && target.visitDate) {
    primaryTarget.episodeStartDate = target.visitDate;
  }

  if (target.relatedCaseIds && target.relatedCaseIds.length > 0) {
    const firstId = target.relatedCaseIds[0];
    if (firstId) {
      primaryTarget.entityRef = firstId;
    }
  } else if (resolution.relatedCaseIds && resolution.relatedCaseIds.length > 0) {
    const firstId = resolution.relatedCaseIds[0];
    if (firstId) {
      primaryTarget.entityRef = firstId;
    }
  }

  return {
    actionId,
    actionOrder: 3,
    actionType: primaryActionType,
    entityType: 'case',
    targetMode: primaryTargetMode,
    target: primaryTarget,
    payloadIntent: {
      intendedChanges: {},
      guardedFields: ['case_id', 'date_created'],
    },
    dependsOnActionIds: [patientActionId, visitActionId],
    blockers: [],
    safety: {
      duplicateSafe: false,
      replayEligibleIfFailed:
        primaryActionType === 'create_case' || primaryActionType === 'split_case',
      highRiskIdentityAction:
        primaryActionType === 'create_case' ||
        primaryActionType === 'split_case' ||
        primaryActionType === 'close_case',
    },
    previewVisible: true,
  };
}

function buildCaseSynthesisAction(input: {
  planId: string;
  patientId: string;
  visitActionId: string;
  snapshotActionIds: string[];
  hasCaseContent: boolean;
  target: CaseResolutionTarget;
  primaryActionId?: string | undefined;
}): WriteAction | null {
  const {
    planId,
    patientId,
    visitActionId,
    snapshotActionIds,
    hasCaseContent,
    target,
    primaryActionId,
  } = input;

  if (
    !hasCaseContent ||
    target.status !== 'continue_case' ||
    !getExistingCaseTargetId(target)
  ) {
    return null;
  }

  return {
    actionId: generateActionId(
      planId,
      6,
      'update_case_latest_synthesis',
      getExistingCaseTargetId(target)!,
    ),
    actionOrder: 6,
    actionType: 'update_case_latest_synthesis',
    entityType: 'case',
    targetMode: 'update_existing',
    target: {
      patientId,
      caseId: getExistingCaseTargetId(target)!,
      ...(target.visitDate ? { visitDate: target.visitDate } : {}),
      ...(target.episodeStartDate ? { episodeStartDate: target.episodeStartDate } : {}),
      toothNumber: target.toothNumber,
      sourceResolutionPath: 'case_synthesis_update',
    },
    payloadIntent: {
      intendedChanges: {},
      guardedFields: ['case_id'],
      omittedFieldsByRule: ['date_created', 'case_id'],
    },
    dependsOnActionIds: [
      ...(primaryActionId ? [primaryActionId] : [visitActionId]),
      ...snapshotActionIds,
    ],
    blockers: [],
    safety: {
      duplicateSafe: true,
      replayEligibleIfFailed: true,
    },
    previewVisible: false,
  };
}

function getCaseTargets(
  resolution: CaseResolution,
): CaseResolutionTarget[] {
  if (resolution.targets && resolution.targets.length > 0) {
    return resolution.targets;
  }

  if (
    (resolution.status === 'create_case' ||
      resolution.status === 'continue_case' ||
      resolution.status === 'close_case' ||
      resolution.status === 'split_case') &&
    resolution.toothNumber
  ) {
    return [
      {
        status: resolution.status,
        toothNumber: resolution.toothNumber,
        ...(resolution.resolvedCaseId
          ? { resolvedCaseId: resolution.resolvedCaseId }
          : {}),
        ...(resolution.resolvedCaseRecordRef
          ? { resolvedCaseRecordRef: resolution.resolvedCaseRecordRef }
          : {}),
        ...(resolution.visitDate ? { visitDate: resolution.visitDate } : {}),
        ...(resolution.episodeStartDate
          ? { episodeStartDate: resolution.episodeStartDate }
          : {}),
        ...(resolution.relatedCaseIds
          ? { relatedCaseIds: resolution.relatedCaseIds }
          : {}),
        reasons: [...resolution.reasons],
      },
    ];
  }

  return [];
}
