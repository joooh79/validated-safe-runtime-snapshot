import type { ContinuityIntent, InteractionMode, ReadinessStatus, WorkflowIntent } from './core.js';

export interface PatientResolution {
  status:
    | 'resolved_existing_patient'
    | 'create_new_patient'
    | 'no_patient_needed'
    | 'correction_needed_patient_duplicate_suspicion'
    | 'recheck_required_patient_not_found'
    | 'unresolved_ambiguous_patient'
    | 'hard_stop_patient_resolution';
  resolvedPatientId?: string;
  resolvedPatientRecordRef?: string;
  candidatePatientIds?: string[];
  reasons: string[];
}

export interface VisitResolution {
  status:
    | 'create_new_visit'
    | 'update_existing_visit_same_date'
    | 'no_visit_needed'
    | 'correction_needed_same_date_conflict'
    | 'hard_stop_same_date_keep_new_visit_claim'
    | 'unresolved_visit_ambiguity';
  resolvedVisitId?: string;
  matchedSameDateVisitId?: string;
  matchedVisitRecordRef?: string;
  reasons: string[];
}

export interface CaseResolution {
  status:
    | 'create_case'
    | 'continue_case'
    | 'direct_case_update'
    | 'close_case'
    | 'split_case'
    | 'none'
    | 'unresolved_case_ambiguity';
  resolvedCaseId?: string;
  resolvedCaseRecordRef?: string;
  toothNumber?: string;
  visitDate?: string;
  episodeStartDate?: string;
  relatedCaseIds?: string[];
  candidateCases?: CaseResolutionCandidate[];
  targets?: CaseResolutionTarget[];
  reasons: string[];
}

export interface CaseResolutionTarget {
  status:
    | 'create_case'
    | 'continue_case'
    | 'direct_case_update'
    | 'close_case'
    | 'split_case';
  toothNumber?: string;
  resolvedCaseId?: string;
  resolvedCaseRecordRef?: string;
  visitDate?: string;
  episodeStartDate?: string;
  latestVisitDate?: string;
  episodeStatus?: 'open' | 'closed' | 'split' | 'unknown';
  relatedCaseIds?: string[];
  reasons: string[];
}

export interface CaseResolutionCandidate {
  toothNumber: string;
  resolvedCaseId?: string;
  resolvedCaseRecordRef?: string;
  episodeStartDate?: string;
  latestVisitDate?: string;
  episodeStatus?: 'open' | 'closed' | 'split' | 'unknown';
  summaryHint?: string;
  reasons: string[];
}

export interface CorrectionResolution {
  correctionNeeded: boolean;
  correctionType?: 'same_date_conflict' | 'patient_duplicate_suspicion' | 'target_visit_missing' | 'other';
  resendAllowed?: boolean;
  reasons: string[];
}

export interface AmbiguityResolution {
  hasAmbiguity: boolean;
  ambiguityTypes: Array<'patient_identity' | 'visit_identity' | 'same_date_conflict' | 'case_continuity' | 'other'>;
  reasons: string[];
}

export interface ResolutionSummary {
  patientActionSummary: string;
  visitActionSummary: string;
  caseActionSummary: string;
  nextStepSummary: string;
}

export interface StateResolutionResult {
  requestId: string;
  workflowIntent: WorkflowIntent;
  continuityIntent: ContinuityIntent;
  patient: PatientResolution;
  visit: VisitResolution;
  caseResolution: CaseResolution;
  correction: CorrectionResolution;
  ambiguity: AmbiguityResolution;
  readiness: ReadinessStatus;
  interactionMode: InteractionMode;
  warnings: string[];
  summary: ResolutionSummary;
}
