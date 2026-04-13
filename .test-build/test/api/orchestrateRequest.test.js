import assert from 'node:assert/strict';
import test from 'node:test';
import { orchestrateRequest } from '../../src/api/orchestrateRequest.js';
import { apiFixture_patientRecheckRequiredRequest } from '../../src/api/__fixtures__/exampleRequests.js';
test('recheck confirmed patient id patches the lookup bundle so recheck can resolve on re-preview', async () => {
    const response = await orchestrateRequest({
        ...apiFixture_patientRecheckRequiredRequest,
        interactionInput: {
            recheck: {
                confirmedPatientId: 'pat_confirmed_001',
                existingPatientClaim: true,
            },
        },
    });
    assert.notEqual(response.terminalStatus, 'recheck_required');
    assert.equal(response.resolution?.patient.status, 'resolved_existing_patient');
    assert.equal(response.confirmed, false);
});
test('live-equivalent same-date PRE update collapses to no_op when incoming values equal the current row', async () => {
    const response = await orchestrateRequest({
        normalizedContract: {
            requestId: 'NO_OP_PRE_LIVE_COMPARE',
            workflowIntent: 'existing_visit_update',
            continuityIntent: 'none',
            patientClues: {
                patientId: '910001',
                existingPatientClaim: true,
            },
            visitContext: {
                visitDate: '2026-04-13',
                targetVisitDate: '2026-04-13',
                targetVisitId: 'VISIT-910001-20260413',
            },
            findingsContext: {
                toothItems: [
                    {
                        toothNumber: '36',
                        branches: [
                            {
                                branch: 'PRE',
                                payload: {
                                    symptom: 'chewing pain',
                                },
                            },
                        ],
                    },
                ],
                findingsPresent: {},
            },
            warnings: [],
        },
        lookupBundle: {
            patientLookup: {
                found: true,
                patientId: '910001',
            },
            sameDateVisitLookup: {
                found: true,
                visitId: 'VISIT-910001-20260413',
                visitDate: '2026-04-13',
            },
            caseLookups: {},
            snapshotLookups: {
                PRE: {
                    '36': {
                        found: true,
                        recordId: 'rec_pre_36',
                        visitId: 'VISIT-910001-20260413',
                        recordName: 'VISIT-910001-20260413-36-PRE',
                        fields: {
                            Symptom: ['chewing pain'],
                        },
                    },
                },
            },
        },
        providerConfig: {
            kind: 'airtable',
            mode: 'dryrun',
        },
    });
    assert.equal(response.terminalStatus, 'no_op');
    assert.equal(response.plan?.readiness, 'preview_only');
    assert.deepEqual(response.plan?.actions.map((action) => action.actionType), ['attach_existing_patient', 'no_op_visit', 'no_op_snapshot']);
    assert.equal(response.requiresConfirmation, false);
    assert.equal(response.interaction?.mode, 'terminal');
    assert.equal(response.interaction?.uiKind, 'no_op');
    assert.equal(response.interaction?.executeAllowed, false);
    assert.equal(response.interaction?.choiceMap.length, 0);
    assert.equal(response.message, 'snapshot 달라진 내용이 없어, 샌더를 종료합니다.');
    assert.deepEqual(response.readablePreview?.findings[0]?.field_changes, [
        {
            field: 'Symptom',
            status_label: '변경 없음',
            before: 'chewing pain',
            incoming: 'chewing pain',
            after: 'chewing pain',
        },
    ]);
});
test('materially changed same-date PRE update keeps update_snapshot active', async () => {
    const response = await orchestrateRequest({
        normalizedContract: {
            requestId: 'CHANGE_PRE_LIVE_COMPARE',
            workflowIntent: 'existing_visit_update',
            continuityIntent: 'none',
            patientClues: {
                patientId: '910001',
                existingPatientClaim: true,
            },
            visitContext: {
                visitDate: '2026-04-13',
                targetVisitDate: '2026-04-13',
                targetVisitId: 'VISIT-910001-20260413',
            },
            findingsContext: {
                toothItems: [
                    {
                        toothNumber: '36',
                        branches: [
                            {
                                branch: 'PRE',
                                payload: {
                                    symptom: 'bite pain',
                                },
                            },
                        ],
                    },
                ],
                findingsPresent: {},
            },
            warnings: [],
        },
        lookupBundle: {
            patientLookup: {
                found: true,
                patientId: '910001',
            },
            sameDateVisitLookup: {
                found: true,
                visitId: 'VISIT-910001-20260413',
                visitDate: '2026-04-13',
            },
            caseLookups: {},
            snapshotLookups: {
                PRE: {
                    '36': {
                        found: true,
                        recordId: 'rec_pre_36',
                        visitId: 'VISIT-910001-20260413',
                        recordName: 'VISIT-910001-20260413-36-PRE',
                        fields: {
                            Symptom: ['chewing pain'],
                        },
                    },
                },
            },
        },
        providerConfig: {
            kind: 'airtable',
            mode: 'dryrun',
        },
    });
    assert.equal(response.terminalStatus, 'preview_pending_confirmation');
    assert.equal(response.plan?.readiness, 'execution_ready');
    assert(response.plan?.actions.some((action) => action.actionType === 'update_snapshot'));
    assert(!response.plan?.actions.some((action) => action.actionType === 'update_visit'));
    assert.equal(response.requiresConfirmation, true);
    assert.equal(response.interaction?.uiKind, 'preview_confirmation');
    assert.equal(response.interaction?.executeAllowed, true);
    assert.equal(response.interaction?.userMessage, '기존 방문 업데이트 preview입니다. 이 내용대로 적용할까요?');
    assert.deepEqual(response.interaction?.choiceMap.map((choice) => ({
        number: choice.number,
        label: choice.label,
        nextTool: choice.nextTool,
    })), [
        {
            number: 1,
            label: '이대로 진행',
            nextTool: 'execute',
        },
        {
            number: 2,
            label: '종료',
            nextTool: 'none',
        },
    ]);
    assert.deepEqual(response.readablePreview?.findings[0]?.field_changes, [
        {
            field: 'Symptom',
            status_label: '변경 예정',
            before: 'chewing pain',
            incoming: 'bite pain',
            after: 'bite pain',
        },
    ]);
});
test('new patient new visit with continuityIntent none auto-creates patient, visit, case, and snapshots', async () => {
    const response = await orchestrateRequest({
        normalizedContract: {
            requestId: 'req_new_patient_auto_case_fix',
            workflowIntent: 'new_patient_new_visit',
            continuityIntent: 'none',
            patientClues: {
                patientId: '916872',
                newPatientClaim: true,
                existingPatientClaim: false,
                birthYear: '',
                genderHint: '',
            },
            visitContext: {
                visitDate: '2022-10-13',
                visitType: 'first visit',
                chiefComplaint: 'cold and hot sensitivity',
                painLevel: 1,
                targetVisitId: '',
                doctorConfirmedCorrection: false,
            },
            findingsContext: {
                toothItems: [
                    {
                        toothNumber: '14',
                        branches: [
                            {
                                branch: 'PRE',
                                payload: {
                                    Symptom: ['cold sensitivity'],
                                },
                            },
                            {
                                branch: 'RAD',
                                payload: {
                                    'Radiograph type': 'bitewing',
                                    'Radiographic caries depth': 'outer dentin',
                                },
                            },
                            {
                                branch: 'OP',
                                payload: {
                                    'Crack confirmed': 'dentin crack',
                                    'Subgingival margin': 'slightly subgingival',
                                },
                            },
                            {
                                branch: 'DR',
                                payload: {
                                    'Decision factor': ['caries depth', 'subgingival margin'],
                                    'Crack progression risk': 'low',
                                    'Occlusal risk': 'normal',
                                },
                            },
                        ],
                    },
                ],
                findingsPresent: {
                    pre_op: true,
                    radiographic: true,
                    operative: true,
                    diagnosis: false,
                    treatment_plan: false,
                    doctor_reasoning: true,
                },
            },
            warnings: [],
        },
        lookupBundle: {
            patientLookup: {
                found: false,
                patientId: '916872',
            },
            sameDateVisitLookup: {
                found: false,
            },
            caseLookups: {},
        },
        providerConfig: {
            kind: 'airtable',
            mode: 'dryrun',
        },
    });
    assert.equal(response.terminalStatus, 'preview_pending_confirmation');
    assert.equal(response.resolution?.patient.status, 'create_new_patient');
    assert.equal(response.resolution?.visit.status, 'create_new_visit');
    assert.equal(response.resolution?.caseResolution.status, 'create_case');
    assert.deepEqual(response.resolution?.caseResolution.targets, [
        {
            status: 'create_case',
            toothNumber: '14',
            visitDate: '2022-10-13',
            reasons: ['continuity_intent_none + new_patient_new_visit_auto_create_case'],
        },
    ]);
    assert.equal(response.plan?.readiness, 'execution_ready');
    assert(response.plan?.actions.some((action) => action.actionType === 'create_patient'));
    assert(response.plan?.actions.some((action) => action.actionType === 'create_visit'));
    assert(response.plan?.actions.some((action) => action.actionType === 'create_case'));
    assert.equal(response.plan?.actions.filter((action) => action.actionType === 'create_snapshot').length, 4);
    assert.equal(response.plan?.preview.caseAction, 'Create new case for tooth 14');
    assert.equal(response.resolution?.summary.caseActionSummary, 'Create new case for tooth 14');
});
test('new patient new visit with continuityIntent none creates one case per touched tooth', async () => {
    const response = await orchestrateRequest({
        normalizedContract: {
            requestId: 'req_new_patient_multi_tooth_auto_case_fix',
            workflowIntent: 'new_patient_new_visit',
            continuityIntent: 'none',
            patientClues: {
                patientId: '916873',
            },
            visitContext: {
                visitDate: '2022-10-14',
                visitType: 'first visit',
                chiefComplaint: 'multiple teeth sensitive',
                painLevel: 2,
            },
            findingsContext: {
                toothItems: [
                    {
                        toothNumber: '14',
                        branches: [
                            {
                                branch: 'PRE',
                                payload: {
                                    Symptom: ['cold sensitivity'],
                                },
                            },
                        ],
                    },
                    {
                        toothNumber: '15',
                        branches: [
                            {
                                branch: 'PRE',
                                payload: {
                                    Symptom: ['bite pain'],
                                },
                            },
                        ],
                    },
                ],
                findingsPresent: {
                    pre_op: true,
                },
            },
            warnings: [],
        },
        lookupBundle: {
            patientLookup: {
                found: false,
                patientId: '916873',
            },
            sameDateVisitLookup: {
                found: false,
            },
            caseLookups: {},
        },
        providerConfig: {
            kind: 'airtable',
            mode: 'dryrun',
        },
    });
    assert.equal(response.resolution?.patient.status, 'create_new_patient');
    assert.equal(response.resolution?.caseResolution.status, 'create_case');
    assert.deepEqual(response.resolution?.caseResolution.targets?.map((target) => target.toothNumber), ['14', '15']);
    assert.equal(response.plan?.actions.filter((action) => action.actionType === 'create_case').length, 2);
    assert.equal(response.plan?.actions.filter((action) => action.entityType === 'snapshot').length, 2);
    assert.equal(response.plan?.preview.caseAction, 'Create new cases for teeth 14, 15');
});
test('new patient workflow still blocks on duplicate conflict when an existing patient is found', async () => {
    const response = await orchestrateRequest({
        normalizedContract: {
            requestId: 'req_new_patient_conflict_found',
            workflowIntent: 'new_patient_new_visit',
            continuityIntent: 'none',
            patientClues: {
                patientId: '916874',
                newPatientClaim: true,
            },
            visitContext: {
                visitDate: '2022-10-15',
            },
            findingsContext: {
                toothItems: [
                    {
                        toothNumber: '14',
                        branches: [
                            {
                                branch: 'PRE',
                                payload: {
                                    symptom: 'cold sensitivity',
                                },
                            },
                        ],
                    },
                ],
            },
            warnings: [],
        },
        lookupBundle: {
            patientLookup: {
                found: true,
                patientId: '916874',
            },
            sameDateVisitLookup: {
                found: false,
            },
            caseLookups: {},
        },
        providerConfig: {
            kind: 'airtable',
            mode: 'dryrun',
        },
    });
    assert.equal(response.terminalStatus, 'correction_required');
    assert.equal(response.resolution?.patient.status, 'correction_needed_patient_duplicate_suspicion');
    assert.equal(response.plan?.readiness, 'blocked');
    assert(!response.plan?.actions.some((action) => action.actionType === 'create_patient'));
});
