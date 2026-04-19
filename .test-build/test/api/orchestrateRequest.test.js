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
    const snapshotActions = response.plan?.actions.filter((action) => action.actionType === 'create_snapshot');
    const preSnapshot = snapshotActions?.find((action) => action.target.branch === 'PRE');
    const radSnapshot = snapshotActions?.find((action) => action.target.branch === 'RAD');
    const opSnapshot = snapshotActions?.find((action) => action.target.branch === 'OP');
    const drSnapshot = snapshotActions?.find((action) => action.target.branch === 'DR');
    assert.deepEqual(preSnapshot?.payloadIntent?.intendedChanges, {
        symptom: 'cold sensitivity',
    });
    assert.deepEqual(radSnapshot?.payloadIntent?.intendedChanges, {
        radiographType: 'bitewing',
        radiographicCariesDepth: 'outer dentin',
    });
    assert.deepEqual(opSnapshot?.payloadIntent?.intendedChanges, {
        crackConfirmed: 'dentin crack',
        subgingivalMargin: 'slightly subgingival',
    });
    assert.deepEqual(drSnapshot?.payloadIntent?.intendedChanges, {
        decisionFactors: ['caries depth', 'subgingival margin'],
        crackProgressionRisk: 'low',
        occlusalRisk: 'normal',
    });
    assert.equal(response.plan?.preview.caseAction, 'Create new case for tooth 14');
    assert.equal(response.resolution?.summary.caseActionSummary, 'Create new case for tooth 14');
    assert.equal(response.display?.title, 'Preview Ready');
    assert.equal(response.display?.interaction.assistantQuestion, '숫자만 입력해 주세요.\n1. 이대로 진행\n2. 종료');
    assert.deepEqual(response.display?.interaction.numeric_choices.map((choice) => ({
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
    assert.equal(response.display?.executionState.executeAllowed, true);
    assert.equal(response.display?.executionState.nextTool, 'execute');
    assert.equal(response.display?.executionState.nextStepType, 'preview_confirmation');
    assert.equal(response.display?.executionState.requiresConfirmation, true);
    assert.deepEqual(response.display?.patient.input_fields, [
        {
            field: 'Patient ID',
            value: '916872',
        },
        {
            field: 'Birth year',
            value: '',
        },
        {
            field: 'Gender',
            value: '',
        },
        {
            field: 'First visit date',
            value: '2022-10-13',
        },
    ]);
    assert.deepEqual(response.display?.visit.input_fields, [
        {
            field: 'Patient ID link',
            value: '916872',
        },
        {
            field: 'Visit date',
            value: '2022-10-13',
        },
        {
            field: 'Visit type',
            value: 'first visit',
        },
        {
            field: 'Chief complaint',
            value: 'cold and hot sensitivity',
        },
        {
            field: 'Pain level',
            value: '1',
        },
        {
            field: 'Doctor confirmed correction',
            value: 'false',
        },
    ]);
    assert.deepEqual(response.display?.case.input_fields, [
        {
            field: 'Patient ID',
            value: '916872',
        },
        {
            field: 'Tooth number',
            value: '14',
        },
        {
            field: 'Episode start date',
            value: '2022-10-13',
        },
    ]);
    assert.deepEqual(response.display?.findings[0]?.representative_fields, [
        {
            field: 'Symptom',
            value: 'cold sensitivity',
        },
    ]);
    assert.deepEqual(response.display?.findings[0]?.input_fields, [
        {
            field: 'Symptom',
            value: 'cold sensitivity',
        },
        {
            field: 'Symptom reproducible',
            value: '',
        },
        {
            field: 'Visible crack',
            value: '',
        },
        {
            field: 'Crack detection method',
            value: '',
        },
    ]);
    assert.equal(response.display?.findings[0]?.field_changes[0]?.field, 'Symptom');
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
test('continue_case execute no longer skips update_case_latest_synthesis or link_visit_to_case', async () => {
    const response = await orchestrateRequest({
        normalizedContract: {
            requestId: 'req_916872_20221019_14_continue_mock_fix',
            workflowIntent: 'existing_patient_new_visit',
            continuityIntent: 'continue_case',
            patientClues: {
                patientId: '916872',
                existingPatientClaim: true,
            },
            visitContext: {
                visitDate: '2022-10-19',
                visitType: 'continue case',
                chiefComplaint: 'follow-up review after delivery',
                painLevel: 0,
            },
            findingsContext: {
                toothItems: [
                    {
                        toothNumber: '14',
                        branches: [
                            {
                                branch: 'PRE',
                                payload: {
                                    Symptom: ['none'],
                                },
                            },
                            {
                                branch: 'RAD',
                                payload: {
                                    'Radiograph type': 'bitewing',
                                },
                            },
                            {
                                branch: 'OP',
                                payload: {
                                    'Crack confirmed': 'none',
                                },
                            },
                            {
                                branch: 'DX',
                                payload: {
                                    'Structural diagnosis': ['intact tooth'],
                                },
                            },
                            {
                                branch: 'PLAN',
                                payload: {
                                    'Restoration design': 'crown',
                                },
                            },
                            {
                                branch: 'DR',
                                payload: {
                                    'Decision factor': ['occlusion'],
                                    latestSummary: 'delivery check complete',
                                },
                            },
                        ],
                    },
                ],
                findingsPresent: {
                    pre_op: true,
                    radiographic: true,
                    operative: true,
                    diagnosis: true,
                    treatment_plan: true,
                    doctor_reasoning: true,
                },
            },
            warnings: [],
        },
        lookupBundle: {
            patientLookup: {
                found: true,
                patientId: '916872',
                recordId: 'rec_patient_001',
            },
            sameDateVisitLookup: {
                found: false,
            },
            caseLookups: {
                '14': {
                    found: true,
                    caseId: 'VISIT-916872-20221013',
                },
            },
        },
        interactionInput: {
            confirmation: {
                confirmed: true,
            },
        },
        providerConfig: {
            kind: 'airtable',
            mode: 'mock',
        },
    });
    assert.equal(response.terminalStatus, 'executed');
    assert.equal(response.plan?.readiness, 'execution_ready');
    assert.equal(response.resolution?.caseResolution.resolvedCaseId, 'VISIT-916872-20221013');
    const actionTypes = response.plan?.actions.map((action) => action.actionType) ?? [];
    assert.notEqual(actionTypes.indexOf('create_snapshot'), -1);
    assert.notEqual(actionTypes.indexOf('update_case_latest_synthesis'), -1);
    assert.ok(actionTypes.indexOf('create_snapshot') < actionTypes.indexOf('update_case_latest_synthesis'));
    const visitAction = response.plan?.actions.find((action) => action.entityType === 'visit');
    const linkVisitAction = response.plan?.actions.find((action) => action.actionType === 'link_visit_to_case');
    assert.deepEqual(linkVisitAction?.dependsOnActionIds, visitAction ? [visitAction.actionId] : undefined);
    const updateCaseResult = response.executionResult?.actionResults.find((action) => action.actionType === 'update_case_latest_synthesis');
    const linkVisitResult = response.executionResult?.actionResults.find((action) => action.actionType === 'link_visit_to_case');
    assert.equal(updateCaseResult?.status, 'success');
    assert.equal(linkVisitResult?.status, 'success');
});
test('follow-up preview exposes a post-delivery follow-up create action and safe episode-start visit helper write', async () => {
    const response = await orchestrateRequest({
        normalizedContract: {
            requestId: 'req_916872_20221116_14_follow_up_preview',
            workflowIntent: 'existing_patient_new_visit',
            continuityIntent: 'continue_case',
            patientClues: {
                patientId: '916872',
                existingPatientClaim: true,
            },
            visitContext: {
                visitDate: '2022-11-16',
                visitType: 'follow up',
                chiefComplaint: 'post-delivery check',
                painLevel: 0,
            },
            findingsContext: {
                toothItems: [
                    {
                        toothNumber: '14',
                        branches: [
                            {
                                branch: 'OP',
                                payload: {
                                    followUpDate: '2022-11-16',
                                    followUpResult: 'no issue',
                                    issueSummary: 'none reported',
                                    followUpNotes: 'occlusion stable',
                                },
                            },
                        ],
                    },
                ],
                findingsPresent: {
                    operative: true,
                },
            },
            warnings: [],
        },
        lookupBundle: {
            patientLookup: {
                found: true,
                patientId: '916872',
                recordId: 'rec_patient_001',
            },
            sameDateVisitLookup: {
                found: false,
            },
            caseLookups: {
                '14': {
                    found: true,
                    caseId: 'VISIT-916872-20221013',
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
    const visitAction = response.plan?.actions.find((action) => action.entityType === 'visit');
    assert.equal(visitAction?.payloadIntent?.intendedChanges.episodeStartVisit, 'VISIT-916872-20221013');
    const followUpAction = response.plan?.actions.find((action) => action.actionType === 'create_post_delivery_follow_up');
    assert.equal(followUpAction?.target.toothNumber, '14');
    assert.deepEqual(followUpAction?.payloadIntent?.intendedChanges, {
        followUpDate: '2022-11-16',
        followUpResult: 'no issue',
        issueSummary: 'none reported',
        followUpNotes: 'occlusion stable',
    });
    assert.equal(response.readablePreview?.visit_summary.representative_fields.some((field) => field.field === 'Episode start visit' &&
        field.value === 'VISIT-916872-20221013'), true);
    assert.equal(response.readablePreview?.case_summary.details?.includes('Post-delivery follow-up row: tooth 14 / 2022-11-16 / no issue'), true);
});
test('top-level caseUpdates are preserved into continue-case preview and execution intent', async () => {
    const response = await orchestrateRequest({
        normalizedContract: {
            requestId: 'req_916872_20221026_14_case_updates',
            workflowIntent: 'existing_patient_new_visit',
            continuityIntent: 'continue_case',
            patientClues: {
                patientId: '916872',
                existingPatientClaim: true,
            },
            visitContext: {
                visitDate: '2022-10-26',
                visitType: 'recall',
                chiefComplaint: '14번 e.max crown final delivery',
                painLevel: 0,
            },
            findingsContext: {
                toothItems: [
                    {
                        toothNumber: '14',
                        branches: [
                            {
                                branch: 'DR',
                                payload: {
                                    decisionFactors: ['N/A'],
                                    reasoningNotes: 'e.max crown final delivery 완료. 장착 후 이상 없음 확인. 14번 치아 케이스 종료.',
                                },
                            },
                        ],
                    },
                ],
                findingsPresent: {
                    doctor_reasoning: true,
                },
            },
            caseUpdates: {
                episodeStatus: 'closed',
                finalProsthesisPlanDate: '2022-10-19',
                finalPrepAndScanDate: '2022-10-19',
                finalProsthesisDeliveryDate: '2022-10-26',
            },
            warnings: [],
        },
        lookupBundle: {
            patientLookup: {
                found: true,
                patientId: '916872',
                recordId: 'rec_patient_001',
            },
            sameDateVisitLookup: {
                found: false,
            },
            caseLookups: {
                '14': {
                    found: true,
                    caseId: 'CASE-916872-14-20221013',
                },
            },
        },
        interactionInput: {
            confirmation: {
                confirmed: true,
            },
        },
        providerConfig: {
            kind: 'airtable',
            mode: 'mock',
        },
    });
    assert.equal(response.terminalStatus, 'executed');
    assert.equal(response.plan?.readiness, 'execution_ready');
    const caseAction = response.plan?.actions.find((action) => action.actionType === 'update_case_latest_synthesis');
    assert.deepEqual(caseAction?.payloadIntent?.intendedChanges, {
        episodeStatus: 'closed',
        finalProsthesisPlanDate: '2022-10-19',
        finalPrepAndScanDate: '2022-10-19',
        finalProsthesisDeliveryDate: '2022-10-26',
    });
    assert.equal(response.readablePreview?.case_summary.representative_fields.some((field) => field.field === 'Episode status' && field.value === 'closed'), true);
    assert.equal(response.readablePreview?.case_summary.representative_fields.some((field) => field.field === 'Final prosthesis delivery date' && field.value === '2022-10-26'), true);
    const caseResult = response.executionResult?.actionResults.find((action) => action.actionType === 'update_case_latest_synthesis');
    assert.equal(caseResult?.status, 'success');
});
test('existing patient demographics can be updated without a visit workflow', async () => {
    const response = await orchestrateRequest({
        normalizedContract: {
            requestId: 'req_patient_only_update_196872',
            workflowIntent: 'unknown',
            continuityIntent: 'none',
            patientClues: {
                patientId: '196872',
                birthYear: '1966',
                genderHint: 'Female',
            },
            visitContext: {},
            findingsContext: {
                toothItems: [],
            },
            warnings: [],
        },
        lookupBundle: {
            patientLookup: {
                found: true,
                patientId: '196872',
                recordId: 'rec_patient_196872',
            },
            sameDateVisitLookup: {
                found: false,
            },
            caseLookups: {},
        },
        providerConfig: {
            kind: 'airtable',
            mode: 'mock',
        },
    });
    assert.equal(response.terminalStatus, 'preview_pending_confirmation');
    assert.equal(response.plan?.readiness, 'execution_ready');
    assert.equal(response.resolution?.visit.status, 'no_visit_needed');
    assert.equal(response.resolution?.caseResolution.status, 'none');
    const patientAction = response.plan?.actions.find((action) => action.entityType === 'patient');
    assert.equal(patientAction?.actionType, 'update_patient');
    assert.deepEqual(patientAction?.payloadIntent?.intendedChanges, {
        birthYear: '1966',
        gender: 'Female',
    });
    assert.equal(response.readablePreview?.patient_summary.representative_fields.some((field) => field.field === 'Birth year' && field.value === '1966'), true);
    assert.equal(response.readablePreview?.patient_summary.representative_fields.some((field) => field.field === 'Gender hint' && field.value === 'Female'), true);
    assert.equal(response.preview?.visitBlock.value, 'No visit action needed');
    assert.equal(response.preview?.warnings.some((warning) => warning.includes('workflowIntent: Workflow intent could not be determined')), false);
    const executed = await orchestrateRequest({
        normalizedContract: {
            requestId: 'req_patient_only_update_196872',
            workflowIntent: 'unknown',
            continuityIntent: 'none',
            patientClues: {
                patientId: '196872',
                birthYear: '1966',
                genderHint: 'Female',
            },
            visitContext: {},
            findingsContext: {
                toothItems: [],
            },
            warnings: [],
        },
        lookupBundle: {
            patientLookup: {
                found: true,
                patientId: '196872',
                recordId: 'rec_patient_196872',
            },
            sameDateVisitLookup: {
                found: false,
            },
            caseLookups: {},
        },
        interactionInput: {
            confirmation: {
                confirmed: true,
            },
        },
        providerConfig: {
            kind: 'airtable',
            mode: 'mock',
        },
    });
    assert.equal(executed.terminalStatus, 'executed');
    const patientResult = executed.executionResult?.actionResults.find((action) => action.actionType === 'update_patient');
    assert.equal(patientResult?.status, 'success');
});
test('real-mode patient_update resolves the Airtable patient record id during execute when lookupBundle only has patientId', async () => {
    const originalFetch = globalThis.fetch;
    const requests = [];
    globalThis.fetch = (async (input, init) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
        const method = init?.method ?? 'GET';
        if (method === 'GET' && url.includes('/Patients?')) {
            return new Response(JSON.stringify({
                records: [
                    {
                        id: 'rec_patient_196872',
                        fields: {
                            'Patients ID': '196872',
                            'Birth year': 1965,
                            Gender: 'Male',
                        },
                    },
                ],
            }), {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                },
            });
        }
        if (method === 'PATCH' && url.includes('/Patients/rec_patient_196872')) {
            requests.push({
                url,
                method,
                body: typeof init?.body === 'string' ? init.body : '',
            });
            return new Response(JSON.stringify({
                id: 'rec_patient_196872',
            }), {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                },
            });
        }
        throw new Error(`Unexpected fetch in test: ${method} ${url}`);
    });
    try {
        const preview = await orchestrateRequest({
            normalizedContract: {
                requestId: 'req_patient_only_update_real_without_record_ref',
                workflowIntent: 'unknown',
                continuityIntent: 'none',
                patientClues: {
                    patientId: '196872',
                    birthYear: '1966',
                    genderHint: 'Female',
                },
                visitContext: {},
                findingsContext: {
                    toothItems: [],
                },
                warnings: [],
            },
            lookupBundle: {
                patientLookup: {
                    found: true,
                    patientId: '196872',
                },
                sameDateVisitLookup: {
                    found: false,
                },
                caseLookups: {},
            },
            providerConfig: {
                kind: 'airtable',
                mode: 'real',
                baseId: 'app_test',
                apiToken: 'pat_test',
                apiBaseUrl: 'http://127.0.0.1:9999',
            },
        });
        assert.equal(preview.terminalStatus, 'preview_pending_confirmation');
        assert.equal(preview.plan?.readiness, 'execution_ready');
        const executed = await orchestrateRequest({
            normalizedContract: {
                requestId: 'req_patient_only_update_real_without_record_ref',
                workflowIntent: 'unknown',
                continuityIntent: 'none',
                patientClues: {
                    patientId: '196872',
                    birthYear: '1966',
                    genderHint: 'Female',
                },
                visitContext: {},
                findingsContext: {
                    toothItems: [],
                },
                warnings: [],
            },
            lookupBundle: {
                patientLookup: {
                    found: true,
                    patientId: '196872',
                },
                sameDateVisitLookup: {
                    found: false,
                },
                caseLookups: {},
            },
            interactionInput: {
                confirmation: {
                    confirmed: true,
                },
            },
            providerConfig: {
                kind: 'airtable',
                mode: 'real',
                baseId: 'app_test',
                apiToken: 'pat_test',
                apiBaseUrl: 'http://127.0.0.1:9999',
            },
        });
        assert.equal(executed.terminalStatus, 'executed');
        assert.equal(requests.length, 1);
        assert.match(requests[0].url, /\/Patients\/rec_patient_196872$/);
    }
    finally {
        globalThis.fetch = originalFetch;
    }
});
test('exact case id supports case-only updates without visit or findings', async () => {
    const response = await orchestrateRequest({
        normalizedContract: {
            requestId: 'req_case_only_update_case_14',
            workflowIntent: 'unknown',
            continuityIntent: 'none',
            patientClues: {},
            visitContext: {},
            findingsContext: {
                toothItems: [],
            },
            caseUpdates: {
                caseId: 'CASE-916872-14-20221013',
                episodeStatus: 'closed',
                finalProsthesisDeliveryDate: '2022-10-26',
            },
            warnings: [],
        },
        lookupBundle: {
            patientLookup: {
                found: false,
            },
            sameDateVisitLookup: {
                found: false,
            },
            caseLookups: {
                __direct_case__: {
                    found: true,
                    caseId: 'CASE-916872-14-20221013',
                    recordId: 'rec_case_14',
                    toothNumber: '14',
                    episodeStartDate: '2022-10-13',
                },
            },
        },
        providerConfig: {
            kind: 'airtable',
            mode: 'mock',
        },
    });
    assert.equal(response.terminalStatus, 'preview_pending_confirmation');
    assert.equal(response.plan?.readiness, 'execution_ready');
    assert.equal(response.resolution?.patient.status, 'no_patient_needed');
    assert.equal(response.resolution?.visit.status, 'no_visit_needed');
    assert.equal(response.resolution?.caseResolution.status, 'direct_case_update');
    assert.equal(response.resolution?.caseResolution.resolvedCaseId, 'CASE-916872-14-20221013');
    assert.equal(response.preview?.patientBlock.value, 'No patient action needed');
    assert.equal(response.preview?.visitBlock.value, 'No visit action needed');
    assert.equal(response.preview?.caseBlock.value, 'Update existing case: CASE-916872-14-20221013');
    const caseAction = response.plan?.actions.find((action) => action.actionType === 'update_case_latest_synthesis');
    assert.deepEqual(caseAction?.payloadIntent?.intendedChanges, {
        episodeStatus: 'closed',
        finalProsthesisDeliveryDate: '2022-10-26',
    });
    const executed = await orchestrateRequest({
        normalizedContract: {
            requestId: 'req_case_only_update_case_14',
            workflowIntent: 'unknown',
            continuityIntent: 'none',
            patientClues: {},
            visitContext: {},
            findingsContext: {
                toothItems: [],
            },
            caseUpdates: {
                caseId: 'CASE-916872-14-20221013',
                episodeStatus: 'closed',
                finalProsthesisDeliveryDate: '2022-10-26',
            },
            warnings: [],
        },
        lookupBundle: {
            patientLookup: {
                found: false,
            },
            sameDateVisitLookup: {
                found: false,
            },
            caseLookups: {
                __direct_case__: {
                    found: true,
                    caseId: 'CASE-916872-14-20221013',
                    recordId: 'rec_case_14',
                    toothNumber: '14',
                    episodeStartDate: '2022-10-13',
                },
            },
        },
        interactionInput: {
            confirmation: {
                confirmed: true,
            },
        },
        providerConfig: {
            kind: 'airtable',
            mode: 'mock',
        },
    });
    assert.equal(executed.terminalStatus, 'executed');
    const executedCaseResult = executed.executionResult?.actionResults.find((action) => action.actionType === 'update_case_latest_synthesis');
    assert.equal(executedCaseResult?.status, 'success');
});
