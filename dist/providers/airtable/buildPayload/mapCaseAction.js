/**
 * Case Action Payload Builder
 *
 * Stage 5 scope:
 * - create_case
 * - update_case_latest_synthesis for safe continuation on an existing case
 *
 * Still blocked:
 * - split_case
 * - close_case
 * - ambiguous reassignment
 * - explicit Case/Visit/Snapshot link writes beyond the minimal active scope
 */
import { canonConfirmRequiredError, unsupportedActionError, } from '../errors.js';
import { normalizeDate, normalizeSelectOption, normalizeString, } from './normalizeAirtableValue.js';
import { buildLinkedRecordCell } from './resolveLinkedRecordValue.js';
export function mapCaseAction(input) {
    const { action, registry, resolvedRefs, requireRuntimeRefs = false, } = input;
    if (action.entityType !== 'case') {
        return {
            success: false,
            error: unsupportedActionError(action.actionType, 'not a case action'),
        };
    }
    switch (action.actionType) {
        case 'create_case':
            return mapCreateCase(action, registry, resolvedRefs, requireRuntimeRefs);
        case 'update_case_latest_synthesis':
            return mapUpdateCaseLatestSynthesis(action, registry);
        case 'split_case':
        case 'close_case':
            return {
                success: false,
                error: canonConfirmRequiredError(`action_${action.actionType}`, 'Cases', `${action.actionType} remains blocked pending explicit status-transition, lineage, and replay semantics`),
            };
        case 'no_op_case':
            return {
                success: true,
                request: {
                    table: 'Cases',
                    fields: {},
                },
            };
        default:
            return {
                success: false,
                error: unsupportedActionError(action.actionType, 'unknown case action'),
            };
    }
}
function mapCreateCase(action, registry, resolvedRefs, requireRuntimeRefs = false) {
    const patientIdentity = normalizeString(action.target.patientId);
    if (isAdapterError(patientIdentity)) {
        return {
            success: false,
            error: canonConfirmRequiredError('Cases.Patient ID', 'Cases', 'create_case currently requires a resolved patient identifier; create_case after unresolved/new patient creation remains blocked'),
        };
    }
    if (patientIdentity === 'NEW') {
        return {
            success: false,
            error: canonConfirmRequiredError('Cases.Patient ID', 'Cases', 'create_case currently requires an existing resolved patient identifier; chained create_patient -> create_case linking is still deferred'),
        };
    }
    const toothNumber = normalizeString(action.target.toothNumber);
    if (isAdapterError(toothNumber)) {
        return {
            success: false,
            error: canonConfirmRequiredError('Cases.Tooth number', 'Cases', 'create_case requires an exact single-tooth target'),
        };
    }
    const episodeStartDate = normalizeDate(action.target.episodeStartDate);
    if (isAdapterError(episodeStartDate)) {
        return {
            success: false,
            error: canonConfirmRequiredError('Cases.Episode start date', 'Cases', 'create_case requires an exact visit/episode start date in YYYY-MM-DD format'),
        };
    }
    const patientLinkValue = buildLinkedRecordCell({
        dependencyActionId: action.dependsOnActionIds[0],
        resolvedRefs,
        requireRuntimeRefs,
        fallbackRef: action.target.patientId,
        canonField: 'Cases.Patient ID',
        table: 'Cases',
        missingRefMessage: 'create_case requires a resolved patient record reference at execution time',
    });
    if (isAdapterError(patientLinkValue)) {
        return {
            success: false,
            error: patientLinkValue,
        };
    }
    const caseId = buildCaseId(patientIdentity, toothNumber, episodeStartDate);
    const latestVisitId = buildVisitId(patientIdentity, episodeStartDate);
    return {
        success: true,
        request: {
            table: 'Cases',
            fields: {
                [registry.caseFields.caseId.fieldName]: caseId,
                [registry.caseFields.patientId.fieldName]: patientLinkValue,
                [registry.caseFields.toothNumber.fieldName]: toothNumber,
                [registry.caseFields.episodeStartDate.fieldName]: episodeStartDate,
                [registry.caseFields.episodeStatus.fieldName]: registry.episodeStatusOptions.open,
                [registry.caseFields.latestVisitId.fieldName]: latestVisitId,
            },
        },
    };
}
function mapUpdateCaseLatestSynthesis(action, registry) {
    const recordId = action.target.entityRef || action.target.caseId;
    if (!recordId || recordId === 'NEW') {
        return {
            success: false,
            error: canonConfirmRequiredError('Cases.Case ID', 'Cases', 'case continuation update requires a resolved existing case identifier'),
        };
    }
    const isDirectCaseUpdate = action.target.sourceResolutionPath === 'case_direct_update';
    const normalizedPatientId = normalizeString(action.target.patientId);
    const normalizedVisitDate = normalizeDate(action.target.visitDate);
    if (!isDirectCaseUpdate &&
        (isAdapterError(normalizedPatientId) || isAdapterError(normalizedVisitDate))) {
        return {
            success: false,
            error: canonConfirmRequiredError('Cases.Latest Visit ID', 'Cases', 'case continuation update requires resolved patient identity and visit date to derive the canonical latest visit id'),
        };
    }
    const fields = {};
    if (!isDirectCaseUpdate) {
        fields[registry.caseFields.latestVisitId.fieldName] = buildVisitId(normalizedPatientId, normalizedVisitDate);
        fields[registry.caseFields.episodeStatus.fieldName] =
            registry.episodeStatusOptions.open;
    }
    const intended = action.payloadIntent?.intendedChanges;
    if (typeof intended?.latestSummary === 'string' && intended.latestSummary.trim()) {
        fields[registry.caseFields.latestSummary.fieldName] = intended.latestSummary.trim();
    }
    if (typeof intended?.latestWorkingDiagnosis === 'string' &&
        intended.latestWorkingDiagnosis.trim()) {
        fields[registry.caseFields.latestWorkingDiagnosis.fieldName] =
            intended.latestWorkingDiagnosis.trim();
    }
    if (typeof intended?.latestWorkingPlan === 'string' && intended.latestWorkingPlan.trim()) {
        fields[registry.caseFields.latestWorkingPlan.fieldName] = intended.latestWorkingPlan.trim();
    }
    const episodeStatus = maybeNormalizeSelect(intended?.episodeStatus, Object.values(registry.episodeStatusOptions), registry.caseFields.episodeStatus.fieldName);
    if (isAdapterError(episodeStatus)) {
        return {
            success: false,
            error: episodeStatus,
        };
    }
    if (episodeStatus) {
        fields[registry.caseFields.episodeStatus.fieldName] = episodeStatus;
    }
    const finalProsthesisPlanDate = maybeNormalizeDate(intended?.finalProsthesisPlanDate);
    if (isAdapterError(finalProsthesisPlanDate)) {
        return {
            success: false,
            error: finalProsthesisPlanDate,
        };
    }
    if (finalProsthesisPlanDate) {
        fields[registry.caseFields.finalProsthesisPlanDate.fieldName] = finalProsthesisPlanDate;
    }
    const finalPrepAndScanDate = maybeNormalizeDate(intended?.finalPrepAndScanDate);
    if (isAdapterError(finalPrepAndScanDate)) {
        return {
            success: false,
            error: finalPrepAndScanDate,
        };
    }
    if (finalPrepAndScanDate) {
        fields[registry.caseFields.finalPrepAndScanDate.fieldName] = finalPrepAndScanDate;
    }
    const finalProsthesisDeliveryDate = maybeNormalizeDate(intended?.finalProsthesisDeliveryDate);
    if (isAdapterError(finalProsthesisDeliveryDate)) {
        return {
            success: false,
            error: finalProsthesisDeliveryDate,
        };
    }
    if (finalProsthesisDeliveryDate) {
        fields[registry.caseFields.finalProsthesisDeliveryDate.fieldName] =
            finalProsthesisDeliveryDate;
    }
    const latestPostDeliveryFollowUpDate = maybeNormalizeDate(intended?.latestPostDeliveryFollowUpDate);
    if (isAdapterError(latestPostDeliveryFollowUpDate)) {
        return {
            success: false,
            error: latestPostDeliveryFollowUpDate,
        };
    }
    if (latestPostDeliveryFollowUpDate) {
        fields[registry.caseFields.latestPostDeliveryFollowUpDate.fieldName] =
            latestPostDeliveryFollowUpDate;
    }
    const latestPostDeliveryFollowUpResult = maybeNormalizeSelect(intended?.latestPostDeliveryFollowUpResult, Object.values(registry.postDeliveryFollowUpResultOptions), registry.caseFields.latestPostDeliveryFollowUpResult.fieldName);
    if (isAdapterError(latestPostDeliveryFollowUpResult)) {
        return {
            success: false,
            error: latestPostDeliveryFollowUpResult,
        };
    }
    if (latestPostDeliveryFollowUpResult) {
        fields[registry.caseFields.latestPostDeliveryFollowUpResult.fieldName] =
            latestPostDeliveryFollowUpResult;
    }
    return {
        success: true,
        request: {
            table: 'Cases',
            recordId,
            fields,
        },
    };
}
function buildCaseId(patientId, toothNumber, episodeStartDate) {
    return `CASE-${patientId}-${toothNumber}-${compactDate(episodeStartDate)}`;
}
function buildVisitId(patientId, visitDate) {
    return `VISIT-${patientId}-${compactDate(visitDate)}`;
}
function compactDate(date) {
    return date.replaceAll('-', '');
}
function maybeNormalizeDate(value) {
    if (value === undefined || value === null || value === '') {
        return undefined;
    }
    return normalizeDate(value);
}
function maybeNormalizeSelect(value, allowedOptions, fieldName) {
    if (value === undefined || value === null || value === '') {
        return undefined;
    }
    return normalizeSelectOption(value, allowedOptions, fieldName);
}
function isAdapterError(value) {
    return (typeof value === 'object' &&
        value !== null &&
        'type' in value);
}
