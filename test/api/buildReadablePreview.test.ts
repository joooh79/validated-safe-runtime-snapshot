import assert from 'node:assert/strict';
import test from 'node:test';
import { buildPreview } from '../../src/api/steps/buildPreview.js';
import { buildReadablePreview } from '../../src/api/steps/buildReadablePreview.js';
import { fixture_existingPatientNewVisitSimple } from '../../src/resolution/__fixtures__/scenarioFixtures.js';
import type { PreparedApiRequest } from '../../src/types/api.js';
import type { StateResolutionResult } from '../../src/types/resolution.js';
import type { WritePlan } from '../../src/types/write-plan.js';

test('buildReadablePreview exposes representative_fields from supported snapshot payload keys', () => {
  const preparedRequest: PreparedApiRequest = {
    requestId: fixture_existingPatientNewVisitSimple.contract.requestId,
    contract: fixture_existingPatientNewVisitSimple.contract,
    lookupBundle: fixture_existingPatientNewVisitSimple.lookups,
    provider: {} as PreparedApiRequest['provider'],
    confirmed: false,
    dryRun: true,
  };

  const resolution: StateResolutionResult = {
    requestId: fixture_existingPatientNewVisitSimple.contract.requestId,
    workflowIntent: fixture_existingPatientNewVisitSimple.contract.workflowIntent,
    continuityIntent: fixture_existingPatientNewVisitSimple.contract.continuityIntent,
    patient: {
      status: 'resolved_existing_patient',
      resolvedPatientId: 'P-001',
      reasons: ['existing_patient_claim + patient_found'],
    },
    visit: {
      status: 'create_new_visit',
      reasons: ['new_visit_intent + no_same_date_visit_conflict'],
    },
    caseResolution: {
      status: 'none',
      reasons: ['no_case_action'],
    },
    correction: {
      correctionNeeded: false,
      reasons: ['no_correction_needed'],
    },
    ambiguity: {
      hasAmbiguity: false,
      ambiguityTypes: [],
      reasons: [],
    },
    readiness: 'ready_for_write_plan',
    interactionMode: 'preview_confirmation',
    warnings: [],
    summary: {
      patientActionSummary: 'Use existing patient: P-001',
      visitActionSummary: 'Create new visit',
      caseActionSummary: 'No case action needed',
      nextStepSummary: 'Ready to send. Please review and confirm.',
    },
  };

  const plan: WritePlan = {
    planId: 'plan_test_001',
    requestId: preparedRequest.requestId,
    inputHash: null,
    resolution,
    warnings: [],
    readiness: 'execution_ready',
    actions: [
      {
        actionId: 'action_attach_patient',
        actionOrder: 1,
        actionType: 'attach_existing_patient',
        entityType: 'patient',
        targetMode: 'update_existing',
        target: {
          patientId: 'P-001',
        },
        payloadIntent: {
          intendedChanges: {},
          guardedFields: [],
        },
        dependsOnActionIds: [],
        blockers: [],
        safety: {
          duplicateSafe: true,
          replayEligibleIfFailed: false,
          highRiskIdentityAction: true,
        },
        previewVisible: true,
      },
      {
        actionId: 'action_create_visit',
        actionOrder: 2,
        actionType: 'create_visit',
        entityType: 'visit',
        targetMode: 'create_new',
        target: {
          visitId: 'NEW',
        },
        payloadIntent: {
          intendedChanges: {},
          guardedFields: [],
        },
        dependsOnActionIds: ['action_attach_patient'],
        blockers: [],
        safety: {
          duplicateSafe: false,
          replayEligibleIfFailed: true,
          highRiskIdentityAction: true,
        },
        previewVisible: true,
      },
      {
        actionId: 'action_create_snapshot',
        actionOrder: 4,
        actionType: 'create_snapshot',
        entityType: 'snapshot',
        targetMode: 'create_new',
        target: {
          visitId: 'NEW',
          toothNumber: '11',
          branch: 'PRE',
        },
        payloadIntent: {
          intendedChanges: {
            symptom: 'none',
          },
          guardedFields: [],
        },
        dependsOnActionIds: ['action_create_visit'],
        blockers: [],
        safety: {
          duplicateSafe: true,
          replayEligibleIfFailed: true,
        },
        previewVisible: true,
      },
    ],
    preview: {
      patientAction: 'Use existing patient (ID: P-001)',
      visitAction: 'Create new visit',
      caseAction: 'No case action',
      snapshotActions: [
        {
          toothNumber: '11',
          branch: 'PRE',
          action: 'create',
        },
      ],
      warnings: [],
      nextStep: 'confirm',
    },
    replay: {
      replaySourcePlanId: 'plan_test_001',
      replayVersion: 1,
      safeResumePoints: ['action_create_snapshot'],
    },
  };

  const preview = buildPreview(resolution, plan, 'preview_confirmation');
  const readablePreview = buildReadablePreview(preparedRequest, preview, plan);

  assert.equal(readablePreview.findings.length, 1);
  assert.deepEqual(readablePreview.findings[0]?.representative_fields, [
    {
      field: 'Symptom',
      value: 'none',
    },
  ]);
});

