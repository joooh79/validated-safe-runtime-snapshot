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
