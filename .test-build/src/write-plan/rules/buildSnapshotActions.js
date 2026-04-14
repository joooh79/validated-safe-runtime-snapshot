/**
 * Build snapshot write actions
 *
 * Requirements:
 * - create_snapshot: when new snapshot rows should be created
 * - update_snapshot: when same-date correction updates existing snapshot
 * - no_op_snapshot: when snapshot action is blocked or not needed
 *
 * Rules:
 * - snapshot actions depend on visit action
 * - ordering position is 4 (after case)
 * - snapshot truth is visit-based, not case-based
 * - same-date correction may update existing snapshots
 * - later-date continuation creates new snapshots
 * - snapshots are branch-aware (PRE, RAD, OP, DX, PLAN, DR)
 *
 * Note: Exact branches supported and field mappings are provider-specific.
 * This module generates the intent; provider adapter materializes the payload.
 *
 * Stage 7 note:
 * - when Case-aware single-tooth scope is available, pass that tooth/case
 *   context through so PLAN / DR / DX / RAD / OP can activate conservatively without
 *   widening the multi-tooth model
 */
import { generateActionId } from '../helpers/idGen.js';
import { extractWritableSnapshotIntendedChanges, shouldCollapseSnapshotUpdateToNoOp, } from './compareSnapshotPayload.js';
export function buildSnapshotActions(input) {
    const { planId, visitResolution, caseResolution, workflowIntent, visitActionId, plannedVisitId, branchIntents, snapshotLookups, } = input;
    const actions = [];
    let snapshotOrder = 4;
    for (const branchIntent of branchIntents) {
        const { branch, hasContent, isSameDateCorrection, isContinuation, toothNumber, payload, } = branchIntent;
        const intendedChanges = extractWritableSnapshotIntendedChanges(branch, payload ?? {});
        // Skip if no content for this branch
        if (!hasContent) {
            continue;
        }
        // Determine action type
        let actionType;
        let targetMode;
        if (isSameDateCorrection && visitResolution.matchedSameDateVisitId) {
            // Same-date correction => update existing snapshot
            actionType = 'update_snapshot';
            targetMode = 'update_existing';
        }
        else if (isContinuation || visitResolution.status === 'create_new_visit') {
            // New visit => create new snapshot
            actionType = 'create_snapshot';
            targetMode = 'create_new';
        }
        else {
            // Default no-op
            actionType = 'no_op_snapshot';
            targetMode = 'no_op';
        }
        const actionId = generateActionId(planId, snapshotOrder, actionType, `snapshot_${branch}`);
        const target = {
            branch,
            visitId: visitResolution.resolvedVisitId || plannedVisitId || 'NEW',
            sourceResolutionPath: `snapshot_${branch}_${visitResolution.status}`,
        };
        const caseTarget = getCaseTargetForTooth(caseResolution, toothNumber);
        if (toothNumber) {
            target.toothNumber = toothNumber;
        }
        else if (caseTarget?.toothNumber) {
            target.toothNumber = caseTarget.toothNumber;
        }
        else if (caseResolution.toothNumber) {
            target.toothNumber = caseResolution.toothNumber;
        }
        else {
            target.toothNumber = 'all'; // Canon-confirm-required outside the single-tooth path
        }
        if (caseTarget) {
            target.caseId = caseTarget.resolvedCaseId || 'NEW';
        }
        else if (caseResolution.status === 'create_case' ||
            caseResolution.status === 'continue_case') {
            target.caseId = caseResolution.resolvedCaseId || 'NEW';
        }
        if (actionType === 'update_snapshot') {
            const explicitRecordRef = getExplicitSnapshotRecordRef(snapshotLookups, branch, target.toothNumber);
            if (explicitRecordRef) {
                target.entityRef = explicitRecordRef;
            }
            if (shouldCollapseSnapshotUpdateToNoOp(snapshotLookups, branch, target.toothNumber, intendedChanges)) {
                actionType = 'no_op_snapshot';
                targetMode = 'no_op';
                delete target.entityRef;
            }
        }
        actions.push({
            actionId,
            actionOrder: snapshotOrder,
            actionType,
            entityType: 'snapshot',
            targetMode,
            target,
            payloadIntent: actionType !== 'no_op_snapshot' ? {
                intendedChanges,
                guardedFields: ['visit_id', 'snapshot_date', branch],
                omittedFieldsByRule: actionType === 'update_snapshot' ? ['snapshot_date', 'visit_id'] : [],
            } : { intendedChanges: {}, guardedFields: [] },
            dependsOnActionIds: [visitActionId],
            blockers: [],
            safety: {
                duplicateSafe: actionType === 'no_op_snapshot',
                replayEligibleIfFailed: actionType === 'create_snapshot',
            },
            previewVisible: true,
        });
        snapshotOrder++;
    }
    // If no snapshots were created, still return a no-op to preserve intent
    if (actions.length === 0) {
        const noOpId = generateActionId(planId, 4, 'no_op_snapshot', 'all_branches');
        actions.push({
            actionId: noOpId,
            actionOrder: 4,
            actionType: 'no_op_snapshot',
            entityType: 'snapshot',
            targetMode: 'no_op',
            target: {
                toothNumber: 'all',
                branch: 'PRE', // Placeholder
                sourceResolutionPath: 'no_snapshot_content',
            },
            payloadIntent: { intendedChanges: {}, guardedFields: [] },
            dependsOnActionIds: [visitActionId],
            blockers: [],
            safety: {
                duplicateSafe: true,
                replayEligibleIfFailed: false,
            },
            previewVisible: false,
        });
    }
    return actions;
}
function getCaseTargetForTooth(caseResolution, toothNumber) {
    if (!toothNumber) {
        return undefined;
    }
    if (caseResolution.targets && caseResolution.targets.length > 0) {
        return caseResolution.targets.find((target) => target.toothNumber === toothNumber);
    }
    if (caseResolution.toothNumber === toothNumber &&
        (caseResolution.status === 'create_case' ||
            caseResolution.status === 'continue_case')) {
        return {
            status: caseResolution.status,
            toothNumber,
            ...(caseResolution.resolvedCaseId
                ? { resolvedCaseId: caseResolution.resolvedCaseId }
                : {}),
            ...(caseResolution.visitDate ? { visitDate: caseResolution.visitDate } : {}),
            reasons: [...caseResolution.reasons],
        };
    }
    return undefined;
}
function getExplicitSnapshotRecordRef(snapshotLookups, branch, toothNumber) {
    if (!snapshotLookups || !toothNumber || toothNumber === 'all') {
        return undefined;
    }
    const branchLookups = snapshotLookups[branch];
    const snapshotLookup = branchLookups?.[toothNumber];
    if (snapshotLookup?.found && snapshotLookup.recordId) {
        return snapshotLookup.recordId;
    }
    return undefined;
}
