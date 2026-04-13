/**
 * Build patient write actions from resolved patient state
 *
 * Requirements:
 * - create_patient: when resolution says create_new_patient
 * - update_patient: when patient found and updates needed
 * - attach_existing_patient: when existing patient found, no update needed
 * - no_op_patient: when no action is the right answer
 *
 * Rules:
 * - patient action is always first in ordering
 * - patient action depends on no prior actions
 * - if patient resolution is blocked, may generate no_op instead
 */
import { generateActionId } from '../helpers/idGen.js';
export function buildPatientActions(input) {
    const { planId, resolution, hasPatientContent, claimedPatientId, birthYear, genderHint, firstVisitDate, } = input;
    const actions = [];
    // Determine action type based on resolution status
    let actionType;
    let targetMode;
    switch (resolution.status) {
        case 'resolved_existing_patient':
            // Existing patient found
            if (hasPatientContent) {
                actionType = 'update_patient';
                targetMode = 'update_existing';
            }
            else {
                actionType = 'attach_existing_patient';
                targetMode = 'attach_existing';
            }
            break;
        case 'create_new_patient':
            actionType = 'create_patient';
            targetMode = 'create_new';
            break;
        case 'correction_needed_patient_duplicate_suspicion':
        case 'recheck_required_patient_not_found':
        case 'unresolved_ambiguous_patient':
        case 'hard_stop_patient_resolution':
            // Blocked resolution => no executable patient action
            actionType = 'no_op_patient';
            targetMode = 'no_op';
            break;
        default:
            actionType = 'no_op_patient';
            targetMode = 'no_op';
    }
    const actionId = generateActionId(planId, 1, actionType, 'patient');
    actions.push({
        actionId,
        actionOrder: 1,
        actionType,
        entityType: 'patient',
        targetMode,
        target: {
            patientId: resolution.resolvedPatientId || claimedPatientId || 'NEW',
            sourceResolutionPath: resolution.status,
        },
        payloadIntent: actionType !== 'no_op_patient' ? {
            intendedChanges: buildPatientIntendedChanges({
                actionType,
                birthYear,
                genderHint,
                firstVisitDate,
            }),
            guardedFields: ['patient_id', 'date_created'],
        } : { intendedChanges: {}, guardedFields: [] },
        dependsOnActionIds: [],
        blockers: resolution.status === 'hard_stop_patient_resolution' ? ['hard_stop'] : [],
        safety: {
            duplicateSafe: actionType === 'attach_existing_patient' || actionType === 'no_op_patient',
            replayEligibleIfFailed: actionType === 'create_patient',
            highRiskIdentityAction: actionType === 'create_patient' || actionType === 'update_patient',
        },
        previewVisible: true,
    });
    return actions;
}
function buildPatientIntendedChanges(input) {
    if (input.actionType !== 'create_patient' &&
        input.actionType !== 'update_patient') {
        return {};
    }
    const intendedChanges = {};
    if (input.birthYear !== undefined && input.birthYear !== '') {
        intendedChanges.birthYear = input.birthYear;
    }
    if (typeof input.genderHint === 'string' && input.genderHint.trim()) {
        intendedChanges.gender = input.genderHint.trim();
    }
    if (typeof input.firstVisitDate === 'string' && input.firstVisitDate.trim()) {
        intendedChanges.firstVisitDate = input.firstVisitDate.trim();
    }
    return intendedChanges;
}
