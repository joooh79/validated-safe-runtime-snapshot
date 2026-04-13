/**
 * Collect created and updated refs from action execution results
 *
 * Traverses execution results and tracks:
 * - what was newly created
 * - what was updated
 *
 * Uses action type hints to categorize refs.
 */
export function collectExecutionRefs(actionResults, actions) {
    const createdRefs = {};
    const updatedRefs = {};
    for (const result of actionResults) {
        if (result.status !== 'success' || !result.providerRef) {
            // Only process successful results with a ref
            continue;
        }
        // Find corresponding action to understand intent
        const action = actions.find((a) => a.actionId === result.actionId);
        if (!action) {
            continue;
        }
        // Categorize based on targetMode and actionType
        const isCreate = action.targetMode === 'create_new' || action.actionType.startsWith('create_');
        const isUpdate = action.targetMode === 'update_existing' || action.actionType.startsWith('update_');
        const isAttach = action.targetMode === 'attach_existing';
        // Use action type to determine what entity was affected
        const refKey = `${action.entityType}_${result.actionId}`;
        if (isCreate) {
            createdRefs[refKey] = result.providerRef;
        }
        else if (isUpdate) {
            updatedRefs[refKey] = result.providerRef;
        }
        else if (isAttach) {
            // Attach operations don't create or update; they just reference
            // No ref collected for attach operations
        }
    }
    return { createdRefs, updatedRefs };
}
