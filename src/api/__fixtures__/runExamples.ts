import { orchestrateRequest } from '../orchestrateRequest.js';
import { apiFixtureRequests } from './exampleRequests.js';

export async function runApiOrchestrationExamples() {
  const results = [];

  for (const fixture of apiFixtureRequests) {
    const response = await orchestrateRequest(fixture.request);
    results.push({
      name: fixture.name,
      requestId: response.requestId,
      terminalStatus: response.terminalStatus,
      interactionMode: response.interactionMode,
      didWrite: response.didWrite,
    });
  }

  return results;
}
