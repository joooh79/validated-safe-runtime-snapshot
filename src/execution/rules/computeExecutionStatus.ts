/**
 * Compute final execution status from execution outcome
 *
 * Normalizes execution results into discrete ExecutionStatus values:
 * - success: all executable actions succeeded
 * - partial_success: some succeeded, some failed, but progress was made
 * - failed_after_partial_write: write did occur, then failed
 * - failed_before_any_write: no successful writes at all
 * - blocked_before_write: plan was not execution_ready
 * - no_op: no meaningful actions to execute
 */

import type { ExecutionStatus } from '../../types/core.js';

export interface ComputeStatusInput {
  completedCount: number;
  failedCount: number;
  skippedCount: number;
  noOpCount: number;
  totalExecutableActions: number;
}

export function computeExecutionStatus(input: ComputeStatusInput): ExecutionStatus {
  const { completedCount, failedCount, skippedCount, noOpCount, totalExecutableActions } = input;

  // If no executable actions at all, return no_op
  if (totalExecutableActions === 0) {
    return 'no_op';
  }

  // If all executable actions succeeded
  if (failedCount === 0 && completedCount > 0) {
    return 'success';
  }

  // If some succeeded and some failed: partial_success
  if (completedCount > 0 && failedCount > 0) {
    return 'partial_success';
  }

  // If nothing succeeded but some were skipped, still no meaningful write
  if (completedCount === 0 && failedCount > 0 && skippedCount > 0) {
    return 'failed_before_any_write';
  }

  // If nothing succeeded and nothing was skipped, it all failed
  if (completedCount === 0 && failedCount > 0) {
    return 'failed_before_any_write';
  }

  // Catch-all: no progress
  return 'failed_before_any_write';
}
