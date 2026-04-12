import type { PatientResolution, VisitResolution, CorrectionResolution, AmbiguityResolution } from '../../types/resolution.js';

/**
 * Compute correction needs based on patient and visit resolutions
 */
export function resolveCorrection(
  patient: PatientResolution,
  visit: VisitResolution,
): CorrectionResolution {
  const reasons: string[] = [];

  // Patient-level correction
  if (patient.status === 'correction_needed_patient_duplicate_suspicion') {
    reasons.push('patient_duplicate_suspicion_detected');
    return {
      correctionNeeded: true,
      correctionType: 'patient_duplicate_suspicion',
      resendAllowed: true,
      reasons,
    };
  }

  // Visit-level correction
  if (visit.status === 'correction_needed_same_date_conflict') {
    reasons.push('same_date_visit_conflict_detected');
    return {
      correctionNeeded: true,
      correctionType: 'same_date_conflict',
      resendAllowed: true,
      reasons,
    };
  }

  // Target visit missing
  if (visit.status === 'unresolved_visit_ambiguity') {
    const reason = 'target_visit_ambiguity_or_missing';
    if (visit.reasons?.some((r: string) => r.includes('target'))) {
      reasons.push(reason);
      return {
        correctionNeeded: true,
        correctionType: 'target_visit_missing',
        resendAllowed: false,
        reasons,
      };
    }
  }

  // No correction needed
  reasons.push('no_correction_needed');
  return {
    correctionNeeded: false,
    reasons,
  };
}

/**
 * Detect unresolved ambiguity across all resolution components
 */
export function resolveAmbiguity(
  patient: PatientResolution,
  visit: VisitResolution,
  caseResolution: import('../../types/resolution.js').CaseResolution,
  correctionNeeded: boolean,
): AmbiguityResolution {
  const ambiguityTypes: Array<'patient_identity' | 'visit_identity' | 'same_date_conflict' | 'case_continuity' | 'other'> = [];
  const reasons: string[] = [];

  if (patient.status === 'unresolved_ambiguous_patient') {
    ambiguityTypes.push('patient_identity');
    reasons.push('patient_identity_unresolved');
  }

  if (visit.status === 'unresolved_visit_ambiguity') {
    ambiguityTypes.push('visit_identity');
    reasons.push('visit_identity_unresolved');
  }

  if (visit.status === 'correction_needed_same_date_conflict' && !correctionNeeded) {
    // Correction is available but not yet confirmed
    ambiguityTypes.push('same_date_conflict');
    reasons.push('same_date_conflict_awaiting_correction');
  }

  if (caseResolution.status === 'unresolved_case_ambiguity') {
    ambiguityTypes.push('case_continuity');
    reasons.push('case_continuity_unresolved');
  }

  const hasAmbiguity = ambiguityTypes.length > 0;

  return {
    hasAmbiguity,
    ambiguityTypes,
    reasons,
  };
}
