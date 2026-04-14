import type {
  ApiConversationChoiceMapEntry,
  ApiConversationInteraction,
  ApiConversationRequiredUserInput,
  ApiTerminalStatus,
} from '../../types/api.js';
import type { PreparedApiRequest } from '../../types/api.js';
import type { PreviewModel } from '../../types/preview.js';
import type { CaseResolutionCandidate, StateResolutionResult } from '../../types/resolution.js';
import type { WritePlan } from '../../types/write-plan.js';

export interface BuildConversationInteractionInput {
  request: PreparedApiRequest;
  resolution: StateResolutionResult;
  plan: WritePlan;
  preview: PreviewModel;
  terminalStatus: ApiTerminalStatus;
  requiresConfirmation: boolean;
}

const RECHECK_TEXT_FIELDS = [
  {
    field: 'confirmed_patient_id',
    label: 'Corrected patient ID',
    path: 'interactionInput.recheck.confirmedPatientId',
    required: true,
  },
] as const;

export function buildConversationInteraction(
  input: BuildConversationInteractionInput,
): ApiConversationInteraction {
  const {
    request,
    resolution,
    preview,
    terminalStatus,
    requiresConfirmation,
    plan,
  } = input;

  switch (terminalStatus) {
    case 'preview_pending_confirmation':
      return {
        mode: 'await_user_choice',
        uiKind: 'preview_confirmation',
        userMessage: buildPreviewConfirmationUserMessage(request, preview),
        assistantQuestion: '숫자만 입력해 주세요.\n1. 이대로 진행\n2. 종료',
        requiredUserInput: buildRequiredUserInput('preview_confirmation_choice', [
          { number: 1, label: '이대로 진행', value: 'confirm_and_execute' },
          { number: 2, label: '종료', value: 'cancel' },
        ]),
        choiceMap: [
          {
            number: 1,
            meaning: 'confirm_and_execute',
            label: '이대로 진행',
            nextTool: 'execute',
            requiresPreviewAfterChoice: false,
            requestPatch: {
              interactionInput: {
                confirmation: {
                  confirmed: true,
                },
              },
            },
          },
          {
            number: 2,
            meaning: 'cancel',
            label: '종료',
            nextTool: 'none',
            requiresPreviewAfterChoice: false,
          },
        ],
        nextStepType: requiresConfirmation
          ? 'preview_confirmation'
          : 'preview_again',
        mustPreviewBeforeExecute: true,
        previewInvalidatedByPayloadChange: true,
        executeAllowed: requiresConfirmation,
        executeLockedReason: requiresConfirmation
          ? ''
          : 'Execute remains locked until preview is current and execution-ready for this exact payload.',
      };

    case 'correction_required':
      if (resolution.correction.correctionType === 'same_date_conflict') {
        return {
          mode: 'await_user_choice',
          uiKind: 'correction_required',
          userMessage: resolution.summary.nextStepSummary,
          assistantQuestion:
            'Choose one number.\n1. Use the existing same-date visit and preview again\n2. Keep the new-visit stance and preview again\n3. Cancel',
          requiredUserInput: buildRequiredUserInput('same_date_correction_choice', [
            {
              number: 1,
              label: 'Use the existing same-date visit and preview again',
              value: 'use_existing_same_date_visit',
            },
            {
              number: 2,
              label: 'Keep the new-visit stance and preview again',
              value: 'keep_new_visit_stance',
            },
            {
              number: 3,
              label: 'Cancel',
              value: 'cancel',
            },
          ]),
          choiceMap: [
            {
              number: 1,
              meaning: 'use_existing_same_date_visit',
              label: 'Use the existing same-date visit and preview again',
              nextTool: 'preview',
              requiresPreviewAfterChoice: true,
              requestPatch: {
                interactionInput: {
                  correction: {
                    doctorConfirmedCorrection: true,
                  },
                },
              },
            },
            {
              number: 2,
              meaning: 'keep_new_visit_stance',
              label: 'Keep the new-visit stance and preview again',
              nextTool: 'preview',
              requiresPreviewAfterChoice: true,
              requestPatch: {
                interactionInput: {
                  correction: {
                    doctorConfirmedCorrection: false,
                  },
                },
              },
            },
            {
              number: 3,
              meaning: 'cancel',
              label: 'Cancel',
              nextTool: 'none',
              requiresPreviewAfterChoice: false,
            },
          ],
          nextStepType: 'correction_required',
          mustPreviewBeforeExecute: true,
          previewInvalidatedByPayloadChange: true,
          executeAllowed: false,
          executeLockedReason:
            'Execute is locked until the correction choice is applied and a fresh preview succeeds.',
        };
      }

      return {
        mode: 'await_user_choice',
        uiKind: 'correction_required',
        userMessage: resolution.summary.nextStepSummary,
        assistantQuestion:
          'This correction type does not have an automatic patch path in the current runtime.\n1. Revise the payload manually, then preview again\n2. Cancel',
        requiredUserInput: buildRequiredUserInput('manual_correction_choice', [
          {
            number: 1,
            label: 'Revise manually, then preview again',
            value: 'manual_revision_required',
          },
          {
            number: 2,
            label: 'Cancel',
            value: 'cancel',
          },
        ]),
        choiceMap: [
          {
            number: 1,
            meaning: 'manual_revision_required',
            label: 'Revise manually, then preview again',
            nextTool: 'preview',
            requiresPreviewAfterChoice: true,
          },
          {
            number: 2,
            meaning: 'cancel',
            label: 'Cancel',
            nextTool: 'none',
            requiresPreviewAfterChoice: false,
          },
        ],
        nextStepType: 'correction_required',
        mustPreviewBeforeExecute: true,
        previewInvalidatedByPayloadChange: true,
        executeAllowed: false,
        executeLockedReason:
          'Execute is locked because this correction path is not auto-patchable in the current runtime.',
      };

    case 'recheck_required':
      return {
        mode: 'await_user_choice',
        uiKind: 'recheck_required',
        userMessage: resolution.summary.nextStepSummary,
        assistantQuestion:
          'Choose one number.\n1. Provide the corrected patient ID and preview again\n2. Revise manually and preview again\n3. Cancel',
        requiredUserInput: {
          type: 'single_number_choice_with_text',
          field: 'recheck_action',
          prompt:
            'Choose a number. If you choose 1, also provide the corrected patient ID.',
          choices: [
            {
              number: 1,
              label: 'Provide corrected patient ID and preview again',
              value: 'provide_corrected_patient_id',
            },
            {
              number: 2,
              label: 'Revise manually and preview again',
              value: 'revise_manually',
            },
            {
              number: 3,
              label: 'Cancel',
              value: 'cancel',
            },
          ],
          textFields: [...RECHECK_TEXT_FIELDS],
        },
        choiceMap: [
          {
            number: 1,
            meaning: 'provide_corrected_patient_id',
            label: 'Provide corrected patient ID and preview again',
            nextTool: 'preview',
            requiresPreviewAfterChoice: true,
            requestPatch: {
              interactionInput: {
                recheck: {
                  existingPatientClaim: true,
                },
              },
            },
            requiresTextInput: [...RECHECK_TEXT_FIELDS],
          },
          {
            number: 2,
            meaning: 'revise_manually',
            label: 'Revise manually and preview again',
            nextTool: 'preview',
            requiresPreviewAfterChoice: true,
          },
          {
            number: 3,
            meaning: 'cancel',
            label: 'Cancel',
            nextTool: 'none',
            requiresPreviewAfterChoice: false,
          },
        ],
        nextStepType: 'recheck_required',
        mustPreviewBeforeExecute: true,
        previewInvalidatedByPayloadChange: true,
        executeAllowed: false,
        executeLockedReason:
          'Execute is locked until the corrected patient ID is applied and a fresh preview succeeds.',
      };

    case 'hard_stop':
      if (hasCaseCandidateSelectionPath(resolution)) {
        return buildCaseCandidateSelectionInteraction(resolution);
      }
      return buildInformationalInteraction(
        'hard_stop',
        buildHardStopUserMessage(resolution),
        buildHardStopAssistantQuestion(resolution),
        'blocked',
      );

    case 'blocked_before_write':
      return buildInformationalInteraction(
        'blocked_before_write',
        plan.warnings[0] ?? resolution.summary.nextStepSummary,
        'The plan is blocked before write. Unsupported or unverified content must be revised before previewing again.',
        'blocked',
      );

    case 'execution_failed':
      return buildInformationalInteraction(
        'execution_failed',
        'Execution failed. Inspect the execution result before retrying.',
        'Retry only after reviewing the failed execution state.',
        'execution_failed',
      );

    case 'no_op':
      return {
        mode: 'terminal',
        uiKind: 'no_op',
        userMessage: 'snapshot 달라진 내용이 없어, 샌더를 종료합니다.',
        assistantQuestion: '',
        requiredUserInput: null,
        choiceMap: [],
        nextStepType: 'no_op',
        mustPreviewBeforeExecute: true,
        previewInvalidatedByPayloadChange: true,
        executeAllowed: false,
        executeLockedReason: '실행할 변경 사항이 없어 여기서 종료합니다.',
      };

    case 'executed':
      return buildInformationalInteraction(
        'executed',
        'Execution completed from the confirmed preview.',
        'The current payload has already been executed.',
        'executed',
      );
  }
}

