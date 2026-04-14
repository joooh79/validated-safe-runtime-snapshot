import type { NormalizedContract } from '../types/contract.js';
import type { StateResolutionResult } from '../types/resolution.js';
import { resolveState } from './resolveState.js';
import type { CurrentStateLookupBundle } from './types.js';

/**
 * State Resolver interface
 *
 * Main interface for the state resolution engine.
 * Implementations handle patient, visit, case, and correction resolution.
 */
export interface StateResolver {
  resolve(
    contract: NormalizedContract,
    lookups: CurrentStateLookupBundle,
  ): Promise<StateResolutionResult>;
}

/**
 * Default state resolver implementation
 */
export const defaultStateResolver: StateResolver = {
  resolve: resolveState,
};

// Exports for direct use
export { resolveState } from './resolveState.js';
export type {
  CurrentStateLookupBundle,
  PatientLookupResult,
  VisitLookupResult,
  SameDateVisitLookupResult,
  CaseLookupResult,
  CaseCandidateLookupResult,
  SnapshotLookupResult,
} from './types.js';
export { createEmptyLookupBundle } from './types.js';

// Rule module exports for advanced usage
export { resolvePatient } from './rules/resolvePatient.js';
export { resolveVisit } from './rules/resolveVisit.js';
export { resolveCase } from './rules/resolveCase.js';
export { resolveCorrection, resolveAmbiguity } from './rules/resolveCorrection.js';
export { computeReadiness, computeInteractionMode } from './rules/computeReadiness.js';
export { generateResolutionSummary } from './rules/generateSummary.js';
