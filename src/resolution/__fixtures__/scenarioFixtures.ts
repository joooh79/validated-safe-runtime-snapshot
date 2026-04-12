import type { NormalizedContract } from '../../types/contract.js';
import type { CurrentStateLookupBundle } from '../types.js';

/**
 * Example Fixtures for State Resolution Engine
 *
 * These fixtures demonstrate the resolution engine working with various scenarios
 * without requiring live provider calls.
 */

// ============================================================================
// Fixture 1: Existing Patient New Visit - Simple Case
// ============================================================================
export const fixture_existingPatientNewVisitSimple = {
  contract: {
    requestId: 'req-001',
    workflowIntent: 'existing_patient_new_visit',
    continuityIntent: 'none',
    patientClues: {
      patientId: 'P-001',
      existingPatientClaim: true,
    },
    visitContext: {
      visitDate: '2026-04-12',
      visitType: 'recall',
      chiefComplaint: 'Checkup',
    },
    findingsContext: {
      toothItems: [
        {
          toothNumber: '11',
          branches: [
            {
              branch: 'PRE',
              payload: { symptom: 'none' },
            } as any,
          ],
        },
      ],
    },
    warnings: [],
  } as NormalizedContract,

  lookups: {
    patientLookup: {
      found: true,
      patientId: 'P-001',
      birthYear: '1985',
      gender: 'Female',
      firstVisitDate: '2020-01-15',
      duplicateSuspicion: false,
    },
    sameDateVisitLookup: {
      found: false,
    },
    caseLookups: {},
  } as CurrentStateLookupBundle,

  expectedOutcome: {
    patientStatus: 'resolved_existing_patient',
    visitStatus: 'create_new_visit',
    readiness: 'ready_for_write_plan',
    interactionMode: 'preview_confirmation',
  },
};

// ============================================================================
// Fixture 2: Same-Date Correction Required
// ============================================================================
export const fixture_sameDateCorrectionRequired = {
  contract: {
    requestId: 'req-002',
    workflowIntent: 'existing_patient_new_visit',
    continuityIntent: 'none',
    patientClues: {
      patientId: 'P-002',
      existingPatientClaim: true,
    },
    visitContext: {
      visitDate: '2026-04-12',
      targetVisitDate: '2026-04-12', // Same date as existing visit
      doctorConfirmedCorrection: null, // Not yet confirmed
    },
    findingsContext: {
      toothItems: [
        {
          toothNumber: '12',
          branches: [
            {
              branch: 'DX',
              payload: { diagnosis: 'caries' },
            } as any,
          ],
        },
      ],
    },
    warnings: [],
  } as NormalizedContract,

  lookups: {
    patientLookup: {
      found: true,
      patientId: 'P-002',
    },
    sameDateVisitLookup: {
      found: true,
      visitId: 'V-2026-04-12',
      visitDate: '2026-04-12',
    },
    caseLookups: {},
  } as CurrentStateLookupBundle,

  expectedOutcome: {
    patientStatus: 'resolved_existing_patient',
    visitStatus: 'correction_needed_same_date_conflict',
    correction: {
      correctionNeeded: true,
      correctionType: 'same_date_conflict',
    },
    readiness: 'blocked_requires_correction',
    interactionMode: 'correction_required',
  },
};

// ============================================================================
// Fixture 3: Patient Recheck Required
// ============================================================================
export const fixture_patientRecheckRequired = {
  contract: {
    requestId: 'req-003',
    workflowIntent: 'existing_patient_new_visit',
    continuityIntent: 'none',
    patientClues: {
      patientId: 'P-unknown',
      existingPatientClaim: true,
    },
    visitContext: {
      visitDate: '2026-04-12',
    },
    findingsContext: {
      toothItems: [],
    },
    warnings: [],
  } as NormalizedContract,

  lookups: {
    patientLookup: {
      found: false,
      reason: 'patient_not_found',
      candidateIds: [],
    },
    sameDateVisitLookup: {
      found: false,
    },
    caseLookups: {},
  } as CurrentStateLookupBundle,

  expectedOutcome: {
    patientStatus: 'recheck_required_patient_not_found',
    readiness: 'blocked_requires_recheck',
    interactionMode: 'recheck_required',
  },
};

