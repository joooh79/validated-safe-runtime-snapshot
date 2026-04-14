import assert from 'node:assert/strict';
import test from 'node:test';
import { createAirtableProvider } from '../../src/providers/airtable/createAirtableProvider.js';
import { shouldSkipAction } from '../../src/execution/rules/shouldSkipAction.js';
function createCapturingProvider() {
    const requests = [];
    const executor = {
        async execute(request) {
            requests.push(request);
            return {
                success: true,
                recordId: `rec_test_${requests.length}`,
            };
        },
    };
    const provider = createAirtableProvider({
        baseId: 'app_test',
        apiToken: 'pat_test',
        requestExecutor: 'real',
    }, executor);
    return { provider, requests };
}
test('attach_existing_patient does not issue a create request in real mode', async () => {
    const { provider, requests } = createCapturingProvider();
    const action = {
        actionId: 'action_attach_patient',
        actionOrder: 1,
        actionType: 'attach_existing_patient',
        entityType: 'patient',
        targetMode: 'attach_existing',
        target: {
            patientId: 'rec_existing_patient',
            sourceResolutionPath: 'resolved_existing_patient',
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
        },
        previewVisible: true,
    };
    const result = await provider.executeAction(action, {
        requestId: 'req_attach_patient',
        planId: 'plan_attach_patient',
        resolvedRefs: {},
    });
    assert.equal(result.status, 'success');
    assert.equal(result.providerRef, 'rec_existing_patient');
    assert.equal(requests.length, 0);
});
test('create_visit writes linked patient refs as an array and includes the deterministic visit id', async () => {
    const { provider, requests } = createCapturingProvider();
    const action = {
        actionId: 'action_create_visit',
        actionOrder: 2,
        actionType: 'create_visit',
        entityType: 'visit',
        targetMode: 'create_new',
        target: {
            patientId: '916872',
            visitId: 'VISIT-916872-20221013',
            sourceResolutionPath: 'create_new_visit',
        },
        payloadIntent: {
            intendedChanges: {
                patientId: '916872',
                visitId: 'VISIT-916872-20221013',
                date: '2022-10-13',
                visitType: 'first visit',
                chiefComplaint: 'cold and hot sensitivity',
                painLevel: 1,
            },
            guardedFields: ['visit_id', 'visit_date'],
        },
        dependsOnActionIds: ['action_create_patient'],
        blockers: [],
        safety: {
            duplicateSafe: false,
            replayEligibleIfFailed: true,
            highRiskIdentityAction: true,
        },
        previewVisible: true,
    };
    const result = await provider.executeAction(action, {
        requestId: 'req_create_visit',
        planId: 'plan_create_visit',
        resolvedRefs: {
            action_create_patient: 'rec_patient_001',
        },
    });
    assert.equal(result.status, 'success');
    assert.equal(requests.length, 1);
    assert.equal(requests[0]?.type, 'create');
    assert.deepEqual(requests[0]?.fields['Patient ID'], ['rec_patient_001']);
    assert.equal(requests[0]?.fields['Visit ID'], 'VISIT-916872-20221013');
});
test('create_case and create_snapshot use runtime linked record refs', async () => {
    const { provider, requests } = createCapturingProvider();
    const createCaseAction = {
        actionId: 'action_create_case',
        actionOrder: 3,
        actionType: 'create_case',
        entityType: 'case',
        targetMode: 'create_new',
        target: {
            patientId: '916872',
            caseId: 'NEW',
            toothNumber: '14',
            episodeStartDate: '2022-10-13',
            sourceResolutionPath: 'create_case',
        },
        payloadIntent: {
            intendedChanges: {},
            guardedFields: ['case_id', 'date_created'],
        },
        dependsOnActionIds: ['action_create_patient', 'action_create_visit'],
        blockers: [],
        safety: {
            duplicateSafe: false,
            replayEligibleIfFailed: true,
            highRiskIdentityAction: true,
        },
        previewVisible: true,
    };
    const createSnapshotAction = {
        actionId: 'action_create_snapshot_pre',
        actionOrder: 4,
        actionType: 'create_snapshot',
        entityType: 'snapshot',
        targetMode: 'create_new',
        target: {
            branch: 'PRE',
            visitId: 'VISIT-916872-20221013',
            toothNumber: '14',
            caseId: 'NEW',
            sourceResolutionPath: 'snapshot_PRE_create_new_visit',
        },
        payloadIntent: {
            intendedChanges: {
                symptom: 'cold sensitivity',
            },
            guardedFields: ['visit_id', 'snapshot_date', 'PRE'],
        },
        dependsOnActionIds: ['action_create_visit'],
        blockers: [],
        safety: {
            duplicateSafe: false,
            replayEligibleIfFailed: true,
        },
        previewVisible: true,
    };
    const caseResult = await provider.executeAction(createCaseAction, {
        requestId: 'req_create_case',
        planId: 'plan_create_case',
        resolvedRefs: {
            action_create_patient: 'rec_patient_001',
            action_create_visit: 'rec_visit_001',
        },
    });
    const snapshotResult = await provider.executeAction(createSnapshotAction, {
        requestId: 'req_create_snapshot',
        planId: 'plan_create_snapshot',
        resolvedRefs: {
            action_create_visit: 'rec_visit_001',
        },
    });
    assert.equal(caseResult.status, 'success');
    assert.equal(snapshotResult.status, 'success');
    assert.deepEqual(requests[0]?.fields['Patient ID'], ['rec_patient_001']);
    assert.deepEqual(requests[1]?.fields['Visit ID'], ['rec_visit_001']);
    assert.equal(requests[1]?.fields['Record name'], 'VISIT-916872-20221013-14-PRE');
});
test('link_snapshot_to_case writes the case link as a linked-record array', async () => {
    const { provider, requests } = createCapturingProvider();
    const action = {
        actionId: 'action_link_snapshot_case',
        actionOrder: 5,
        actionType: 'link_snapshot_to_case',
        entityType: 'link',
        targetMode: 'update_existing',
        target: {
            branch: 'RAD',
            caseId: 'NEW',
            toothNumber: '14',
            sourceResolutionPath: 'snapshot_to_case_link',
        },
        payloadIntent: {
            intendedChanges: {},
            guardedFields: [
                'relationship_source_case_identity',
                'relationship_source_snapshot_identity',
            ],
        },
        dependsOnActionIds: ['action_create_case', 'action_create_snapshot_rad'],
        blockers: [],
        safety: {
            duplicateSafe: true,
            replayEligibleIfFailed: true,
        },
        previewVisible: false,
    };
    const result = await provider.executeAction(action, {
        requestId: 'req_link_snapshot_case',
        planId: 'plan_link_snapshot_case',
        resolvedRefs: {
            action_create_case: 'rec_case_001',
            action_create_snapshot_rad: 'rec_rad_001',
        },
    });
    assert.equal(result.status, 'success');
    assert.equal(requests.length, 1);
    assert.equal(requests[0]?.type, 'update');
    assert.deepEqual(requests[0]?.fields['Case ID'], ['rec_case_001']);
});
test('shouldSkipAction skips dependents when an upstream dependency was skipped', () => {
    const dependentAction = {
        actionId: 'action_link_snapshot_case',
        actionOrder: 5,
        actionType: 'link_snapshot_to_case',
        entityType: 'link',
        targetMode: 'update_existing',
        target: {
            branch: 'PRE',
            caseId: 'NEW',
            toothNumber: '14',
        },
        payloadIntent: {
            intendedChanges: {},
            guardedFields: [],
        },
        dependsOnActionIds: ['action_create_snapshot'],
        blockers: [],
        safety: {
            duplicateSafe: true,
            replayEligibleIfFailed: true,
        },
        previewVisible: false,
    };
    const skipReason = shouldSkipAction(dependentAction, [
        {
            actionId: 'action_create_snapshot',
            actionType: 'create_snapshot',
            status: 'skipped',
            errorMessage: 'upstream dependency failed: action_create_visit',
        },
    ]);
    assert.equal(skipReason, 'upstream dependency failed: action_create_snapshot');
});
