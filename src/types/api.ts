import type { InteractionMode, ReadinessStatus } from './core.js';
import type { ContractInput, NormalizedContract } from './contract.js';
import type { StateResolutionResult } from './resolution.js';
import type { WritePlan } from './write-plan.js';
import type { ExecutionResult } from './execution.js';
import type { PreviewModel } from './preview.js';
import type { DirectWriteProvider } from './provider.js';
import type { CurrentStateLookupBundle } from '../resolution/index.js';
import type { ContractParser } from '../contract/index.js';
import type { SnapshotBranch } from './core.js';

/**
 * API Orchestration Layer Types
 *
 * Orchestrates the full flow:
 * parse -> resolve -> preview -> confirm/correct/recheck -> execute
 *
 * Keeps business logic out of the transport layer.
 * Manages state through the full workflow lifecycle.
 */

export type ApiState =
  | 'received'
  | 'parsing'
  | 'parsed'
  | 'resolving'
  | 'resolved'
  | 'planning'
  | 'planned'
  | 'preview_ready'
  | 'preview_confirmed'
  | 'executing'
  | 'execution_complete'
  | 'failed'
  | 'blocked';

export interface ApiRequest {
  requestId: string;
  inputPayload: unknown;
  sourceSystem?: string;
  userContext?: {
    userId?: string;
    clinicId?: string;
    roleHint?: string;
  };
  metadata?: Record<string, unknown>;
}

export interface ApiResponse<T> {
  requestId: string;
  success: boolean;
  status: ApiState;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  preview?: PreviewModel;
  nextAllowedActions: string[];
}

export interface PreviewRequest {
  requestId: string;
  preview: PreviewModel;
  allowedActions: Array<'confirm_send' | 'revise_and_retry' | 'cancel' | 'submit_correction' | 'submit_recheck'>;
}

export interface CorrectionSubmission {
  requestId: string;
  correctionRequestId: string;
  correctionType: 'same_date_conflict' | 'patient_duplicate' | 'other';
  userDecision: 'proceed_with_new_visit' | 'proceed_with_update' | 'cancel';
  additionalContext?: Record<string, unknown>;
}

export interface RecheckSubmission {
  requestId: string;
  recheckRequestId: string;
  recheckType: 'patient_verification' | 'identity_confirmation' | 'other';
  verifiedClinicalContent?: Record<string, unknown>;
  confirmedPatientId?: string;
  additionalContext?: Record<string, unknown>;
}

export interface ExecutionConfirmation {
  requestId: string;
  planId: string;
  userConfirmed: boolean;
  confirmationTime: string;
}

export interface ApiOperationResult {
  requestId: string;
  success: boolean;
  state: ApiState;
  resolution?: StateResolutionResult;
  plan?: WritePlan;
  execution?: ExecutionResult;
  preview?: PreviewModel;
  message: string;
  blockingReasons?: string[];
}

export interface ApiWorkflowContext {
  requestId: string;
  currentState: ApiState;
  contract?: NormalizedContract;
  resolution?: StateResolutionResult;
  plan?: WritePlan;
  execution?: ExecutionResult;
  preview?: PreviewModel;
  startedAt: string;
  lastUpdatedAt: string;
  isBlocked: boolean;
  blockers: string[];
}

export interface ApiOrchestrator {
  /**
   * Accept an incoming request and begin orchestration
   */
  receiveRequest(request: ApiRequest): Promise<ApiResponse<ApiOperationResult>>;

  /**
   * Get the current state of a request being processed
   */
  getRequestState(requestId: string): Promise<ApiWorkflowContext>;

  /**
   * User confirms they want to send (after preview)
   */
  confirmExecution(confirmation: ExecutionConfirmation): Promise<ApiResponse<ApiOperationResult>>;

  /**
   * User provides correction input (e.g., resolving same-date conflict)
   */
  submitCorrection(correction: CorrectionSubmission): Promise<ApiResponse<ApiOperationResult>>;

  /**
   * User provides recheck input (e.g., confirming patient identity)
   */
  submitRecheck(recheck: RecheckSubmission): Promise<ApiResponse<ApiOperationResult>>;

