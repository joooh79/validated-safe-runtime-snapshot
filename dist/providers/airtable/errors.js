/**
 * Airtable Adapter Error Constructors
 *
 * Canonical error types for adapter failures.
 * Used to communicate exactly why an action failed or was blocked.
 */
/**
 * Extract error message from AirtableAdapterError
 */
export function getErrorMessage(error) {
    if ('message' in error) {
        return error.message;
    }
    if ('reason' in error) {
        return error.reason;
    }
    if (error.type === 'invalid_mapped_value') {
        return `Invalid mapped value for ${error.field}: expected ${error.expectedType}`;
    }
    if (error.type === 'missing_option_mapping') {
        return `Missing option mapping for ${error.field}=${error.value} in ${error.table}`;
    }
    if (error.type === 'missing_field_mapping') {
        return `Missing field mapping for ${error.field} in ${error.table}`;
    }
    if (error.type === 'missing_table_mapping') {
        return `Missing table mapping for ${error.entityType}`;
    }
    return 'Unknown adapter error';
}
export function canonConfirmRequiredError(field, table, reason) {
    return {
        type: 'canon_confirm_required',
        message: `Canon mapping required: ${field} in ${table}: ${reason}`,
        field,
        table,
    };
}
export function unsupportedActionError(actionType, reason) {
    return {
        type: 'unsupported_action',
        actionType,
        reason,
    };
}
export function missingTableMappingError(entityType) {
    return {
        type: 'missing_table_mapping',
        entityType,
    };
}
export function missingFieldMappingError(table, field) {
    return {
        type: 'missing_field_mapping',
        table,
        field,
    };
}
export function missingOptionMappingError(field, value, table) {
    return {
        type: 'missing_option_mapping',
        field,
        value,
        table,
    };
}
export function invalidMappedValueError(field, value, expectedType) {
    return {
        type: 'invalid_mapped_value',
        field,
        value,
        expectedType,
    };
}
export function invalidProviderResponseError(message, response) {
    return {
        type: 'invalid_provider_response',
        message,
        response,
    };
}
export function unsafeWriteBlockedError(reason) {
    return {
        type: 'unsafe_write_blocked',
        reason,
    };
}
