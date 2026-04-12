/**
 * Determine the readiness of the write plan for execution
 *
 * Rules:
 * - If resolution is blocked, plan must be blocked or preview_only
 * - If resolution is ready_for_write_plan, plan may be execution_ready
 * - If plan has no actions or all actions are no-op, mark as appropriate
 */

import type { StateResolutionResult } from '../../types/resolution.js';
import type { WriteAction } from '../../types/write-plan.js';

export function computePlanReadiness(
  resolution: StateResolutionResult,
  actions: WriteAction[],
): 'execution_ready' | 'preview_only' | 'blocked' {
  // If resolution is blocked, plan must not be execution_ready
  if (
    resolution.readiness === 'blocked_requires_correction' ||
    resolution.readiness === 'blocked_requires_recheck' ||
    resolution.readiness === 'blocked_hard_stop' ||
    resolution.readiness === 'blocked_unresolved'
  ) {
    return 'blocked';
  }

  // If resolution is ready but plan is empty/all no-op
  if (actions.length === 0) {
    return 'preview_only';
  }

  const hasExecutableAction = actions.some(
    (a) =>
      !a.actionType.startsWith('no_op') &&
      a.actionType !== 'attach_existing_patient' &&
      (!a.blockers || a.blockers.length === 0),
  );

  if (!hasExecutableAction) {
    return 'preview_only';
  }

  // Resolution is ready and plan has executable actions
  return 'execution_ready';
}
