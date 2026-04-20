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
import { buildFollowUpActions } from './rules/buildFollowUpActions.js';
import { buildPlanWarnings } from './rules/buildPlanWarnings.js';
import { buildPreviewSummary } from './rules/buildPreviewSummary.js';
import { computePlanReadiness } from './rules/computePlanReadiness.js';
import { buildDeterministicVisitId } from './helpers/visitId.js';
import { extractContinuationPayload } from './rules/extractContinuationPayload.js';
/**
 * Build a WritePlan from a StateResolutionResult
 *
 * This is the main entry point for the write-plan engine.
 */
export async function buildWritePlan(input) {
    const { resolution, snapshotBranchIntents, inputHash, snapshotLookups, hasVisitLevelChanges, providerMode, patientClues, visitContext, toothItems, caseUpdates, } = input;
    // Generate plan ID (deterministic based on request)
    const planId = `plan_${input.resolution.requestId.slice(0, 8)}`;
    const branchIntents = snapshotBranchIntents ||
        inferSnapshotBranchIntents(resolution);
    const plannedVisitId = buildDeterministicVisitId(patientClues?.patientId, visitContext?.visitDate);
    const hasSnapshotContent = branchIntents.some((intent) => intent.hasContent);
    const hasSnapshotWrites = branchIntents.some((intent) => snapshotBranchIntentProducesWrite(intent, snapshotLookups));
    const continuationPayload = extractContinuationPayload({
        toothItems,
        ...(caseUpdates !== undefined ? { caseUpdates } : {}),
    });
    const episodeStartVisitId = resolveSafeEpisodeStartVisitId(resolution);
    const hasCaseIntendedChanges = Object.keys(continuationPayload.caseIntendedChangesByTooth).length > 0;
    const hasDirectCaseIntendedChanges = Boolean(continuationPayload.directCaseUpdate &&
        Object.keys(continuationPayload.directCaseUpdate.intendedChanges).length > 0);
    const hasPatientContent = hasPatientUpdateContent(patientClues);
    // Step 1: Build patient actions
    const patientActions = buildPatientActions({
        planId,
        resolution: resolution.patient,
        hasPatientContent,
        claimedPatientId: patientClues?.patientId,
        birthYear: patientClues?.birthYear,
        genderHint: patientClues?.genderHint,
        firstVisitDate: resolution.patient.status === 'create_new_patient'
            ? visitContext?.visitDate
            : undefined,
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
        claimedPatientId: patientClues?.patientId,
        visitDate: visitContext?.visitDate,
        visitType: visitContext?.visitType,
        chiefComplaint: visitContext?.chiefComplaint,
        painLevel: visitContext?.painLevel,
        episodeStartVisitId,
    });
    if (visitActions.length === 0) {
        throw new Error('Visit actions must not be empty');
    }
    // Step 3: Build case actions
    const caseActions = buildCaseActions({
        planId,
        patientResolution: resolution.patient,
        resolution: resolution.caseResolution,
        patientActionId: patientActions[0].actionId,
        visitActionId: visitActions[0].actionId,
        snapshotActionIds: [], // Will be filled after snapshot actions
        hasCaseContent: (hasSnapshotContent || hasCaseIntendedChanges || hasDirectCaseIntendedChanges) &&
            resolution.caseResolution.status !== 'none',
        claimedPatientId: patientClues?.patientId,
        caseIntendedChangesByTooth: continuationPayload.caseIntendedChangesByTooth,
        ...(continuationPayload.directCaseUpdate
            ? { directCaseUpdate: continuationPayload.directCaseUpdate }
            : {}),
    });
    // Build snapshot actions
    const snapshotActions = buildSnapshotActions({
        planId,
        visitResolution: resolution.visit,
        caseResolution: resolution.caseResolution,
        workflowIntent: resolution.workflowIntent,
        visitActionId: visitActions[0].actionId,
        plannedVisitId,
        branchIntents,
        snapshotLookups,
    });
    // Update case actions with snapshot IDs now that we have them
    const snapshotActionIds = snapshotActions.map((a) => a.actionId);
    const updatedCaseActions = buildCaseActions({
        planId,
        patientResolution: resolution.patient,
        resolution: resolution.caseResolution,
        patientActionId: patientActions[0].actionId,
        visitActionId: visitActions[0].actionId,
        snapshotActionIds,
        hasCaseContent: (hasSnapshotContent || hasCaseIntendedChanges || hasDirectCaseIntendedChanges) &&
            resolution.caseResolution.status !== 'none',
        claimedPatientId: patientClues?.patientId,
        caseIntendedChangesByTooth: continuationPayload.caseIntendedChangesByTooth,
        ...(continuationPayload.directCaseUpdate
            ? { directCaseUpdate: continuationPayload.directCaseUpdate }
            : {}),
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
        includeExplicitLinks: hasLinkableCaseTargets(resolution) &&
            branchIntents.every((intent) => !intent.hasContent ||
                intent.branch === 'PRE' ||
                intent.branch === 'PLAN' ||
                intent.branch === 'DR' ||
                intent.branch === 'DX' ||
                intent.branch === 'RAD' ||
                intent.branch === 'OP'),
    };
    const caseActionIdsByTooth = buildCaseActionIdsByTooth(updatedCaseActions);
    if (Object.keys(caseActionIdsByTooth).length > 0) {
        linkActionInput.caseActionIdsByTooth = caseActionIdsByTooth;
    }
    const primaryCaseAction = updatedCaseActions.find((action) => action.entityType === 'case' && action.actionType === 'create_case');
    if (primaryCaseAction?.actionId) {
        linkActionInput.caseActionId = primaryCaseAction.actionId;
    }
    const followUpActions = buildFollowUpActions({
        planId,
        patientResolution: resolution.patient,
        visitResolution: resolution.visit,
        caseResolution: resolution.caseResolution,
        patientActionId: patientActions[0].actionId,
        visitActionId: visitActions[0].actionId,
        caseActionIdsByTooth,
        followUpIntendedChangesByTooth: continuationPayload.followUpIntendedChangesByTooth,
    });
    const linkActions = buildLinkActions(linkActionInput);
    // Step 6: Combine all actions in order
    const allActions = sortActionsForExecution([
        ...patientActions,
        ...visitActions,
        ...updatedCaseActions,
        ...snapshotActions,
        ...followUpActions,
        ...linkActions,
    ]);
    // Step 7: Build plan-level warnings
    const planWarnings = buildPlanWarnings(resolution, allActions);
    if (hasBlockedRealPatientUpdateTarget(providerMode, allActions)) {
        planWarnings.push('🛑 Real Airtable patient update is blocked until the patient Airtable record id is resolved.');
    }
    // Step 8: Compute plan readiness
    const planReadiness = hasBlockedRealPatientUpdateTarget(providerMode, allActions)
        ? 'blocked'
        : computePlanReadiness(resolution, allActions);
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
function hasBlockedRealPatientUpdateTarget(providerMode, actions) {
    if (providerMode !== 'real') {
        return false;
    }
    return actions.some((action) => action.entityType === 'patient' &&
        action.actionType === 'update_patient' &&
        (!action.target.entityRef || action.target.entityRef === 'NEW'));
}
function buildCaseActionIdsByTooth(actions) {
    return Object.fromEntries(actions.flatMap((action) => action.entityType === 'case' &&
        action.actionType === 'create_case' &&
        action.target.toothNumber
        ? [[action.target.toothNumber, action.actionId]]
        : []));
}
function hasLinkableCaseTargets(resolution) {
    if (resolution.caseResolution.targets && resolution.caseResolution.targets.length > 0) {
        return resolution.caseResolution.targets.some((target) => target.status === 'create_case' || target.status === 'continue_case');
    }
    return ((resolution.caseResolution.status === 'create_case' ||
        resolution.caseResolution.status === 'continue_case') &&
        Boolean(resolution.caseResolution.toothNumber));
}
function resolveSafeEpisodeStartVisitId(resolution) {
    const caseTargets = resolution.caseResolution.targets && resolution.caseResolution.targets.length > 0
        ? resolution.caseResolution.targets
        : resolution.caseResolution.status === 'continue_case' &&
            resolution.caseResolution.resolvedCaseId
            ? [
                {
                    status: 'continue_case',
                    toothNumber: resolution.caseResolution.toothNumber ?? 'unknown',
                    resolvedCaseId: resolution.caseResolution.resolvedCaseId,
                    reasons: [...resolution.caseResolution.reasons],
                },
            ]
            : [];
    if (caseTargets.length !== 1) {
        return undefined;
    }
    const target = caseTargets[0];
    if (target.status !== 'continue_case' || !target.resolvedCaseId) {
        return undefined;
    }
    const candidate = target.resolvedCaseId.trim();
    return candidate.startsWith('VISIT-') ? candidate : undefined;
}
function sortActionsForExecution(actions) {
    const indexedActions = actions.map((action, index) => ({ action, index }));
    const actionIds = new Set(actions.map((action) => action.actionId));
    const dependencyCounts = new Map();
    const downstreamByDependency = new Map();
    for (const { action } of indexedActions) {
        const relevantDependencies = action.dependsOnActionIds.filter((depId) => actionIds.has(depId));
        dependencyCounts.set(action.actionId, relevantDependencies.length);
        for (const depId of relevantDependencies) {
            const downstream = downstreamByDependency.get(depId) ?? [];
            downstream.push(action.actionId);
            downstreamByDependency.set(depId, downstream);
        }
    }
    const readyQueue = indexedActions
        .filter(({ action }) => (dependencyCounts.get(action.actionId) ?? 0) === 0)
        .sort(compareIndexedActions);
    const sorted = [];
    while (readyQueue.length > 0) {
        const next = readyQueue.shift();
        if (!next) {
            break;
        }
        sorted.push(next.action);
        for (const dependentId of downstreamByDependency.get(next.action.actionId) ?? []) {
            const remainingDeps = (dependencyCounts.get(dependentId) ?? 0) - 1;
            dependencyCounts.set(dependentId, remainingDeps);
            if (remainingDeps === 0) {
                const dependent = indexedActions.find(({ action }) => action.actionId === dependentId);
                if (dependent) {
                    readyQueue.push(dependent);
                    readyQueue.sort(compareIndexedActions);
                }
            }
        }
    }
    if (sorted.length === actions.length) {
        return sorted;
    }
    return [...indexedActions].sort(compareIndexedActions).map(({ action }) => action);
}
function compareIndexedActions(left, right) {
    if (left.action.actionOrder !== right.action.actionOrder) {
        return left.action.actionOrder - right.action.actionOrder;
    }
    return left.index - right.index;
}
function hasPatientUpdateContent(patientClues) {
    if (!patientClues) {
        return false;
    }
    return ((patientClues.birthYear !== undefined &&
        String(patientClues.birthYear) !== '') ||
        (typeof patientClues.genderHint === 'string' &&
            patientClues.genderHint.trim().length > 0));
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
