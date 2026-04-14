/**
 * Generate human-readable summary for preview display
 */
export function generateResolutionSummary(patient, visit, caseRes, readiness, interactionMode) {
    return {
        patientActionSummary: summarizePatientAction(patient),
        visitActionSummary: summarizeVisitAction(visit),
        caseActionSummary: summarizeCaseAction(caseRes),
        nextStepSummary: summarizeNextStep(readiness, interactionMode),
    };
}
/**
 * Summarize patient resolution action
 */
function summarizePatientAction(patient) {
    switch (patient.status) {
        case 'resolved_existing_patient':
            return `Use existing patient: ${patient.resolvedPatientId || 'ID pending'}`;
        case 'create_new_patient':
            return 'Create new patient';
        case 'correction_needed_patient_duplicate_suspicion':
            return `Possible duplicate found. Please confirm patient identity.`;
        case 'recheck_required_patient_not_found':
            return `Patient not found. Please verify patient details and try again.`;
        case 'unresolved_ambiguous_patient':
            return 'Patient identity could not be determined. Blocked.';
        case 'hard_stop_patient_resolution':
            return 'Patient resolution blocked - cannot proceed.';
        default:
            return 'Patient action: unknown';
    }
}
/**
 * Summarize visit resolution action
 */
function summarizeVisitAction(visit) {
    switch (visit.status) {
        case 'create_new_visit':
            return 'Create new visit';
        case 'update_existing_visit_same_date':
            return `Update existing visit from same date`;
        case 'correction_needed_same_date_conflict':
            return `Same-date visit exists. Please confirm how to proceed.`;
        case 'hard_stop_same_date_keep_new_visit_claim':
            return `Cannot proceed: same-date visit exists but user insisted on new visit.`;
        case 'unresolved_visit_ambiguity':
            return 'Visit identity could not be determined. Blocked.';
        default:
            return 'Visit action: unknown';
    }
}
/**
 * Summarize case resolution action
 */
function summarizeCaseAction(caseRes) {
    const targetTeeth = caseRes.targets?.map((target) => target.toothNumber) ?? [];
    const candidateCount = caseRes.candidateCases?.length ?? 0;
    switch (caseRes.status) {
        case 'create_case':
            if (targetTeeth.length > 1) {
                return `Create new cases for teeth ${targetTeeth.join(', ')}`;
            }
            if (targetTeeth.length === 1) {
                return `Create new case for tooth ${targetTeeth[0]}`;
            }
            return 'Create new case';
        case 'continue_case':
            if (targetTeeth.length === 1) {
                return `Continue existing case for tooth ${targetTeeth[0]}: ${caseRes.resolvedCaseId || 'ID pending'}`;
            }
            return `Continue existing case: ${caseRes.resolvedCaseId || 'ID pending'}`;
        case 'close_case':
            return `Close case: ${caseRes.resolvedCaseId || 'ID pending'}`;
        case 'split_case':
            return 'Split existing case into new cases';
        case 'none':
            return 'No case action needed';
        case 'unresolved_case_ambiguity':
            if (candidateCount > 1) {
                const toothLabel = caseRes.toothNumber ? ` for tooth ${caseRes.toothNumber}` : '';
                return `Case continuity is ambiguous${toothLabel}. ${candidateCount} candidate cases found.`;
            }
            return 'Case continuity could not be determined. Blocked.';
        default:
            return 'Case action: unknown';
    }
}
/**
 * Summarize next step based on readiness and interaction mode
 */
function summarizeNextStep(readiness, interactionMode) {
    switch (interactionMode) {
        case 'preview_confirmation':
            return 'Ready to send. Please review and confirm.';
        case 'correction_required':
            return 'Correction required before proceeding. Review conflict and make decision.';
        case 'recheck_required':
            return 'Patient recheck required. Please verify patient details.';
        case 'hard_stop':
            return 'Cannot proceed. Review issues above and contact support if needed.';
        case 'inform_no_op':
            return 'No changes detected. No action needed.';
        default:
            return 'Unknown next step.';
    }
}