function buildCaseCandidateSelectionInteraction(
  resolution: StateResolutionResult,
): ApiConversationInteraction {
  const toothNumber = resolution.caseResolution.toothNumber ?? '';
  const candidates = resolution.caseResolution.candidateCases ?? [];
  const candidateChoices = candidates
    .filter((candidate) => candidate.resolvedCaseId)
    .map((candidate, index) => ({
      number: index + 1,
      meaning: `select_case_${candidate.resolvedCaseId}`,
      label: buildCaseCandidateChoiceLabel(candidate, index),
      nextTool: 'preview' as const,
      requiresPreviewAfterChoice: true,
      requestPatch: {
        interactionInput: {
          caseSelection: {
            toothNumber,
            selectedCaseId: candidate.resolvedCaseId!,
          },
        },
      },
    }));

  const cancelChoice = {
    number: candidateChoices.length + 1,
    meaning: 'cancel',
    label: '종료',
    nextTool: 'none' as const,
    requiresPreviewAfterChoice: false,
  };

  return {
    mode: 'await_user_choice',
    uiKind: 'correction_required',
    userMessage: buildHardStopUserMessage(resolution),
    assistantQuestion: [
      '계속할 case를 숫자로 선택해 주세요.',
      ...candidateChoices.map((choice) => `${choice.number}. ${choice.label}`),
      `${cancelChoice.number}. ${cancelChoice.label}`,
    ].join('\n'),
    requiredUserInput: buildRequiredUserInput('case_candidate_selection_choice', [
      ...candidateChoices.map((choice) => ({
        number: choice.number,
        label: choice.label,
        value: choice.meaning,
      })),
      {
        number: cancelChoice.number,
        label: cancelChoice.label,
        value: cancelChoice.meaning,
      },
    ]),
    choiceMap: [...candidateChoices, cancelChoice],
    nextStepType: 'correction_required',
    mustPreviewBeforeExecute: true,
    previewInvalidatedByPayloadChange: true,
    executeAllowed: false,
    executeLockedReason:
      'Execute is locked until one candidate case is selected and a fresh preview succeeds.',
  };
}

