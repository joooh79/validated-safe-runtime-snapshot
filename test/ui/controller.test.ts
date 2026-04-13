import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyNumericChoice,
  buildExecuteRequest,
  deriveExecutionGate,
  sanitizeWorkingRequest,
  type UiConversationState,
} from '../../src/ui/controller.js';
import { apiFixture_safeNewVisitPreviewRequest } from '../../src/api/__fixtures__/exampleRequests.js';

test('confirmation is ignored for preview freshness but added for execute requests', () => {
  const workingRequest = sanitizeWorkingRequest({
    ...apiFixture_safeNewVisitPreviewRequest,
    interactionInput: {
      confirmation: {
        confirmed: true,
      },
    },
  });

  assert.equal(workingRequest.interactionInput?.confirmation?.confirmed, false);

  const executeRequest = buildExecuteRequest(workingRequest);
  assert.equal(executeRequest.interactionInput?.confirmation?.confirmed, true);
});

test('deriveExecutionGate marks preview stale after a material payload change', () => {
  const previewedRequest = sanitizeWorkingRequest(apiFixture_safeNewVisitPreviewRequest);
  const changedRequest = sanitizeWorkingRequest({
    ...apiFixture_safeNewVisitPreviewRequest,
    normalizedContract: {
      ...apiFixture_safeNewVisitPreviewRequest.normalizedContract!,
      visitContext: {
        ...apiFixture_safeNewVisitPreviewRequest.normalizedContract!.visitContext,
        chiefComplaint: 'Changed after preview',
      },
    },
  });

  const state: UiConversationState = {
    workingRequest: changedRequest,
    lastPreviewedRequest: previewedRequest,
    latestPreviewResponse: {
      requestId: 'req-1',
      success: true,
      apiState: 'preview_ready',
      terminalStatus: 'preview_pending_confirmation',
      interactionMode: 'preview_confirmation',
      readiness: 'execution_ready',
      didWrite: false,
      warnings: [],
      nextStepHint: 'Review the preview and confirm before execution.',
      message: 'Preview generated successfully.',
      confirmed: false,
      requiresConfirmation: true,
    },
    latestExecuteResponse: null,
  };

  const gate = deriveExecutionGate(state);
  assert.equal(gate.previewState, 'preview_stale_due_to_payload_change');
  assert.equal(gate.executeAllowed, false);
});

test('same-date correction choice patches the payload and forces preview again', () => {
  const workingRequest = sanitizeWorkingRequest(apiFixture_safeNewVisitPreviewRequest);
  const outcome = applyNumericChoice(
    {
      workingRequest,
      lastPreviewedRequest: workingRequest,
      latestPreviewResponse: {
        requestId: 'req-correction',
        success: true,
        apiState: 'blocked',
        terminalStatus: 'correction_required',
        interactionMode: 'correction_required',
        readiness: 'blocked_requires_correction',
        didWrite: false,
        warnings: [],
        nextStepHint: 'Submit the required correction and regenerate preview.',
        message: 'Correction required.',
        confirmed: false,
        requiresConfirmation: false,
        resolution: {
          correction: {
            correctionNeeded: true,
            correctionType: 'same_date_conflict',
            reasons: [],
          },
        } as any,
      },
      latestExecuteResponse: null,
    },
    1,
  );

  assert.equal(outcome.effect, 'preview');
  assert.equal(
    outcome.nextWorkingRequest?.interactionInput?.correction?.doctorConfirmedCorrection,
    true,
  );
  assert.equal(
    outcome.nextWorkingRequest?.interactionInput?.confirmation?.confirmed,
    undefined,
  );
});

test('recheck choice patches only the minimal supported patient confirmation input', () => {
  const workingRequest = sanitizeWorkingRequest(apiFixture_safeNewVisitPreviewRequest);
  const outcome = applyNumericChoice(
    {
      workingRequest,
      lastPreviewedRequest: workingRequest,
      latestPreviewResponse: {
        requestId: 'req-recheck',
        success: true,
        apiState: 'blocked',
        terminalStatus: 'recheck_required',
        interactionMode: 'recheck_required',
        readiness: 'blocked_requires_recheck',
        didWrite: false,
        warnings: [],
        nextStepHint: 'Provide the required recheck input and regenerate preview.',
        message: 'Recheck required.',
        confirmed: false,
        requiresConfirmation: false,
      },
      latestExecuteResponse: null,
    },
    1,
    {
      textInput: 'pat_confirmed_001',
    },
  );

  assert.equal(outcome.effect, 'preview');
  assert.deepEqual(outcome.nextWorkingRequest?.interactionInput?.recheck, {
    confirmedPatientId: 'pat_confirmed_001',
    existingPatientClaim: true,
  });
});
