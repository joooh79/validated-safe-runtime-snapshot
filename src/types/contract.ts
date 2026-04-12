import type { ContinuityIntent, SnapshotBranch, WorkflowIntent } from './core.js';

export interface ContractInput {
  requestId: string;
  inputHash?: string;
  rawPayload: unknown;
}

export interface PatientClues {
  patientId?: string;
  birthYear?: string | number;
  genderHint?: string;
  existingPatientClaim?: boolean;
  newPatientClaim?: boolean;
  additionalIdentityHints?: Record<string, unknown>;
}

export interface VisitContext {
  visitDate?: string;
  visitType?: string;
  chiefComplaint?: string;
  painLevel?: number | string | null;
  targetVisitDate?: string;
  targetVisitId?: string;
  targetVisitClue?: string;
  doctorConfirmedCorrection?: boolean | null;
}

export interface BranchPayload {
  branch: SnapshotBranch;
  sourceRecordKey?: string;
  payload: Record<string, unknown>;
}

export interface ToothFindingsItem {
  toothNumber: string;
  branches: BranchPayload[];
}

export interface FindingsContext {
  toothItems: ToothFindingsItem[];
  findingsPresent?: Record<string, boolean>;
}

export interface NormalizedContract {
  requestId: string;
  inputHash?: string;
  workflowIntent: WorkflowIntent;
  continuityIntent: ContinuityIntent;
  patientClues: PatientClues;
  visitContext: VisitContext;
  findingsContext: FindingsContext;
  warnings: string[];
}
