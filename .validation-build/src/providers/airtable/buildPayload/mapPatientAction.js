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
import { normalizeString, normalizeDate } from './normalizeAirtableValue.js';
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
            if ('birthYear' in intended) {
                const birthYear = intended.birthYear;
                if (typeof birthYear === 'number' || typeof birthYear === 'string') {
                    fields[registry.patientFields.birthYear.fieldName] = birthYear;
                }
            }
            // Gender (if provided)
            if ('gender' in intended) {
                const gender = intended.gender;
                if (typeof gender === 'string') {
                    const genderValue = registry.genderOptions[gender];
                    if (genderValue) {
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
            // recordId comes from target.patientId
            const recordId = action.target.patientId;
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
                fields[registry.patientFields.birthYear.fieldName] = intended.birthYear;
            }
            if ('gender' in intended) {
                const gender = intended.gender;
                if (typeof gender === 'string') {
                    const genderValue = registry.genderOptions[gender];
                    if (genderValue) {
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
