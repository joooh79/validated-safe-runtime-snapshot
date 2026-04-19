const DIRECT_CASE_LOOKUP_KEY = '__direct_case__';
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
    const directCaseUpdate = extractDirectCaseUpdate(contract.caseUpdates);
    if (contract.workflowIntent === 'case_update' ||
        (directCaseUpdate &&
            toothItems.length === 0 &&
            visitResolution.status === 'no_visit_needed')) {
        reasons.push('workflow_intent_case_update');
        if (!directCaseUpdate?.caseId) {
            reasons.push('case_update_requires_exact_case_id');
            return {
                status: 'unresolved_case_ambiguity',
                reasons,
            };
        }
        if (Object.keys(directCaseUpdate.intendedChanges).length === 0) {
            reasons.push('case_update_requires_recognized_case_fields');
            return {
                status: 'none',
                reasons,
            };
        }
        const directLookup = lookups.caseLookups[DIRECT_CASE_LOOKUP_KEY];
        const resolvedToothNumber = directLookup?.toothNumber || directCaseUpdate.toothNumber;
        const target = {
            status: 'direct_case_update',
            ...(resolvedToothNumber ? { toothNumber: resolvedToothNumber } : {}),
            resolvedCaseId: directLookup?.caseId || directCaseUpdate.caseId,
            ...(directLookup?.recordId
                ? { resolvedCaseRecordRef: directLookup.recordId }
                : {}),
            ...(directLookup?.episodeStartDate
                ? { episodeStartDate: directLookup.episodeStartDate }
                : {}),
            reasons: ['direct_case_update'],
        };
        reasons.push('direct_case_update_from_case_id');
        return finalizeCaseResolution('direct_case_update', [target], reasons);
    }
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
            const candidates = resolveContinueCaseCandidates(lookups, firstTooth);
            if (candidates.length === 1) {
                const candidate = candidates[0];
                const target = createCaseTarget('continue_case', firstTooth, visitDate, reasons, {
                    ...(candidate.resolvedCaseId ? { resolvedCaseId: candidate.resolvedCaseId } : {}),
                    ...(candidate.resolvedCaseRecordRef
                        ? { resolvedCaseRecordRef: candidate.resolvedCaseRecordRef }
                        : {}),
                    ...(candidate.episodeStartDate ? { episodeStartDate: candidate.episodeStartDate } : {}),
                    ...(candidate.latestVisitDate ? { latestVisitDate: candidate.latestVisitDate } : {}),
                    ...(candidate.episodeStatus ? { episodeStatus: candidate.episodeStatus } : {}),
                });
                return finalizeCaseResolution('continue_case', [target], reasons);
            }
            if (candidates.length > 1) {
                reasons.push('continue_case_multiple_candidates_found');
                return {
                    status: 'unresolved_case_ambiguity',
                    ...caseContext(firstTooth),
                    candidateCases: candidates,
                    reasons,
                };
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
            const candidates = resolveContinueCaseCandidates(lookups, firstTooth);
            if (candidates.length === 1) {
                const candidate = candidates[0];
                reasons.push('single_tooth_findings_infer_continue_case');
                const target = createCaseTarget('continue_case', firstTooth, visitDate, reasons, {
                    ...(candidate.resolvedCaseId ? { resolvedCaseId: candidate.resolvedCaseId } : {}),
                    ...(candidate.resolvedCaseRecordRef
                        ? { resolvedCaseRecordRef: candidate.resolvedCaseRecordRef }
                        : {}),
                    ...(candidate.episodeStartDate ? { episodeStartDate: candidate.episodeStartDate } : {}),
                    ...(candidate.latestVisitDate ? { latestVisitDate: candidate.latestVisitDate } : {}),
                    ...(candidate.episodeStatus ? { episodeStatus: candidate.episodeStatus } : {}),
                });
                return finalizeCaseResolution('continue_case', [target], reasons);
            }
            if (candidates.length > 1) {
                reasons.push('single_tooth_findings_multiple_continue_case_candidates');
                return {
                    status: 'unresolved_case_ambiguity',
                    ...caseContext(firstTooth),
                    candidateCases: candidates,
                    reasons,
                };
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
        ...(firstTarget?.resolvedCaseRecordRef
            ? { resolvedCaseRecordRef: firstTarget.resolvedCaseRecordRef }
            : {}),
        ...(targets.length === 1 && firstTarget?.toothNumber
            ? { toothNumber: firstTarget.toothNumber }
            : {}),
        ...(firstTarget?.visitDate ? { visitDate: firstTarget.visitDate } : {}),
        ...(firstTarget?.episodeStartDate ? { episodeStartDate: firstTarget.episodeStartDate } : {}),
        ...(firstTarget?.relatedCaseIds ? { relatedCaseIds: firstTarget.relatedCaseIds } : {}),
        targets,
        reasons,
    };
}
function resolveContinueCaseCandidates(lookups, toothNumber) {
    const explicitCandidates = lookups.caseCandidateLookups?.[toothNumber] ?? [];
    if (explicitCandidates.length > 0) {
        return explicitCandidates.map((candidate) => ({
            toothNumber,
            ...(candidate.caseId ? { resolvedCaseId: candidate.caseId } : {}),
            ...(candidate.recordId ? { resolvedCaseRecordRef: candidate.recordId } : {}),
            ...(candidate.episodeStartDate ? { episodeStartDate: candidate.episodeStartDate } : {}),
            ...(candidate.latestVisitDate ? { latestVisitDate: candidate.latestVisitDate } : {}),
            ...(candidate.status ? { episodeStatus: candidate.status } : {}),
            ...(candidate.latestSummary ? { summaryHint: candidate.latestSummary } : {}),
            reasons: ['case_candidate_lookup'],
        }));
    }
    const caseInfo = lookups.caseLookups[toothNumber];
    if (caseInfo?.found && caseInfo.caseId) {
        return [{
                toothNumber,
                resolvedCaseId: caseInfo.caseId,
                ...(caseInfo.recordId ? { resolvedCaseRecordRef: caseInfo.recordId } : {}),
                ...(caseInfo.episodeStartDate ? { episodeStartDate: caseInfo.episodeStartDate } : {}),
                ...(caseInfo.latestVisitDate ? { latestVisitDate: caseInfo.latestVisitDate } : {}),
                ...(caseInfo.status ? { episodeStatus: caseInfo.status } : {}),
                ...(caseInfo.latestSummary ? { summaryHint: caseInfo.latestSummary } : {}),
                reasons: ['case_lookup_match'],
            }];
    }
    return [];
}
function extractDirectCaseUpdate(caseUpdates) {
    if (!caseUpdates) {
        return undefined;
    }
    const entries = Array.isArray(caseUpdates) ? caseUpdates : [caseUpdates];
    for (const entry of entries) {
        if (!isRecord(entry) || 'byTooth' in entry || 'items' in entry) {
            continue;
        }
        const caseId = typeof entry.caseId === 'string' && entry.caseId.trim()
            ? entry.caseId.trim()
            : typeof entry['Case ID'] === 'string' && entry['Case ID'].trim()
                ? entry['Case ID'].trim()
                : undefined;
        if (!caseId) {
            continue;
        }
        return {
            caseId,
            ...(typeof entry.toothNumber === 'string' && entry.toothNumber.trim()
                ? { toothNumber: entry.toothNumber.trim() }
                : {}),
            intendedChanges: collectRecognizedCaseUpdateFields(entry),
        };
    }
    return undefined;
}
function collectRecognizedCaseUpdateFields(entry) {
    const aliases = {
        episodeStatus: ['episodeStatus', 'Episode status'],
        latestSummary: ['latestSummary', 'Latest summary'],
        latestWorkingDiagnosis: ['latestWorkingDiagnosis', 'Latest working diagnosis'],
        latestWorkingPlan: ['latestWorkingPlan', 'Latest working plan'],
        finalProsthesisPlanDate: ['finalProsthesisPlanDate', 'Final prosthesis plan date'],
        finalPrepAndScanDate: ['finalPrepAndScanDate', 'Final prep & scan date'],
        finalProsthesisDeliveryDate: [
            'finalProsthesisDeliveryDate',
            'Final prosthesis delivery date',
        ],
        latestPostDeliveryFollowUpDate: [
            'latestPostDeliveryFollowUpDate',
            'Latest post-delivery follow-up date',
        ],
        latestPostDeliveryFollowUpResult: [
            'latestPostDeliveryFollowUpResult',
            'Latest post-delivery follow-up result',
        ],
    };
    const collected = {};
    for (const [targetKey, candidateKeys] of Object.entries(aliases)) {
        for (const candidateKey of candidateKeys) {
            if (!(candidateKey in entry)) {
                continue;
            }
            const value = entry[candidateKey];
            if (isMeaningfulValue(value)) {
                collected[targetKey] = value;
                break;
            }
        }
    }
    return collected;
}
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function isMeaningfulValue(value) {
    if (value === undefined || value === null) {
        return false;
    }
    if (typeof value === 'string') {
        return value.trim().length > 0;
    }
    if (Array.isArray(value)) {
        return value.length > 0;
    }
    return true;
}
