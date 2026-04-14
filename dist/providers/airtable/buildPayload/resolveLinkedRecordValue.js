import { canonConfirmRequiredError } from '../errors.js';
import { normalizeLinkedRef } from './normalizeAirtableValue.js';
export function resolveLinkedRecordRef(input) {
    const { dependencyActionId, resolvedRefs, requireRuntimeRefs = false, fallbackRef, canonField, table, missingRefMessage, } = input;
    if (dependencyActionId) {
        if (!requireRuntimeRefs) {
            return `preflight_${dependencyActionId}`;
        }
        const resolvedRef = resolvedRefs?.[dependencyActionId];
        if (resolvedRef) {
            return resolvedRef;
        }
    }
    if (typeof fallbackRef === 'string' && fallbackRef.trim()) {
        const normalized = normalizeLinkedRef(fallbackRef);
        if (!isAdapterError(normalized)) {
            return normalized;
        }
    }
    return canonConfirmRequiredError(canonField, table, missingRefMessage);
}
export function buildLinkedRecordCell(input) {
    const resolved = resolveLinkedRecordRef(input);
    if (isAdapterError(resolved)) {
        return resolved;
    }
    return [resolved];
}
export function toLinkedRecordCell(recordId) {
    return [recordId];
}
function isAdapterError(value) {
    return typeof value === 'object' && value !== null && 'type' in value;
}