  /**
   * User cancels a request
   */
  cancelRequest(requestId: string): Promise<ApiResponse<ApiOperationResult>>;

  /**
   * Retry a failed execution
   */
  retryExecution(requestId: string, reason?: string): Promise<ApiResponse<ApiOperationResult>>;

  /**
   * Manually trigger a correction flow (for admin/clinical review)
   */
  triggerCorrectionFlow(requestId: string, reason: string): Promise<ApiResponse<ApiOperationResult>>;

  /**
   * Manually trigger a recheck flow (for admin/clinical review)
   */
  triggerRecheckFlow(requestId: string, reason: string): Promise<ApiResponse<ApiOperationResult>>;
}

export interface ApiOrchestratorConfig {
  /** Enable preview-first behavior (cannot be bypassed) */
  previewFirstEnabled: boolean;
  /** Timeout for each phase (ms) */
  phaseTimeouts: {
    contractParseMs: number;
    resolutionMs: number;
    planningMs: number;
    executionMs: number;
    previewMs: number;
  };
  /** How long a preview session can remain active before expiring */
  previewSessionTtlMs: number;
  /** Enable automatic retry on certain errors */
  autoRetryEnabled: boolean;
  /** Max retries before manual intervention required */
  maxAutoRetries: number;
  /** Whether to allow bypass of blocked states */
  allowBlockBypassApproval: boolean;
}

export type ApiTerminalStatus =
  | 'preview_pending_confirmation'
  | 'correction_required'
  | 'recheck_required'
  | 'hard_stop'
  | 'no_op'
  | 'blocked_before_write'
  | 'executed'
  | 'execution_failed';

export interface ApiProviderConfig {
  kind: 'airtable';
  mode: 'dryrun' | 'mock' | 'real';
  baseId?: string;
  apiToken?: string;
  apiBaseUrl?: string;
}

export interface ApiInteractionInput {
  confirmation?: {
    confirmed: boolean;
  };
  correction?: {
    doctorConfirmedCorrection?: boolean | null;
  };
  recheck?: {
    confirmedPatientId?: string;
    existingPatientClaim?: boolean;
  };
}

export interface ApiPlanSummaryView {
  planId: string | null;
  readiness: WritePlan['readiness'] | null;
  actionTypes: Array<WritePlan['actions'][number]['actionType']>;
  actionCount: number;
  previewNextStep?: WritePlan['preview']['nextStep'];
}

export interface ApiRepresentativeFieldView {
  field: string;
  value: string;
}

export interface ApiReadableSummaryBlock {
  label: string;
  value: string;
  details: string[];
  representative_fields: ApiRepresentativeFieldView[];
  field_changes?: ApiReadableFieldChangeView[];
}

export interface ApiReadableFieldChangeView {
  field: string;
  status_label: '변경 없음' | '변경 예정' | '현재 확인불가' | '신규 행 생성 예정';
  before: string;
  incoming: string;
  after: string;
}

export interface ApiReadableFindingSummary {
  no: number;
  branch_code: SnapshotBranch;
  tooth_number: string;
  action: 'create' | 'update' | 'no_op';
  label: string;
  value: string;
  representative_fields: ApiRepresentativeFieldView[];
  field_changes: ApiReadableFieldChangeView[];
  entered_field_count: number;
}

export interface ApiReadablePreviewSummary {
  claim_label: string;
  patient_summary: ApiReadableSummaryBlock;
  visit_summary: ApiReadableSummaryBlock;
  case_summary: ApiReadableSummaryBlock;
  findings: ApiReadableFindingSummary[];
  warnings: string[];
}

export interface ApiDisplaySection {
  label: string;
  value: string;
  details: string[];
  input_fields: ApiRepresentativeFieldView[];
  representative_fields: ApiRepresentativeFieldView[];
}

export interface ApiDisplayFinding {
  no: number;
  branch_code: SnapshotBranch;
  tooth_number: string;
  action: 'create' | 'update' | 'no_op';
  label: string;
  value: string;
  input_fields: ApiRepresentativeFieldView[];
  representative_fields: ApiRepresentativeFieldView[];
  field_changes: ApiReadableFieldChangeView[];
  entered_field_count: number;
}

