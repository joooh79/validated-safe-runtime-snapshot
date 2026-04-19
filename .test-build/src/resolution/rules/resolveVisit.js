/**
 * Resolve visit identity and operation
 *
 * Behavioral requirements:
 * - intent: existing_visit_update + same-date visit => update_existing_visit_same_date
 * - intent: new_visit + same-date visit exists => depends on correctionConfirmed:
 *   - null or false => correction_needed_same_date_conflict
 *   - true => update_existing_visit_same_date (proceeding with update)
 *   - explicitly false (keep-new-visit) => hard_stop
 * - intent: new_visit + no same-date visit => create_new_visit
 * - later date always means new visit unless explicit same-date update intent
 */
export function resolveVisit(contract, sameDateLookup) {
    const reasons = [];
    const context = contract.visitContext;
    const intent = contract.workflowIntent;
    // Determine visit date to use
    const effectiveVisitDate = context.visitDate || context.targetVisitDate;
    if (isPatientOnlyUpdate(contract, effectiveVisitDate)) {
        reasons.push('patient_only_update_no_visit_needed');
        return {
            status: 'no_visit_needed',
            reasons,
        };
    }
    if (isCaseOnlyUpdate(contract, effectiveVisitDate)) {
        reasons.push('case_only_update_no_visit_needed');
        return {
            status: 'no_visit_needed',
            reasons,
        };
    }
    // Check same-date conditions
    const sameDateVisitExists = sameDateLookup.found && sameDateLookup.visitId;
    // Case 1: Explicit existing visit update intent
    if (intent === 'existing_visit_update') {
        if (sameDateLookup.found && sameDateLookup.visitId) {
            reasons.push('existing_visit_update_intent + same_date_visit_found');
            return {
                status: 'update_existing_visit_same_date',
                resolvedVisitId: sameDateLookup.visitId,
                matchedSameDateVisitId: sameDateLookup.visitId,
                reasons,
            };
        }
        // No same-date visit found - still proceed with existing visit intent
        // (The visit ID should have been resolved in contract parsing)
        reasons.push('existing_visit_update_intent + no_same_date_visit');
        const result = {
            status: 'update_existing_visit_same_date',
            reasons,
        };
        if (context.targetVisitId) {
            result.resolvedVisitId = context.targetVisitId;
        }
        return result;
    }
    // Case 2: New visit intent with same-date visit exists
    if (intent === 'new_patient_new_visit' || intent === 'existing_patient_new_visit') {
        if (sameDateLookup.found && sameDateLookup.visitId) {
            // A same-date visit exists - must handle correction flow
            const correctionConfirmed = context.doctorConfirmedCorrection;
            if (correctionConfirmed === null || correctionConfirmed === undefined) {
                // No correction decision yet => require correction
                reasons.push('new_visit_intent + same_date_visit_exists + correction_not_confirmed');
                return {
                    status: 'correction_needed_same_date_conflict',
                    matchedSameDateVisitId: sameDateLookup.visitId,
                    reasons,
                };
            }
            if (correctionConfirmed === false && context.visitDate !== context.targetVisitDate) {
                // Explicit keep-new-visit stance => hard stop
                // (only if intentional divergence from same-date)
                reasons.push('new_visit_intent + same_date_visit_exists + explicit_keep_new_visit_stance');
                return {
                    status: 'hard_stop_same_date_keep_new_visit_claim',
                    matchedSameDateVisitId: sameDateLookup.visitId,
                    reasons,
                };
            }
            if (correctionConfirmed === true) {
                // User confirmed => proceed with update
                reasons.push('new_visit_intent + same_date_visit_exists + correction_confirmed_true');
                return {
                    status: 'update_existing_visit_same_date',
                    resolvedVisitId: sameDateLookup.visitId,
                    matchedSameDateVisitId: sameDateLookup.visitId,
                    reasons,
                };
            }
        }
        // No same-date conflict => proceed with new visit
        reasons.push('new_visit_intent + no_same_date_visit_conflict');
        return {
            status: 'create_new_visit',
            reasons,
        };
    }
    if (intent === 'patient_update') {
        reasons.push('patient_update_intent + no_visit_needed');
        return {
            status: 'no_visit_needed',
            reasons,
        };
    }
    if (intent === 'case_update') {
        reasons.push('case_update_intent + no_visit_needed');
        return {
            status: 'no_visit_needed',
            reasons,
        };
    }
    // Case 3: Unknown intent or state
    reasons.push('visit_intent_unknown_or_unhandled');
    return {
        status: 'unresolved_visit_ambiguity',
        reasons,
    };
}
function isPatientOnlyUpdate(contract, effectiveVisitDate) {
    if (effectiveVisitDate) {
        return false;
    }
    if (contract.workflowIntent === 'patient_update') {
        return true;
    }
    const hasFindings = contract.findingsContext.toothItems.some((item) => item.branches.length > 0);
    if (hasFindings) {
        return false;
    }
    const hasPatientUpdateFields = (contract.patientClues.birthYear !== undefined &&
        String(contract.patientClues.birthYear) !== '') ||
        (typeof contract.patientClues.genderHint === 'string' &&
            contract.patientClues.genderHint.trim().length > 0);
    return hasPatientUpdateFields;
}
function isCaseOnlyUpdate(contract, effectiveVisitDate) {
    if (effectiveVisitDate) {
        return false;
    }
    if (contract.workflowIntent === 'case_update') {
        return true;
    }
    const hasFindings = contract.findingsContext.toothItems.some((item) => item.branches.length > 0);
    if (hasFindings) {
        return false;
    }
    if (!contract.caseUpdates) {
        return false;
    }
    const entries = Array.isArray(contract.caseUpdates)
        ? contract.caseUpdates
        : [contract.caseUpdates];
    return entries.some((entry) => {
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
            return false;
        }
        return ((typeof entry.caseId === 'string' && entry.caseId.trim().length > 0) ||
            (typeof entry['Case ID'] === 'string' && entry['Case ID'].trim().length > 0));
    });
}
