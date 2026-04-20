import type {
  ApiOrchestrationRequest,
  ApiOrchestrationResponse,
  ApiTerminalStatus,
} from '../types/api.js';
import { normalizeRequest } from './steps/normalizeRequest.js';
import { runResolution } from './steps/runResolution.js';
import { buildPlan } from './steps/buildPlan.js';
import { enforceInteractionMode } from './steps/enforceInteractionMode.js';
import { buildPreview } from './steps/buildPreview.js';
import { executeConfirmedPlan } from './steps/executeConfirmedPlan.js';
import {
  buildErrorResponse,
  buildTerminalResponse,
} from './steps/buildTerminalResponse.js';

export async function orchestrateRequest(
  request: ApiOrchestrationRequest,
): Promise<ApiOrchestrationResponse> {
  const fallbackRequestId =
    request.requestId ??
    request.normalizedContract?.requestId ??
    request.contractInput?.requestId ??
    'request_id_missing';

  try {
    const prepared = await normalizeRequest(request);
    const resolution = await runResolution(prepared);
    const plan = await buildPlan(prepared, resolution);
    let interactionMode = enforceInteractionMode(resolution, plan);
    let preview = buildPreview(resolution, plan, interactionMode);

    if (
      plan.readiness === 'blocked' &&
      resolution.interactionMode === 'preview_confirmation'
    ) {
      interactionMode = 'hard_stop';
      preview = buildPreview(resolution, plan, interactionMode);

      return buildTerminalResponse({
        request: prepared,
        resolution,
        plan,
        preview,
        interactionMode,
        terminalStatus: 'blocked_before_write',
      });
    }

    if (interactionMode === 'correction_required') {
      return buildTerminalResponse({
        request: prepared,
        resolution,
        plan,
        preview,
        interactionMode,
        terminalStatus: 'correction_required',
      });
    }

    if (interactionMode === 'recheck_required') {
      return buildTerminalResponse({
        request: prepared,
        resolution,
        plan,
        preview,
        interactionMode,
        terminalStatus: 'recheck_required',
      });
    }

    if (interactionMode === 'hard_stop') {
      return buildTerminalResponse({
        request: prepared,
        resolution,
        plan,
        preview,
        interactionMode,
        terminalStatus: 'hard_stop',
      });
    }

    if (interactionMode === 'inform_no_op') {
      return buildTerminalResponse({
        request: prepared,
        resolution,
        plan,
        preview,
        interactionMode,
        terminalStatus: 'no_op',
      });
    }

    if (!prepared.confirmed) {
      return buildTerminalResponse({
        request: prepared,
        resolution,
        plan,
        preview,
        interactionMode,
        terminalStatus: 'preview_pending_confirmation',
      });
    }

    if (plan.readiness !== 'execution_ready') {
      const terminalStatus: ApiTerminalStatus =
        plan.readiness === 'preview_only' ? 'no_op' : 'blocked_before_write';

      return buildTerminalResponse({
        request: prepared,
        resolution,
        plan,
        preview,
        interactionMode,
        terminalStatus,
      });
    }

    const executionResult = await executeConfirmedPlan(prepared, plan);
    const terminalStatus = mapExecutionToTerminalStatus(executionResult.status);

    return buildTerminalResponse({
      request: prepared,
      resolution,
      plan,
      preview,
      interactionMode,
      terminalStatus,
      executionResult,
    });
  } catch (error) {
    return buildErrorResponse(
      fallbackRequestId,
      error instanceof Error ? error.message : String(error),
      error,
    );
  }
}

function mapExecutionToTerminalStatus(
  executionStatus: string,
): ApiTerminalStatus {
  switch (executionStatus) {
    case 'success':
      return 'executed';
    case 'no_op':
      return 'no_op';
    case 'blocked_before_write':
      return 'blocked_before_write';
    default:
      return 'execution_failed';
  }
}
