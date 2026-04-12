/**
 * Unsupported Action Handler
 *
 * Handles actions that are not yet supported by the adapter
 * because runtime activation semantics are still intentionally blocked.
 *
 * Includes:
 * - still-blocked Case actions outside the minimal Stage 5 subset
 * - Link actions outside the minimal Stage 6/7 subset
 * - Snapshot branches outside the currently active PRE / PLAN / DR / DX / RAD / OP subset
 */
import { unsupportedActionError, canonConfirmRequiredError, } from '../errors.js';
export function getUnsupportedActionError(action) {
    // Case actions
    if (action.entityType === 'case') {
        return canonConfirmRequiredError(`action_${action.actionType}`, 'case', 'This Case action remains outside the minimal active Stage 5 subset and is still blocked pending fuller Case identity, transition, and sequencing semantics');
    }
    // Link actions
    if (action.entityType === 'link') {
        return canonConfirmRequiredError(`action_${action.actionType}`, 'linking', 'This explicit link action remains outside the minimal active Stage 6 subset and stays blocked pending broader authoritative write-side, payload shape, and replay/idempotence decisions');
    }
    // Snapshot branches beyond the currently active subset
    if (action.entityType === 'snapshot') {
        const branch = action.target.branch;
        if (branch &&
            branch !== 'PRE' &&
            branch !== 'PLAN' &&
            branch !== 'DR' &&
            branch !== 'DX' &&
            branch !== 'RAD' &&
            branch !== 'OP') {
            return canonConfirmRequiredError(`snapshot_${branch}`, branch, `${branch} branch remains blocked: schema exists, but writable payload mapping, option coverage, record-name behavior, and identity/update-vs-create semantics are not yet activated`);
        }
    }
    // Default
    return unsupportedActionError(action.actionType, 'Action type not yet supported by Airtable adapter');
}
