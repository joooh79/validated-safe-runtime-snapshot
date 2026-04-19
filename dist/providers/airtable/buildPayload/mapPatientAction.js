/**
 * Patient Action Payload Builder
 *
 * Translates provider-neutral patient WriteAction to Airtable request.
 *
 * Supported actions:
 * - create_patient: Create new patient record
 * - update_patient: Update existing patient record
 * - attach_existing_patient: Reference existing patient (no write)
 * - no_op_patient: No operation
 *
 * Stage 4 note:
 * - the migrated schema now includes `Patients.Cases`
 * - this mapper remains limited to the validated patient safe slice
 * - explicit Case-link activation is still deferred
 */
import { unsupportedActionError } from '../errors.js';
import { normalizeDate, normalizeNumber, normalizeSelectOption, normalizeString, } from './normalizeAirtableValue.js';
/**
 * Map patient action to Airtable request
 */
export function mapPatientAction(input) {
    const { action, registry } = input;
    // Only handle patient actions
    if (action.entityType !== 'patient') {
        return {
            success: false,
            error: unsupportedActionError(action.actionType, 'not a patient action'),
        };
    }
    switch (action.actionType) {
        case 'create_patient': {
            // Create new patient record
            // Use canon-confirmed patient fields
            const fields = {};
            const payload = action.payloadIntent;
            if (!payload) {
                return {
                    success: false,
                    error: unsupportedActionError('create_patient', 'no payload intent'),
                };
            }
            // Map intended changes to Airtable fields
            const intended = payload.intendedChanges;
            // Birth year (if provided)
            if (typeof action.target.patientId === 'string' && action.target.patientId.trim()) {
                fields[registry.patientFields.patientId.fieldName] = action.target.patientId.trim();
            }
            if ('birthYear' in intended) {
                const birthYear = intended.birthYear;
                const normalized = normalizeNumber(birthYear);
                if (typeof normalized === 'number') {
                    fields[registry.patientFields.birthYear.fieldName] = normalized;
                }
            }
            // Gender (if provided)
            if ('gender' in intended) {
                const gender = intended.gender;
                if (typeof gender === 'string') {
                    const genderValue = normalizeGenderValue(gender, registry);
                    if (typeof genderValue === 'string') {
                        fields[registry.patientFields.gender.fieldName] = genderValue;
                    }
                }
            }
            // Medical alert (if provided)
            if ('medicalAlert' in intended) {
                const alert = intended.medicalAlert;
                if (typeof alert === 'string') {
                    const normalized = normalizeString(alert);
                    if (typeof normalized === 'string') {
                        fields[registry.patientFields.medicalAlert.fieldName] = normalized;
                    }
                }
            }
            // First visit date (canonical for new patient)
            if ('firstVisitDate' in intended) {
                const date = intended.firstVisitDate;
                if (typeof date === 'string') {
                    const normalized = normalizeDate(date);
                    if (typeof normalized === 'string') {
                        fields[registry.patientFields.firstVisitDate.fieldName] = normalized;
                    }
                }
            }
            return {
                success: true,
                request: {
                    table: 'Patients',
                    fields,
                },
            };
        }
        case 'update_patient': {
            // Update existing patient record
            // Existing patient updates must target the provider row ref when available.
            // `patientId` is the business identifier, while `entityRef` carries the
            // Airtable record id resolved during lookup/enrichment.
            const recordId = action.target.entityRef || action.target.patientId;
            if (!recordId || recordId === 'NEW') {
                return {
                    success: false,
                    error: unsupportedActionError('update_patient', 'no existing patient ID in target'),
                };
            }
            const fields = {};
            const payload = action.payloadIntent;
            if (!payload) {
                return {
                    success: false,
                    error: unsupportedActionError('update_patient', 'no payload intent'),
                };
            }
            const intended = payload.intendedChanges;
            // Update allowed patient fields
            if ('birthYear' in intended) {
                const normalized = normalizeNumber(intended.birthYear);
                if (typeof normalized === 'number') {
                    fields[registry.patientFields.birthYear.fieldName] = normalized;
                }
            }
            if ('gender' in intended) {
                const gender = intended.gender;
                if (typeof gender === 'string') {
                    const genderValue = normalizeGenderValue(gender, registry);
                    if (typeof genderValue === 'string') {
                        fields[registry.patientFields.gender.fieldName] = genderValue;
                    }
                }
            }
            if ('medicalAlert' in intended) {
                const normalized = normalizeString(intended.medicalAlert);
                if (typeof normalized === 'string') {
                    fields[registry.patientFields.medicalAlert.fieldName] = normalized;
                }
            }
            return {
                success: true,
                request: {
                    table: 'Patients',
                    recordId,
                    fields,
                },
            };
        }
        case 'attach_existing_patient': {
            // Attach to existing patient - no write needed
            // Return empty create request that will be skipped
            return {
                success: true,
                request: {
                    table: 'Patients',
                    fields: {},
                },
            };
        }
        case 'no_op_patient': {
            // No-op - return minimal request
            return {
                success: true,
                request: {
                    table: 'Patients',
                    fields: {},
                },
            };
        }
        default:
            return {
                success: false,
                error: unsupportedActionError(action.actionType, `unknown patient action`),
            };
    }
}
function normalizeGenderValue(value, registry) {
    const keyedValue = registry.genderOptions[value];
    if (typeof keyedValue === 'string') {
        return keyedValue;
    }
    const normalized = normalizeSelectOption(value, Object.values(registry.genderOptions), 'Gender');
    return typeof normalized === 'string' ? normalized : undefined;
}
