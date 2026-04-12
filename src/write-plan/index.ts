import type { StateResolutionResult } from '../types/resolution.js';
import type { WritePlan } from '../types/write-plan.js';
import { buildWritePlan, type BuildWritePlanInput } from './buildWritePlan.js';

export interface WritePlanner {
  build(resolution: StateResolutionResult): Promise<WritePlan>;
}

/**
 * Default write planner implementation
 */
export const defaultWritePlanner: WritePlanner = {
  build: (resolution: StateResolutionResult) =>
    buildWritePlan({ resolution }),
};

// Main orchestration export
export { buildWritePlan, type BuildWritePlanInput } from './buildWritePlan.js';

// Rule exports for advanced usage
export { buildPatientActions, type BuildPatientActionsInput } from './rules/buildPatientActions.js';
export { buildVisitActions, type BuildVisitActionsInput } from './rules/buildVisitActions.js';
export { buildCaseActions, type BuildCaseActionsInput } from './rules/buildCaseActions.js';
export {
  buildSnapshotActions,
  type SnapshotBranchIntent,
  type BuildSnapshotActionsInput,
} from './rules/buildSnapshotActions.js';
export { buildLinkActions, type BuildLinkActionsInput } from './rules/buildLinkActions.js';
export { buildPlanWarnings } from './rules/buildPlanWarnings.js';
export { buildPreviewSummary } from './rules/buildPreviewSummary.js';
export { computePlanReadiness } from './rules/computePlanReadiness.js';

// Helper exports
export { generateActionId } from './helpers/idGen.js';
