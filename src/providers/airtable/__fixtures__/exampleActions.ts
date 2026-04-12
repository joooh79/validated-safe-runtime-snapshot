/**
 * Airtable Adapter Fixture Examples
 *
 * Show adapter behavior for different scenarios:
 * - Successful mapping + execution
 * - Blocked due to missing mapping
 * - Blocked due to missing option mapping
 * - Invalid value handling
 */

import type { WriteAction } from '../../../types/write-plan.js';

/**
 * Example 1: Valid patient creation action
 * Maps successfully to Airtable request
 */
export const validPatientCreateAction: WriteAction = {
  actionId: 'action_patient_create_001',
  actionOrder: 1,
  actionType: 'create_patient',
  entityType: 'patient',
  targetMode: 'create_new',
  target: {
    patientId: 'NEW',
    sourceResolutionPath: 'create_new_patient',
  },
  payloadIntent: {
    intendedChanges: {
      birthYear: 1980,
      gender: 'male',
      medicalAlert: 'NKA',
      firstVisitDate: '2024-04-12',
    },
    guardedFields: [],
    omittedFieldsByRule: [],
  },
  dependsOnActionIds: [],
  blockers: [],
  safety: {
    duplicateSafe: true,
    replayEligibleIfFailed: false,
    highRiskIdentityAction: true,
  },
  previewVisible: true,
};

/**
 * Example 2: Valid visit creation action
 * Maps successfully to Airtable request
 */
export const validVisitCreateAction: WriteAction = {
  actionId: 'action_visit_create_001',
  actionOrder: 2,
  actionType: 'create_visit',
  entityType: 'visit',
  targetMode: 'create_new',
  target: {
    patientId: 'pat_12345',
    visitId: 'NEW',
    sourceResolutionPath: 'create_new_visit',
  },
  payloadIntent: {
    intendedChanges: {
      patientId: 'pat_12345',
      date: '2024-04-12',
      visitType: 'first visit',
      chiefComplaint: 'Routine checkup',
      painLevel: 0,
    },
    guardedFields: [],
    omittedFieldsByRule: [],
  },
  dependsOnActionIds: ['action_patient_create_001'],
  blockers: [],
  safety: {
    duplicateSafe: false,
    replayEligibleIfFailed: true,
    highRiskIdentityAction: true,
  },
  previewVisible: true,
};

/**
 * Example 3: Valid snapshot creation action
 * Maps successfully to Pre-op snapshot
 */
export const validSnapshotCreateAction: WriteAction = {
  actionId: 'action_snapshot_preop_001',
  actionOrder: 4,
  actionType: 'create_snapshot',
  entityType: 'snapshot',
  targetMode: 'create_new',
  target: {
    visitId: 'vis_12345',
    toothNumber: '11',
    branch: 'PRE',
    sourceResolutionPath: 'create_snapshot',
  },
  payloadIntent: {
    intendedChanges: {
      symptom: 'cold sensitivity',
      symptomReproducible: 'yes',
      visibleCrack: 'none',
      crackDetectionMethod: 'N/A',
    },
    guardedFields: [],
    omittedFieldsByRule: [],
  },
  dependsOnActionIds: ['action_visit_create_001'],
  blockers: [],
  safety: {
    duplicateSafe: true,
    replayEligibleIfFailed: true,
  },
  previewVisible: true,
};

/**
 * Example 4: Case action (not yet supported)
 * Will be blocked with canon-confirm-required error
 */
export const unsupportedCaseCreateAction: WriteAction = {
  actionId: 'action_case_create_001',
  actionOrder: 3,
  actionType: 'create_case',
  entityType: 'case',
  targetMode: 'create_new',
  target: {
    patientId: 'pat_12345',
    caseId: 'NEW',
  },
  payloadIntent: {
    intendedChanges: {
      patientId: 'pat_12345',
      startDate: '2024-04-12',
    },
    guardedFields: [],
    omittedFieldsByRule: [],
  },
  dependsOnActionIds: ['action_visit_create_001'],
  blockers: [],
  safety: {
    duplicateSafe: false,
    replayEligibleIfFailed: false,
  },
  previewVisible: true,
};

/**
 * Example 5: Treatment plan snapshot (not yet supported)
 * Will be blocked with canon-confirm-required error for PLAN branch
 */
export const unsupportedSnapshotPlanAction: WriteAction = {
  actionId: 'action_snapshot_plan_001',
  actionOrder: 4,
  actionType: 'create_snapshot',
  entityType: 'snapshot',
  targetMode: 'create_new',
  target: {
    visitId: 'vis_12345',
    toothNumber: '11',
    branch: 'PLAN',
    sourceResolutionPath: 'create_snapshot',
  },
  payloadIntent: {
    intendedChanges: {
      pulpTherapy: 'RCT',
      restorationDesign: 'crown',
      // Other fields canon-confirm-required
    },
    guardedFields: [],
    omittedFieldsByRule: [],
  },
  dependsOnActionIds: ['action_visit_create_001'],
  blockers: [],
  safety: {
    duplicateSafe: true,
    replayEligibleIfFailed: true,
  },
  previewVisible: true,
};

/**
 * Example 6: No-op patient action
 * Will be handled as no-operation
 */
export const noOpPatientAction: WriteAction = {
  actionId: 'action_patient_noop_001',
  actionOrder: 1,
  actionType: 'no_op_patient',
  entityType: 'patient',
  targetMode: 'no_op',
  target: {
    patientId: 'pat_12345',
  },
  payloadIntent: {
    intendedChanges: {},
    guardedFields: [],
    omittedFieldsByRule: [],
  },
  dependsOnActionIds: [],
  blockers: [],
  safety: {
    duplicateSafe: true,
    replayEligibleIfFailed: false,
  },
  previewVisible: false,
};
