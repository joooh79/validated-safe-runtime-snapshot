import type { ExecutionResult } from '../types/execution.js';
import type { DirectWriteProvider } from '../types/provider.js';
import type { WritePlan } from '../types/write-plan.js';

export interface PlanExecutor {
  execute(plan: WritePlan, provider: DirectWriteProvider): Promise<ExecutionResult>;
}

// Main orchestration export
export { executeWritePlan, defaultPlanExecutor, type ExecuteWritePlanInput } from './executeWritePlan.js';

// Rule exports for advanced usage
export { shouldSkipAction } from './rules/shouldSkipAction.js';
export { computeExecutionStatus, type ComputeStatusInput } from './rules/computeExecutionStatus.js';
export { collectExecutionRefs } from './rules/collectExecutionRefs.js';
export {
  computeReplayEligibility,
  type ComputeReplayEligibilityInput,
} from './rules/computeReplayEligibility.js';
export { buildExecutionSummary, type BuildSummaryInput } from './rules/buildExecutionSummary.js';

// Test/fixture exports
export { createFakeProvider, FakeProvider } from './__fixtures__/fakeProvider.js';
export {
  successfulExecutionExample,
  partialSuccessExecutionExample,
  blockedExecutionExample,
  noOpExecutionExample,
  failedAfterPartialExample,
  failedBeforeAnyWriteExample,
} from './__fixtures__/exampleResults.js';
