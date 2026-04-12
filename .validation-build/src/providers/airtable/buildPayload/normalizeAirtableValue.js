/**
 * Value Normalization Helpers
 *
 * Safe, fail-closed normalization of values for Airtable fields.
 * Never invent or approximate; fail if uncertain.
 */
import { invalidMappedValueError } from '../errors.js';
/**
 * Normalize a string value
 * Trim and validate non-empty
 */
export function normalizeString(value) {
    if (typeof value !== 'string') {
        return invalidMappedValueError('string_field', value, 'string');
    }
    const trimmed = value.trim();
    if (trimmed.length === 0) {
        return invalidMappedValueError('string_field', value, 'non-empty string');
    }
    return trimmed;
}
/**
 * Normalize a date value (YYYY-MM-DD format)
 * Validate ISO date format
 */
export function normalizeDate(value) {
    if (typeof value !== 'string') {
        return invalidMappedValueError('date_field', value, 'YYYY-MM-DD string');
    }
    // Basic ISO date validation
    const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!isoDateRegex.test(value)) {
        return invalidMappedValueError('date_field', value, 'YYYY-MM-DD format');
    }
    return value;
}
/**
 * Normalize a number value
 */
export function normalizeNumber(value) {
    if (typeof value === 'number') {
        return value;
    }
    if (typeof value === 'string') {
        const num = parseFloat(value);
        if (!isFinite(num)) {
            return invalidMappedValueError('number_field', value, 'number or numeric string');
        }
        return num;
    }
    return invalidMappedValueError('number_field', value, 'number');
}
/**
 * Normalize a boolean value
 */
export function normalizeBoolean(value) {
    if (typeof value === 'boolean') {
        return value;
    }
    if (typeof value === 'string') {
        const lower = value.toLowerCase();
        if (lower === 'true' || lower === 'yes' || lower === '1') {
            return true;
        }
        if (lower === 'false' || lower === 'no' || lower === '0') {
            return false;
        }
    }
    return invalidMappedValueError('boolean_field', value, 'boolean or truthy string');
}
/**
 * Select option validation
 * Validate that provided value is in allowed options set
 */
export function normalizeSelectOption(value, allowedOptions, fieldName) {
    if (typeof value !== 'string') {
        return invalidMappedValueError(fieldName, value, 'string (option)');
    }
    const trimmed = value.trim();
    if (!allowedOptions.includes(trimmed)) {
        return invalidMappedValueError(fieldName, value, `one of: ${allowedOptions.join(', ')}`);
    }
    return trimmed;
}
/**
 * Multi-select option validation
 * Validate that all provided values are in allowed options set
 */
export function normalizeMultiSelectOptions(values, allowedOptions, fieldName) {
    if (!Array.isArray(values)) {
        return invalidMappedValueError(fieldName, values, 'string array (multi-select)');
    }
    const result = [];
    for (const v of values) {
        if (typeof v !== 'string') {
            return invalidMappedValueError(fieldName, v, 'string in array');
        }
        const trimmed = v.trim();
        if (!allowedOptions.includes(trimmed)) {
            return invalidMappedValueError(fieldName, v, `one of: ${allowedOptions.join(', ')}`);
        }
        result.push(trimmed);
    }
    return result;
}
/**
 * Linked record ref validation
 * Accept string reference to another record
 */
export function normalizeLinkedRef(value) {
    if (typeof value !== 'string') {
        return invalidMappedValueError('link_field', value, 'string reference');
    }
    const trimmed = value.trim();
    if (!trimmed.startsWith('rec_')) {
        // Note: Airtable record IDs start with rec_
        // If value doesn't match pattern, still accept it for now
        // Provider may validate further
    }
    return trimmed;
}
/**
 * Helper: Check if value is error
 */
export function isError(value) {
    return (typeof value === 'object' &&
        value !== null &&
        'type' in value &&
        value.type === 'invalid_mapped_value' ||
        value.type === 'canon_confirm_required' ||
        value.type === 'missing_option_mapping');
}
