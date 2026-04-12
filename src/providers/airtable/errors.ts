/**
 * Airtable Adapter Error Constructors
 *
 * Canonical error types for adapter failures.
 * Used to communicate exactly why an action failed or was blocked.
 */

import type { AirtableAdapterError } from './types.js';

/**
 * Extract error message from AirtableAdapterError
 */
export function getErrorMessage(error: AirtableAdapterError): string {
  if ('message' in error) {
    return error.message;
  }
  if ('reason' in error) {
    return error.reason;
  }
  return 'Unknown adapter error';
}

export function canonConfirmRequiredError(
  field: string,
  table: string,
  reason: string,
): AirtableAdapterError {
  return {
    type: 'canon_confirm_required',
    message: `Canon mapping required: ${field} in ${table}: ${reason}`,
    field,
    table,
  };
}

export function unsupportedActionError(
  actionType: string,
  reason: string,
): AirtableAdapterError {
  return {
    type: 'unsupported_action',
    actionType,
    reason,
  };
}

export function missingTableMappingError(entityType: string): AirtableAdapterError {
  return {
    type: 'missing_table_mapping',
    entityType,
  };
}

export function missingFieldMappingError(table: string, field: string): AirtableAdapterError {
  return {
    type: 'missing_field_mapping',
    table,
    field,
  };
}

export function missingOptionMappingError(
  field: string,
  value: string,
  table: string,
): AirtableAdapterError {
  return {
    type: 'missing_option_mapping',
    field,
    value,
    table,
  };
}

export function invalidMappedValueError(
  field: string,
  value: unknown,
  expectedType: string,
): AirtableAdapterError {
  return {
    type: 'invalid_mapped_value',
    field,
    value,
    expectedType,
  };
}

export function invalidProviderResponseError(
  message: string,
  response: unknown,
): AirtableAdapterError {
  return {
    type: 'invalid_provider_response',
    message,
    response,
  };
}

export function unsafeWriteBlockedError(reason: string): AirtableAdapterError {
  return {
    type: 'unsafe_write_blocked',
    reason,
  };
}