function buildPreviewConfirmationUserMessage(
  request: PreparedApiRequest,
  preview: PreviewModel,
): string {
  if (request.contract.workflowIntent === 'existing_visit_update') {
    return '기존 방문 업데이트 preview입니다. 이 내용대로 적용할까요?';
  }

  return preview.message;
}

function buildRequiredUserInput(
  field: string,
  choices: ApiConversationRequiredUserInput['choices'],
): ApiConversationRequiredUserInput {
  const requiredInput: ApiConversationRequiredUserInput = {
    type: 'single_number_choice',
    field,
    prompt: 'Choose one number.',
  };

  if (choices) {
    requiredInput.choices = choices;
  }

  return requiredInput;
}

function buildInformationalInteraction(
  uiKind: ApiConversationInteraction['uiKind'],
  userMessage: string,
  assistantQuestion: string,
  nextStepType: ApiConversationInteraction['nextStepType'],
): ApiConversationInteraction {
  return {
    mode: uiKind === 'executed' ? 'terminal' : 'inform',
    uiKind,
    userMessage,
    assistantQuestion,
    requiredUserInput: null,
    choiceMap: [],
    nextStepType,
    mustPreviewBeforeExecute: true,
    previewInvalidatedByPayloadChange: true,
    executeAllowed: false,
    executeLockedReason: 'Execute is not available in this state.',
  };
}

function buildHardStopUserMessage(
  resolution: StateResolutionResult,
): string {
  if (
    resolution.caseResolution.status === 'unresolved_case_ambiguity' &&
    (resolution.caseResolution.candidateCases?.length ?? 0) > 1
  ) {
    const toothLabel = resolution.caseResolution.toothNumber
      ? ` tooth ${resolution.caseResolution.toothNumber}`
      : '';
    return `Multiple existing case candidates were found for${toothLabel}. Review the candidate list in the preview before retrying.`;
  }

  return resolution.summary.nextStepSummary;
}

function buildHardStopAssistantQuestion(
  resolution: StateResolutionResult,
): string {
  if (
    resolution.caseResolution.status === 'unresolved_case_ambiguity' &&
    (resolution.caseResolution.candidateCases?.length ?? 0) > 1
  ) {
    return 'Select the intended case in the payload or revise the continuity intent, then preview again.';
  }

  return 'No safe next step is available. Revise the payload manually if needed.';
}

function hasCaseCandidateSelectionPath(
  resolution: StateResolutionResult,
): boolean {
  return (
    resolution.caseResolution.status === 'unresolved_case_ambiguity' &&
    (resolution.caseResolution.candidateCases?.filter((candidate) => candidate.resolvedCaseId).length ?? 0) > 1
  );
}

function buildCaseCandidateChoiceLabel(
  candidate: CaseResolutionCandidate,
  index: number,
): string {
  const parts = [
    `후보 ${index + 1}`,
    candidate.episodeStatus ? candidate.episodeStatus : '',
    candidate.episodeStartDate ? `start ${candidate.episodeStartDate}` : '',
    candidate.latestVisitDate ? `latest ${candidate.latestVisitDate}` : '',
  ].filter(Boolean);

  return candidate.summaryHint
    ? `${parts.join(' / ')} / ${candidate.summaryHint}`
    : parts.join(' / ');
}
