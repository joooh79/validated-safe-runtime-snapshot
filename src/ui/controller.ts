import type {
  ApiOrchestrationRequest,
  ApiOrchestrationResponse,
} from '../types/api.js';

export interface UiConversationState {
  workingRequest: ApiOrchestrationRequest | null;
  lastPreviewedRequest: ApiOrchestrationRequest | null;
  latestPreviewResponse: ApiOrchestrationResponse | null;
  latestExecuteResponse: ApiOrchestrationResponse | null;
}

export interface UiExecutionGate {
  previewState:
    | 'no_preview_yet'
    | 'preview_stale_due_to_payload_change'
    | 'correction_required'
    | 'recheck_required'
    | 'hard_stop'
    | 'no_op'
    | 'preview_ready'
    | 'execute_allowed'
    | 'executed';
  previewCurrent: boolean;
  executeAllowed: boolean;
  reason: string;
}

export interface UiChoiceOutcome {
  effect:
    | 'execute'
    | 'preview'
    | 'edit'
    | 'reset'
    | 'manual_edit_required'
    | 'needs_text_input';
  nextWorkingRequest: ApiOrchestrationRequest | null;
  executeRequest?: ApiOrchestrationRequest;
  message?: string;
}

export function sanitizeWorkingRequest(
  request: ApiOrchestrationRequest,
): ApiOrchestrationRequest {
  const sanitized: ApiOrchestrationRequest = deepClone(request);

  if (sanitized.interactionInput?.confirmation) {
    sanitized.interactionInput = {
      ...sanitized.interactionInput,
      confirmation: {
        confirmed: false,
      },
    };
  }

  return sanitized;
}

export function buildExecuteRequest(
  workingRequest: ApiOrchestrationRequest,
): ApiOrchestrationRequest {
  const executeRequest = deepClone(sanitizeWorkingRequest(workingRequest));
  executeRequest.interactionInput = {
    ...executeRequest.interactionInput,
    confirmation: {
      confirmed: true,
    },
  };
  return executeRequest;
}

export function deriveExecutionGate(
  state: UiConversationState,
): UiExecutionGate {
  if (!state.workingRequest || !state.latestPreviewResponse || !state.lastPreviewedRequest) {
    return {
      previewState: 'no_preview_yet',
      previewCurrent: false,
      executeAllowed: false,
      reason: 'Preview is required before execution.',
    };
  }

  const previewCurrent =
    getPreviewIdentity(state.workingRequest) ===
    getPreviewIdentity(state.lastPreviewedRequest);

  if (!previewCurrent) {
    return {
      previewState: 'preview_stale_due_to_payload_change',
      previewCurrent: false,
      executeAllowed: false,
      reason: 'Payload changed after preview. Preview again before execution.',
    };
  }

  switch (state.latestPreviewResponse.terminalStatus) {
    case 'correction_required':
      return {
        previewState: 'correction_required',
        previewCurrent: true,
        executeAllowed: false,
        reason: 'A correction step is required before execution.',
      };
    case 'recheck_required':
      return {
        previewState: 'recheck_required',
        previewCurrent: true,
        executeAllowed: false,
        reason: 'A recheck step is required before execution.',
      };
    case 'hard_stop':
    case 'blocked_before_write':
    case 'execution_failed':
      return {
        previewState: 'hard_stop',
        previewCurrent: true,
        executeAllowed: false,
        reason: 'Execution is blocked for the current preview.',
      };
    case 'no_op':
      return {
        previewState: 'no_op',
        previewCurrent: true,
        executeAllowed: false,
        reason: 'No meaningful write is available for execution.',
      };
    case 'executed':
      return {
        previewState: 'executed',
        previewCurrent: true,
        executeAllowed: false,
        reason: 'This payload has already been executed.',
      };
    case 'preview_pending_confirmation': {
      const executeAllowed =
        state.latestPreviewResponse.requiresConfirmation === true &&
        state.latestPreviewResponse.success === true &&
        state.latestPreviewResponse.readiness === 'execution_ready';

      return {
        previewState: executeAllowed ? 'execute_allowed' : 'preview_ready',
        previewCurrent: true,
        executeAllowed,
        reason: executeAllowed
          ? 'Preview is current. Explicit confirmation can now execute.'
          : 'Preview is current, but execution is not available yet.',
      };
    }
    default:
      return {
        previewState: 'preview_ready',
        previewCurrent: true,
        executeAllowed: false,
        reason: 'Preview is current, but execution is not available yet.',
      };
  }
}

