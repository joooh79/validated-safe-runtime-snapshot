import type { ContinuityIntent, InteractionMode, ReadinessStatus, WorkflowIntent } from './core.js';
import type { NormalizedContract } from './contract.js';
import type { StateResolutionResult } from './resolution.js';
import type { WritePlan } from './write-plan.js';
import type { ExecutionResult } from './execution.js';

/**
 * Logging and Inspection Layer
 *
 * Records the full lifecycle of a sender operation for:
 * - debugging
 * - auditability
 * - replay support
 * - behavior regression detection
 * - analytics / insights
 */

export interface ResolutionLogEntry {
  timestamp: string;
  requestId: string;
  inputHash?: string;
  contract: NormalizedContract;
  resolution: StateResolutionResult;
  processingTimeMs: number;
  decisionPath: string[];
  ambiguityFlags: string[];
}

export interface PlanLogEntry {
  timestamp: string;
  requestId: string;
  planId: string;
  resolution: StateResolutionResult;
  plan: WritePlan;
  processingTimeMs: number;
  actionCount: number;
  previewGeneratedAt: string;
}

export interface ExecutionLogEntry {
  timestamp: string;
  requestId: string;
  planId: string;
  plan: WritePlan;
  result: ExecutionResult;
  processingTimeMs: number;
  actionResultCount: number;
  providerCallCount: number;
  failureDetails?: string;
  replayRequired: boolean;
}

export interface ReplayLogEntry {
  timestamp: string;
  replayId: string;
  originalPlanId: string;
  originalRequestId: string;
  replayReason: 'partial_success' | 'failed_before_write' | 'failed_after_partial' | 'manual_retry' | 'other';
  originalState: {
    completedActionIds: string[];
    failedActionIds: string[];
    createdRefs: Record<string, string>;
  };
  result: ExecutionResult;
  processingTimeMs: number;
  duplicationRiskAssessment: string;
}

export interface InspectionSnapshot {
  /** Current moment of the snapshot */
  timestamp: string;
  /** Request being examined */
  requestId: string;
  /** Current phase: contract | resolution | planning | execution | completed */
  phase: 'contract' | 'resolution' | 'planning' | 'execution' | 'completed';
  /** Current state of resolution as of this moment */
  currentResolution?: StateResolutionResult;
  /** Current state of plan as of this moment */
  currentPlan?: WritePlan;
  /** Performance metrics collected so far */
  performanceMetrics: {
    contractParseMs?: number;
    resolutionMs?: number;
    planningMs?: number;
    executionMs?: number;
  };
  /** All warnings and blockers encountered */
  warnings: string[];
  blockers: string[];
}

export interface LoggingContext {
  requestId: string;
  tracingEnabled: boolean;
  auditLevel: 'minimal' | 'standard' | 'detailed';
}

export interface Logger {
  logResolution(entry: ResolutionLogEntry): Promise<void>;
  logPlan(entry: PlanLogEntry): Promise<void>;
  logExecution(entry: ExecutionLogEntry): Promise<void>;
  logReplay(entry: ReplayLogEntry): Promise<void>;
  snapshot(): Promise<InspectionSnapshot>;
}
