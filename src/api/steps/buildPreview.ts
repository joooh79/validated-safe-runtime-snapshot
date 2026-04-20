import type { InteractionMode } from '../../types/core.js';
import type { PreviewModel, PreviewNextStep } from '../../types/preview.js';
import type { StateResolutionResult } from '../../types/resolution.js';
import type { WritePlan } from '../../types/write-plan.js';

export function buildPreview(
  resolution: StateResolutionResult,
  plan: WritePlan,
  interactionMode: InteractionMode,
): PreviewModel {
  return {
    interactionMode,
    title: getPreviewTitle(interactionMode),
    message: getPreviewMessage(interactionMode, resolution, plan),
    patientBlock: {
      label: 'Patient',
      value: plan.preview.patientAction,
      details: resolution.patient.reasons,
    },
    visitBlock: {
      label: 'Visit',
      value: plan.preview.visitAction,
      details: resolution.visit.reasons,
    },
    caseBlock: {
      label: 'Case',
      value: plan.preview.caseAction,
      details: resolution.caseResolution.reasons,
    },
    snapshotBlocks: plan.preview.snapshotActions.map((snapshot) => ({
      label: `Snapshot ${snapshot.branch}`,
      value: `${snapshot.action} snapshot for tooth ${snapshot.toothNumber}`,
    })),
    warnings: plan.warnings,
    allowedNextSteps: getAllowedNextSteps(interactionMode),
  };
}

function getPreviewTitle(interactionMode: InteractionMode): string {
  switch (interactionMode) {
    case 'preview_confirmation':
      return 'Preview Ready';
    case 'correction_required':
      return 'Correction Required';
    case 'recheck_required':
      return 'Recheck Required';
    case 'hard_stop':
      return 'Hard Stop';
    case 'inform_no_op':
      return 'No Meaningful Change';
    default:
      return 'Preview';
  }
}

function getPreviewMessage(
  interactionMode: InteractionMode,
  resolution: StateResolutionResult,
  plan: WritePlan,
): string {
  if (interactionMode === 'inform_no_op') {
    return 'No meaningful write was planned. No provider write will occur.';
  }

  if (interactionMode === 'preview_confirmation') {
    return 'Preview generated from the actual write plan. Explicit confirmation is required before execution.';
  }

  return resolution.summary.nextStepSummary || plan.preview.nextStep;
}

function getAllowedNextSteps(
  interactionMode: InteractionMode,
): PreviewNextStep[] {
  switch (interactionMode) {
    case 'preview_confirmation':
      return ['confirm_send', 'revise_and_preview_again', 'cancel'];
    case 'correction_required':
      return ['submit_correction', 'cancel'];
    case 'recheck_required':
      return ['submit_recheck', 'cancel'];
    case 'inform_no_op':
      return ['revise_and_preview_again', 'cancel'];
    case 'hard_stop':
    default:
      return ['cancel'];
  }
}
