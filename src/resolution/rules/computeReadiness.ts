import type {
  PatientResolution,
  VisitResolution,
  CaseResolution,
  CorrectionResolution,
  AmbiguityResolution,
} from '../../types/resolution.js';
import type { InteractionMode, ReadinessStatus } from '../../types/core.js';

/**
 * Compute readiness status
 *
 * Rules:
 * - only ready_for_write_plan if:
 *   - patient resolved to existing or safe create
 *   - visit resolved to create or update
 *   - no blocking ambiguity
 *   - no correction/recheck/hard-stop condition active
 *
 * - blocked_requires_correction if:
 *   - patient duplicate or visit same-date conflict
 *
 * - blocked_requires_recheck if:
 *   - patient recheck required
 *
 * - blocked_hard_stop if:
 *   - user explicitly kept new visit stance with same-date conflict
 *
 * - blocked_unresolved if:
 *   - ambiguity remains and no specific correction/recheck/hard-stop applies
 */
export function computeReadiness(
  patient: PatientResolution,
  visit: VisitResolution,
  caseResolution: CaseResolution,
  correction: CorrectionResolution,
  ambiguity: AmbiguityResolution,
): ReadinessStatus {
  // Hard stops take precedence
  if (visit.status === 'hard_stop_same_date_keep_new_visit_claim') {
    return 'blocked_hard_stop';
  }

  if (patient.status === 'hard_stop_patient_resolution') {
    return 'blocked_hard_stop';
  }

  // Correction required
  if (
    correction.correctionNeeded &&
    (patient.status === 'correction_needed_patient_duplicate_suspicion' ||
      visit.status === 'correction_needed_same_date_conflict')
  ) {
    return 'blocked_requires_correction';
  }

  // Recheck required
  if (patient.status === 'recheck_required_patient_not_found') {
    return 'blocked_requires_recheck';
  }

  // Unresolved ambiguity with no specific blocker
  if (ambiguity.hasAmbiguity && ambiguityHasNoSpecificBlocker(patient, visit, correction)) {
    return 'blocked_unresolved';
  }

  // Check that patient and visit are in valid resolved states
  if (!isPatientResolutionValid(patient)) {
    return 'blocked_unresolved';
  }

  if (!isVisitResolutionValid(visit)) {
    return 'blocked_unresolved';
  }

  if (!hasRequiredRuntimeRefs(patient, caseResolution)) {
    return 'blocked_unresolved';
  }

  // All gates clear => ready for write plan
  return 'ready_for_write_plan';
}

/**
 * Map resolution state to interaction mode for preview
 */
export function computeInteractionMode(
  readiness: ReadinessStatus,
  correction: CorrectionResolution,
): InteractionMode {
  switch (readiness) {
    case 'ready_for_write_plan':
      return 'preview_confirmation';

    case 'blocked_requires_correction':
      return 'correction_required';

    case 'blocked_requires_recheck':
      return 'recheck_required';

    case 'blocked_hard_stop':
      return 'hard_stop';

    case 'blocked_unresolved':
      return 'hard_stop';

    default:
      // Fallback
      return 'hard_stop';
  }
}

/**
 * Helper: is patient in a valid resolved state for proceeding?
 */
function isPatientResolutionValid(patient: PatientResolution): boolean {
  return (
    patient.status === 'resolved_existing_patient' ||
    patient.status === 'create_new_patient' ||
    patient.status === 'no_patient_needed'
  );
}

/**
 * Helper: is visit in a valid resolved state for proceeding?
 */
function isVisitResolutionValid(visit: VisitResolution): boolean {
  return (
    visit.status === 'create_new_visit' ||
    visit.status === 'update_existing_visit_same_date' ||
    visit.status === 'no_visit_needed'
  );
}

function hasRequiredRuntimeRefs(
  patient: PatientResolution,
  caseResolution: CaseResolution,
): boolean {
  if (
    patient.status === 'resolved_existing_patient' &&
    !patient.resolvedPatientRecordRef &&
    !patient.resolvedPatientId
  ) {
    return false;
  }

  if (
    (caseResolution.status === 'continue_case' ||
      caseResolution.status === 'direct_case_update') &&
    !caseResolution.resolvedCaseRecordRef &&
    !caseResolution.resolvedCaseId
  ) {
    return false;
  }

  return true;
}

/**
 * Helper: does ambiguity have no specific blocker (i.e., is it just waiting for correction)?
 */
function ambiguityHasNoSpecificBlocker(
  patient: PatientResolution,
  visit: VisitResolution,
  correction: CorrectionResolution,
): boolean {
  // If there's a specific correction available, ambiguity is being handled
  if (
    correction.correctionNeeded &&
    (correction.correctionType === 'same_date_conflict' ||
      correction.correctionType === 'patient_duplicate_suspicion')
  ) {
    return false; // Already being handled by correction flow
  }

  // If it's a recheck situation, that's specific
  if (patient.status === 'recheck_required_patient_not_found') {
    return false;
  }

  // Otherwise, it's unresolved
  return true;
}
