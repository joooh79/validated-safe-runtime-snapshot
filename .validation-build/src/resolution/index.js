import { resolveState } from './resolveState.js';
/**
 * Default state resolver implementation
 */
export const defaultStateResolver = {
    resolve: resolveState,
};
// Exports for direct use
export { resolveState } from './resolveState.js';
export { createEmptyLookupBundle } from './types.js';
// Rule module exports for advanced usage
export { resolvePatient } from './rules/resolvePatient.js';
export { resolveVisit } from './rules/resolveVisit.js';
export { resolveCase } from './rules/resolveCase.js';
export { resolveCorrection, resolveAmbiguity } from './rules/resolveCorrection.js';
export { computeReadiness, computeInteractionMode } from './rules/computeReadiness.js';
export { generateResolutionSummary } from './rules/generateSummary.js';
