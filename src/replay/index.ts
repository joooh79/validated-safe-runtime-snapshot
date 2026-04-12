import type { WritePlan } from '../types/write-plan.js';
import type { ExecutionResult } from '../types/execution.js';
import type { ReplayEngine, FailedPlanRecord, ReplayResult } from '../types/replay.js';

/**
 * Replay Engine Interfaces
 *
 * Manages safe replay of failed/incomplete write plans.
 * Ensures duplicate-safe behavior during retry/replay.
 */

export interface ReplayStore {
  saveFailedPlan(planId: string, record: FailedPlanRecord): Promise<void>;
  getPlan(planId: string): Promise<FailedPlanRecord | null>;
  listPlansForRequest(requestId: string): Promise<FailedPlanRecord[]>;
  deletePlan(planId: string): Promise<void>;
}

export interface ReplayManager extends ReplayEngine {}

