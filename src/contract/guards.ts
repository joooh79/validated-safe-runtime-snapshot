import type { ContractInput, NormalizedContract, ToothFindingsItem } from '../types/contract.js';

/**
 * Contract Validation Guards and Utilities
 *
 * Provides runtime guards and validation helpers
 * to ensure contract parsing is safe and well-disciplined.
 */

export interface ValidationError {
  field: string;
  reason: string;
  severity: 'error' | 'warning';
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

/**
 * Ensures input has required contract structure
 */
export function isContractInputValid(input: ContractInput): boolean {
  return (
    input &&
    typeof input === 'object' &&
    typeof input.requestId === 'string' &&
    input.requestId.length > 0 &&
    input.rawPayload !== undefined
  );
}

/**
 * Validates normalized contract consistency
 */
export function isNormalizedContractValid(contract: NormalizedContract): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Required fields
  if (!contract.requestId || typeof contract.requestId !== 'string') {
    errors.push({
      field: 'requestId',
      reason: 'Missing or invalid requestId',
      severity: 'error',
    });
  }

  if (!contract.workflowIntent) {
    errors.push({
      field: 'workflowIntent',
      reason: 'Missing workflowIntent',
      severity: 'error',
    });
  }

  if (contract.workflowIntent === 'unknown') {
    warnings.push({
      field: 'workflowIntent',
      reason: 'Workflow intent could not be determined',
      severity: 'warning',
    });
  }

  if (!contract.patientClues) {
    errors.push({
      field: 'patientClues',
      reason: 'Missing patient clues',
      severity: 'error',
    });
  }

  if (!contract.visitContext) {
    errors.push({
      field: 'visitContext',
      reason: 'Missing visit context',
      severity: 'error',
    });
  }

  if (!contract.findingsContext) {
    errors.push({
      field: 'findingsContext',
      reason: 'Missing findings context',
      severity: 'error',
    });
  }

  // Consistency checks
  if (
    contract.patientClues &&
    contract.patientClues.existingPatientClaim &&
    contract.patientClues.newPatientClaim
  ) {
    errors.push({
      field: 'patientClues',
      reason: 'Conflicting patient claims: both existing and new',
      severity: 'error',
    });
  }

  if (
    contract.findingsContext &&
    contract.findingsContext.toothItems &&
    contract.findingsContext.toothItems.length === 0
  ) {
    warnings.push({
      field: 'findingsContext',
      reason: 'No tooth findings provided',
      severity: 'warning',
    });
  }

  // Warnings about unknown values
  if (contract.continuityIntent === 'unknown') {
    warnings.push({
      field: 'continuityIntent',
      reason: 'Continuity intent could not be determined',
      severity: 'warning',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Check if contract contains actual findings data
 */
export function hasValidFindings(contract: NormalizedContract): boolean {
  return (
    contract.findingsContext &&
    contract.findingsContext.toothItems &&
    contract.findingsContext.toothItems.length > 0 &&
    contract.findingsContext.toothItems.some((item: ToothFindingsItem) => item.branches && item.branches.length > 0)
  );
}

/**
 * Check if patient clues support existing patient resolution
 */
export function supportsExistingPatientResolution(contract: NormalizedContract): boolean {
  const clues = contract.patientClues;
  return !!(clues && (clues.patientId || clues.existingPatientClaim));
}

/**
 * Check if patient clues support new patient creation
 */
export function supportsNewPatientCreation(contract: NormalizedContract): boolean {
  const clues = contract.patientClues;
  return !!(clues && clues.newPatientClaim && !clues.existingPatientClaim);
}

/**
 * Check if visit context indicates same-date visit
 */
export function indicatesSameDateVisit(contract: NormalizedContract): boolean {
  const ctx = contract.visitContext;
  return !!(ctx && ctx.targetVisitDate && ctx.visitDate && ctx.targetVisitDate === ctx.visitDate);
}

/**
 * Check if correction handling should be active
 */
export function indicatesCorrectionActive(contract: NormalizedContract): boolean {
  const ctx = contract.visitContext;
  return !!(ctx && ctx.doctorConfirmedCorrection !== false);
}

/**
 * Guard: ensure no invented Airtable field names are in the output
 */
export function ensureNoInventedAirtableFields(payload: unknown): payload is Record<string, unknown> {
  // This is a placeholder - actual implementation would check against
  // the canon-confirmed field list from docs/12_airtable_canon_reference.md
  // For now, just verify it's an object
  return payload !== null && typeof payload === 'object';
}

/**
 * Guard: ensure no invented Airtable option values are in the output
 */
export function ensureNoInventedAirtableOptions(
  fieldName: string,
  optionValue: unknown,
  canonOptions: string[],
): boolean {
  // If option is empty string, it's a valid "not set" marker
  if (optionValue === '') {
    return true;
  }

  // Otherwise, must be in canon options
  return canonOptions.includes(String(optionValue));
}

/**
 * Mark something as requiring canon confirmation
 */
export function markCanonConfirmRequired(location: string, field: string): string {
  return `canon-confirm-required:${location}:${field}`;
}

/**
 * Check if a value is a canon-confirm-required marker
 */
export function isCanonConfirmRequired(value: unknown): boolean {
  return typeof value === 'string' && value.startsWith('canon-confirm-required:');
}
