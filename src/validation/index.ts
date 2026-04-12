/**
 * Validation Module Exports
 *
 * Golden-case validation harness for the sender rebuild.
 */

// Types
export type {
  GoldenCaseId,
  GoldenCaseInput,
  GoldenCaseExpectation,
  StageValidationResult,
  AssertionResult,
  GoldenCaseResult,
  GoldenCaseSuiteResult,
} from './types.js';

// Scenarios
export { ALL_GOLDEN_CASES } from './scenarios.js';
export {
  GC_SAFE_NEW_VISIT,
  GC_SAFE_NEW_VISIT_EXPECTATION,
  GC_SAME_DATE_UPDATE,
  GC_SAME_DATE_UPDATE_EXPECTATION,
  GC_SAME_DATE_CORRECTION_REQUIRED,
  GC_SAME_DATE_CORRECTION_REQUIRED_EXPECTATION,
  GC_PATIENT_RECHECK_REQUIRED,
  GC_PATIENT_RECHECK_REQUIRED_EXPECTATION,
  GC_DUPLICATE_SUSPICION,
  GC_DUPLICATE_SUSPICION_EXPECTATION,
  GC_SAFE_CREATE_CASE,
  GC_SAFE_CREATE_CASE_EXPECTATION,
  GC_SAFE_CONTINUE_CASE,
  GC_SAFE_CONTINUE_CASE_EXPECTATION,
  GC_SAFE_PLAN_CREATE,
  GC_SAFE_PLAN_CREATE_EXPECTATION,
  GC_SAFE_PLAN_UPDATE,
  GC_SAFE_PLAN_UPDATE_EXPECTATION,
  GC_SAFE_DR_CREATE,
  GC_SAFE_DR_CREATE_EXPECTATION,
  GC_SAFE_DR_UPDATE,
  GC_SAFE_DR_UPDATE_EXPECTATION,
  GC_SAFE_DX_CREATE,
  GC_SAFE_DX_CREATE_EXPECTATION,
  GC_SAFE_DX_UPDATE,
  GC_SAFE_DX_UPDATE_EXPECTATION,
  GC_SAFE_RAD_CREATE,
  GC_SAFE_RAD_CREATE_EXPECTATION,
  GC_SAFE_RAD_UPDATE,
  GC_SAFE_RAD_UPDATE_EXPECTATION,
  GC_SAFE_OP_CREATE,
  GC_SAFE_OP_CREATE_EXPECTATION,
  GC_SAFE_OP_UPDATE,
  GC_SAFE_OP_UPDATE_EXPECTATION,
  GC_BLOCKED_CASE_AMBIGUITY,
  GC_BLOCKED_CASE_AMBIGUITY_EXPECTATION,
  GC_BLOCKED_CASE_MAPPING,
  GC_BLOCKED_CASE_MAPPING_EXPECTATION,
  GC_BLOCKED_PLAN_UPDATE,
  GC_BLOCKED_PLAN_UPDATE_EXPECTATION,
  GC_BLOCKED_DR_UPDATE,
  GC_BLOCKED_DR_UPDATE_EXPECTATION,
  GC_BLOCKED_DX_UPDATE,
  GC_BLOCKED_DX_UPDATE_EXPECTATION,
  GC_BLOCKED_RAD_UPDATE,
  GC_BLOCKED_RAD_UPDATE_EXPECTATION,
  GC_BLOCKED_OP_UPDATE,
  GC_BLOCKED_OP_UPDATE_EXPECTATION,
  GC_NO_OP,
  GC_NO_OP_EXPECTATION,
  GC_PARTIAL_FAILURE,
  GC_PARTIAL_FAILURE_EXPECTATION,
} from './scenarios.js';

// Assertions
export {
  assertResolutionStatus,
  assertReadinessStatus,
  assertPlanReadiness,
  assertExecutionStatus,
  assertActionsPresent,
  assertActionsForbidden,
  assertNoWrites,
  assertWritesOccurred,
  assertReplayEligibility,
  assertBlocking,
  assertActionCount,
} from './assertions.js';

// Fixtures
export {
  createScenarioLookupBundle,
  bundleWithExistingPatient,
  bundleWithSameDateVisit,
  bundleWithNoPatient,
  bundleWithDuplicateSuspicion,
  bundleWithExistingCase,
  createContractFromScenario,
  createLookupBundleFromScenario,
  createSnapshotBranchIntentsFromScenario,
} from './fixtures.js';

// Runners
export { runGoldenCase } from './runGoldenCase.js';
export { runGoldenCaseSuite } from './runGoldenSuite.js';

// Reporting
export { formatGoldenCaseResult, formatSuiteResult, logSuiteResult, getSuiteStats } from './reporting.js';
