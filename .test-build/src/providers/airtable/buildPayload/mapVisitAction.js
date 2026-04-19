/**
 * Visit Action Payload Builder
 *
 * Translates provider-neutral visit WriteAction to Airtable request.
 *
 * Supported actions:
 * - create_visit: Create new visit record
 * - update_visit: Update existing visit record (same-date correction)
 * - no_op_visit: No operation
 *
 * Key rules:
 * - One visit record per patient per visit date
 * - Visit is visit-level, not tooth-level
 * - Pain level remains visit-level
 *
 * Stage 4 note:
 * - the migrated schema now includes `Visits.Cases` plus reverse links to all
 *   snapshot tables
 * - this mapper remains limited to the validated visit safe slice
 * - explicit link activation is still deferred
 */
import { unsupportedActionError } from '../errors.js';
import { normalizeDate, normalizeString, normalizeNumber } from './normalizeAirtableValue.js';
import { buildLinkedRecordCell } from './resolveLinkedRecordValue.js';
/**
 * Map visit action to Airtable request
 */
export function mapVisitAction(input) {
    const { action, registry, resolvedRefs, requireRuntimeRefs = false, } = input;
    // Only handle visit actions
    if (action.entityType !== 'visit') {
        return {
            success: false,
            error: unsupportedActionError(action.actionType, 'not a visit action'),
        };
    }
    switch (action.actionType) {
        case 'create_visit': {
            // Create new visit record
            const fields = {};
            const payload = action.payloadIntent;
            if (!payload) {
                return {
                    success: false,
                    error: unsupportedActionError('create_visit', 'no payload intent'),
                };
            }
            const intended = payload.intendedChanges;
            // Required: Patient ID (link to patient)
            if ('patientId' in intended) {
                const patientId = intended.patientId;
                if (typeof patientId === 'string') {
                    const patientLinkValue = buildLinkedRecordCell({
                        dependencyActionId: action.dependsOnActionIds[0],
                        resolvedRefs,
                        requireRuntimeRefs,
                        fallbackRef: action.target.patientId ?? patientId,
                        canonField: 'Visits.Patient ID',
                        table: 'Visits',
                        missingRefMessage: 'create_visit requires a resolved patient record reference at execution time',
                    });
                    if (isAdapterError(patientLinkValue)) {
                        return {
                            success: false,
                            error: patientLinkValue,
                        };
                    }
                    fields[registry.visitFields.patientId.fieldName] = patientLinkValue;
                }
            }
            if ('visitId' in intended) {
                const visitId = intended.visitId;
                if (typeof visitId === 'string' && visitId.trim()) {
                    fields[registry.visitFields.visitId.fieldName] = visitId.trim();
                }
            }
            // Required: Visit date
            if ('date' in intended) {
                const date = intended.date;
                if (typeof date === 'string') {
                    const normalized = normalizeDate(date);
                    if (typeof normalized === 'string') {
                        fields[registry.visitFields.date.fieldName] = normalized;
                    }
                }
            }
            // Optional: Visit type (select field)
            if ('visitType' in intended) {
                const visitType = intended.visitType;
                if (typeof visitType === 'string') {
                    const allowedValues = Object.values(registry.visitTypeOptions);
                    if (allowedValues.includes(visitType)) {
                        fields[registry.visitFields.visitType.fieldName] = visitType;
                    }
                }
            }
            if ('episodeStartVisit' in intended) {
                const episodeStartVisit = intended.episodeStartVisit;
                if (typeof episodeStartVisit === 'string' && episodeStartVisit.trim()) {
                    const episodeStartVisitLink = buildLinkedRecordCell({
                        dependencyActionId: undefined,
                        resolvedRefs,
                        requireRuntimeRefs,
                        fallbackRef: episodeStartVisit,
                        canonField: 'Visits.Episode start visit',
                        table: 'Visits',
                        missingRefMessage: 'create_visit requires a resolved episode-start visit reference when writing the helper link',
                    });
                    if (isAdapterError(episodeStartVisitLink)) {
                        return {
                            success: false,
                            error: episodeStartVisitLink,
                        };
                    }
                    fields[registry.visitFields.episodeStartVisit.fieldName] = episodeStartVisitLink;
                }
            }
            // Optional: Chief complaint
            if ('chiefComplaint' in intended) {
                const complaint = intended.chiefComplaint;
                const normalized = normalizeString(complaint);
                if (typeof normalized === 'string') {
                    fields[registry.visitFields.chiefComplaint.fieldName] = normalized;
                }
            }
            // Optional: Pain level
            if ('painLevel' in intended) {
                const pain = intended.painLevel;
                const norm = normalizeNumber(pain);
                if (typeof norm === 'number') {
                    fields[registry.visitFields.painLevel.fieldName] = norm;
                }
            }
            if ('episodeStartVisit' in intended) {
                const episodeStartVisit = intended.episodeStartVisit;
                if (typeof episodeStartVisit === 'string' && episodeStartVisit.trim()) {
                    const episodeStartVisitLink = buildLinkedRecordCell({
                        dependencyActionId: undefined,
                        resolvedRefs,
                        requireRuntimeRefs,
                        fallbackRef: episodeStartVisit,
                        canonField: 'Visits.Episode start visit',
                        table: 'Visits',
                        missingRefMessage: 'update_visit requires a resolved episode-start visit reference when writing the helper link',
                    });
                    if (isAdapterError(episodeStartVisitLink)) {
                        return {
                            success: false,
                            error: episodeStartVisitLink,
                        };
                    }
                    fields[registry.visitFields.episodeStartVisit.fieldName] = episodeStartVisitLink;
                }
            }
            return {
                success: true,
                request: {
                    table: 'Visits',
                    fields,
                },
            };
        }
        case 'update_visit': {
            // Update existing visit (same-date correction)
            const recordId = action.target.visitId;
            if (!recordId || recordId === 'NEW') {
                return {
                    success: false,
                    error: unsupportedActionError('update_visit', 'no existing visit ID in target'),
                };
            }
            const fields = {};
            const payload = action.payloadIntent;
            if (!payload) {
                return {
                    success: false,
                    error: unsupportedActionError('update_visit', 'no payload intent'),
                };
            }
            const intended = payload.intendedChanges;
            // Update optional fields (date should not change in same-date correction)
            if ('visitType' in intended) {
                const visitType = intended.visitType;
                if (typeof visitType === 'string') {
                    const allowedValues = Object.values(registry.visitTypeOptions);
                    if (allowedValues.includes(visitType)) {
                        fields[registry.visitFields.visitType.fieldName] = visitType;
                    }
                }
            }
            if ('chiefComplaint' in intended) {
                const complaint = intended.chiefComplaint;
                const normalized = normalizeString(complaint);
                if (typeof normalized === 'string') {
                    fields[registry.visitFields.chiefComplaint.fieldName] = normalized;
                }
            }
            if ('painLevel' in intended) {
                const pain = intended.painLevel;
                const norm = normalizeNumber(pain);
                if (typeof norm === 'number') {
                    fields[registry.visitFields.painLevel.fieldName] = norm;
                }
            }
            return {
                success: true,
                request: {
                    table: 'Visits',
                    recordId,
                    fields,
                },
            };
        }
        case 'no_op_visit': {
            // No-op - return minimal request
            return {
                success: true,
                request: {
                    table: 'Visits',
                    fields: {},
                },
            };
        }
        default:
            return {
                success: false,
                error: unsupportedActionError(action.actionType, `unknown visit action`),
            };
    }
}
function isAdapterError(value) {
    return typeof value === 'object' && value !== null && 'type' in value;
}
