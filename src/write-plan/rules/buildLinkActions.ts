/**
 * Build link write actions
 *
 * Requirements:
 * - link_visit_to_case: connect visit to case
 * - link_snapshot_to_case: connect snapshot rows to case (for continuity)
 * - no_op_link: when link action is not needed
 *
 * Rules:
 * - link actions depend on both entities being ready
 * - ordering position is 5 (after snapshots)
 * - links are identity-establishing, not content updates
 * - link actions should be explicit (not implicit in other writes)
 *
 * Current boundary:
 * - this module preserves the action family in the provider-neutral plan model
 * - Stage 7E activates only a minimal safe Case-link subset
 * - authoritatively written sides are:
 *   - `Visits.Cases`
 *   - `Pre-op Clinical Findings.Case ID`
 *   - `Treatment Plan.Case ID`
 *   - `Doctor Reasoning.Case ID`
 *   - `Diagnosis.Case ID`
 *   - `Radiographic Findings.Case ID`
 *   - `Operative Findings.Case ID`
 * - inverse links on `Cases` are expected to materialize from those writes
 * - visit-to-patient and snapshot-to-visit explicit links remain disabled
 */

import type {
  CaseResolution,
  CaseResolutionTarget,
  PatientResolution,
  VisitResolution,
} from '../../types/resolution.js';
import type { WriteAction, ActionTarget } from '../../types/write-plan.js';
import { generateActionId } from '../helpers/idGen.js';

export interface BuildLinkActionsInput {
  planId: string;
  patientResolution: PatientResolution;
  visitResolution: VisitResolution;
  caseResolution: CaseResolution;
  patientActionId: string;
  visitActionId: string;
  caseActionId?: string;
  caseActionIdsByTooth?: Record<string, string>;
  snapshotActions: WriteAction[];
  includeExplicitLinks?: boolean;
}

export function buildLinkActions(
  input: BuildLinkActionsInput,
): WriteAction[] {
  const {
    planId,
    patientResolution,
    visitResolution,
    caseResolution,
    visitActionId,
    caseActionId,
    caseActionIdsByTooth,
    snapshotActions,
    includeExplicitLinks = false,
  } = input;

  const actions: WriteAction[] = [];
  let linkOrder = 5;

  if (!includeExplicitLinks) {
    return actions;
  }

  const caseTargets = getLinkableCaseTargets(caseResolution);
  const supportsMinimalCaseLinks = caseTargets.length > 0;

  if (!supportsMinimalCaseLinks) {
    return actions;
  }

  // Link 1: Visit to Case
  if (caseTargets.length === 1) {
    const caseTarget = caseTargets[0]!;
    const linkId = generateActionId(planId, linkOrder, 'link_visit_to_case', 'v2c');
    const linkedCaseActionId =
      (caseTarget.toothNumber && caseActionIdsByTooth?.[caseTarget.toothNumber]) ||
      caseActionId;

    const dependsOnActionIds = linkedCaseActionId
      ? [visitActionId, linkedCaseActionId]
      : [visitActionId];

    actions.push({
      actionId: linkId,
      actionOrder: linkOrder,
      actionType: 'link_visit_to_case',
      entityType: 'link',
      targetMode: 'update_existing',
      target: {
        patientId: patientResolution.resolvedPatientId || 'NEW',
        visitId: visitResolution.resolvedVisitId || 'NEW',
        caseId: caseTarget.resolvedCaseId || 'NEW',
        toothNumber: caseTarget.toothNumber,
        sourceResolutionPath: 'visit_to_case_link',
      },
      payloadIntent: {
        intendedChanges: {},
        guardedFields: [
          'relationship_source_visit_identity',
          'relationship_source_case_identity',
        ],
      },
      dependsOnActionIds,
      blockers: [],
      safety: {
        duplicateSafe: true,
        replayEligibleIfFailed: true,
      },
      previewVisible: false,
    });

    linkOrder++;
  }

  // Link 2: PRE / PLAN / DR / DX / RAD / OP snapshots to Case
  const caseLinkedSnapshotActions = snapshotActions.filter(
    (snapshotAction) =>
      snapshotAction.entityType === 'snapshot' &&
      (snapshotAction.target.branch === 'PRE' ||
        snapshotAction.target.branch === 'PLAN' ||
        snapshotAction.target.branch === 'DR' ||
        snapshotAction.target.branch === 'DX' ||
        snapshotAction.target.branch === 'RAD' ||
        snapshotAction.target.branch === 'OP') &&
      (snapshotAction.actionType === 'create_snapshot' ||
        snapshotAction.actionType === 'update_snapshot'),
  );

  if (caseLinkedSnapshotActions.length > 0) {
    for (const snapshotAction of caseLinkedSnapshotActions) {
      const toothNumber = snapshotAction.target.toothNumber;
      const matchingCaseTarget = toothNumber
        ? caseTargets.find((target) => target.toothNumber === toothNumber)
        : undefined;

      if (!matchingCaseTarget) {
        continue;
      }

      const linkId = generateActionId(
        planId,
        linkOrder,
        'link_snapshot_to_case',
        `s2c_${linkOrder}`,
      );

      actions.push({
        actionId: linkId,
        actionOrder: linkOrder,
        actionType: 'link_snapshot_to_case',
        entityType: 'link',
        targetMode: 'update_existing',
        target: {
          patientId: patientResolution.resolvedPatientId || 'NEW',
          caseId: matchingCaseTarget.resolvedCaseId || 'NEW',
          toothNumber: matchingCaseTarget.toothNumber,
          ...(snapshotAction.target.branch ? { branch: snapshotAction.target.branch } : {}),
          sourceResolutionPath: 'snapshot_to_case_link',
        },
        payloadIntent: {
          intendedChanges: {},
          guardedFields: [
            'relationship_source_case_identity',
            'relationship_source_snapshot_identity',
          ],
        },
        dependsOnActionIds:
          matchingCaseTarget.toothNumber &&
          caseActionIdsByTooth?.[matchingCaseTarget.toothNumber]
            ? [
                caseActionIdsByTooth[matchingCaseTarget.toothNumber]!,
                snapshotAction.actionId,
              ]
            : [snapshotAction.actionId],
        blockers: [],
        safety: {
          duplicateSafe: true,
          replayEligibleIfFailed: true,
        },
        previewVisible: false,
      });

      linkOrder++;
    }
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
              ...(caseResolution.visitDate
                ? { visitDate: caseResolution.visitDate }
                : {}),
              reasons: [...caseResolution.reasons],
            },
          ]
        : [];

  return rawTargets.filter(
    (target) =>
      target.status === 'create_case' || target.status === 'continue_case',
  );
}
