export type EntityType = 'patient' | 'visit' | 'case' | 'snapshot' | 'link' | 'system';

export type SnapshotBranch = 'PRE' | 'RAD' | 'OP' | 'DX' | 'PLAN' | 'DR';

export type WorkflowIntent =
  | 'new_patient_new_visit'
  | 'existing_patient_new_visit'
  | 'existing_visit_update'
  | 'unknown';

export type ContinuityIntent =
  | 'create_case'
  | 'continue_case'
  | 'close_case'
  | 'split_case'
  | 'none'
  | 'unknown';

export type ReadinessStatus =
  | 'ready_for_write_plan'
  | 'blocked_requires_correction'
  | 'blocked_requires_recheck'
  | 'blocked_hard_stop'
  | 'blocked_unresolved';

export type InteractionMode =
  | 'preview_confirmation'
  | 'correction_required'
  | 'recheck_required'
  | 'hard_stop'
  | 'inform_no_op';

export type ExecutionStatus =
  | 'success'
  | 'partial_success'
  | 'blocked_before_write'
  | 'failed_after_partial_write'
  | 'failed_before_any_write'
  | 'no_op';

export type TargetMode = 'create_new' | 'update_existing' | 'attach_existing' | 'no_op';
