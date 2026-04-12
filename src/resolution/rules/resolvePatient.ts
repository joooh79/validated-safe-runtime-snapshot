import type { NormalizedContract } from '../../types/contract.js';
import type { PatientResolution } from '../../types/resolution.js';
import type { PatientLookupResult } from '../types.js';

/**
 * Resolve patient identity and readiness for write
 *
 * Behavioral requirements:
 * - existing_patient_claim + patient found => resolved_existing_patient
 * - existing_patient_claim + patient not found => recheck_required
 * - new_patient_claim + duplicate_suspicion => correction_needed
 * - new_patient_claim + no suspicion => create_new_patient (if safe)
 * - unresolved ambiguity => blocked
 */

export function resolvePatient(
  contract: NormalizedContract,
  lookup: PatientLookupResult,
): PatientResolution {
  const reasons: string[] = [];
  const clues = contract.patientClues;

  // Case 1: Explicit existing patient claim
  if (clues.existingPatientClaim) {
    if (lookup.found && lookup.patientId) {
      reasons.push('existing_patient_claim + patient_found');
      return {
        status: 'resolved_existing_patient',
        resolvedPatientId: lookup.patientId,
        reasons,
      };
    }

    // Existing patient claim but patient not found => require recheck
    reasons.push('existing_patient_claim + patient_not_found');
    const result: PatientResolution = {
      status: 'recheck_required_patient_not_found',
      reasons,
    };
    if (lookup.candidateIds) {
      result.candidatePatientIds = lookup.candidateIds;
    }
    return result;
  }

  // Case 2: Explicit new patient claim
  if (clues.newPatientClaim) {
    // Check for duplicate suspicion
    if (lookup.duplicateSuspicion || (lookup.candidateIds && lookup.candidateIds.length > 0)) {
      reasons.push('new_patient_claim + duplicate_suspicion');
      const result: PatientResolution = {
        status: 'correction_needed_patient_duplicate_suspicion',
        reasons,
      };
      if (lookup.candidateIds) {
        result.candidatePatientIds = lookup.candidateIds;
      }
      return result;
    }

    // Safe to create new patient
    reasons.push('new_patient_claim + no_duplicate_suspicion');
    return {
      status: 'create_new_patient',
      reasons,
    };
  }

  // Case 3: No explicit claim - infer from clues
  if (clues.patientId) {
    // Patient ID provided - treat as existing claim
    if (lookup.found && lookup.patientId === clues.patientId) {
      reasons.push('patient_id_provided + patient_found');
      return {
        status: 'resolved_existing_patient',
        resolvedPatientId: lookup.patientId,
        reasons,
      };
    }

    if (lookup.found && lookup.patientId !== clues.patientId) {
      // ID mismatch - may indicate ambiguity or error
      reasons.push('patient_id_provided + different_patient_found');
      const result: PatientResolution = {
        status: 'unresolved_ambiguous_patient',
        reasons,
      };
      if (lookup.candidateIds) {
        result.candidatePatientIds = lookup.candidateIds;
      }
      return result;
    }

    // ID provided but not found
    reasons.push('patient_id_provided + patient_not_found');
    const result: PatientResolution = {
      status: 'recheck_required_patient_not_found',
      reasons,
    };
    if (lookup.candidateIds) {
      result.candidatePatientIds = lookup.candidateIds;
    }
    return result;
  }

  // Case 4: Some lookup evidence but unclear intent
  if (lookup.found && lookup.patientId) {
    // Patient was found - infer existing patient intent
    reasons.push('patient_found_no_explicit_claim');
    return {
      status: 'resolved_existing_patient',
      resolvedPatientId: lookup.patientId,
      reasons,
    };
  }

  // Case 5: Complete ambiguity
  reasons.push('no_patient_clues_no_lookup_result');
  return {
    status: 'unresolved_ambiguous_patient',
    reasons,
  };
}
