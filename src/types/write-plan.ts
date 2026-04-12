import type { EntityType, SnapshotBranch, TargetMode, ReadinessStatus } from './core.js';
import type { StateResolutionResult } from './resolution.js';

export type WriteActionType =
  | 'create_patient'
  | 'update_patient'
  | 'attach_existing_patient'
  | 'create_visit'
  | 'update_visit'
  // Reserved target-canon case action family.
  // Runtime activation remains intentionally blocked until the target Cases
  // table and related link model are migrated and verified.
  | 'create_case'
  | 'update_case_latest_synthesis'
  | 'close_case'
  | 'split_case'
  | 'create_snapshot'
  | 'update_snapshot'
  // Reserved explicit-link action family.
  // The validated runtime keeps these blocked until exact linked-record write
  // shape is canon-confirmed for the target schema.
  | 'link_snapshot_to_visit'
  | 'link_snapshot_to_case'
  | 'link_visit_to_patient'
  | 'link_visit_to_case'
  | 'log_execution_artifact'
  | 'no_op_patient'
  | 'no_op_visit'
  | 'no_op_case'
  | 'no_op_snapshot'
  | 'no_op_link';

export interface ActionTarget {
  entityRef?: string;
  patientId?: string;
  visitId?: string;
  visitDate?: string;
  // Present in the provider-neutral plan model so the repo can express the
  // future target Case-aware write surface without activating it yet.
  caseId?: string;
  episodeStartDate?: string;
  toothNumber?: string;
  branch?: SnapshotBranch;
  sourceResolutionPath?: string;
}

export interface PayloadIntent {
  intendedChanges: Record<string, unknown>;
  guardedFields: string[];
  omittedFieldsByRule?: string[];
  providerPayloadRef?: string;
}

export interface ActionSafety {
  duplicateSafe: boolean;
  replayEligibleIfFailed: boolean;
  highRiskIdentityAction?: boolean;
}

export interface WriteAction {
  actionId: string;
  actionOrder: number;
  actionType: WriteActionType;
  entityType: EntityType;
  targetMode: TargetMode;
  target: ActionTarget;
  payloadIntent: PayloadIntent | undefined;
  dependsOnActionIds: string[];
  blockers: string[];
  safety: ActionSafety;
  previewVisible: boolean;
}

export interface PlanPreviewSummary {
  patientAction: string;
  visitAction: string;
  caseAction: string;
  snapshotActions: Array<{
    toothNumber: string;
    branch: SnapshotBranch;
    action: 'create' | 'update' | 'no_op';
  }>;
  warnings: string[];
  nextStep:
    | 'confirm'
    | 'revise'
    | 'cancel'
    | 'correction_required'
    | 'recheck_required'
    | 'hard_stop'
    | 'inform_no_op';
}

export interface ReplayMetadata {
  replaySourcePlanId?: string;
  replayVersion?: number;
  safeResumePoints?: string[];
}

export interface WritePlan {
  planId: string;
  requestId: string;
  inputHash: string | null;
  resolution: StateResolutionResult;
  warnings: string[];
  readiness: 'execution_ready' | 'preview_only' | 'blocked';
  actions: WriteAction[];
  preview: PlanPreviewSummary;
  replay?: ReplayMetadata;
}
