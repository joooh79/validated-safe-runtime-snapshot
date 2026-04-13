import type {
  ApiOrchestrationResponse,
  ApiPlanSummaryView,
  ApiState,
  ApiTerminalStatus,
  PreparedApiRequest,
} from '../../types/api.js';
import type { InteractionMode, ReadinessStatus } from '../../types/core.js';
import type { ExecutionResult } from '../../types/execution.js';
import type { PreviewModel } from '../../types/preview.js';
import type { StateResolutionResult } from '../../types/resolution.js';
import type { WritePlan } from '../../types/write-plan.js';
import { buildReadablePreview } from './buildReadablePreview.js';
import { buildConversationInteraction } from './buildConversationInteraction.js';

export interface BuildTerminalResponseInput {
  request: PreparedApiRequest;
  resolution: StateResolutionResult;
  plan: WritePlan;
  preview: PreviewModel;
  interactionMode: InteractionMode;
  terminalStatus: ApiTerminalStatus;
  executionResult?: ExecutionResult;
  success?: boolean;
}

export function buildTerminalResponse(
  input: BuildTerminalResponseInput,
): ApiOrchestrationResponse {
  const {
    request,
    resolution,
    plan,
    preview,
    interactionMode,
    terminalStatus,
    executionResult,
    success = true,
  } = input;
  const requiresConfirmation =
    interactionMode === 'preview_confirmation' &&
    plan.readiness === 'execution_ready';

  const response: ApiOrchestrationResponse = {
    requestId: request.requestId,
    success,
    apiState: getApiState(terminalStatus),
    terminalStatus,
    interactionMode,
    readiness: getReadinessValue(resolution, plan),
    preview,
    resolution,
    resolutionSummary: resolution.summary,
    plan,
    planSummary: buildPlanSummary(plan),
    readablePreview: buildReadablePreview(request, preview, plan),
    interaction: buildConversationInteraction({
      request,
      resolution,
      plan,
      preview,
      terminalStatus,
      requiresConfirmation,
    }),
    didWrite: computeDidWrite(executionResult),
    warnings: [...resolution.warnings, ...plan.warnings],
    nextStepHint: getNextStepHint(terminalStatus, interactionMode, request.confirmed),
    message: getMessage(terminalStatus, resolution, executionResult),
    confirmed: request.confirmed,
    requiresConfirmation,
  };

  if (executionResult) {
    response.executionResult = executionResult;
  }

  return response;
}

export function buildErrorResponse(
  requestId: string,
  message: string,
  details?: unknown,
): ApiOrchestrationResponse {
  return {
    requestId,
    success: false,
    apiState: 'failed',
    terminalStatus: 'hard_stop',
    interactionMode: 'hard_stop',
    readiness: 'blocked_unresolved',
    didWrite: false,
    warnings: [],
    nextStepHint: 'Fix the request input and try again.',
    message,
    confirmed: false,
    requiresConfirmation: false,
    interaction: {
      mode: 'inform',
      uiKind: 'hard_stop',
      userMessage: message,
      assistantQuestion:
        'Fix the request input and preview again. No execute step is available from this error state.',
      requiredUserInput: null,
      choiceMap: [],
      nextStepType: 'blocked',
      mustPreviewBeforeExecute: true,
      previewInvalidatedByPayloadChange: true,
      executeAllowed: false,
      executeLockedReason: 'Execute is not available when the request failed validation.',
    },
    error: {
      code: 'api_orchestration_error',
      message,
      details,
    },
  };
}

function buildPlanSummary(plan: WritePlan): ApiPlanSummaryView {
  return {
    planId: plan.planId,
    readiness: plan.readiness,
    actionTypes: plan.actions.map((action) => action.actionType),
    actionCount: plan.actions.length,
    previewNextStep: plan.preview.nextStep,
  };
}

function getApiState(terminalStatus: ApiTerminalStatus): ApiState {
  switch (terminalStatus) {
    case 'preview_pending_confirmation':
      return 'preview_ready';
    case 'executed':
    case 'execution_failed':
      return 'execution_complete';
    case 'correction_required':
    case 'recheck_required':
    case 'hard_stop':
    case 'blocked_before_write':
      return 'blocked';
    case 'no_op':
      return 'planned';
    default:
      return 'failed';
  }
}

function getReadinessValue(
  resolution: StateResolutionResult,
  plan: WritePlan,
): ReadinessStatus | WritePlan['readiness'] {
  if (plan.readiness === 'execution_ready') {
    return plan.readiness;
  }

  if (plan.readiness === 'preview_only') {
    return plan.readiness;
  }

  return resolution.readiness;
}

function computeDidWrite(executionResult?: ExecutionResult): boolean {
  if (!executionResult) {
    return false;
  }

  return (
    Object.keys(executionResult.createdRefs).length +
      Object.keys(executionResult.updatedRefs).length >
    0
  );
}

function getNextStepHint(
  terminalStatus: ApiTerminalStatus,
  interactionMode: InteractionMode,
  confirmed: boolean,
): string {
  switch (terminalStatus) {
    case 'preview_pending_confirmation':
      return confirmed
        ? 'Confirmation was present, but execution is still waiting on an execution-ready plan.'
        : 'Review the preview and confirm before execution.';
    case 'correction_required':
      return 'Submit the required correction and regenerate preview.';
    case 'recheck_required':
      return 'Provide the required recheck input and regenerate preview.';
    case 'hard_stop':
      return 'No write occurred. Revise the request before retrying.';
    case 'blocked_before_write':
      return 'Execution was blocked before write. Review unsupported or unverified plan content.';
    case 'no_op':
      return 'No write is needed unless the request changes materially.';
    case 'execution_failed':
      return 'Inspect the execution result before retrying or replaying.';
    case 'executed':
      return 'Execution completed from the confirmed preview.';
    default:
      return interactionMode;
  }
}

function getMessage(
  terminalStatus: ApiTerminalStatus,
  resolution: StateResolutionResult,
  executionResult?: ExecutionResult,
): string {
  switch (terminalStatus) {
    case 'preview_pending_confirmation':
      return 'Preview generated successfully. Explicit confirmation is still required before execution.';
    case 'correction_required':
    case 'recheck_required':
    case 'hard_stop':
      return resolution.summary.nextStepSummary;
    case 'blocked_before_write':
    case 'execution_failed':
    case 'executed':
      return executionResult?.summary || resolution.summary.nextStepSummary;
    case 'no_op':
      return 'No meaningful write was planned. The request completed without provider writes.';
    default:
      return 'API orchestration completed.';
  }
}
