export * from './types/core.js';
export * from './types/contract.js';
export * from './types/resolution.js';
export * from './types/write-plan.js';
export * from './types/execution.js';
export * from './types/provider.js';
export * from './types/preview.js';
export * from './types/logging.js';
export * from './types/replay.js';
export * from './types/api.js';

// Engines
export type { ContractParser } from './contract/index.js';
export * from './contract/guards.js';

// API Orchestration Layer
export type { ApiOrchestrator, ApiOrchestratorConfig } from './api/index.js';
export type {
  ApiOrchestrationRequest,
  ApiOrchestrationResponse,
  ApiTerminalStatus,
  ApiProviderConfig,
  ApiInteractionInput,
  PreparedApiRequest,
} from './api/index.js';
export {
  orchestrateRequest,
  normalizeRequest,
  runResolution as runApiResolution,
  buildPlan as buildApiPlan,
  buildPreview as buildApiPreview,
  enforceInteractionMode,
  executeConfirmedPlan,
  buildTerminalResponse,
  buildErrorResponse,
  apiFixture_safeNewVisitPreviewRequest,
  apiFixture_safeNewVisitConfirmRequest,
  apiFixture_sameDateCorrectionRequiredRequest,
  apiFixture_patientRecheckRequiredRequest,
  apiFixture_duplicateSuspicionRequest,
  apiFixture_hardStopRequest,
  apiFixture_noOpRequest,
  apiFixture_blockedUnsupportedMappingRequest,
  apiFixtureRequests,
  runApiOrchestrationExamples,
} from './api/index.js';

// State Resolution Engine
export type { StateResolver } from './resolution/index.js';
export { defaultStateResolver, resolveState } from './resolution/index.js';
export type {
  CurrentStateLookupBundle,
  PatientLookupResult,
  VisitLookupResult,
  SameDateVisitLookupResult,
  CaseLookupResult,
  SnapshotLookupResult,
} from './resolution/index.js';
export { createEmptyLookupBundle } from './resolution/index.js';

// Write Plan Engine
export type { WritePlanner } from './write-plan/index.js';
export { defaultWritePlanner, buildWritePlan } from './write-plan/index.js';
export type { BuildWritePlanInput, SnapshotBranchIntent } from './write-plan/index.js';

// Execution Engine
export type { PlanExecutor } from './execution/index.js';
export { executeWritePlan, defaultPlanExecutor } from './execution/index.js';
export type { ExecuteWritePlanInput } from './execution/index.js';

// Validation Module (Golden Case Suite)
export type {
  GoldenCaseId,
  GoldenCaseInput,
  GoldenCaseExpectation,
  StageValidationResult,
  AssertionResult,
  GoldenCaseResult,
  GoldenCaseSuiteResult,
} from './validation/index.js';
export {
  ALL_GOLDEN_CASES,
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
  GC_BLOCKED_CASE_MAPPING,
  GC_BLOCKED_CASE_MAPPING_EXPECTATION,
  GC_SAFE_PLAN_UPDATE,
  GC_SAFE_PLAN_UPDATE_EXPECTATION,
  GC_SAFE_DR_UPDATE,
  GC_SAFE_DR_UPDATE_EXPECTATION,
  GC_SAFE_DX_UPDATE,
  GC_SAFE_DX_UPDATE_EXPECTATION,
  GC_SAFE_RAD_UPDATE,
  GC_SAFE_RAD_UPDATE_EXPECTATION,
  GC_SAFE_OP_UPDATE,
  GC_SAFE_OP_UPDATE_EXPECTATION,
  GC_BLOCKED_OP_UPDATE,
  GC_BLOCKED_OP_UPDATE_EXPECTATION,
  GC_NO_OP,
  GC_NO_OP_EXPECTATION,
  GC_PARTIAL_FAILURE,
  GC_PARTIAL_FAILURE_EXPECTATION,
} from './validation/index.js';
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
  runGoldenCase,
  runGoldenCaseSuite,
  formatGoldenCaseResult,
  formatSuiteResult,
  logSuiteResult,
  getSuiteStats,
  createScenarioLookupBundle,
  bundleWithExistingPatient,
  bundleWithSameDateVisit,
  bundleWithNoPatient,
  bundleWithDuplicateSuspicion,
  bundleWithExistingCase,
  createContractFromScenario,
  createLookupBundleFromScenario,
  createSnapshotBranchIntentsFromScenario,
} from './validation/index.js';
