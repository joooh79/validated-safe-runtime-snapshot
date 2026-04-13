/**
 * Minimal lookup bundle for "no lookups performed yet"
 * Used for dry-run or preview-only scenarios
 */
export function createEmptyLookupBundle() {
    return {
        patientLookup: { found: false, reason: 'lookup_not_performed' },
        sameDateVisitLookup: { found: false, reason: 'lookup_not_performed' },
        caseLookups: {},
    };
}
