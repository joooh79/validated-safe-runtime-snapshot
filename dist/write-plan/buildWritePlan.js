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
import { buildPatientActions } from './rules/buildPatientActions.js';
import { buildVisitActions } from './rules/buildVisitActions.js';
import { buildCaseActions } from './rules/buildCaseActions.js';
import { buildSnapshotActions } from './rules/buildSnapshotActions.js';
import { snapshotBranchIntentProducesWrite } from './rules/compareSnapshotPayload.js';
import { buildLinkActions } from './rules/buildLinkActions.js';
import { buildPlanWarnings } from './rules/buildPlanWarnings.js';
import { buildPreviewSummary } from './rules/buildPreviewSummary.js';
import { computePlanReadiness } from './rules/computePlanReadiness.js';
/**
 * Build a WritePlan from a StateResolutionResult
 *
 * This is the main entry point for the write-plan engine.
 */
export async function buildWritePlan(input) {
    const { resolution, snapshotBranchIntents, inputHash, snapshotLookups, hasVisitLevelChanges, } = input;
    // Generate plan ID (deterministic based on request)
    const planId = `plan_${input.resolution.requestId.slice(0, 8)}`;
    const branchIntents = snapshotBranchIntents ||
        inferSnapshotBranchIntents(resolution);
    const hasSnapshotContent = branchIntents.some((intent) => intent.hasContent);
    const hasSnapshotWrites = branchIntents.some((intent) => snapshotBranchIntentProducesWrite(intent, snapshotLookups));
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
        patientActionId: patientActions[0].actionId,
        hasVisitLevelChanges: hasVisitLevelChanges ??
            resolution.visit.status !== 'update_existing_visit_same_date',
        hasDependentSnapshotWrites: hasSnapshotWrites || hasSnapshotContent,
    });
    if (visitActions.length === 0) {
        throw new Error('Visit actions must not be empty');
    }
    // Step 3: Build case actions
    const caseActions = buildCaseActions({
        planId,
        patientResolution: resolution.patient,
        resolution: resolution.caseResolution,
        visitActionId: visitActions[0].actionId,
        snapshotActionIds: [], // Will be filled after snapshot actions
        hasCaseContent: hasSnapshotContent && resolution.caseResolution.status !== 'none',
    });
    // Build snapshot actions
    const snapshotActions = buildSnapshotActions({
        planId,
        visitResolution: resolution.visit,
        caseResolution: resolution.caseResolution,
        workflowIntent: resolution.workflowIntent,
        visitActionId: visitActions[0].actionId,
        branchIntents,
        snapshotLookups,
    });
    // Update case actions with snapshot IDs now that we have them
    const snapshotActionIds = snapshotActions.map((a) => a.actionId);
    const updatedCaseActions = buildCaseActions({
        planId,
        patientResolution: resolution.patient,
        resolution: resolution.caseResolution,
        visitActionId: visitActions[0].actionId,
        snapshotActionIds,
        hasCaseContent: hasSnapshotContent && resolution.caseResolution.status !== 'none',
    });
    // Step 5: Build link actions
    const linkActionInput = {
        planId,
        patientResolution: resolution.patient,
        visitResolution: resolution.visit,
        caseResolution: resolution.caseResolution,
        patientActionId: patientActions[0].actionId,
        visitActionId: visitActions[0].actionId,
        snapshotActions,
        // Stage 7E activates only the minimal PRE/PLAN/DR/DX/RAD/OP + Case-aware link subset.
        includeExplicitLinks: (resolution.caseResolution.status === 'create_case' ||
            resolution.caseResolution.status === 'continue_case') &&
            branchIntents.every((intent) => !intent.hasContent ||
                intent.branch === 'PRE' ||
                intent.branch === 'PLAN' ||
                intent.branch === 'DR' ||
                intent.branch === 'DX' ||
                intent.branch === 'RAD' ||
                intent.branch === 'OP') &&
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
    const writePlan = {
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
function inferSnapshotBranchIntents(resolution) {
    const branches = ['PRE', 'RAD', 'OP', 'DX', 'PLAN', 'DR'];
    // Start with all branches as potential candidates
    // Provider adapter will map exact content to branches
    const intents = branches.map((branch) => ({
        branch,
        hasContent: true, // Assume all branches have content unless provider says otherwise
        isSameDateCorrection: resolution.visit.status === 'update_existing_visit_same_date',
        isContinuation: resolution.continuityIntent === 'continue_case' ||
            (resolution.visit.status === 'create_new_visit' &&
                resolution.caseResolution.status !== 'create_case'),
    }));
    return intents;
}