test('buildReadablePreview surfaces new case milestone and post-delivery follow-up fields when present', () => {
  const preparedRequest: PreparedApiRequest = {
    requestId: fixture_existingPatientNewVisitSimple.contract.requestId,
    contract: fixture_existingPatientNewVisitSimple.contract,
    lookupBundle: fixture_existingPatientNewVisitSimple.lookups,
    provider: {} as PreparedApiRequest['provider'],
    confirmed: false,
    dryRun: true,
  };

  const resolution: StateResolutionResult = {
    requestId: fixture_existingPatientNewVisitSimple.contract.requestId,
    workflowIntent: fixture_existingPatientNewVisitSimple.contract.workflowIntent,
    continuityIntent: 'continue_case',
    patient: {
      status: 'resolved_existing_patient',
      resolvedPatientId: 'P-001',
      reasons: ['existing_patient_claim + patient_found'],
    },
    visit: {
      status: 'create_new_visit',
      reasons: ['new_visit_intent + no_same_date_visit_conflict'],
    },
    caseResolution: {
      status: 'continue_case',
      resolvedCaseId: 'VISIT-916872-20221013',
      toothNumber: '14',
      visitDate: '2022-10-19',
      episodeStartDate: '2022-10-13',
      reasons: ['continue_case'],
    },
    correction: {
      correctionNeeded: false,
      reasons: ['no_correction_needed'],
    },
    ambiguity: {
      hasAmbiguity: false,
      ambiguityTypes: [],
      reasons: [],
    },
    readiness: 'ready_for_write_plan',
    interactionMode: 'preview_confirmation',
    warnings: [],
    summary: {
      patientActionSummary: 'Use existing patient: P-001',
      visitActionSummary: 'Create new visit',
      caseActionSummary: 'Continue existing case',
      nextStepSummary: 'Ready to send. Please review and confirm.',
    },
  };

  const plan: WritePlan = {
    planId: 'plan_case_preview_001',
    requestId: preparedRequest.requestId,
    inputHash: null,
    resolution,
    warnings: [],
    readiness: 'execution_ready',
    actions: [
      {
        actionId: 'action_attach_patient',
        actionOrder: 1,
        actionType: 'attach_existing_patient',
        entityType: 'patient',
        targetMode: 'update_existing',
        target: {
          patientId: 'P-001',
        },
        payloadIntent: {
          intendedChanges: {},
          guardedFields: [],
        },
        dependsOnActionIds: [],
        blockers: [],
        safety: {
          duplicateSafe: true,
          replayEligibleIfFailed: false,
          highRiskIdentityAction: true,
        },
        previewVisible: true,
      },
      {
        actionId: 'action_create_visit',
        actionOrder: 2,
        actionType: 'create_visit',
        entityType: 'visit',
        targetMode: 'create_new',
        target: {
          visitId: 'NEW',
        },
        payloadIntent: {
          intendedChanges: {
            visitType: 'follow up',
            episodeStartVisit: 'VISIT-916872-20221013',
          },
          guardedFields: [],
        },
        dependsOnActionIds: ['action_attach_patient'],
        blockers: [],
        safety: {
          duplicateSafe: false,
          replayEligibleIfFailed: true,
          highRiskIdentityAction: true,
        },
        previewVisible: true,
      },
      {
        actionId: 'action_create_post_delivery_follow_up',
        actionOrder: 7,
        actionType: 'create_post_delivery_follow_up',
        entityType: 'follow_up',
        targetMode: 'create_new',
        target: {
          patientId: '916872',
          visitId: 'VISIT-916872-20221019',
          caseId: 'VISIT-916872-20221013',
          toothNumber: '14',
        },
        payloadIntent: {
          intendedChanges: {
            followUpDate: '2022-11-16',
            followUpResult: 'not checked',
          },
          guardedFields: ['relationship_source_patient_identity', 'relationship_source_visit_identity'],
        },
        dependsOnActionIds: ['action_attach_patient', 'action_create_visit'],
        blockers: [],
        safety: {
          duplicateSafe: false,
          replayEligibleIfFailed: true,
        },
        previewVisible: true,
      },
      {
        actionId: 'action_update_case_latest_synthesis',
        actionOrder: 6,
        actionType: 'update_case_latest_synthesis',
        entityType: 'case',
        targetMode: 'update_existing',
        target: {
          patientId: '916872',
          caseId: 'VISIT-916872-20221013',
          visitDate: '2022-10-19',
          toothNumber: '14',
        },
        payloadIntent: {
          intendedChanges: {
            episodeStatus: 'closed',
            finalProsthesisPlanDate: '2022-10-19',
            finalPrepAndScanDate: '2022-10-26',
            finalProsthesisDeliveryDate: '2022-11-02',
            latestPostDeliveryFollowUpDate: '2022-11-16',
            latestPostDeliveryFollowUpResult: 'not checked',
          },
          guardedFields: ['case_id'],
        },
        dependsOnActionIds: ['action_create_visit'],
        blockers: [],
        safety: {
          duplicateSafe: true,
          replayEligibleIfFailed: true,
        },
        previewVisible: false,
      },
    ],
    preview: {
      patientAction: 'Use existing patient (ID: P-001)',
      visitAction: 'Create new visit',
      caseAction: 'Continue existing case for tooth 14',
      snapshotActions: [],
      warnings: [],
      nextStep: 'confirm',
    },
  };

  const preview = buildPreview(resolution, plan, 'preview_confirmation');
  const readablePreview = buildReadablePreview(preparedRequest, preview, plan);

  assert.equal(
    readablePreview.visit_summary.representative_fields.some(
      (field) =>
        field.field === 'Episode start visit' &&
        field.value === 'VISIT-916872-20221013',
    ),
    true,
  );
  assert.equal(
    readablePreview.case_summary.representative_fields.some(
      (field) => field.field === 'Episode status' && field.value === 'closed',
    ),
    true,
  );
  assert.equal(
    readablePreview.case_summary.representative_fields.some(
      (field) =>
        field.field === 'Final prosthesis plan date' && field.value === '2022-10-19',
    ),
    true,
  );
  assert.equal(
    readablePreview.case_summary.representative_fields.some(
      (field) =>
        field.field === 'Latest post-delivery follow-up result' &&
        field.value === 'not checked',
    ),
    true,
  );
  assert.equal(
    readablePreview.case_summary.details?.includes(
      'Post-delivery follow-up row: tooth 14 / 2022-11-16 / not checked',
    ),
    true,
  );
});
