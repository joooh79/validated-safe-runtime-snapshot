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
    const caseActions = actions.filter((a) => a.entityType === 'case' &&
        a.actionType !== 'update_case_latest_synthesis' &&
        a.previewVisible);
    const snapshotActions = actions.filter((a) => a.entityType === 'snapshot');
    // Build patient preview
    const patientActionText = patientAction
        ? describePatientAction(patientAction, resolution)
        : 'No patient action';
    // Build visit preview
    const visitActionText = visitAction
        ? describeVisitAction(visitAction, resolution)
        : 'No visit action';
    // Build case preview
    const caseActionText = caseActions.length > 0
        ? describeCaseActions(caseActions)
        : describeCaseResolutionFallback(resolution);
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
    else if (actions.length === 0 ||
        !actions.some((a) => !a.actionType.startsWith('no_op') &&
            a.actionType !== 'attach_existing_patient' &&
            (!a.blockers || a.blockers.length === 0))) {
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
function describePatientAction(action, resolution) {
    switch (action.actionType) {
        case 'create_patient':
            return `Create new patient record`;
        case 'update_patient':
            return `Update patient record (ID: ${action.target.patientId || 'NEW'})`;
        case 'attach_existing_patient':
            return `Use existing patient (ID: ${action.target.patientId})`;
        case 'no_op_patient':
            if (resolution.patient.status === 'no_patient_needed') {
                return 'No patient action needed';
            }
            return `No patient action (blocked or skipped)`;
        default:
            return 'Unknown patient action';
    }
}
function describeVisitAction(action, resolution) {
    switch (action.actionType) {
        case 'create_visit':
            return `Create new visit`;
        case 'update_visit':
            return `Update existing visit (same-date correction)`;
        case 'no_op_visit':
            if (resolution.visit.status === 'no_visit_needed') {
                return `No visit action needed`;
            }
            return `No visit action (blocked or skipped)`;
        default:
            return 'Unknown visit action';
    }
}
function describeCaseActions(actions) {
    if (actions.every((action) => action.actionType === 'create_case')) {
        const teeth = actions
            .map((action) => action.target.toothNumber)
            .filter((tooth) => typeof tooth === 'string' && tooth.length > 0);
        if (teeth.length > 1) {
            return `Create new cases for teeth ${teeth.join(', ')}`;
        }
        if (teeth.length === 1) {
            return `Create new case for tooth ${teeth[0]}`;
        }
        return 'Create new case/episode';
    }
    const firstAction = actions[0];
    switch (firstAction.actionType) {
        case 'create_case':
            return `Create new case/episode`;
        case 'close_case':
            return `Close case (ID: ${firstAction.target.caseId})`;
        case 'split_case':
            return `Split case into new episode`;
        case 'no_op_case':
            return `No case action (blocked or skipped)`;
        default:
            return 'Unknown case action';
    }
}
function describeCaseResolutionFallback(resolution) {
    if (resolution.caseResolution.status === 'continue_case') {
        if (resolution.caseResolution.toothNumber) {
            return `Continue existing case for tooth ${resolution.caseResolution.toothNumber}`;
        }
        return `Continue existing case`;
    }
    if (resolution.caseResolution.status === 'direct_case_update') {
        return `Update existing case: ${resolution.caseResolution.resolvedCaseId || 'ID pending'}`;
    }
    return 'No case action';
}
