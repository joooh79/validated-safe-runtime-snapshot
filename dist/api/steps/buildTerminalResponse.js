import { buildReadablePreview } from './buildReadablePreview.js';
import { buildConversationInteraction } from './buildConversationInteraction.js';
import { buildDisplay } from './buildDisplay.js';
export function buildTerminalResponse(input) {
    const { request, resolution, plan, preview, interactionMode, terminalStatus, executionResult, success = true, } = input;
    const requiresConfirmation = interactionMode === 'preview_confirmation' &&
        plan.readiness === 'execution_ready';
    const warnings = buildResponseWarnings(resolution, plan, executionResult);
    const readablePreview = buildReadablePreview(request, preview, plan);
    const interaction = buildConversationInteraction({
        request,
        resolution,
        plan,
        preview,
        terminalStatus,
        requiresConfirmation,
    });
    const response = {
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
        readablePreview,
        interaction,
        didWrite: computeDidWrite(executionResult),
        warnings,
        nextStepHint: getNextStepHint(terminalStatus, interactionMode, request.confirmed),
        message: getMessage(terminalStatus, resolution, executionResult),
        confirmed: request.confirmed,
        requiresConfirmation,
    };
    response.display = buildDisplay({
        request,
        preview,
        plan,
        readablePreview,
        interaction,
        message: response.message,
        warnings: response.warnings,
        requiresConfirmation,
    });
    if (executionResult) {
        response.executionResult = executionResult;
    }
    return response;
}
export function buildErrorResponse(requestId, message, details) {
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
            assistantQuestion: 'Fix the request input and preview again. No execute step is available from this error state.',
            requiredUserInput: null,
            choiceMap: [],
            nextStepType: 'blocked',
            mustPreviewBeforeExecute: true,
            previewInvalidatedByPayloadChange: true,
            executeAllowed: false,
            executeLockedReason: 'Execute is not available when the request failed validation.',
        },
        display: {
            title: 'Request Failed',
            message,
            patient: {
                label: 'Patient',
                value: '',
                details: [],
                input_fields: [],
                representative_fields: [],
            },
            visit: {
                label: 'Visit',
                value: '',
                details: [],
                input_fields: [],
                representative_fields: [],
            },
            case: {
                label: 'Case',
                value: '',
                details: [],
                input_fields: [],
                representative_fields: [],
            },
            findings: [],
            warnings: [],
            interaction: {
                userMessage: message,
                assistantQuestion: 'Fix the request input and preview again. No execute step is available from this error state.',
                requiredUserInput: null,
                numeric_choices: [],
            },
            executionState: {
                executeAllowed: false,
                executeLockedReason: 'Execute is not available when the request failed validation.',
                nextTool: null,
                nextStepType: 'blocked',
                nextStep: null,
                requiresConfirmation: false,
            },
        },
        error: {
            code: 'api_orchestration_error',
            message,
            details,
        },
    };
}
function buildPlanSummary(plan) {
    return {
        planId: plan.planId,
        readiness: plan.readiness,
        actionTypes: plan.actions.map((action) => action.actionType),
        actionCount: plan.actions.length,
        previewNextStep: plan.preview.nextStep,
    };
}
function getApiState(terminalStatus) {
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
function getReadinessValue(resolution, plan) {
    if (plan.readiness === 'execution_ready') {
        return plan.readiness;
    }
    if (plan.readiness === 'preview_only') {
        return plan.readiness;
    }
    return resolution.readiness;
}
function computeDidWrite(executionResult) {
    if (!executionResult) {
        return false;
    }
    return (Object.keys(executionResult.createdRefs).length +
        Object.keys(executionResult.updatedRefs).length >
        0);
}
function getNextStepHint(terminalStatus, interactionMode, confirmed) {
    switch (terminalStatus) {
        case 'preview_pending_confirmation':
            return confirmed
                ? '같은 payload의 확인된 미리보기에서만 실행할 수 있습니다.'
                : '미리보기를 확인한 뒤 1번으로 실행하거나 2번으로 종료하세요.';
        case 'correction_required':
            return 'Submit the required correction and regenerate preview.';
        case 'recheck_required':
            return 'Provide the required recheck input and regenerate preview.';
        case 'hard_stop':
            return 'No write occurred. Revise the request before retrying.';
        case 'blocked_before_write':
            return 'Execution was blocked before write. Review unsupported or unverified plan content.';
        case 'no_op':
            return 'snapshot 달라진 내용이 없어 여기서 종료합니다.';
        case 'execution_failed':
            return 'Inspect the execution result before retrying or replaying.';
        case 'executed':
            return 'Execution completed from the confirmed preview.';
        default:
            return interactionMode;
    }
}
function getMessage(terminalStatus, resolution, executionResult) {
    const executionFailureDetail = extractExecutionFailureDetail(executionResult);
    switch (terminalStatus) {
        case 'preview_pending_confirmation':
            return '미리보기가 준비되었습니다. 1. 이대로 진행 / 2. 종료 중에서 선택하세요.';
        case 'correction_required':
        case 'recheck_required':
        case 'hard_stop':
            return resolution.summary.nextStepSummary;
        case 'blocked_before_write':
        case 'executed':
            return executionResult?.summary || resolution.summary.nextStepSummary;
        case 'execution_failed':
            return executionFailureDetail
                ? `${executionResult?.summary || 'Execution failed.'} [Error: ${executionFailureDetail}]`
                : executionResult?.summary || resolution.summary.nextStepSummary;
        case 'no_op':
            return 'snapshot 달라진 내용이 없어, 샌더를 종료합니다.';
        default:
            return 'API orchestration completed.';
    }
}
function buildResponseWarnings(resolution, plan, executionResult) {
    const warnings = [...resolution.warnings, ...plan.warnings];
    const executionFailureDetail = extractExecutionFailureDetail(executionResult);
    if (executionFailureDetail) {
        warnings.push(`Execution error: ${executionFailureDetail}`);
    }
    return warnings;
}
function extractExecutionFailureDetail(executionResult) {
    if (!executionResult) {
        return undefined;
    }
    const failedAction = executionResult.actionResults.find((actionResult) => actionResult.status === 'failed' && actionResult.errorMessage);
    if (!failedAction?.errorMessage) {
        return undefined;
    }
    return `${failedAction.actionType}: ${failedAction.errorMessage}`;
}
