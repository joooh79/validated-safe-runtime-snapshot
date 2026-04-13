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
});
