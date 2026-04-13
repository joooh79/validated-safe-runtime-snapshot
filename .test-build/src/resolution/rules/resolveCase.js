/**
 * Resolve case continuity
 *
 * Behavioral requirements:
 * - same tooth + same episode + later date => continue_case
 * - same tooth + new episode => create_case or split_case
 * - same-date correction is visit correction first (case implications secondary)
 * - new visit, findings with multiple teeth => may create multiple cases
 * - unresolved episode identity => ambiguity
 */
export function resolveCase(contract, visitResolution, lookups) {
    const reasons = [];
    const continuityIntent = contract.continuityIntent;
    const findings = contract.findingsContext;
    const toothItems = findings.toothItems ?? [];
    const visitDate = contract.visitContext.visitDate;
    const touchedTeeth = [...new Set(toothItems
            .map((item) => item.toothNumber)
            .filter((tooth) => typeof tooth === 'string' && tooth.length > 0))];
    const firstTooth = touchedTeeth[0];
    const hasSingleTooth = touchedTeeth.length === 1 && Boolean(firstTooth);
    const caseContext = (toothNumber) => ({
        ...(toothNumber ? { toothNumber } : {}),
        ...(visitDate ? { visitDate } : {}),
    });
    // If no findings, no case to resolve
    if (!toothItems || toothItems.length === 0) {
        reasons.push('no_findings_no_case_needed');
        return {
            status: 'none',
            reasons,
        };
    }
    // If visit is same-date update, case handling is secondary
    if (visitResolution.status === 'update_existing_visit_same_date') {
        reasons.push('same_date_correction_visit_takes_precedence');
        // For same-date corrections, typically no new case
        // (snapshots will be updated, not created)
        return {
            status: 'none',
            reasons,
        };
    }
    // If creating new visit, determine case behavior
    if (visitResolution.status === 'create_new_visit') {
        // Explicit continuity intent
        if (continuityIntent === 'continue_case') {
            reasons.push('continuity_intent_continue_case');
            if (!hasSingleTooth || !firstTooth) {
                reasons.push('continue_case_requires_single_tooth_scope');
                return {
                    status: 'unresolved_case_ambiguity',
                    ...caseContext(firstTooth),
                    reasons,
                };
            }
            // Case ID should be indicated in lookups
            if (lookups.caseLookups[firstTooth]) {
                const caseInfo = lookups.caseLookups[firstTooth];
                if (caseInfo.found && caseInfo.caseId) {
                    const target = createCaseTarget('continue_case', firstTooth, visitDate, reasons, {
                        resolvedCaseId: caseInfo.caseId,
                    });
                    return finalizeCaseResolution('continue_case', [target], reasons);
                }
            }
            // Case not found but intent is to continue => ambiguity
            reasons.push('continue_case_intent_but_case_not_found');
            return {
                status: 'unresolved_case_ambiguity',
                ...caseContext(firstTooth),
                reasons,
            };
        }
        if (continuityIntent === 'create_case') {
            reasons.push('continuity_intent_create_case');
            if (!hasSingleTooth || !firstTooth || !visitDate) {
                reasons.push('create_case_requires_single_tooth_and_visit_date');
                return {
                    status: 'unresolved_case_ambiguity',
                    ...caseContext(firstTooth),
                    reasons,
                };
            }
            return finalizeCaseResolution('create_case', [createCaseTarget('create_case', firstTooth, visitDate, reasons)], reasons);
        }
        if (continuityIntent === 'split_case') {
            reasons.push('continuity_intent_split_case');
            if (!hasSingleTooth || !firstTooth) {
                reasons.push('split_case_requires_single_tooth_scope');
                return {
                    status: 'unresolved_case_ambiguity',
                    ...caseContext(firstTooth),
                    reasons,
                };
            }
            return {
                status: 'split_case',
                ...caseContext(firstTooth),
                reasons,
            };
        }
        if (continuityIntent === 'close_case') {
            reasons.push('continuity_intent_close_case');
            if (!hasSingleTooth || !firstTooth) {
                reasons.push('close_case_requires_single_tooth_scope');
                return {
                    status: 'unresolved_case_ambiguity',
                    ...caseContext(firstTooth),
                    reasons,
                };
            }
            // Case should exist; find it
            if (lookups.caseLookups[firstTooth]) {
                const caseInfo = lookups.caseLookups[firstTooth];
                if (caseInfo.found && caseInfo.caseId) {
                    const target = createCaseTarget('close_case', firstTooth, visitDate, reasons, {
                        resolvedCaseId: caseInfo.caseId,
                    });
                    return finalizeCaseResolution('close_case', [target], reasons);
                }
            }
            reasons.push('close_case_intent_but_case_not_found');
            return {
                status: 'unresolved_case_ambiguity',
                ...caseContext(firstTooth),
                reasons,
            };
        }
        // No explicit continuity intent => infer from findings
        // If findings reference a single tooth, try to continue existing case
        if (hasSingleTooth && firstTooth) {
            const caseInfo = lookups.caseLookups[firstTooth];
            if (caseInfo && caseInfo.found && caseInfo.caseId) {
                reasons.push('single_tooth_findings_infer_continue_case');
                const target = createCaseTarget('continue_case', firstTooth, visitDate, reasons, {
                    resolvedCaseId: caseInfo.caseId,
                });
                return finalizeCaseResolution('continue_case', [target], reasons);
            }
        }
        if (continuityIntent === 'none' &&
            contract.workflowIntent === 'new_patient_new_visit' &&
            visitDate &&
            touchedTeeth.length > 0) {
            reasons.push('continuity_intent_none + new_patient_new_visit_auto_create_case');
            const targets = touchedTeeth.map((toothNumber) => createCaseTarget('create_case', toothNumber, visitDate, reasons));
            return finalizeCaseResolution('create_case', targets, reasons);
        }
        // Safe-slice default outside the new-patient auto-create path.
        reasons.push('no_explicit_case_intent_safe_slice_none');
        return {
            status: 'none',
            reasons,
        };
    }
    // Other visit statuses (correction needed, hard stop, etc.) => no case action
    reasons.push('visit_status_requires_blocking_case_resolution');
    return {
        status: 'none',
        reasons,
    };
}
function createCaseTarget(status, toothNumber, visitDate, reasons, overrides = {}) {
    return {
        status,
        toothNumber,
        ...(visitDate ? { visitDate } : {}),
        reasons: [...reasons],
        ...overrides,
    };
}
function finalizeCaseResolution(status, targets, reasons) {
    const firstTarget = targets[0];
    return {
        status,
        ...(firstTarget?.resolvedCaseId ? { resolvedCaseId: firstTarget.resolvedCaseId } : {}),
        ...(targets.length === 1 && firstTarget?.toothNumber
            ? { toothNumber: firstTarget.toothNumber }
            : {}),
        ...(firstTarget?.visitDate ? { visitDate: firstTarget.visitDate } : {}),
        ...(firstTarget?.relatedCaseIds ? { relatedCaseIds: firstTarget.relatedCaseIds } : {}),
        targets,
        reasons,
    };
}
