import type { PreparedApiRequest } from '../../types/api.js';
import type { WritePlan } from '../../types/write-plan.js';
import { executeWritePlan } from '../../execution/index.js';

export async function executeConfirmedPlan(
  request: PreparedApiRequest,
  plan: WritePlan,
) {
  return executeWritePlan({
    plan,
    provider: request.provider,
    dryRun: request.dryRun,
  });
}
