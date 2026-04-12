import { executeWritePlan } from '../../execution/index.js';
export async function executeConfirmedPlan(request, plan) {
    return executeWritePlan({
        plan,
        provider: request.provider,
        dryRun: request.dryRun,
    });
}
