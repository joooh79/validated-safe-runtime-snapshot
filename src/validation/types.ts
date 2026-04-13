/**
 * Validation Types
 *
 * Schemas for golden-case scenarios, expected outcomes, and validation results.
 */

import type { StateResolutionResult } from '../types/resolution.js';
import type { WritePlan } from '../types/write-plan.js';
import type { ExecutionResult } from '../types/execution.js';

/**
 * Golden case scenario ID
 */
export type GoldenCaseId =
  | 'GC_SAFE_NEW_VISIT'
  | 'GC_SAME_DATE_UPDATE'
  | 'GC_SAME_DATE_CORRECTION_REQUIRED'
  | 'GC_PATIENT_RECHECK_REQUIRED'
  | 'GC_DUPLICATE_SUSPICION'
  | 'GC_SAFE_CREATE_CASE'
  | 'GC_SAFE_CONTINUE_CASE'
  | 'GC_SAFE_PLAN_CREATE'
  | 'GC_SAFE_PLAN_UPDATE'
  | 'GC_SAFE_DR_CREATE'
  | 'GC_SAFE_DR_UPDATE'
  | 'GC_SAFE_DX_CREATE'
  | 'GC_SAFE_DX_UPDATE'
  | 'GC_SAFE_RAD_CREATE'
  | 'GC_SAFE_RAD_UPDATE'
  | 'GC_SAFE_OP_CREATE'
  | 'GC_SAFE_OP_UPDATE'
  | 'GC_BLOCKED_CASE_AMBIGUITY'
  | 'GC_BLOCKED_CASE_MAPPING'
  | 'GC_BLOCKED_PLAN_UPDATE'
  | 'GC_BLOCKED_DR_UPDATE'
  | 'GC_BLOCKED_DX_UPDATE'
  | 'GC_BLOCKED_RAD_UPDATE'
  | 'GC_BLOCKED_OP_UPDATE'
  | 'GC_NO_OP'
  | 'GC_PARTIAL_FAILURE';

/**
 * Contract/normalized input fixture for a scenario
 */
export interface GoldenCaseInput {
  id: GoldenCaseId;
  title: string;
  description: string;
  currentStateLookup: {
    patientSearch?: {
      found: boolean;
      patientId?: string;
      candidateIds?: string[];
    };
    visitSearch?: {
      found: boolean;
      visitId?: string;
      date?: string;
    };
    caseSearch?: {
      found: boolean;
      caseId?: string;
    };
    snapshotSearch?: Array<{
      found: boolean;
      branch: string;
      tooth: string;
      recordId?: string;
      visitId?: string;
      recordName?: string;
      currentValues?: Record<string, unknown>;
    }>;
  };
  contractInputSummary: {
    workflowIntent: string; // 'new_patient_new_visit' | 'existing_patient_new_visit' | ...
    continuityIntent?: string;
    patientClues: string[];
    visitDate: string;
    findings?: Array<{ tooth: string; branch: string }>;
  };
}

/**
 * Expected outcome for a scenario
 */
export interface GoldenCaseExpectation {
  // Resolution expectations
  patientResolutionStatus?: string;
  visitResolutionStatus?: string;
  caseResolutionStatus?: string;
  readinessStatus?: string;

  // Plan expectations
  planReadiness?: 'execution_ready' | 'preview_only' | 'blocked';
  allowedActionTypes?: string[];
  forbiddenActionTypes?: string[];
  shouldExecute: boolean; // true if execution should proceed

  // Execution expectations
  executionStatus?: string;
  shouldWrite: boolean; // true if provider write should occur
  replayEligible?: boolean;

  // Blocking expectations
  intentionallyBlocked?: boolean;
  blockReason?: string;
}

/**
 * Per-stage validation result
 */
export interface StageValidationResult {
  stage: 'resolution' | 'plan' | 'execution' | 'blocking';
  passed: boolean;
  assertions: AssertionResult[];
  output?: unknown; // resolution/plan/execution result
}

/**
 * Individual assertion result
 */
export interface AssertionResult {
  name: string;
  expected: unknown;
  actual: unknown;
  passed: boolean;
  details?: string;
}

/**
 * Complete golden case validation result
 */
export interface GoldenCaseResult {
  scenarioId: GoldenCaseId;
  title: string;
  passed: boolean;
  stages: StageValidationResult[];
  summary: string;
  notes?: string[];
}

/**
 * Suite-level results
 */
export interface GoldenCaseSuiteResult {
  totalScenarios: number;
  passedScenarios: number;
  failedScenarios: number;
  scenarios: GoldenCaseResult[];
  overallPassed: boolean;
  summary: string;
}
