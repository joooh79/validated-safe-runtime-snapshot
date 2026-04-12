/**
 * Build preview summary from write plan
 *
 * Requirements:
 * - preview must show patient action
 * - preview must show visit action
 * - preview must show case action
 * - preview must show snapshot actions by branch
 * - preview must clearly indicate blocked status
 * - preview must indicate next required step
 *
 * Rules:
 * - preview is generated from actual plan meaning, not guessed
 * - preview reflects the resolution's readiness state
 * - preview displays action intent in user-facing language
 */
export function buildPreviewSummary(resolution, actions, warnings) {
    // Extract specific actions
    const patientAction = actions.find((a) => a.entityType === 'patient');
    const visitAction = actions.find((a) => a.entityType === 'visit');
    const caseAction = actions.find((a) => a.entityType === 'case' && a.actionType !== 'update_case_latest_synthesis');
    const snapshotActions = actions.filter((a) => a.entityType === 'snapshot');
    // Build patient preview
    const patientActionText = patientAction
        ? describePatientAction(patientAction)
        : 'No patient action';
    // Build visit preview
    const visitActionText = visitAction
        ? describeVisitAction(visitAction)
        : 'No visit action';
    // Build case preview
    const caseActionText = caseAction
        ? describeCaseAction(caseAction)
        : 'No case action';
    // Build snapshot previews
    const snapshotPreviews = snapshotActions
        .filter((a) => a.previewVisible && !a.actionType.startsWith('no_op'))
        .map((a) => ({
        toothNumber: a.target.toothNumber || 'all',
        branch: a.target.branch || 'PRE',
        action: a.actionType === 'create_snapshot' ? 'create' :
            a.actionType === 'update_snapshot' ? 'update' :
                'no_op',
    }));
    // Determine next step based on readiness
    let nextStep;
    if (resolution.readiness === 'blocked_requires_correction') {
        nextStep = 'correction_required';
    }
    else if (resolution.readiness === 'blocked_requires_recheck') {
        nextStep = 'recheck_required';
    }
    else if (resolution.readiness === 'blocked_hard_stop') {
        nextStep = 'hard_stop';
    }
    else if (actions.length === 0 || actions.every((a) => a.actionType.startsWith('no_op'))) {
        nextStep = 'inform_no_op';
    }
    else {
        nextStep = 'confirm';
    }
    return {
        patientAction: patientActionText,
        visitAction: visitActionText,
        caseAction: caseActionText,
        snapshotActions: snapshotPreviews,
        warnings,
        nextStep,
    };
}
function describePatientAction(action) {
    switch (action.actionType) {
        case 'create_patient':
            return `Create new patient record`;
        case 'update_patient':
            return `Update patient record (ID: ${action.target.patientId || 'NEW'})`;
        case 'attach_existing_patient':
            return `Use existing patient (ID: ${action.target.patientId})`;
        case 'no_op_patient':
            return `No patient action (blocked or skipped)`;
        default:
            return 'Unknown patient action';
    }
}
function describeVisitAction(action) {
    switch (action.actionType) {
        case 'create_visit':
            return `Create new visit`;
        case 'update_visit':
            return `Update existing visit (same-date correction)`;
        case 'no_op_visit':
            return `No visit action (blocked or skipped)`;
        default:
            return 'Unknown visit action';
    }
}
function describeCaseAction(action) {
    switch (action.actionType) {
        case 'create_case':
            return `Create new case/episode`;
        case 'close_case':
            return `Close case (ID: ${action.target.caseId})`;
        case 'split_case':
            return `Split case into new episode`;
        case 'no_op_case':
            return `No case action (blocked or skipped)`;
        default:
            return 'Unknown case action';
    }
}
