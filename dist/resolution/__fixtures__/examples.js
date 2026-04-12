import { resolveState } from '../resolveState.js';
import { fixture_existingPatientNewVisitSimple, fixture_sameDateCorrectionRequired, fixture_patientRecheckRequired, fixture_patientDuplicateCorrection, fixture_caseContinuation, fixture_hardStopSameDateKeepNew, } from './scenarioFixtures.js';
/**
 * Example: Running the State Resolution Engine
 *
 * This demonstrates how to use the resolution engine without provider calls.
 * Each fixture contains:
 * - A normalized contract
 * - Current-state lookup results (pre-populated)
 * - Expected resolution outcomes
 */
export async function exampleResolutionFlow() {
    console.log('=== State Resolution Engine Examples ===\n');
    const fixtures = [
        {
            name: 'Example 1: Existing Patient New Visit (Simple)',
            fixture: fixture_existingPatientNewVisitSimple,
        },
        {
            name: 'Example 2: Same-Date Correction Required',
            fixture: fixture_sameDateCorrectionRequired,
        },
        {
            name: 'Example 3: Patient Recheck Required',
            fixture: fixture_patientRecheckRequired,
        },
        {
            name: 'Example 4: Patient Duplicate Correction',
            fixture: fixture_patientDuplicateCorrection,
        },
        {
            name: 'Example 5: Case Continuation',
            fixture: fixture_caseContinuation,
        },
        {
            name: 'Example 6: Hard Stop - Same-Date Keep New',
            fixture: fixture_hardStopSameDateKeepNew,
        },
    ];
    for (const { name, fixture } of fixtures) {
        console.log(`\n${name}`);
        console.log('─'.repeat(60));
        try {
            const result = await resolveState(fixture.contract, fixture.lookups);
            console.log(`Readiness: ${result.readiness}`);
            console.log(`Interaction Mode: ${result.interactionMode}`);
            console.log(`\nPatient: ${result.patient.status}`);
            console.log(`Visit: ${result.visit.status}`);
            console.log(`Case: ${result.caseResolution.status}`);
            console.log(`\nSummary:`);
            console.log(`  Patient: ${result.summary.patientActionSummary}`);
            console.log(`  Visit: ${result.summary.visitActionSummary}`);
            console.log(`  Case: ${result.summary.caseActionSummary}`);
            console.log(`  Next: ${result.summary.nextStepSummary}`);
            if (result.warnings.length > 0) {
                console.log(`\nWarnings:`);
                result.warnings.forEach((w) => console.log(`  - ${w}`));
            }
        }
        catch (error) {
            console.error(`Error: ${error}`);
        }
    }
}
// Examples are exported for use in test files or CLI tools
export default exampleResolutionFlow;
