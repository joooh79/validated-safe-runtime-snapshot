import type { NormalizedContract } from '../types/contract.js';
import type { StateResolutionResult } from '../types/resolution.js';
import { resolvePatient } from './rules/resolvePatient.js';
import { resolveVisit } from './rules/resolveVisit.js';
import { resolveCase } from './rules/resolveCase.js';
import { resolveCorrection, resolveAmbiguity } from './rules/resolveCorrection.js';
import { computeReadiness, computeInteractionMode } from './rules/computeReadiness.js';
import { generateResolutionSummary } from './rules/generateSummary.js';
import type { CurrentStateLookupBundle } from './types.js';

/**
 * Main State Resolution orchestration
 *
 * This is the core decision engine for the new sender.
 * It consumes a normalized contract and current-state lookup results,
 * and produces a comprehensive resolution result.
 *
 * The function is pure and deterministic:
 * - no provider calls
 * - no I/O
 * - given same inputs, always produces same output
 */
export async function resolveState(
  contract: NormalizedContract,
  currentStateLookups: CurrentStateLookupBundle,
): Promise<StateResolutionResult> {
  const warnings: string[] = [
    ...contract.warnings, // Preserve any parsing warnings
  ];

  // Step 1: Resolve patient
  const patientResolution = resolvePatient(
    contract,
    currentStateLookups.patientLookup,
  );

  // Step 2: Resolve visit
  const visitResolution = resolveVisit(
    contract,
    currentStateLookups.sameDateVisitLookup,
  );

  // Step 3: Resolve case
  const caseResolution = resolveCase(
    contract,
    visitResolution,
    currentStateLookups,
  );

  // Step 4: Resolve correction
  const correctionResolution = resolveCorrection(patientResolution, visitResolution);

  // Step 5: Resolve ambiguity
  const ambiguityResolution = resolveAmbiguity(
    patientResolution,
    visitResolution,
    caseResolution,
    correctionResolution.correctionNeeded,
  );

  // Step 6: Compute readiness
  const readiness = computeReadiness(
    patientResolution,
    visitResolution,
    caseResolution,
    correctionResolution,
    ambiguityResolution,
  );

  // Step 7: Map to interaction mode
  const interactionMode = computeInteractionMode(readiness, correctionResolution);

  // Step 8: Generate summary
  const summary = generateResolutionSummary(
    patientResolution,
    visitResolution,
    caseResolution,
    readiness,
    interactionMode,
  );

  // Gather any provider notes
  if (currentStateLookups.providerNotes) {
    warnings.push(`Provider notes: ${currentStateLookups.providerNotes}`);
  }

  if (currentStateLookups.ambiguityHints && currentStateLookups.ambiguityHints.length > 0) {
    warnings.push(...currentStateLookups.ambiguityHints);
  }

  return {
    requestId: contract.requestId,
    workflowIntent: contract.workflowIntent,
    continuityIntent: contract.continuityIntent,
    patient: patientResolution,
    visit: visitResolution,
    caseResolution,
    correction: correctionResolution,
    ambiguity: ambiguityResolution,
    readiness,
    interactionMode,
    warnings,
    summary,
  };
}
