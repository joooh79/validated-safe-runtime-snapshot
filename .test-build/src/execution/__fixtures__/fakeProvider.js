/**
 * Fake/Mock Provider for Testing
 *
 * Simulates DirectWriteProvider behavior without actual Airtable calls.
 * Used for fixtures and unit testing.
 *
 * Supports multiple behaviors:
 * - allSuccess: all actions succeed
 * - failFirst: first action fails before any write
 * - failMiddle: middle action fails after prior success (partial)
 * - blockedDeps: dependencies cause later actions to skip
 */
export class FakeProvider {
    behavior;
    actionDelay;
    constructor(behavior = 'allSuccess', actionDelay = 0) {
        this.behavior = behavior;
        this.actionDelay = actionDelay;
    }
    async executeAction(action, ctx) {
        // Simulate network/processing delay
        if (this.actionDelay > 0) {
            await new Promise((r) => setTimeout(r, this.actionDelay));
        }
        const result = {
            actionId: action.actionId,
            actionType: action.actionType,
            status: 'success',
            providerRef: `ref_${action.actionId}`,
        };
        // Apply behavior
        switch (this.behavior) {
            case 'allSuccess':
                // All actions succeed (default)
                result.status = 'success';
                result.providerRef = `${action.actionType}_${Date.now()}`;
                break;
            case 'failFirst':
                // First executable action fails
                if (!action.actionType.startsWith('no_op')) {
                    result.status = 'failed';
                    result.errorMessage = 'Simulated failure on first executable action';
                    delete result.providerRef;
                }
                break;
            case 'failMiddle':
                // Third executable action fails; first two succeed
                if (!action.actionType.startsWith('no_op') && action.actionOrder === 4) {
                    result.status = 'failed';
                    result.errorMessage = 'Simulated failure on middle action (order 4)';
                    delete result.providerRef;
                }
                else {
                    result.status = 'success';
                    result.providerRef = `${action.actionType}_${Date.now()}`;
                }
                break;
            case 'blockedDeps':
                // First action succeeds, second fails, downstream should skip
                if (action.actionOrder === 1) {
                    result.status = 'success';
                    result.providerRef = `${action.actionType}_${Date.now()}`;
                }
                else if (action.actionOrder === 2) {
                    result.status = 'failed';
                    result.errorMessage = 'Simulated failure on order 2 (causes downstream skips)';
                    delete result.providerRef;
                }
                else {
                    // Would skip due to dependency
                    result.status = 'skipped';
                    result.errorMessage = 'Skipped due to upstream failure';
                    delete result.providerRef;
                }
                break;
            default:
                result.status = 'success';
        }
        return result;
    }
}
/**
 * Create a fake provider with specific behavior
 */
export function createFakeProvider(behavior = 'allSuccess', delayMs = 0) {
    return new FakeProvider(behavior, delayMs);
}
