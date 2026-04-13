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
import { generateActionId } from '../helpers/idGen.js';
export function buildVisitActions(input) {
    const { planId, resolution, patientActionId, hasVisitLevelChanges, hasDependentSnapshotWrites, } = input;
    const actions = [];
    // Determine action type based on resolution status
    let actionType;
    let targetMode;
    switch (resolution.status) {
        case 'create_new_visit':
            if (hasVisitLevelChanges || hasDependentSnapshotWrites) {
                actionType = 'create_visit';
                targetMode = 'create_new';
            }
            else {
                actionType = 'no_op_visit';
                targetMode = 'no_op';
            }
            break;
        case 'update_existing_visit_same_date':
            if (hasVisitLevelChanges) {
                actionType = 'update_visit';
                targetMode = 'update_existing';
            }
            else {
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
    const target = {
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
            intendedChanges: {}, // Provider adapter will fill these
            guardedFields: ['visit_id', 'visit_date'],
        } : { intendedChanges: {}, guardedFields: [] },
        dependsOnActionIds: [patientActionId],
        blockers: resolution.status === 'hard_stop_same_date_keep_new_visit_claim'
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