// ============================================================================
// Fixture 4: Patient Duplicate Correction Required
// ============================================================================
export const fixture_patientDuplicateCorrection = {
  contract: {
    requestId: 'req-004',
    workflowIntent: 'new_patient_new_visit',
    continuityIntent: 'create_case',
    patientClues: {
      birthYear: 1990,
      newPatientClaim: true,
    },
    visitContext: {
      visitDate: '2026-04-12',
    },
    findingsContext: {
      toothItems: [
        {
          toothNumber: '14',
          branches: [
            {
              branch: 'PRE',
              payload: {},
            } as any,
          ],
        },
      ],
    },
    warnings: [],
  } as NormalizedContract,

  lookups: {
    patientLookup: {
      found: false,
      duplicateSuspicion: true,
      candidateIds: ['P-901', 'P-902'],
      reason: 'possible_duplicate_based_on_demographics',
    },
    sameDateVisitLookup: {
      found: false,
    },
    caseLookups: {},
  } as CurrentStateLookupBundle,

  expectedOutcome: {
    patientStatus: 'correction_needed_patient_duplicate_suspicion',
    correction: {
      correctionNeeded: true,
      correctionType: 'patient_duplicate_suspicion',
    },
    readiness: 'blocked_requires_correction',
    interactionMode: 'correction_required',
  },
};

// ============================================================================
// Fixture 5: Case Continuation
// ============================================================================
export const fixture_caseContinuation = {
  contract: {
    requestId: 'req-005',
    workflowIntent: 'existing_patient_new_visit',
    continuityIntent: 'continue_case',
    patientClues: {
      patientId: 'P-003',
      existingPatientClaim: true,
    },
    visitContext: {
      visitDate: '2026-04-19', // Later date than previous visit
    },
    findingsContext: {
      toothItems: [
        {
          toothNumber: '11',
          branches: [
            {
              branch: 'OP',
              payload: { result: 'treatment_completed' },
            } as any,
          ],
        },
      ],
    },
    warnings: [],
  } as NormalizedContract,

  lookups: {
    patientLookup: {
      found: true,
      patientId: 'P-003',
    },
    sameDateVisitLookup: {
      found: false,
    },
    caseLookups: {
      '11': {
        found: true,
        caseId: 'C-001-11',
        toothNumber: '11',
        episodeIdentifier: '2026-tooth-11-endo',
      },
    },
  } as CurrentStateLookupBundle,

  expectedOutcome: {
    patientStatus: 'resolved_existing_patient',
    visitStatus: 'create_new_visit',
    caseStatus: 'continue_case',
    readiness: 'ready_for_write_plan',
    interactionMode: 'preview_confirmation',
  },
};

// ============================================================================
// Fixture 6: Hard Stop - Same-Date But User Insisted on New Visit
// ============================================================================
export const fixture_hardStopSameDateKeepNew = {
  contract: {
    requestId: 'req-006',
    workflowIntent: 'existing_patient_new_visit',
    continuityIntent: 'none',
    patientClues: {
      patientId: 'P-004',
      existingPatientClaim: true,
    },
    visitContext: {
      visitDate: '2026-04-12',
      targetVisitDate: '2026-04-13', // Different target
      doctorConfirmedCorrection: false, // Explicitly keep new visit stance
    },
    findingsContext: {
      toothItems: [],
    },
    warnings: [],
  } as NormalizedContract,

  lookups: {
    patientLookup: {
      found: true,
      patientId: 'P-004',
    },
    sameDateVisitLookup: {
      found: true,
      visitId: 'V-2026-04-12',
      visitDate: '2026-04-12',
    },
    caseLookups: {},
  } as CurrentStateLookupBundle,

  expectedOutcome: {
    visitStatus: 'hard_stop_same_date_keep_new_visit_claim',
    readiness: 'blocked_hard_stop',
    interactionMode: 'hard_stop',
  },
};
