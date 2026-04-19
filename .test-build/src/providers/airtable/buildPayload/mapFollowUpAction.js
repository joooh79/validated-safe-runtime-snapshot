import { unsupportedActionError } from '../errors.js';
import { normalizeDate, normalizeSelectOption, normalizeString, } from './normalizeAirtableValue.js';
import { buildLinkedRecordCell } from './resolveLinkedRecordValue.js';
export function mapFollowUpAction(input) {
    const { action, registry, resolvedRefs, requireRuntimeRefs = false, } = input;
    if (action.entityType !== 'follow_up') {
        return {
            success: false,
            error: unsupportedActionError(action.actionType, 'not a follow-up action'),
        };
    }
    if (action.actionType !== 'create_post_delivery_follow_up') {
        return {
            success: false,
            error: unsupportedActionError(action.actionType, 'unknown follow-up action'),
        };
    }
    const fields = {};
    const intended = action.payloadIntent?.intendedChanges;
    const patientLinkValue = buildLinkedRecordCell({
        dependencyActionId: action.dependsOnActionIds[0],
        resolvedRefs,
        requireRuntimeRefs,
        fallbackRef: action.target.patientId,
        canonField: 'Post-delivery Follow-ups.Patient ID',
        table: 'Post-delivery Follow-ups',
        missingRefMessage: 'create_post_delivery_follow_up requires a resolved patient record reference at execution time',
    });
    if (isAdapterError(patientLinkValue)) {
        return { success: false, error: patientLinkValue };
    }
    fields[registry.postDeliveryFollowUpFields.patientId.fieldName] = patientLinkValue;
    const visitLinkValue = buildLinkedRecordCell({
        dependencyActionId: action.dependsOnActionIds[1],
        resolvedRefs,
        requireRuntimeRefs,
        fallbackRef: action.target.visitId,
        canonField: 'Post-delivery Follow-ups.Visit ID',
        table: 'Post-delivery Follow-ups',
        missingRefMessage: 'create_post_delivery_follow_up requires a resolved visit record reference at execution time',
    });
    if (isAdapterError(visitLinkValue)) {
        return { success: false, error: visitLinkValue };
    }
    fields[registry.postDeliveryFollowUpFields.visitId.fieldName] = visitLinkValue;
    const caseLinkValue = buildLinkedRecordCell({
        dependencyActionId: action.dependsOnActionIds[2],
        resolvedRefs,
        requireRuntimeRefs,
        fallbackRef: action.target.caseId,
        canonField: 'Post-delivery Follow-ups.Case ID',
        table: 'Post-delivery Follow-ups',
        missingRefMessage: 'create_post_delivery_follow_up requires a resolved case record reference at execution time',
    });
    if (isAdapterError(caseLinkValue)) {
        return { success: false, error: caseLinkValue };
    }
    fields[registry.postDeliveryFollowUpFields.caseId.fieldName] = caseLinkValue;
    const toothNumber = maybeNormalizeString(action.target.toothNumber);
    if (isAdapterError(toothNumber)) {
        return { success: false, error: toothNumber };
    }
    if (toothNumber) {
        fields[registry.postDeliveryFollowUpFields.toothNumber.fieldName] = toothNumber;
    }
    const followUpDate = maybeNormalizeDate(intended?.followUpDate);
    if (isAdapterError(followUpDate)) {
        return { success: false, error: followUpDate };
    }
    if (followUpDate) {
        fields[registry.postDeliveryFollowUpFields.followUpDate.fieldName] = followUpDate;
    }
    const followUpResult = maybeNormalizeSelect(intended?.followUpResult, Object.values(registry.postDeliveryFollowUpResultOptions), registry.postDeliveryFollowUpFields.followUpResult.fieldName);
    if (isAdapterError(followUpResult)) {
        return { success: false, error: followUpResult };
    }
    if (followUpResult) {
        fields[registry.postDeliveryFollowUpFields.followUpResult.fieldName] = followUpResult;
    }
    const issueSummary = maybeNormalizeString(intended?.issueSummary);
    if (isAdapterError(issueSummary)) {
        return { success: false, error: issueSummary };
    }
    if (issueSummary) {
        fields[registry.postDeliveryFollowUpFields.issueSummary.fieldName] = issueSummary;
    }
    const followUpNotes = maybeNormalizeString(intended?.followUpNotes);
    if (isAdapterError(followUpNotes)) {
        return { success: false, error: followUpNotes };
    }
    if (followUpNotes) {
        fields[registry.postDeliveryFollowUpFields.followUpNotes.fieldName] = followUpNotes;
    }
    return {
        success: true,
        request: {
            table: 'Post-delivery Follow-ups',
            fields,
        },
    };
}
function maybeNormalizeDate(value) {
    if (value === undefined || value === null || value === '') {
        return undefined;
    }
    return normalizeDate(value);
}
function maybeNormalizeString(value) {
    if (value === undefined || value === null || value === '') {
        return undefined;
    }
    return normalizeString(value);
}
function maybeNormalizeSelect(value, allowedOptions, fieldName) {
    if (value === undefined || value === null || value === '') {
        return undefined;
    }
    return normalizeSelectOption(value, allowedOptions, fieldName);
}
function isAdapterError(value) {
    return typeof value === 'object' && value !== null && 'type' in value;
}
