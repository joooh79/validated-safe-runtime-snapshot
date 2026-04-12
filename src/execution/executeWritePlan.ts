/**
 * Main Execution Engine Orchestration
 *
 * Executes a WritePlan through a DirectWriteProvider and returns normalized ExecutionResult.
 *
 * Requirements:
 * - input: WritePlan, DirectWriteProvider
 * - output: ExecutionResult with normalized status
 * - no provider payload invention
 * - preserve execution state exactly
 * - handle partial success clearly
 * - compute replay eligibility from actual outcome
 * - never fake full success on partial execution
 *
 * Approach:
 * 1. Validate plan is execution-ready (or determine terminal status)
 * 2. Build execution context
 * 3. Execute actions in order, respecting dependencies
 * 4. Track success/failure/skipped
 * 5. Collect created/updated refs
 * 6. Compute final execution status
 * 7. Compute replay eligibility
 * 8. Build execution summary
 * 9. Return complete ExecutionResult
 */

import type { ExecutionResult, ActionExecutionResult } from '../types/execution.js';
import type { DirectWriteProvider, ProviderExecutionContext } from '../types/provider.js';
import type { WritePlan, WriteAction } from '../types/write-plan.js';
import type { ExecutionStatus } from '../types/core.js';
import { shouldSkipAction } from './rules/shouldSkipAction.js';
import { computeExecutionStatus } from './rules/computeExecutionStatus.js';
import { collectExecutionRefs } from './rules/collectExecutionRefs.js';
import { computeReplayEligibility } from './rules/computeReplayEligibility.js';
import { buildExecutionSummary } from './rules/buildExecutionSummary.js';

export interface ExecuteWritePlanInput {
  plan: WritePlan;
  provider: DirectWriteProvider;
  dryRun?: boolean;
}

/**
 * Execute a WritePlan through a DirectWriteProvider
 *
 * Main entry point for the execution engine.
 */
export async function executeWritePlan(
  input: ExecuteWritePlanInput,
): Promise<ExecutionResult> {
  const { plan, provider, dryRun = false } = input;

  // Step 1: Early exit if plan not execution-ready
  if (plan.readiness !== 'execution_ready') {
    // Plan is blocked or preview-only; determine terminal status
    const status: ExecutionStatus =
      plan.readiness === 'blocked' ? 'blocked_before_write' : 'no_op';

    return {
      planId: plan.planId,
      requestId: plan.requestId,
      status,
      actionResults: [],
      completedActionIds: [],
      failedActionIds: [],
      skippedActionIds: [],
      createdRefs: {},
      updatedRefs: {},
      replayEligible: false,
      summary:
        status === 'blocked_before_write'
          ? 'Execution blocked: plan not ready for write'
          : 'No-op: no executable actions',
    };
  }

  // Step 2: Build execution context
  const ctx: ProviderExecutionContext = {
    requestId: plan.requestId,
    planId: plan.planId,
    resolvedRefs: {}, // Will accumulate as actions complete
    dryRun,
  };

  if (provider.preflightPlan) {
    const preflight = await provider.preflightPlan(plan, ctx);

    if (!preflight.ok) {
      return {
        planId: plan.planId,
        requestId: plan.requestId,
        status: 'blocked_before_write',
        actionResults: [],
        completedActionIds: [],
        failedActionIds: [],
        skippedActionIds: [],
        createdRefs: {},
        updatedRefs: {},
        replayEligible: false,
        summary: preflight.reason
          ? `Execution blocked before write: ${preflight.reason}`
          : 'Execution blocked before write: provider preflight failed',
      };
    }
  }

  // Step 3: Execute actions in order
  const actionResults: ActionExecutionResult[] = [];
  const completedActionIds: string[] = [];
  const failedActionIds: string[] = [];
  const skippedActionIds: string[] = [];

  for (const action of plan.actions) {
    // Check if action should be skipped
    const skipReason = shouldSkipAction(action, actionResults);

    if (skipReason) {
      // Skip this action
      const skipResult: ActionExecutionResult = {
        actionId: action.actionId,
        actionType: action.actionType,
        status: 'skipped',
        errorMessage: skipReason,
      };
      actionResults.push(skipResult);
      skippedActionIds.push(action.actionId);
      continue;
    }

    // Check if action is no-op
    if (action.actionType.startsWith('no_op')) {
      const noOpResult: ActionExecutionResult = {
        actionId: action.actionId,
        actionType: action.actionType,
        status: 'no_op',
      };
      actionResults.push(noOpResult);
      // no-op actions don't contribute to completion tracking for dependency purposes
      continue;
    }

    // Execute action through provider
    try {
      const providerResult = await provider.executeAction(action, ctx);

      // Preserve provider result
      actionResults.push(providerResult);

      if (providerResult.status === 'success') {
        completedActionIds.push(action.actionId);

        // Update context refs for future actions
        if (providerResult.providerRef) {
          ctx.resolvedRefs[action.actionId] = providerResult.providerRef;
        }
      } else if (providerResult.status === 'failed') {
        failedActionIds.push(action.actionId);
      } else if (providerResult.status === 'skipped') {
        skippedActionIds.push(action.actionId);
      }
    } catch (error) {
      // Provider threw an error; record as failed
      const errorResult: ActionExecutionResult = {
        actionId: action.actionId,
        actionType: action.actionType,
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : String(error),
      };
      actionResults.push(errorResult);
      failedActionIds.push(action.actionId);
    }
  }

  // Step 4: Collect created/updated refs
  const { createdRefs, updatedRefs } = collectExecutionRefs(actionResults, plan.actions);

  // Step 5: Compute final execution status
  const executionStatus = computeExecutionStatus({
    completedCount: completedActionIds.length,
    failedCount: failedActionIds.length,
    skippedCount: skippedActionIds.length,
    noOpCount: actionResults.filter((r) => r.status === 'no_op').length,
    totalExecutableActions: plan.actions.filter((a) => !a.actionType.startsWith('no_op')).length,
  });

  // Step 6: Compute replay eligibility
  const replayEligible = computeReplayEligibility({
    executionStatus,
    failedActionIds,
    actionResults,
    plan,
  });

  // Step 7: Build summary
  const summary = buildExecutionSummary({
    status: executionStatus,
    completedCount: completedActionIds.length,
    failedCount: failedActionIds.length,
    warnings: plan.warnings,
  });

  // Step 8: Assemble ExecutionResult
  return {
    planId: plan.planId,
    requestId: plan.requestId,
    status: executionStatus,
    actionResults,
    completedActionIds,
    failedActionIds,
    skippedActionIds,
    createdRefs,
    updatedRefs,
    replayEligible,
    summary,
  };
}

/**
 * Default executor implementation
 */
export interface PlanExecutor {
  execute(plan: WritePlan, provider: DirectWriteProvider): Promise<ExecutionResult>;
}

export const defaultPlanExecutor: PlanExecutor = {
  execute: (plan, provider) => executeWritePlan({ plan, provider }),
};
