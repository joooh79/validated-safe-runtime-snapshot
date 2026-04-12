/**
 * Validation Result Reporting
 *
 * Helpers for formatting and displaying validation results.
 */
/**
 * Format a single golden case result for display
 */
export function formatGoldenCaseResult(result) {
    const status = result.passed ? '✓ PASS' : '✗ FAIL';
    const lines = [
        `${status} - ${result.title} (${result.scenarioId})`,
    ];
    for (const stage of result.stages) {
        const stageStatus = stage.passed ? '✓' : '✗';
        lines.push(`  ${stageStatus} ${stage.stage}: ${stage.assertions.length} assertions`);
        for (const assertion of stage.assertions) {
            if (!assertion.passed) {
                lines.push(`    ✗ ${assertion.name}`, `      Expected: ${JSON.stringify(assertion.expected)}`, `      Actual:   ${JSON.stringify(assertion.actual)}`);
            }
        }
    }
    if (result.notes && result.notes.length > 0) {
        lines.push('  Notes:');
        for (const note of result.notes) {
            lines.push(`    - ${note}`);
        }
    }
    return lines.join('\n');
}
/**
 * Format suite results for display
 */
export function formatSuiteResult(result) {
    const lines = [
        '====================================',
        'GOLDEN CASE SUITE RESULTS',
        '====================================',
        '',
        result.summary,
        `Total: ${result.totalScenarios}`,
        `Passed: ${result.passedScenarios}`,
        `Failed: ${result.failedScenarios}`,
        '',
    ];
    for (const scenario of result.scenarios) {
        lines.push(formatGoldenCaseResult(scenario));
        lines.push('');
    }
    lines.push('====================================');
    const finalStatus = result.overallPassed ? 'ALL TESTS PASSED ✓' : 'SOME TESTS FAILED ✗';
    lines.push(finalStatus);
    lines.push('====================================');
    return lines.join('\n');
}
/**
 * Log suite results to console
 */
export function logSuiteResult(result) {
    console.log(formatSuiteResult(result));
}
/**
 * Get summary statistics
 */
export function getSuiteStats(result) {
    const passRate = result.totalScenarios > 0
        ? ((result.passedScenarios / result.totalScenarios) * 100).toFixed(1)
        : '0.0';
    return {
        total: result.totalScenarios,
        passed: result.passedScenarios,
        failed: result.failedScenarios,
        passRate: `${passRate}%`,
    };
}
