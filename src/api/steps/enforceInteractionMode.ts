import type { InteractionMode } from '../../types/core.js';
import type { StateResolutionResult } from '../../types/resolution.js';
import type { WritePlan } from '../../types/write-plan.js';

export function enforceInteractionMode(
  resolution: StateResolutionResult,
  plan: WritePlan,
): InteractionMode {
  if (plan.readiness === 'preview_only') {
    return 'inform_no_op';
  }

  return resolution.interactionMode;
}
