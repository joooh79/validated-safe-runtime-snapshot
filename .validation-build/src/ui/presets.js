import { fixture_caseContinuation, fixture_existingPatientNewVisitSimple, fixture_hardStopSameDateKeepNew, fixture_patientDuplicateCorrection, fixture_patientRecheckRequired, fixture_sameDateCorrectionRequired, } from '../resolution/__fixtures__/scenarioFixtures.js';
const DEFAULT_PROVIDER_CONFIG = {
    kind: 'airtable',
    mode: 'dryrun',
};
export function getUiPresets() {
    return [
        {
            id: 'happy-path-preview',
            label: 'Happy Path Preview',
            description: 'Existing patient + new visit + PRE finding with a readable representative field.',
            request: createPresetRequest(fixture_existingPatientNewVisitSimple.contract, fixture_existingPatientNewVisitSimple.lookups),
        },
        {
            id: 'happy-path-case',
            label: 'Happy Path Execute-Ready Case',
            description: 'Existing patient + continue-case path that becomes execute-capable after preview.',
            request: createPresetRequest(fixture_caseContinuation.contract, fixture_caseContinuation.lookups),
        },
        {
            id: 'same-date-correction',
            label: 'Same-Date Correction Required',
            description: 'Requires a same-date correction choice before preview can become execution-ready.',
            request: createPresetRequest(fixture_sameDateCorrectionRequired.contract, fixture_sameDateCorrectionRequired.lookups),
        },
        {
            id: 'patient-recheck',
            label: 'Patient Recheck Required',
            description: 'Requires a confirmed patient ID before preview can proceed.',
            request: createPresetRequest(fixture_patientRecheckRequired.contract, fixture_patientRecheckRequired.lookups),
        },
        {
            id: 'duplicate-correction',
            label: 'Duplicate Suspicion Correction',
            description: 'Shows a truthful manual-only correction path because automatic duplicate correction is not wired yet.',
            request: createPresetRequest(fixture_patientDuplicateCorrection.contract, fixture_patientDuplicateCorrection.lookups),
        },
        {
            id: 'hard-stop',
            label: 'Hard Stop Example',
            description: 'Same-date keep-new-visit stance that stays blocked.',
            request: createPresetRequest(fixture_hardStopSameDateKeepNew.contract, fixture_hardStopSameDateKeepNew.lookups),
        },
    ];
}
function createPresetRequest(normalizedContract, lookupBundle) {
    const request = {
        providerConfig: DEFAULT_PROVIDER_CONFIG,
    };
    if (normalizedContract) {
        request.normalizedContract = normalizedContract;
    }
    if (lookupBundle) {
        request.lookupBundle = lookupBundle;
    }
    return request;
}
