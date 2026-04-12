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
import { generateActionId } from '../helpers/idGen.js';
export function buildLinkActions(input) {
    const { planId, patientResolution, visitResolution, caseResolution, visitActionId, caseActionId, snapshotActions, includeExplicitLinks = false, } = input;
    const actions = [];
    let linkOrder = 5;
    if (!includeExplicitLinks) {
        return actions;
    }
    const supportsMinimalCaseLinks = (caseResolution.status === 'create_case' || caseResolution.status === 'continue_case') &&
        Boolean(caseResolution.toothNumber);
    if (!supportsMinimalCaseLinks) {
        return actions;
    }
    const caseTargetContext = {
        ...(caseResolution.toothNumber ? { toothNumber: caseResolution.toothNumber } : {}),
    };
    // Link 1: Visit to Case
    {
        const linkId = generateActionId(planId, linkOrder, 'link_visit_to_case', 'v2c');
        const dependsOnActionIds = caseActionId
            ? [visitActionId, caseActionId]
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
                caseId: caseResolution.resolvedCaseId || 'NEW',
                ...caseTargetContext,
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
    const caseLinkedSnapshotActions = snapshotActions.filter((snapshotAction) => snapshotAction.entityType === 'snapshot' &&
        (snapshotAction.target.branch === 'PRE' ||
            snapshotAction.target.branch === 'PLAN' ||
            snapshotAction.target.branch === 'DR' ||
            snapshotAction.target.branch === 'DX' ||
            snapshotAction.target.branch === 'RAD' ||
            snapshotAction.target.branch === 'OP') &&
        (snapshotAction.actionType === 'create_snapshot' ||
            snapshotAction.actionType === 'update_snapshot'));
    if (caseLinkedSnapshotActions.length > 0) {
        for (const snapshotAction of caseLinkedSnapshotActions) {
            const linkId = generateActionId(planId, linkOrder, 'link_snapshot_to_case', `s2c_${linkOrder}`);
            actions.push({
                actionId: linkId,
                actionOrder: linkOrder,
                actionType: 'link_snapshot_to_case',
                entityType: 'link',
                targetMode: 'update_existing',
                target: {
                    patientId: patientResolution.resolvedPatientId || 'NEW',
                    caseId: caseResolution.resolvedCaseId || 'NEW',
                    ...caseTargetContext,
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
                dependsOnActionIds: caseActionId
                    ? [caseActionId, snapshotAction.actionId]
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
