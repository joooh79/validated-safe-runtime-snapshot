/**
 * Main Write Plan Engine Orchestration
 *
 * Transforms StateResolutionResult into a comprehensive WritePlan.
 *
 * Requirements:
 * - input: StateResolutionResult
 * - output: WritePlan
 * - no provider calls
 * - no schema invention
 * - preserve all resolution context
 * - generate actionable preview summary
 *
 * Approach:
 * 1. Validate resolution is safe to plan for
 * 2. Build per-entity actions in order
 * 3. Combine into ordered action list with dependencies
 * 4. Compute plan readiness
 * 5. Generate preview summary
 * 6. Assemble final WritePlan
 *
 * Canon-aware boundary:
 * - the provider-neutral plan model already reserves Patient / Visit / Case /
 *   Snapshot / Link action families so future activation can follow the target
 *   canon rather than drifting back to the current Airtable base shape
 * - Stage 5 activates only a minimal safe Case subset
 * - explicit link writes and non-PRE snapshot writes remain blocked until
 *   activation work happens deliberately, branch by branch
 */

import type { StateResolutionResult } from '../types/resolution.js';
import type { WritePlan } from '../types/write-plan.js';
import type { SnapshotBranch } from '../types/core.js';
import type { CurrentStateLookupBundle } from '../resolution/index.js';
import { buildPatientActions } from './rules/buildPatientActions.js';
import { buildVisitActions } from './rules/buildVisitActions.js';
import { buildCaseActions } from './rules/buildCaseActions.js';
import { buildSnapshotActions, type SnapshotBranchIntent } from './rules/buildSnapshotActions.js';
import { buildLinkActions, type BuildLinkActionsInput } from './rules/buildLinkActions.js';
import { buildPlanWarnings } from './rules/buildPlanWarnings.js';
import { buildPreviewSummary } from './rules/buildPreviewSummary.js';
import { computePlanReadiness } from './rules/computePlanReadiness.js';

export interface BuildWritePlanInput {
  resolution: StateResolutionResult;
  /**
   * Optional snapshot branch hints
   * If not provided, infer from resolution summary
   */
  snapshotBranchIntents?: SnapshotBranchIntent[];
  /**
   * Optional input hash for tracing
   */
  inputHash?: string;
  /**
   * Optional explicit same-date snapshot row targets carried from current-state
   * lookups. Used conservatively for branch update activation.
   */
  snapshotLookups?: CurrentStateLookupBundle['snapshotLookups'];
}

/**
 * Build a WritePlan from a StateResolutionResult
 *
 * This is the main entry point for the write-plan engine.
 */
