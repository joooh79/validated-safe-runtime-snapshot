/**
 * Dependency and blocker guards for action execution
 *
 * Determines whether an action should be skipped based on:
 * - unmet dependencies
 * - failed upstream actions
 * - blocker conditions
 *
 * Returns skip reason if action should be skipped, or undefined if it can proceed.
 */

import type { WriteAction } from '../../types/write-plan.js';
import type { ActionExecutionResult } from '../../types/execution.js';

export function shouldSkipAction(
  action: WriteAction,
  priorResults: ActionExecutionResult[],
): string | undefined {
  // Check if action has blockers
  if (action.blockers.length > 0) {
    return `blocked by: ${action.blockers.join(', ')}`;
  }

  // Check if all dependencies have been met
  if (action.dependsOnActionIds.length === 0) {
    // No dependencies; can proceed
    return undefined;
  }

  // Check each declared dependency
  for (const depId of action.dependsOnActionIds) {
    const depResult = priorResults.find((r) => r.actionId === depId);

    if (!depResult) {
      // Dependency not yet executed (shouldn't happen in-order, but defensive)
      return `dependency not yet completed: ${depId}`;
    }

    if (depResult.status === 'failed') {
      return `upstream dependency failed: ${depId}`;
    }

    // Note: skipped dependencies might be recoverable; we allow proceeding
    // if the dependency was explicitly skipped (e.g., no-op case)
    // Provider will decide if action can still proceed without ref
  }

  // All dependencies met; action can proceed
  return undefined;
}
