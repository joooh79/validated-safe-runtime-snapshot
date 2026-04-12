/**
 * Golden Case Suite Runner
 *
 * Runs all golden cases and produces aggregated results.
 */
import { ALL_GOLDEN_CASES } from './scenarios.js';
import { runGoldenCase } from './runGoldenCase.js';
/**
 * Run complete golden case suite
 */
export async function runGoldenCaseSuite() {
    const results = [];
    for (const scenario of ALL_GOLDEN_CASES) {
        const result = await runGoldenCase(scenario.input, scenario.expectation);
        results.push(result);
    }
    const passedCount = results.filter((r) => r.passed).length;
    const failedCount = results.filter((r) => !r.passed).length;
    const summary = `Golden Case Suite: ${passedCount}/${results.length} passed`;
    return {
        totalScenarios: results.length,
        passedScenarios: passedCount,
        failedScenarios: failedCount,
        scenarios: results,
        overallPassed: failedCount === 0,
        summary,
    };
}
