import type { ApiOrchestrator, ApiOrchestratorConfig } from '../types/api.js';

/**
 * API Orchestration Layer
 *
 * Main entry point for the rebuilt sender.
 * Orchestrates the full workflow:
 * parse -> resolve -> plan -> preview -> confirm -> execute
 *
 * Preserves:
 * - preview-first discipline (cannot be bypassed)
 * - current-state-based decision discipline
 * - full traceability through logging layer
 * - duplicate-safe replay support
 * - correction and recheck flows
 */

export type { ApiOrchestrator, ApiOrchestratorConfig } from '../types/api.js';
export type {
  ApiOrchestrationRequest,
  ApiOrchestrationResponse,
  ApiTerminalStatus,
  ApiProviderConfig,
  ApiInteractionInput,
  PreparedApiRequest,
} from '../types/api.js';

export interface ApiOrchestratorFactory {
  create(config: ApiOrchestratorConfig): ApiOrchestrator;
}

export { orchestrateRequest } from './orchestrateRequest.js';
export { normalizeRequest } from './steps/normalizeRequest.js';
export { runResolution } from './steps/runResolution.js';
export { buildPlan } from './steps/buildPlan.js';
export { buildPreview } from './steps/buildPreview.js';
export { enforceInteractionMode } from './steps/enforceInteractionMode.js';
export { executeConfirmedPlan } from './steps/executeConfirmedPlan.js';
export { buildTerminalResponse, buildErrorResponse } from './steps/buildTerminalResponse.js';

export {
  apiFixture_safeNewVisitPreviewRequest,
  apiFixture_safeNewVisitConfirmRequest,
  apiFixture_sameDateCorrectionRequiredRequest,
  apiFixture_patientRecheckRequiredRequest,
  apiFixture_duplicateSuspicionRequest,
  apiFixture_hardStopRequest,
  apiFixture_noOpRequest,
  apiFixture_blockedUnsupportedMappingRequest,
  apiFixtureRequests,
} from './__fixtures__/exampleRequests.js';
export { runApiOrchestrationExamples } from './__fixtures__/runExamples.js';