export interface ApiDisplayInteraction {
  userMessage: string;
  assistantQuestion: string;
  requiredUserInput: ApiConversationRequiredUserInput | null;
  numeric_choices: Array<{
    number: number;
    label: string;
    meaning: string;
    nextTool: string;
  }>;
}

export interface ApiDisplayExecutionState {
  executeAllowed: boolean;
  executeLockedReason: string;
  nextTool: string | null;
  nextStepType: ApiConversationInteraction['nextStepType'];
  nextStep: PreviewModel['allowedNextSteps'][number] | WritePlan['preview']['nextStep'] | null;
  requiresConfirmation: boolean;
}

export interface ApiDisplay {
  title: string;
  message: string;
  patient: ApiDisplaySection;
  visit: ApiDisplaySection;
  case: ApiDisplaySection;
  findings: ApiDisplayFinding[];
  warnings: string[];
  interaction: ApiDisplayInteraction;
  executionState: ApiDisplayExecutionState;
}

export interface ApiConversationChoiceValue {
  number: number;
  label: string;
  value: string;
}

export interface ApiConversationTextField {
  field: string;
  label: string;
  path: string;
  required: boolean;
}

export interface ApiConversationRequiredUserInput {
  type: 'single_number_choice' | 'single_number_choice_with_text' | 'text';
  field: string;
  prompt: string;
  choices?: ApiConversationChoiceValue[];
  textFields?: ApiConversationTextField[];
}

export interface ApiConversationChoiceMapEntry {
  number: number;
  meaning: string;
  label: string;
  nextTool: 'preview' | 'execute' | 'none';
  requiresPreviewAfterChoice: boolean;
  requestPatch?: {
    interactionInput?: ApiInteractionInput;
  };
  requiresTextInput?: ApiConversationTextField[];
}

export interface ApiConversationInteraction {
  mode: 'await_user_choice' | 'inform' | 'terminal';
  uiKind:
    | 'preview_confirmation'
    | 'correction_required'
    | 'recheck_required'
    | 'hard_stop'
    | 'no_op'
    | 'blocked_before_write'
    | 'executed'
    | 'execution_failed';
  userMessage: string;
  assistantQuestion: string;
  requiredUserInput: ApiConversationRequiredUserInput | null;
  choiceMap: ApiConversationChoiceMapEntry[];
  nextStepType:
    | 'preview_confirmation'
    | 'preview_again'
    | 'correction_required'
    | 'recheck_required'
    | 'blocked'
    | 'no_op'
    | 'executed'
    | 'execution_failed';
  mustPreviewBeforeExecute: true;
  previewInvalidatedByPayloadChange: true;
  executeAllowed: boolean;
  executeLockedReason: string;
}

export interface ApiOrchestrationRequest {
  requestId?: string;
  normalizedContract?: NormalizedContract;
  contractInput?: ContractInput;
  contractParser?: ContractParser;
  lookupBundle?: CurrentStateLookupBundle;
  provider?: DirectWriteProvider;
  providerConfig?: ApiProviderConfig;
  interactionInput?: ApiInteractionInput;
  dryRun?: boolean;
  metadata?: Record<string, unknown>;
}

export interface PreparedApiRequest {
  requestId: string;
  contract: NormalizedContract;
  lookupBundle: CurrentStateLookupBundle;
  provider: DirectWriteProvider;
  confirmed: boolean;
  dryRun: boolean;
  metadata?: Record<string, unknown>;
}

export interface ApiOrchestrationResponse {
  requestId: string;
  success: boolean;
  apiState: ApiState;
  terminalStatus: ApiTerminalStatus;
  interactionMode: InteractionMode;
  readiness: ReadinessStatus | WritePlan['readiness'];
  preview?: PreviewModel;
  resolution?: StateResolutionResult;
  resolutionSummary?: StateResolutionResult['summary'];
  plan?: WritePlan;
  planSummary?: ApiPlanSummaryView;
  readablePreview?: ApiReadablePreviewSummary;
  interaction?: ApiConversationInteraction;
  display?: ApiDisplay;
  executionResult?: ExecutionResult;
  didWrite: boolean;
  warnings: string[];
  nextStepHint: string;
  message: string;
  confirmed: boolean;
  requiresConfirmation: boolean;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}
