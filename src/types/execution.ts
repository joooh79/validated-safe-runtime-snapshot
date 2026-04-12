import type { ExecutionStatus } from './core.js';
import type { WriteAction } from './write-plan.js';

export interface ActionExecutionResult {
  actionId: string;
  actionType: WriteAction['actionType'];
  status: 'success' | 'failed' | 'skipped' | 'no_op';
  providerRef?: string;
  providerResponseFragment?: unknown;
  errorMessage?: string;
}

export interface ExecutionResult {
  planId: string;
  requestId: string;
  status: ExecutionStatus;
  actionResults: ActionExecutionResult[];
  completedActionIds: string[];
  failedActionIds: string[];
  skippedActionIds: string[];
  createdRefs: Record<string, string>;
  updatedRefs: Record<string, string>;
  replayEligible: boolean;
  summary: string;
}
