import assert from 'node:assert/strict';
import test from 'node:test';
import { createAirtableProvider, type CreateRequest, type RequestExecutor, type UpdateRequest } from '../../src/providers/airtable/createAirtableProvider.js';
import { createDefaultMappingRegistry } from '../../src/providers/airtable/mappingRegistry.js';
import { shouldSkipAction } from '../../src/execution/rules/shouldSkipAction.js';
import type { WriteAction } from '../../src/types/write-plan.js';

function createCapturingProvider() {
  const requests: Array<CreateRequest | UpdateRequest> = [];
  const executor: RequestExecutor = {
    async execute(request) {
      requests.push(request);
      return {
        success: true,
        recordId: `rec_test_${requests.length}`,
      };
    },
  };

  const provider = createAirtableProvider(
    {
      baseId: 'app_test',
      apiToken: 'pat_test',
      requestExecutor: 'real',
    },
    executor,
  );

  return { provider, requests };
}

test('attach_existing_patient does not issue a create request in real mode', async () => {
  const { provider, requests } = createCapturingProvider();

  const action: WriteAction = {
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

test('create_patient normalizes numeric birth year and accepts Airtable gender option values', async () => {
  const { provider, requests } = createCapturingProvider();

  const action: WriteAction = {
    actionId: 'action_create_patient',
    actionOrder: 1,
    actionType: 'create_patient',
    entityType: 'patient',
    targetMode: 'create_new',
    target: {
      patientId: 'codex-patient-001',
      sourceResolutionPath: 'create_new_patient',
    },
    payloadIntent: {
      intendedChanges: {
        birthYear: '1988',
        gender: 'Male',
        firstVisitDate: '2026-04-14',
      },
      guardedFields: ['patient_id', 'date_created'],
    },
    dependsOnActionIds: [],
    blockers: [],
    safety: {
      duplicateSafe: false,
      replayEligibleIfFailed: true,
      highRiskIdentityAction: true,
    },
    previewVisible: true,
  };

  const result = await provider.executeAction(action, {
    requestId: 'req_create_patient',
    planId: 'plan_create_patient',
    resolvedRefs: {},
  });

  assert.equal(result.status, 'success');
  assert.equal(requests.length, 1);
  assert.equal(requests[0]?.type, 'create');
  assert.equal(requests[0]?.fields['Patients ID'], 'codex-patient-001');
  assert.equal(requests[0]?.fields['Birth year'], 1988);
  assert.equal(requests[0]?.fields['Gender'], 'Male');
});

test('update_patient writes existing patient demographics without requiring a visit action', async () => {
  const { provider, requests } = createCapturingProvider();

  const action: WriteAction = {
    actionId: 'action_update_patient',
    actionOrder: 1,
    actionType: 'update_patient',
    entityType: 'patient',
    targetMode: 'update_existing',
    target: {
      patientId: '196872',
      entityRef: 'rec_patient_196872',
      sourceResolutionPath: 'resolved_existing_patient',
    },
    payloadIntent: {
      intendedChanges: {
        birthYear: '1966',
        gender: 'Female',
      },
      guardedFields: ['patient_id', 'date_created'],
    },
    dependsOnActionIds: [],
    blockers: [],
    safety: {
      duplicateSafe: false,
      replayEligibleIfFailed: false,
      highRiskIdentityAction: true,
    },
    previewVisible: true,
  };

  const result = await provider.executeAction(action, {
    requestId: 'req_update_patient',
    planId: 'plan_update_patient',
    resolvedRefs: {},
  });

  assert.equal(result.status, 'success');
  assert.equal(requests.length, 1);
  assert.equal(requests[0]?.type, 'update');
  assert.equal(requests[0]?.recordId, 'rec_patient_196872');
  assert.equal(requests[0]?.fields['Birth year'], 1966);
  assert.equal(requests[0]?.fields['Gender'], 'Female');
});

test('update_patient lazily resolves the Airtable patient record id in real mode when entityRef is missing', async () => {
  const { provider, requests } = createCapturingProvider();
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async (input: URL | RequestInfo, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    assert.match(url, /Patients/);
    assert.equal(init?.method, 'GET');

    return new Response(
      JSON.stringify({
        records: [
          {
            id: 'rec_patient_196872',
            fields: {
              'Patients ID': '196872',
            },
          },
        ],
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
  }) as typeof fetch;

  try {
    const action: WriteAction = {
      actionId: 'action_update_patient_lazy_lookup',
      actionOrder: 1,
      actionType: 'update_patient',
      entityType: 'patient',
      targetMode: 'update_existing',
      target: {
        patientId: '196872',
        sourceResolutionPath: 'resolved_existing_patient',
      },
      payloadIntent: {
        intendedChanges: {
          birthYear: '1966',
          gender: 'Female',
        },
        guardedFields: ['patient_id', 'date_created'],
      },
      dependsOnActionIds: [],
      blockers: [],
      safety: {
        duplicateSafe: false,
        replayEligibleIfFailed: false,
        highRiskIdentityAction: true,
      },
      previewVisible: true,
    };

    const result = await provider.executeAction(action, {
      requestId: 'req_update_patient_lazy_lookup',
      planId: 'plan_update_patient_lazy_lookup',
      resolvedRefs: {},
    });

    assert.equal(result.status, 'success');
    assert.equal(requests.length, 1);
    assert.equal(requests[0]?.type, 'update');
    assert.equal(requests[0]?.recordId, 'rec_patient_196872');
    assert.equal(requests[0]?.fields['Birth year'], 1966);
    assert.equal(requests[0]?.fields['Gender'], 'Female');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('create_visit writes linked patient refs as an array and includes the deterministic visit id', async () => {
  const { provider, requests } = createCapturingProvider();

  const action: WriteAction = {
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

test('create_visit accepts exact Visit type values continue case and follow up', async () => {
  const visitTypes = ['continue case', 'follow up'] as const;

  for (const visitType of visitTypes) {
    const { provider, requests } = createCapturingProvider();

    const action: WriteAction = {
      actionId: `action_create_visit_${visitType.replaceAll(' ', '_')}`,
      actionOrder: 2,
      actionType: 'create_visit',
      entityType: 'visit',
      targetMode: 'create_new',
      target: {
        patientId: '916872',
        visitId: `VISIT-916872-20221019-${visitType.replaceAll(' ', '-')}`,
        sourceResolutionPath: 'create_new_visit',
      },
      payloadIntent: {
        intendedChanges: {
          patientId: '916872',
          visitId: `VISIT-916872-20221019-${visitType.replaceAll(' ', '-')}`,
          date: '2022-10-19',
          visitType,
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
      requestId: `req_create_visit_${visitType.replaceAll(' ', '_')}`,
      planId: 'plan_create_visit_visit_type',
      resolvedRefs: {
        action_create_patient: 'rec_patient_001',
      },
    });

    assert.equal(result.status, 'success');
    assert.equal(requests.length, 1);
    assert.equal(requests[0]?.fields['Visit type'], visitType);
  }
});

test('create_visit writes Episode start visit when a safe source visit id is provided', async () => {
  const { provider, requests } = createCapturingProvider();

  const action: WriteAction = {
    actionId: 'action_create_visit_with_episode_start',
    actionOrder: 2,
    actionType: 'create_visit',
    entityType: 'visit',
    targetMode: 'create_new',
    target: {
      patientId: '916872',
      visitId: 'VISIT-916872-20221019',
      sourceResolutionPath: 'create_new_visit',
    },
    payloadIntent: {
      intendedChanges: {
        patientId: '916872',
        visitId: 'VISIT-916872-20221019',
        date: '2022-10-19',
        visitType: 'continue case',
        episodeStartVisit: 'VISIT-916872-20221013',
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
    requestId: 'req_create_visit_with_episode_start',
    planId: 'plan_create_visit_with_episode_start',
    resolvedRefs: {
      action_create_patient: 'rec_patient_001',
    },
  });

  assert.equal(result.status, 'success');
  assert.equal(requests.length, 1);
  assert.deepEqual(requests[0]?.fields['Episode start visit'], ['VISIT-916872-20221013']);
});

test('create_case and create_snapshot use runtime linked record refs and normalize multi-select snapshot fields', async () => {
  const { provider, requests } = createCapturingProvider();

  const createCaseAction: WriteAction = {
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

  const createSnapshotAction: WriteAction = {
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
        symptomReproducible: 'yes',
        crackDetectionMethod: 'N/A',
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
  assert.deepEqual(requests[1]?.fields['Symptom'], ['cold sensitivity']);
  assert.equal(requests[1]?.fields['Symptom reproducible'], 'yes');
  assert.deepEqual(requests[1]?.fields['Crack detection method'], ['N/A']);
  assert.equal(requests[1]?.fields['Record name'], 'VISIT-916872-20221013-14-PRE');
});

test('create operative snapshot wraps crack location into a multi-select array', async () => {
  const { provider, requests } = createCapturingProvider();

  const action: WriteAction = {
    actionId: 'action_create_snapshot_op',
    actionOrder: 4,
    actionType: 'create_snapshot',
    entityType: 'snapshot',
    targetMode: 'create_new',
    target: {
      branch: 'OP',
      visitId: 'VISIT-916872-20221013',
      toothNumber: '14',
      caseId: 'NEW',
      sourceResolutionPath: 'snapshot_OP_create_new_visit',
    },
    payloadIntent: {
      intendedChanges: {
        crackConfirmed: 'dentin crack',
        crackLocation: 'mesial marginal ridge',
      },
      guardedFields: ['visit_id', 'snapshot_date', 'OP'],
    },
    dependsOnActionIds: ['action_create_visit'],
    blockers: [],
    safety: {
      duplicateSafe: false,
      replayEligibleIfFailed: true,
    },
    previewVisible: true,
  };

  const result = await provider.executeAction(action, {
    requestId: 'req_create_snapshot_op',
    planId: 'plan_create_snapshot_op',
    resolvedRefs: {
      action_create_visit: 'rec_visit_001',
    },
  });

  assert.equal(result.status, 'success');
  assert.equal(requests.length, 1);
  assert.equal(requests[0]?.type, 'create');
  assert.deepEqual(requests[0]?.fields['Visit ID'], ['rec_visit_001']);
  assert.equal(requests[0]?.fields['Crack confirmed'], 'dentin crack');
  assert.deepEqual(requests[0]?.fields['Crack location'], ['mesial marginal ridge']);
});

test('link_snapshot_to_case writes the case link as a linked-record array', async () => {
  const { provider, requests } = createCapturingProvider();

  const action: WriteAction = {
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

test('update_case_latest_synthesis maps new case milestone and post-delivery follow-up fields', async () => {
  const { provider, requests } = createCapturingProvider();

  const action: WriteAction = {
    actionId: 'action_update_case_latest_synthesis',
    actionOrder: 6,
    actionType: 'update_case_latest_synthesis',
    entityType: 'case',
    targetMode: 'update_existing',
    target: {
      patientId: '916872',
      caseId: 'rec_case_001',
      visitDate: '2022-10-19',
      toothNumber: '14',
      sourceResolutionPath: 'case_synthesis_update',
    },
    payloadIntent: {
      intendedChanges: {
        episodeStatus: 'closed',
        latestSummary: 'follow-up after delivery',
        finalProsthesisPlanDate: '2022-10-19',
        finalPrepAndScanDate: '2022-10-26',
        finalProsthesisDeliveryDate: '2022-11-02',
        latestPostDeliveryFollowUpDate: '2022-11-16',
        latestPostDeliveryFollowUpResult: 'no issue',
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
  };

  const result = await provider.executeAction(action, {
    requestId: 'req_update_case_latest_synthesis',
    planId: 'plan_update_case_latest_synthesis',
    resolvedRefs: {},
  });

  assert.equal(result.status, 'success');
  assert.equal(requests.length, 1);
  assert.equal(requests[0]?.type, 'update');
  assert.equal(requests[0]?.fields['Episode status'], 'closed');
  assert.equal(requests[0]?.fields['Final prosthesis plan date'], '2022-10-19');
  assert.equal(requests[0]?.fields['Final prep & scan date'], '2022-10-26');
  assert.equal(requests[0]?.fields['Final prosthesis delivery date'], '2022-11-02');
  assert.equal(requests[0]?.fields['Latest post-delivery follow-up date'], '2022-11-16');
  assert.equal(requests[0]?.fields['Latest post-delivery follow-up result'], 'no issue');
});

test('update_case_latest_synthesis supports direct case-only updates without visit context', async () => {
  const { provider, requests } = createCapturingProvider();

  const action: WriteAction = {
    actionId: 'action_direct_case_update',
    actionOrder: 6,
    actionType: 'update_case_latest_synthesis',
    entityType: 'case',
    targetMode: 'update_existing',
    target: {
      caseId: 'rec_case_direct_001',
      sourceResolutionPath: 'case_direct_update',
    },
    payloadIntent: {
      intendedChanges: {
        episodeStatus: 'closed',
        finalProsthesisDeliveryDate: '2022-10-26',
      },
      guardedFields: ['case_id'],
    },
    dependsOnActionIds: ['action_no_op_visit'],
    blockers: [],
    safety: {
      duplicateSafe: true,
      replayEligibleIfFailed: true,
    },
    previewVisible: false,
  };

  const result = await provider.executeAction(action, {
    requestId: 'req_direct_case_update',
    planId: 'plan_direct_case_update',
    resolvedRefs: {},
  });

  assert.equal(result.status, 'success');
  assert.equal(requests.length, 1);
  assert.equal(requests[0]?.type, 'update');
  assert.equal(requests[0]?.recordId, 'rec_case_direct_001');
  assert.equal(requests[0]?.fields['Episode status'], 'closed');
  assert.equal(requests[0]?.fields['Final prosthesis delivery date'], '2022-10-26');
  assert.equal('Latest Visit ID' in (requests[0]?.fields ?? {}), false);
});

test('update_case_latest_synthesis rejects non-schema post-delivery follow-up result values', async () => {
  const { provider, requests } = createCapturingProvider();

  const action: WriteAction = {
    actionId: 'action_update_case_latest_synthesis_invalid_follow_up',
    actionOrder: 6,
    actionType: 'update_case_latest_synthesis',
    entityType: 'case',
    targetMode: 'update_existing',
    target: {
      patientId: '916872',
      caseId: 'rec_case_001',
      visitDate: '2022-10-19',
      toothNumber: '14',
      sourceResolutionPath: 'case_synthesis_update',
    },
    payloadIntent: {
      intendedChanges: {
        latestPostDeliveryFollowUpResult: 'stable',
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
  };

  const result = await provider.executeAction(action, {
    requestId: 'req_update_case_invalid_follow_up',
    planId: 'plan_update_case_invalid_follow_up',
    resolvedRefs: {},
  });

  assert.equal(result.status, 'failed');
  assert.equal(requests.length, 0);
  assert.match(result.errorMessage ?? '', /Latest post-delivery follow-up result/);
});

test('create_post_delivery_follow_up maps patient, visit, case, and follow-up content into a new row', async () => {
  const { provider, requests } = createCapturingProvider();

  const action: WriteAction = {
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
      sourceResolutionPath: 'post_delivery_follow_up',
    },
    payloadIntent: {
      intendedChanges: {
        followUpDate: '2022-11-16',
        followUpResult: 'no issue',
        issueSummary: 'none reported',
        followUpNotes: 'healing within normal range',
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
  };

  const result = await provider.executeAction(action, {
    requestId: 'req_create_post_delivery_follow_up',
    planId: 'plan_create_post_delivery_follow_up',
    resolvedRefs: {
      action_attach_patient: 'rec_patient_001',
      action_create_visit: 'rec_visit_001',
    },
  });

  assert.equal(result.status, 'success');
  assert.equal(requests.length, 1);
  assert.equal(requests[0]?.type, 'create');
  assert.deepEqual(requests[0]?.fields['Patient ID'], ['rec_patient_001']);
  assert.deepEqual(requests[0]?.fields['Visit ID'], ['rec_visit_001']);
  assert.deepEqual(requests[0]?.fields['Case ID'], ['VISIT-916872-20221013']);
  assert.equal(requests[0]?.fields['Tooth number'], '14');
  assert.equal(requests[0]?.fields['Follow-up date'], '2022-11-16');
  assert.equal(requests[0]?.fields['Follow-up result'], 'no issue');
  assert.equal(requests[0]?.fields['Issue summary'], 'none reported');
  assert.equal(requests[0]?.fields['Follow-up notes'], 'healing within normal range');
});

test('default mapping registry recognizes the new Cases and Post-delivery Follow-ups schema fields', () => {
  const registry = createDefaultMappingRegistry();

  assert.equal(registry.visitTypeOptions.continueCase, 'continue case');
  assert.equal(registry.visitTypeOptions.followUp, 'follow up');
  assert.equal(registry.visitFields.episodeStartVisit.fieldName, 'Episode start visit');
  assert.equal(
    registry.caseFields.finalProsthesisPlanDate.fieldName,
    'Final prosthesis plan date',
  );
  assert.equal(
    registry.caseFields.latestPostDeliveryFollowUpResult.fieldName,
    'Latest post-delivery follow-up result',
  );
  assert.equal(
    registry.postDeliveryFollowUpFields.followUpResult.fieldName,
    'Follow-up result',
  );
  assert.deepEqual(Object.values(registry.postDeliveryFollowUpResultOptions), [
    'no issue',
    'issue detected',
    'not checked',
  ]);
});

test('shouldSkipAction skips dependents when an upstream dependency was skipped', () => {
  const dependentAction: WriteAction = {
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
