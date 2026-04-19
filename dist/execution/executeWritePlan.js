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
import { computeExecutionStatus } from './rules/computeExecutionStatus.js';
import { collectExecutionRefs } from './rules/collectExecutionRefs.js';
import { computeReplayEligibility } from './rules/computeReplayEligibility.js';
import { buildExecutionSummary } from './rules/buildExecutionSummary.js';
/**
 * Execute a WritePlan through a DirectWriteProvider
 *
 * Main entry point for the execution engine.
 */
export async function executeWritePlan(input) {
    const { plan, provider, dryRun = false } = input;
    // Step 1: Early exit if plan not execution-ready
    if (plan.readiness !== 'execution_ready') {
        // Plan is blocked or preview-only; determine terminal status
        const status = plan.readiness === 'blocked' ? 'blocked_before_write' : 'no_op';
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
            summary: status === 'blocked_before_write'
                ? 'Execution blocked: plan not ready for write'
                : 'No-op: no executable actions',
        };
    }
    // Step 2: Build execution context
    const ctx = {
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
    const actionResults = [];
    const completedActionIds = [];
    const failedActionIds = [];
    const skippedActionIds = [];
    let pendingActions = [...plan.actions];
    while (pendingActions.length > 0) {
        let progressedThisPass = false;
        const deferredActions = [];
        for (const action of pendingActions) {
            const dependencyStatus = getDependencyStatus(action, actionResults);
            if (dependencyStatus.kind === 'blocked') {
                const skipResult = {
                    actionId: action.actionId,
                    actionType: action.actionType,
                    status: 'skipped',
                    errorMessage: dependencyStatus.reason,
                };
                actionResults.push(skipResult);
                skippedActionIds.push(action.actionId);
                progressedThisPass = true;
                continue;
            }
            if (dependencyStatus.kind === 'pending') {
                deferredActions.push(action);
                continue;
            }
            if (action.actionType.startsWith('no_op')) {
                const noOpResult = {
                    actionId: action.actionId,
                    actionType: action.actionType,
                    status: 'no_op',
                };
                actionResults.push(noOpResult);
                progressedThisPass = true;
                continue;
            }
            try {
                const providerResult = await provider.executeAction(action, ctx);
                actionResults.push(providerResult);
                if (providerResult.status === 'success') {
                    completedActionIds.push(action.actionId);
                    if (providerResult.providerRef) {
                        ctx.resolvedRefs[action.actionId] = providerResult.providerRef;
                    }
                }
                else if (providerResult.status === 'failed') {
                    failedActionIds.push(action.actionId);
                }
                else if (providerResult.status === 'skipped') {
                    skippedActionIds.push(action.actionId);
                }
            }
            catch (error) {
                const errorResult = {
                    actionId: action.actionId,
                    actionType: action.actionType,
                    status: 'failed',
                    errorMessage: error instanceof Error ? error.message : String(error),
                };
                actionResults.push(errorResult);
                failedActionIds.push(action.actionId);
            }
            progressedThisPass = true;
        }
        if (!progressedThisPass) {
            for (const action of deferredActions) {
                const dependencyStatus = getDependencyStatus(action, actionResults);
                const skipResult = {
                    actionId: action.actionId,
                    actionType: action.actionType,
                    status: 'skipped',
                    errorMessage: dependencyStatus.kind === 'ready'
                        ? 'dependency not yet completed'
                        : dependencyStatus.reason,
                };
                actionResults.push(skipResult);
                skippedActionIds.push(action.actionId);
            }
            break;
        }
        pendingActions = deferredActions;
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
export const defaultPlanExecutor = {
    execute: (plan, provider) => executeWritePlan({ plan, provider }),
};
function getDependencyStatus(action, priorResults) {
    if (action.blockers.length > 0) {
        return {
            kind: 'blocked',
            reason: `blocked by: ${action.blockers.join(', ')}`,
        };
    }
    for (const depId of action.dependsOnActionIds) {
        const depResult = priorResults.find((result) => result.actionId === depId);
        if (!depResult) {
            return {
                kind: 'pending',
                reason: `dependency not yet completed: ${depId}`,
            };
        }
        if (depResult.status === 'failed' || depResult.status === 'skipped') {
            return {
                kind: 'blocked',
                reason: `upstream dependency failed: ${depId}`,
            };
        }
    }
    return { kind: 'ready' };
}
