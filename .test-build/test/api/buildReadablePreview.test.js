import assert from 'node:assert/strict';
import test from 'node:test';
import { buildPreview } from '../../src/api/steps/buildPreview.js';
import { buildReadablePreview } from '../../src/api/steps/buildReadablePreview.js';
import { fixture_existingPatientNewVisitSimple } from '../../src/resolution/__fixtures__/scenarioFixtures.js';
test('buildReadablePreview exposes representative_fields from supported snapshot payload keys', () => {
    const preparedRequest = {
        requestId: fixture_existingPatientNewVisitSimple.contract.requestId,
        contract: fixture_existingPatientNewVisitSimple.contract,
        lookupBundle: fixture_existingPatientNewVisitSimple.lookups,
        provider: {},
        confirmed: false,
        dryRun: true,
    };
    const resolution = {
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
    const plan = {
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
