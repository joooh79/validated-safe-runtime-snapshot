import type { ExecutionResult } from './execution.js';
import type { WritePlan } from './write-plan.js';

/**
 * Replay Engine Types
 *
 * Supports safe replay and retry of failed/incomplete write plans.
 * Replay preserves:
 * - duplicate-safe behavior
 * - partial completion state
 * - failed action tracking
 * - replay eligibility determination
 */

export type ReplayReason =
  | 'partial_success'
  | 'failed_before_write'
  | 'failed_after_partial'
  | 'manual_retry'
  | 'timeout'
  | 'network_error'
  | 'other';

export interface ReplayEligibilityAssessment {
  eligible: boolean;
  reason: string;
  duplicationRisk: 'low' | 'moderate' | 'high';
  expectedBehavior: string;
}

export interface FailedPlanRecord {
  /** ID of the failed plan */
  planId: string;
  /** Request that generated this plan */
  requestId: string;
  /** Input hash for idempotence verification */
  inputHash?: string;
  /** Original plan that failed */
  originalPlan: WritePlan;
  /** Execution result showing partial/failed state */
  failureState: ExecutionResult;
  /** Reason for failure */
  failureReason: ReplayReason;
  /** Timestamp of original execution attempt */
  failedAtTimestamp: string;
  /** Actions that succeeded */
  completedActionIds: string[];
  /** Actions that failed */
  failedActionIds: string[];
  /** Actions that were skipped */
  skippedActionIds: string[];
  /** Created entity references from partial success */
  createdRefs: Record<string, string>;
  /** Updated entity references from partial success */
  updatedRefs: Record<string, string>;
  /** Whether replay is still safe to attempt */
  replayEligible: boolean;
  /** Notes on why replay might not be safe */
  replayBlockers?: string[];
  /** Number of times this plan has been replayed */
  replayCount: number;
  /** Maximum replay attempts allowed */
  maxReplayAttempts: number;
}

export interface ReplayPlan {
  /** ID for this replay execution */
  replayId: string;
  /** Reference to the original failed plan */
  originalPlanId: string;
  /** Reference to original request */
  originalRequestId: string;
  /** Modified plan for replay (may skip completed actions) */
  modifiedPlan: WritePlan;
  /** Reason this replay is being attempted */
  replayReason: ReplayReason;
  /** Actions to skip (they already succeeded) */
  actionsToSkip: string[];
  /** Actions to retry (they failed) */
  actionsToRetry: string[];
  /** State to resume from */
  resumeFromActionId?: string;
  /** Duplication risk at replay time */
  duplicationRisk: 'low' | 'moderate' | 'high';
  /** Assessment that enabled this replay */
  eligibilityAssessment: ReplayEligibilityAssessment;
  /** Timestamp of replay execution */
  replayAtTimestamp: string;
}

export interface ReplayResult {
  replayId: string;
  originalPlanId: string;
  status: 'success' | 'partial_success' | 'failed' | 'blocked';
  result: ExecutionResult;
  newlyCompletedActionIds: string[];
  remainingFailedActionIds: string[];
  summary: string;
  replayCanContinue: boolean;
  nextReplayDelay?: number; // milliseconds
}

export interface ReplayEngine {
  /** Store a failed plan for potential replay */
  recordFailedPlan(plan: WritePlan, failure: ExecutionResult, reason: ReplayReason): Promise<FailedPlanRecord>;

  /** Assess whether a plan can be safely replayed */
  assessReplayEligibility(planId: string): Promise<ReplayEligibilityAssessment>;

  /** Attempt to replay a recorded failed plan */
  replay(planId: string, reason: ReplayReason): Promise<ReplayResult>;

  /** Retrieve a recorded failed plan for inspection */
  getFailedPlan(planId: string): Promise<FailedPlanRecord | null>;

  /** List all recorded failed plans for a request */
  listFailedPlansForRequest(requestId: string): Promise<FailedPlanRecord[]>;

  /** Clean up old recorded plans (archival) */
  archiveOldPlans(olderThanDays: number): Promise<number>;
}

export interface ReplayEngineConfig {
  /** Enable or disable replay support */
  enabled: boolean;
  /** Max replay attempts per plan */
  maxReplayAttempts: number;
  /** Default delay before offering replay (ms) */
  delayBeforeReplayMs: number;
  /** Storage backend for failed plans */
  storageBackend: 'memory' | 'database' | 'custom';
  /** Duplication risk threshold (low/moderate/high) above which replay is blocked */
  maxAllowedDuplicationRisk: 'low' | 'moderate' | 'high';
  /** Enable automatic replay on network errors */
  autoRetryNetworkErrors: boolean;
}
