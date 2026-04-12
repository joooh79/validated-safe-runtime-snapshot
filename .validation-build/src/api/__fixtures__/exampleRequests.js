import { GC_BLOCKED_CASE_MAPPING, GC_DUPLICATE_SUSPICION, GC_NO_OP, GC_PATIENT_RECHECK_REQUIRED, GC_SAFE_NEW_VISIT, GC_SAME_DATE_CORRECTION_REQUIRED, createContractFromScenario, createLookupBundleFromScenario, } from '../../validation/index.js';
const defaultProviderConfig = {
    kind: 'airtable',
    mode: 'dryrun',
};
export const apiFixture_safeNewVisitPreviewRequest = createScenarioRequest(GC_SAFE_NEW_VISIT);
export const apiFixture_safeNewVisitConfirmRequest = createScenarioRequest(GC_SAFE_NEW_VISIT, {
    interactionInput: {
        confirmation: {
            confirmed: true,
        },
    },
});
export const apiFixture_sameDateCorrectionRequiredRequest = createScenarioRequest(GC_SAME_DATE_CORRECTION_REQUIRED);
export const apiFixture_patientRecheckRequiredRequest = createScenarioRequest(GC_PATIENT_RECHECK_REQUIRED);
export const apiFixture_duplicateSuspicionRequest = createScenarioRequest(GC_DUPLICATE_SUSPICION);
export const apiFixture_noOpRequest = createScenarioRequest(GC_NO_OP);
export const apiFixture_blockedUnsupportedMappingRequest = createScenarioRequest(GC_BLOCKED_CASE_MAPPING, {
    interactionInput: {
        confirmation: {
            confirmed: true,
        },
    },
});
export const apiFixture_hardStopRequest = {
    normalizedContract: {
        requestId: 'API_HARD_STOP',
        workflowIntent: 'existing_patient_new_visit',
        continuityIntent: 'none',
        patientClues: {
            patientId: 'pat_existing_12345',
            existingPatientClaim: true,
        },
        visitContext: {
            visitDate: '2024-04-12',
            targetVisitDate: '2024-04-13',
            doctorConfirmedCorrection: false,
        },
        findingsContext: {
            toothItems: [
                {
                    toothNumber: '11',
                    branches: [
                        {
                            branch: 'PRE',
                            payload: {},
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
            patientId: 'pat_existing_12345',
        },
        sameDateVisitLookup: {
            found: true,
            visitId: 'vis_same_date_001',
            visitDate: '2024-04-12',
        },
        caseLookups: {},
    },
    providerConfig: defaultProviderConfig,
};
export const apiFixtureRequests = [
    {
        name: 'safe_new_visit_preview',
        request: apiFixture_safeNewVisitPreviewRequest,
    },
    {
        name: 'safe_new_visit_confirm',
        request: apiFixture_safeNewVisitConfirmRequest,
    },
    {
        name: 'same_date_correction_required',
        request: apiFixture_sameDateCorrectionRequiredRequest,
    },
    {
        name: 'patient_recheck_required',
        request: apiFixture_patientRecheckRequiredRequest,
    },
    {
        name: 'duplicate_suspicion',
        request: apiFixture_duplicateSuspicionRequest,
    },
    {
        name: 'hard_stop',
        request: apiFixture_hardStopRequest,
    },
    {
        name: 'no_op',
        request: apiFixture_noOpRequest,
    },
    {
        name: 'blocked_unsupported_mapping',
        request: apiFixture_blockedUnsupportedMappingRequest,
    },
];
function createScenarioRequest(scenario, overrides = {}) {
    const normalizedContract = createContractFromScenario(scenario);
    const lookupBundle = createLookupBundleFromScenario(scenario);
    return {
        normalizedContract,
        lookupBundle,
        providerConfig: defaultProviderConfig,
        ...overrides,
    };
}
