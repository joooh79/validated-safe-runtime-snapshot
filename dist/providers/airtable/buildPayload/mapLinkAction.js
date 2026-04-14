/**
 * Link Action Payload Builder
 *
 * Stage 7E scope:
 * - link_visit_to_case via `Visits.Cases`
 * - link_snapshot_to_case for PRE / PLAN / DR / DX / RAD / OP via:
 *   - `Pre-op Clinical Findings.Case ID`
 *   - `Treatment Plan.Case ID`
 *   - `Doctor Reasoning.Case ID`
 *   - `Diagnosis.Case ID`
 *   - `Radiographic Findings.Case ID`
 *   - `Operative Findings.Case ID`
 *
 * Authoritative write side:
 * - write only the child-side field
 * - rely on the existing linked-field relationship to materialize the inverse
 *
 * Still blocked:
 * - link_visit_to_patient
 * - link_snapshot_to_visit
 * - non-PRE snapshot-to-case links beyond PLAN / DR / DX / RAD / OP
 * - any split/close/ambiguous Case link path
 */
import { canonConfirmRequiredError, unsupportedActionError, } from '../errors.js';
import { normalizeLinkedRef } from './normalizeAirtableValue.js';
import { toLinkedRecordCell } from './resolveLinkedRecordValue.js';
export function mapLinkAction(input) {
    const { action } = input;
    if (action.entityType !== 'link') {
        return {
            success: false,
            error: unsupportedActionError(action.actionType, 'not a link action'),
        };
    }
    switch (action.actionType) {
        case 'link_visit_to_case':
            return mapVisitToCaseLink(input);
        case 'link_snapshot_to_case':
            return mapSnapshotToCaseLink(input);
        case 'link_visit_to_patient':
        case 'link_snapshot_to_visit':
            return {
                success: false,
                error: canonConfirmRequiredError(`action_${action.actionType}`, 'linking', `${action.actionType} remains outside the minimal active Stage 7E subset`),
            };
        default:
            return {
                success: false,
                error: unsupportedActionError(action.actionType, 'unknown link action'),
            };
    }
}
function mapVisitToCaseLink(input) {
    const { action, registry, resolvedRefs, requireRuntimeRefs } = input;
    const visitDependencyActionId = action.dependsOnActionIds[0];
    const visitRecordId = getDependentRef(visitDependencyActionId, resolvedRefs, requireRuntimeRefs, action.actionType, 'visit');
    const caseDependencyActionId = action.dependsOnActionIds[1];
    const caseRecordId = getCaseRef(action, resolvedRefs, requireRuntimeRefs, caseDependencyActionId);
    if (isAdapterError(visitRecordId)) {
        return { success: false, error: visitRecordId };
    }
    if (isAdapterError(caseRecordId)) {
        return { success: false, error: caseRecordId };
    }
    return {
        success: true,
        request: {
            table: 'Visits',
            recordId: visitRecordId,
            fields: {
                [registry.visitLinkFields.cases.fieldName]: toLinkedRecordCell(caseRecordId),
            },
        },
    };
}
function mapSnapshotToCaseLink(input) {
    const { action, registry, resolvedRefs, requireRuntimeRefs } = input;
    if (action.target.branch !== 'PRE' &&
        action.target.branch !== 'PLAN' &&
        action.target.branch !== 'DR' &&
        action.target.branch !== 'DX' &&
        action.target.branch !== 'RAD' &&
        action.target.branch !== 'OP') {
        return {
            success: false,
            error: canonConfirmRequiredError('snapshot_case_link_branch', action.target.branch || 'unknown', 'only PRE, PLAN, DR, DX, RAD, and OP snapshot-to-case explicit linking are active in Stage 7E'),
        };
    }
    const snapshotDependencyActionId = action.dependsOnActionIds[action.dependsOnActionIds.length - 1];
    const snapshotRecordId = getDependentRef(snapshotDependencyActionId, resolvedRefs, requireRuntimeRefs, action.actionType, 'snapshot');
    const caseDependencyActionId = action.dependsOnActionIds.length > 1 ? action.dependsOnActionIds[0] : undefined;
    const caseRecordId = getCaseRef(action, resolvedRefs, requireRuntimeRefs, caseDependencyActionId);
    if (isAdapterError(snapshotRecordId)) {
        return { success: false, error: snapshotRecordId };
    }
    if (isAdapterError(caseRecordId)) {
        return { success: false, error: caseRecordId };
    }
    return {
        success: true,
        request: {
            table: action.target.branch === 'PLAN'
                ? 'Treatment Plan'
                : action.target.branch === 'DR'
                    ? 'Doctor Reasoning'
                    : action.target.branch === 'DX'
                        ? 'Diagnosis'
                        : action.target.branch === 'RAD'
                            ? 'Radiographic Findings'
                            : action.target.branch === 'OP'
                                ? 'Operative Findings'
                                : 'Pre-op Clinical Findings',
            recordId: snapshotRecordId,
            fields: {
                [action.target.branch === 'PLAN'
                    ? registry.snapshotCaseLinkFields.PLAN.fieldName
                    : action.target.branch === 'DR'
                        ? registry.snapshotCaseLinkFields.DR.fieldName
                        : action.target.branch === 'DX'
                            ? registry.snapshotCaseLinkFields.DX.fieldName
                            : action.target.branch === 'RAD'
                                ? registry.snapshotCaseLinkFields.RAD.fieldName
                                : action.target.branch === 'OP'
                                    ? registry.snapshotCaseLinkFields.OP.fieldName
                                    : registry.snapshotCaseLinkFields.PRE.fieldName]: toLinkedRecordCell(caseRecordId),
            },
        },
    };
}
function getDependentRef(dependencyActionId, resolvedRefs, requireRuntimeRefs, actionType, entity) {
    if (!dependencyActionId) {
        return canonConfirmRequiredError(`link_dependency_${entity}`, 'linking', `${actionType} requires a ${entity} dependency action`);
    }
    if (!requireRuntimeRefs) {
        return `preflight_${dependencyActionId}`;
    }
    const resolvedRef = resolvedRefs?.[dependencyActionId];
    if (!resolvedRef) {
        return canonConfirmRequiredError(`link_dependency_${entity}`, 'linking', `${actionType} requires a resolved ${entity} record reference at execution time`);
    }
    return resolvedRef;
}
function getCaseRef(action, resolvedRefs, requireRuntimeRefs, dependencyActionId) {
    if (action.target.caseId && action.target.caseId !== 'NEW') {
        const normalized = normalizeLinkedRef(action.target.caseId);
        if (isAdapterError(normalized)) {
            return canonConfirmRequiredError('relationship_source_case_identity', 'Cases', 'existing case link requires a resolved case record reference');
        }
        return normalized;
    }
    if (!dependencyActionId) {
        return canonConfirmRequiredError('relationship_source_case_identity', 'Cases', `${action.actionType} requires either an existing case ref or a create_case dependency`);
    }
    if (!requireRuntimeRefs) {
        return `preflight_${dependencyActionId}`;
    }
    const resolvedRef = resolvedRefs?.[dependencyActionId];
    if (!resolvedRef) {
        return canonConfirmRequiredError('relationship_source_case_identity', 'Cases', `${action.actionType} requires the case action to produce a resolved case record reference`);
    }
    return resolvedRef;
}
function isAdapterError(value) {
    return typeof value === 'object' && value !== null && 'type' in value;
}
