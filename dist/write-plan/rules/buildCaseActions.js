/**
 * Build case write actions from resolved case state
 *
 * Requirements:
 * - create_case: when new case/episode should be created
 * - continue_case: represented via a minimal latest-synthesis update on an existing case
 * - close_case: when case should be marked closed
 * - split_case: when case should be split (advanced)
 * - update_case_latest_synthesis: carries the minimal safe latest-case update slot
 * - no_op_case: when case action is blocked or not applicable
 *
 * Rules:
 * - case action depends on visit action completing
 * - ordering position is 3 (after visit)
 * - case action is "late" - scheduled after snapshots are known
 * - same-date correction typically does NOT create/split case
 * - later-date continuation typically continues or creates case
 *
 * Current runtime boundary:
 * - Stage 5 activates only a minimal safe Case subset
 * - create_case is limited to explicit, single-tooth, exact-identity scope
 * - continue_case is limited to an update on an already resolved case
 * - split_case and close_case remain blocked until later stages
 */
import { generateActionId } from '../helpers/idGen.js';
export function buildCaseActions(input) {
    const { planId, patientResolution, resolution, visitActionId, snapshotActionIds, hasCaseContent, } = input;
    const actions = [];
    if (resolution.status === 'none' || resolution.status === 'unresolved_case_ambiguity') {
        return actions;
    }
    // Determine primary action type based on resolution status
    let primaryActionType = null;
    let primaryTargetMode;
    switch (resolution.status) {
        case 'create_case':
            primaryActionType = 'create_case';
            primaryTargetMode = 'create_new';
            break;
        case 'continue_case':
            // Continuing an existing case uses a later synthesis/update action rather
            // than a separate primary case transition in Stage 5.
            primaryActionType = null;
            primaryTargetMode = 'no_op';
            break;
        case 'close_case':
            primaryActionType = 'close_case';
            primaryTargetMode = 'update_existing';
            break;
        case 'split_case':
            primaryActionType = 'split_case';
            primaryTargetMode = 'create_new';
            break;
        default:
            primaryActionType = null;
            primaryTargetMode = 'no_op';
    }
    let primaryActionId;
    const caseTargetContext = {
        ...(resolution.visitDate ? { visitDate: resolution.visitDate } : {}),
        ...(resolution.toothNumber ? { toothNumber: resolution.toothNumber } : {}),
    };
    if (primaryActionType) {
        primaryActionId = generateActionId(planId, 3, primaryActionType, 'case');
        const primaryTarget = {
            patientId: patientResolution.resolvedPatientId || 'NEW',
            caseId: resolution.resolvedCaseId || 'NEW',
            ...caseTargetContext,
            sourceResolutionPath: resolution.status,
        };
        if (resolution.status === 'create_case' && resolution.visitDate) {
            primaryTarget.episodeStartDate = resolution.visitDate;
        }
        if (resolution.relatedCaseIds && resolution.relatedCaseIds.length > 0) {
            const firstId = resolution.relatedCaseIds[0];
            if (firstId) {
                primaryTarget.entityRef = firstId;
            }
        }
        actions.push({
            actionId: primaryActionId,
            actionOrder: 3,
            actionType: primaryActionType,
            entityType: 'case',
            targetMode: primaryTargetMode,
            target: primaryTarget,
            payloadIntent: {
                intendedChanges: {}, // Provider adapter will fill these
                guardedFields: ['case_id', 'date_created'],
            },
            dependsOnActionIds: [visitActionId],
            blockers: [],
            safety: {
                duplicateSafe: false,
                replayEligibleIfFailed: primaryActionType === 'create_case' || primaryActionType === 'split_case',
                highRiskIdentityAction: primaryActionType === 'create_case' ||
                    primaryActionType === 'split_case' ||
                    primaryActionType === 'close_case',
            },
            previewVisible: true,
        });
    }
    // Late-stage case synthesis update (after snapshots are written).
    // Stage 5 keeps this minimal: it is used only for safe continuation on an
    // already resolved case, while broader latest-synthesis behavior stays for
    // later activation.
    if (hasCaseContent &&
        resolution.status === 'continue_case' &&
        resolution.resolvedCaseId) {
        const synthesisActionId = generateActionId(planId, 6, // Late position (after snapshots)
        'update_case_latest_synthesis', resolution.resolvedCaseId);
        actions.push({
            actionId: synthesisActionId,
            actionOrder: 6,
            actionType: 'update_case_latest_synthesis',
            entityType: 'case',
            targetMode: 'update_existing',
            target: {
                patientId: patientResolution.resolvedPatientId || 'NEW',
                caseId: resolution.resolvedCaseId,
                ...caseTargetContext,
                sourceResolutionPath: 'case_synthesis_update',
            },
            payloadIntent: {
                intendedChanges: {}, // Provider adapter will fill these
                guardedFields: ['case_id'],
                omittedFieldsByRule: ['date_created', 'case_id'],
            },
            dependsOnActionIds: [
                ...(primaryActionId ? [primaryActionId] : [visitActionId]),
                ...snapshotActionIds,
            ],
            blockers: [],
            safety: {
                duplicateSafe: true,
                replayEligibleIfFailed: true,
            },
            previewVisible: false, // Synthesis updates are internal
        });
    }
    return actions;
}
