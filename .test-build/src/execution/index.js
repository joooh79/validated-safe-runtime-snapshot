// Main orchestration export
export { executeWritePlan, defaultPlanExecutor } from './executeWritePlan.js';
// Rule exports for advanced usage
export { shouldSkipAction } from './rules/shouldSkipAction.js';
export { computeExecutionStatus } from './rules/computeExecutionStatus.js';
export { collectExecutionRefs } from './rules/collectExecutionRefs.js';
export { computeReplayEligibility, } from './rules/computeReplayEligibility.js';
export { buildExecutionSummary } from './rules/buildExecutionSummary.js';
// Test/fixture exports
export { createFakeProvider, FakeProvider } from './__fixtures__/fakeProvider.js';
export { successfulExecutionExample, partialSuccessExecutionExample, blockedExecutionExample, noOpExecutionExample, failedAfterPartialExample, failedBeforeAnyWriteExample, } from './__fixtures__/exampleResults.js';