export async function buildWritePlan(input: BuildWritePlanInput): Promise<WritePlan> {
  const { resolution, snapshotBranchIntents, inputHash, snapshotLookups } = input;

  // Generate plan ID (deterministic based on request)
  const planId = `plan_${input.resolution.requestId.slice(0, 8)}`;

  const branchIntents: SnapshotBranchIntent[] =
    snapshotBranchIntents ||
    inferSnapshotBranchIntents(resolution);
  const hasSnapshotContent = branchIntents.some((intent) => intent.hasContent);

  // Step 1: Build patient actions
  const patientActions = buildPatientActions({
    planId,
    resolution: resolution.patient,
    hasPatientContent: false,
  });

  if (patientActions.length === 0) {
    throw new Error('Patient actions must not be empty');
  }

  // Step 2: Build visit actions
  const visitActions = buildVisitActions({
    planId,
    resolution: resolution.visit,
    patientActionId: patientActions[0]!.actionId,
    hasVisitContent: hasSnapshotContent,
  });

  if (visitActions.length === 0) {
    throw new Error('Visit actions must not be empty');
  }

  // Step 3: Build case actions
  const caseActions = buildCaseActions({
    planId,
    patientResolution: resolution.patient,
    resolution: resolution.caseResolution,
    visitActionId: visitActions[0]!.actionId,
    snapshotActionIds: [], // Will be filled after snapshot actions
    hasCaseContent:
      hasSnapshotContent && resolution.caseResolution.status !== 'none',
  });

  // Build snapshot actions
  const snapshotActions = buildSnapshotActions({
    planId,
    visitResolution: resolution.visit,
    caseResolution: resolution.caseResolution,
    workflowIntent: resolution.workflowIntent,
    visitActionId: visitActions[0]!.actionId,
    branchIntents,
    snapshotLookups,
  });

  // Update case actions with snapshot IDs now that we have them
  const snapshotActionIds = snapshotActions.map((a) => a.actionId);
  const updatedCaseActions = buildCaseActions({
    planId,
    patientResolution: resolution.patient,
    resolution: resolution.caseResolution,
    visitActionId: visitActions[0]!.actionId,
    snapshotActionIds,
    hasCaseContent:
      hasSnapshotContent && resolution.caseResolution.status !== 'none',
  });

  // Step 5: Build link actions
  const linkActionInput: BuildLinkActionsInput = {
    planId,
    patientResolution: resolution.patient,
    visitResolution: resolution.visit,
    caseResolution: resolution.caseResolution,
    patientActionId: patientActions[0]!.actionId,
    visitActionId: visitActions[0]!.actionId,
    snapshotActions,
    // Stage 7E activates only the minimal PRE/PLAN/DR/DX/RAD/OP + Case-aware link subset.
    includeExplicitLinks:
      (resolution.caseResolution.status === 'create_case' ||
        resolution.caseResolution.status === 'continue_case') &&
      branchIntents.every(
        (intent) =>
          !intent.hasContent ||
          intent.branch === 'PRE' ||
          intent.branch === 'PLAN' ||
          intent.branch === 'DR' ||
          intent.branch === 'DX' ||
          intent.branch === 'RAD' ||
          intent.branch === 'OP',
      ) &&
      Boolean(resolution.caseResolution.toothNumber),
  };

  if (updatedCaseActions[0]?.actionId) {
    linkActionInput.caseActionId = updatedCaseActions[0].actionId;
  }

  const linkActions = buildLinkActions(linkActionInput);

  // Step 6: Combine all actions in order
  const allActions = [
    ...patientActions,
    ...visitActions,
    ...updatedCaseActions,
    ...snapshotActions,
    ...linkActions,
  ];

  // Step 7: Build plan-level warnings
  const planWarnings = buildPlanWarnings(resolution, allActions);

  // Step 8: Compute plan readiness
  const planReadiness = computePlanReadiness(resolution, allActions);

  // Step 9: Generate preview summary
  const previewSummary = buildPreviewSummary(resolution, allActions, planWarnings);

  // Step 10: Assemble final WritePlan
  const writePlan: WritePlan = {
    planId,
    requestId: resolution.requestId,
    inputHash: inputHash ?? null,
    resolution,
    warnings: planWarnings,
    readiness: planReadiness,
    actions: allActions,
    preview: previewSummary,
    replay: {
      // Basic replay metadata
      // Enhanced in execution/retry layer
      replaySourcePlanId: planId,
      replayVersion: 1,
      safeResumePoints: allActions
        .filter((a) => !a.actionType.startsWith('no_op'))
        .map((a) => a.actionId),
    },
  };

  return writePlan;
}

/**
 * Infer snapshot branch intents from resolution state
 *
 * This is a heuristic that can be overridden by explicit intent.
 * Exact branches and content mapping is provider-specific.
 *
 * Important:
 * - broad branch inference here does not activate those branches at runtime
 * - provider preflight still blocks non-PRE execution until target-canon
 *   migration and branch-specific mapping confirmation are completed
 */
function inferSnapshotBranchIntents(
  resolution: StateResolutionResult,
): SnapshotBranchIntent[] {
  const branches: SnapshotBranch[] = ['PRE', 'RAD', 'OP', 'DX', 'PLAN', 'DR'];

  // Start with all branches as potential candidates
  // Provider adapter will map exact content to branches
  const intents: SnapshotBranchIntent[] = branches.map((branch) => ({
    branch,
    hasContent: true, // Assume all branches have content unless provider says otherwise
    isSameDateCorrection:
      resolution.visit.status === 'update_existing_visit_same_date',
    isContinuation:
      resolution.continuityIntent === 'continue_case' ||
      (resolution.visit.status === 'create_new_visit' &&
        resolution.caseResolution.status !== 'create_case'),
  }));

  return intents;
}
