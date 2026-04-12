import type { ActionExecutionResult } from './execution.js';
import type { WriteAction } from './write-plan.js';
import type { WritePlan } from './write-plan.js';

export interface ProviderExecutionContext {
  requestId: string;
  planId: string;
  resolvedRefs: Record<string, string>;
  dryRun?: boolean;
}

export interface ProviderPlanPreflightResult {
  ok: boolean;
  reason?: string;
  blockedActionIds?: string[];
}

export interface DirectWriteProvider {
  executeAction(action: WriteAction, ctx: ProviderExecutionContext): Promise<ActionExecutionResult>;
  preflightPlan?(
    plan: WritePlan,
    ctx: ProviderExecutionContext,
  ): Promise<ProviderPlanPreflightResult>;
}
