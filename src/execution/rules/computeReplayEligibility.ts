/**
 * Compute replay eligibility from execution outcome
 *
 * Determines whether a failed or partial execution can be safely replayed.
 *
 * Replay is eligible when:
 * - prior completion state is clear
 * - duplicate risk is controlled
 * - remaining targets are still trustworthy
 *
 * Replay is blocked when:
 * - prior write completion state is unknown
 * - identity targeting is no longer trustworthy
 * - provider state is ambiguous
 */

import type { ActionExecutionResult } from '../../types/execution.js';
import type { ExecutionStatus } from '../../types/core.js';
import type { WritePlan } from '../../types/write-plan.js';

export interface ComputeReplayEligibilityInput {
  executionStatus: ExecutionStatus;
  failedActionIds: string[];
  actionResults: ActionExecutionResult[];
  plan: WritePlan;
}

export function computeReplayEligibility(input: ComputeReplayEligibilityInput): boolean {
  const { executionStatus, failedActionIds, actionResults, plan } = input;

  // If full success, no replay needed
  if (executionStatus === 'success') {
    return false;
  }

  // If no_op or blocked, no replay
  if (executionStatus === 'no_op' || executionStatus === 'blocked_before_write') {
    return false;
  }

  // If nothing executed at all, no replay
  if (executionStatus === 'failed_before_any_write') {
    return false;
  }

  // Partial success or failed after partial write: check if replay is safe
  if (
    executionStatus === 'partial_success' ||
    executionStatus === 'failed_after_partial_write'
  ) {
    // Safe to replay if:
    // 1. We know exactly what succeeded (all completed actions have clear status)
    // 2. High-risk identity actions that succeeded won't be re-executed

    // Check if any completed actions are high-risk identity actions
    const hasHighRiskCompleted = actionResults
      .filter((r) => r.status === 'success')
      .some((r) => {
        const action = plan.actions.find((a) => a.actionId === r.actionId);
        return action && action.safety.highRiskIdentityAction;
      });

    if (hasHighRiskCompleted) {
      // High-risk action already succeeded; replay could duplicate
      return false;
    }

    // Check plan safety markers
    const allFailedActionsSafeToDuplicate = failedActionIds.every((failedId) => {
      const action = plan.actions.find((a) => a.actionId === failedId);
      return action && action.safety.duplicateSafe;
    });

    if (!allFailedActionsSafeToDuplicate) {
      // Some failed actions are not duplicate-safe; unsafe to replay
      return false;
    }

    // Otherwise, replay is eligible
    return true;
  }

  return false;
}
