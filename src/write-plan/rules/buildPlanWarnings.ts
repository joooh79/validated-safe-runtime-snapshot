/**
 * Build plan-level warnings from resolution state
 *
 * Requirements:
 * - preserve resolution warnings
 * - add plan-specific warnings
 * - mark blocked reads clearly
 * - flag ambiguity
 * - flag high-risk actions
 */

import type { StateResolutionResult } from '../../types/resolution.js';
import type { WriteAction } from '../../types/write-plan.js';

export function buildPlanWarnings(
  resolution: StateResolutionResult,
  actions: WriteAction[],
): string[] {
  const warnings: string[] = [...resolution.warnings];

  // Add plan-specific warnings based on resolution state

  // Correction needed
  if (
    resolution.readiness === 'blocked_requires_correction' ||
    resolution.correction.correctionNeeded
  ) {
    warnings.push('⚠️ Correction required before write plan can be executed.');
  }

  // Recheck needed
  if (resolution.readiness === 'blocked_requires_recheck') {
    warnings.push('⚠️ Patient recheck required before write plan can be executed.');
  }

  // Hard stop
  if (resolution.readiness === 'blocked_hard_stop') {
    warnings.push(
      '🛑 Hard stop: write plan execution is blocked due to unresolvable conflict.',
    );
  }

  // Unresolved ambiguity
  if (resolution.ambiguity.hasAmbiguity) {
    warnings.push(
      `⚠️ Ambiguity detected: ${resolution.ambiguity.ambiguityTypes.join(', ')}`,
    );
  }

  // High-risk patient actions
  const patientAction = actions.find((a) => a.entityType === 'patient');
  if (patientAction?.safety.highRiskIdentityAction) {
    warnings.push(
      'ℹ️ Patient action is high-risk identity operation; verify patient details.',
    );
  }

  // No executable actions
  if (
    actions.length === 0 ||
    actions.every((a) => a.actionType.startsWith('no_op'))
  ) {
    warnings.push('ℹ️ No executable actions in plan (all no-op).');
  }

  return warnings;
}
