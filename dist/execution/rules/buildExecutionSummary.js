/**
 * Build user-facing execution summary
 *
 * Generates plain-language summary of execution outcome for logging/UI.
 */
export function buildExecutionSummary(input) {
    const { status, completedCount, failedCount, warnings } = input;
    let summary = '';
    switch (status) {
        case 'success':
            summary = `✓ Execution complete: ${completedCount} action(s) succeeded`;
            break;
        case 'partial_success':
            summary = `⚠ Partial success: ${completedCount} action(s) succeeded, ${failedCount} failed`;
            break;
        case 'failed_before_any_write':
            summary = `✗ Execution failed before any write`;
            break;
        case 'failed_after_partial_write':
            summary = `✗ Execution failed after partial write: ${completedCount} succeeded, ${failedCount} failed`;
            break;
        case 'blocked_before_write':
            summary = `🛑 Execution blocked: plan not ready for write`;
            break;
        case 'no_op':
            summary = `ℹ No-op: no executable actions`;
            break;
        default:
            summary = `? Unknown execution status: ${status}`;
    }
    // Append warnings if any
    if (warnings && warnings.length > 0) {
        summary += ` [Warnings: ${warnings.join('; ')}]`;
    }
    return summary;
}
