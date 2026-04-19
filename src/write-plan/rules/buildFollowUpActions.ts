import type {
  CaseResolution,
  CaseResolutionTarget,
  PatientResolution,
  VisitResolution,
} from '../../types/resolution.js';
import type { WriteAction } from '../../types/write-plan.js';
import { generateActionId } from '../helpers/idGen.js';

function getExistingCaseTargetId(
  caseTarget: Pick<CaseResolutionTarget, 'resolvedCaseRecordRef' | 'resolvedCaseId'>,
): string | undefined {
  return caseTarget.resolvedCaseRecordRef || caseTarget.resolvedCaseId;
}

export interface BuildFollowUpActionsInput {
  planId: string;
  patientResolution: PatientResolution;
  visitResolution: VisitResolution;
  caseResolution: CaseResolution;
  patientActionId: string;
  visitActionId: string;
  caseActionIdsByTooth?: Record<string, string>;
  followUpIntendedChangesByTooth?: Record<string, Record<string, unknown>>;
}

export function buildFollowUpActions(
  input: BuildFollowUpActionsInput,
): WriteAction[] {
  const {
    planId,
    patientResolution,
    visitResolution,
    caseResolution,
    patientActionId,
    visitActionId,
    caseActionIdsByTooth,
    followUpIntendedChangesByTooth,
  } = input;

  const caseTargets = getLinkableCaseTargets(caseResolution);
  const actions: WriteAction[] = [];
  let actionOrder = 7;

  for (const caseTarget of caseTargets) {
    const toothNumber = caseTarget.toothNumber;
    const intendedChanges = toothNumber
      ? followUpIntendedChangesByTooth?.[toothNumber]
      : undefined;

    if (!intendedChanges || Object.keys(intendedChanges).length === 0) {
      continue;
    }

    const caseDependencyActionId = toothNumber
      ? caseActionIdsByTooth?.[toothNumber]
      : undefined;
    const caseId =
      caseTarget.status === 'create_case'
        ? 'NEW'
        : getExistingCaseTargetId(caseTarget) || 'NEW';

    actions.push({
      actionId: generateActionId(
        planId,
        actionOrder,
        'create_post_delivery_follow_up',
        toothNumber || 'follow_up',
      ),
      actionOrder,
      actionType: 'create_post_delivery_follow_up',
      entityType: 'follow_up',
      targetMode: 'create_new',
      target: {
        patientId: patientResolution.resolvedPatientId || 'NEW',
        visitId: visitResolution.resolvedVisitId || 'NEW',
        caseId,
        toothNumber,
        sourceResolutionPath: 'post_delivery_follow_up',
      },
      payloadIntent: {
        intendedChanges: { ...intendedChanges },
        guardedFields: ['relationship_source_patient_identity', 'relationship_source_visit_identity'],
      },
      dependsOnActionIds: [
        patientActionId,
        visitActionId,
        ...(caseDependencyActionId ? [caseDependencyActionId] : []),
      ],
      blockers: [],
      safety: {
        duplicateSafe: false,
        replayEligibleIfFailed: true,
      },
      previewVisible: true,
    });

    actionOrder++;
  }

  return actions;
}

function getLinkableCaseTargets(
  caseResolution: CaseResolution,
): CaseResolutionTarget[] {
  const rawTargets =
    caseResolution.targets && caseResolution.targets.length > 0
      ? caseResolution.targets
      : caseResolution.toothNumber &&
          (caseResolution.status === 'create_case' ||
            caseResolution.status === 'continue_case')
        ? [
            {
              status: caseResolution.status,
              toothNumber: caseResolution.toothNumber,
              ...(caseResolution.resolvedCaseId
                ? { resolvedCaseId: caseResolution.resolvedCaseId }
                : {}),
              ...(caseResolution.resolvedCaseRecordRef
                ? { resolvedCaseRecordRef: caseResolution.resolvedCaseRecordRef }
                : {}),
              ...(caseResolution.visitDate
                ? { visitDate: caseResolution.visitDate }
                : {}),
              ...(caseResolution.episodeStartDate
                ? { episodeStartDate: caseResolution.episodeStartDate }
                : {}),
              reasons: [...caseResolution.reasons],
            },
          ]
        : [];

  return rawTargets.filter(
    (target) =>
      (target.status === 'create_case' || target.status === 'continue_case') &&
      Boolean(getExistingCaseTargetId(target) || target.status === 'create_case'),
  );
}