export function applyNumericChoice(
  state: UiConversationState,
  choiceNumber: number,
  options: {
    textInput?: string;
  } = {},
): UiChoiceOutcome {
  const workingRequest = state.workingRequest;
  const previewResponse = state.latestPreviewResponse;

  if (!workingRequest || !previewResponse) {
    return {
      effect: 'edit',
      nextWorkingRequest: workingRequest,
      message: 'Load or edit a request first.',
    };
  }

  switch (previewResponse.terminalStatus) {
    case 'preview_pending_confirmation':
      return handlePreviewReadyChoice(state, choiceNumber);
    case 'correction_required':
      return handleCorrectionChoice(workingRequest, previewResponse, choiceNumber);
    case 'recheck_required':
      return handleRecheckChoice(workingRequest, choiceNumber, options.textInput);
    case 'hard_stop':
    case 'blocked_before_write':
    case 'execution_failed':
    case 'no_op':
    case 'executed':
    default:
      if (choiceNumber === 1) {
        return {
          effect: 'edit',
          nextWorkingRequest: workingRequest,
          message: 'Edit the payload or load a different preset.',
        };
      }

      return {
        effect: 'reset',
        nextWorkingRequest: sanitizeWorkingRequest(workingRequest),
      };
  }
}

export function getPreviewIdentity(
  request: ApiOrchestrationRequest,
): string {
  return stableStringify(sanitizeWorkingRequest(request));
}

function handlePreviewReadyChoice(
  state: UiConversationState,
  choiceNumber: number,
): UiChoiceOutcome {
  const workingRequest = state.workingRequest;
  if (!workingRequest) {
    return {
      effect: 'edit',
      nextWorkingRequest: null,
    };
  }

  if (choiceNumber === 1) {
    const gate = deriveExecutionGate(state);
    if (!gate.executeAllowed) {
      return {
        effect: 'preview',
        nextWorkingRequest: sanitizeWorkingRequest(workingRequest),
        message: gate.reason,
      };
    }

    return {
      effect: 'execute',
      nextWorkingRequest: sanitizeWorkingRequest(workingRequest),
      executeRequest: buildExecuteRequest(workingRequest),
    };
  }

  if (choiceNumber === 2) {
    return {
      effect: 'edit',
      nextWorkingRequest: sanitizeWorkingRequest(workingRequest),
      message: 'Edit the payload. Preview will be required again after any change.',
    };
  }

  return {
    effect: 'reset',
    nextWorkingRequest: sanitizeWorkingRequest(workingRequest),
  };
}

function handleCorrectionChoice(
  workingRequest: ApiOrchestrationRequest,
  previewResponse: ApiOrchestrationResponse,
  choiceNumber: number,
): UiChoiceOutcome {
  const correctionType = previewResponse.resolution?.correction?.correctionType;

  if (correctionType === 'same_date_conflict') {
    if (choiceNumber === 1 || choiceNumber === 2) {
      const nextWorkingRequest = sanitizeWorkingRequest(workingRequest);
      nextWorkingRequest.interactionInput = {
        ...nextWorkingRequest.interactionInput,
        correction: {
          doctorConfirmedCorrection: choiceNumber === 1,
        },
      };

      return {
        effect: 'preview',
        nextWorkingRequest,
      };
    }

    return {
      effect: 'reset',
      nextWorkingRequest: sanitizeWorkingRequest(workingRequest),
    };
  }

  if (choiceNumber === 1) {
    return {
      effect: 'manual_edit_required',
      nextWorkingRequest: sanitizeWorkingRequest(workingRequest),
      message:
        'Automatic correction patching is not implemented for this correction type. Edit the payload manually and preview again.',
    };
  }

  return {
    effect: 'reset',
    nextWorkingRequest: sanitizeWorkingRequest(workingRequest),
  };
}

function handleRecheckChoice(
  workingRequest: ApiOrchestrationRequest,
  choiceNumber: number,
  textInput?: string,
): UiChoiceOutcome {
  if (choiceNumber === 1) {
    if (!textInput) {
      return {
        effect: 'needs_text_input',
        nextWorkingRequest: sanitizeWorkingRequest(workingRequest),
        message: 'A confirmed patient ID is required for this recheck step.',
      };
    }

    const nextWorkingRequest = sanitizeWorkingRequest(workingRequest);
    nextWorkingRequest.interactionInput = {
      ...nextWorkingRequest.interactionInput,
      recheck: {
        confirmedPatientId: textInput,
        existingPatientClaim: true,
      },
    };

    return {
      effect: 'preview',
      nextWorkingRequest,
    };
  }

  if (choiceNumber === 2) {
    return {
      effect: 'edit',
      nextWorkingRequest: sanitizeWorkingRequest(workingRequest),
      message: 'Edit the payload manually, then preview again.',
    };
  }

  return {
    effect: 'reset',
    nextWorkingRequest: sanitizeWorkingRequest(workingRequest),
  };
}

function stableStringify(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sortValue(item));
  }

  if (value && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = sortValue((value as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }

  return value;
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
