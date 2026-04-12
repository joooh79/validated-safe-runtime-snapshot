import type {
  ApiOrchestrationRequest,
  PreparedApiRequest,
} from '../../types/api.js';
import type { NormalizedContract } from '../../types/contract.js';
import { isContractInputValid, isNormalizedContractValid } from '../../contract/guards.js';
import { createEmptyLookupBundle } from '../../resolution/index.js';
import {
  createAirtableProvider,
  createDryRunAirtableProvider,
  createMockAirtableProvider,
} from '../../providers/airtable/index.js';

export async function normalizeRequest(
  request: ApiOrchestrationRequest,
): Promise<PreparedApiRequest> {
  const contract = await materializeContract(request);
  const finalRequestId = request.requestId ?? contract.requestId;
  const normalized = cloneContract(contract);

  if (normalized.requestId !== finalRequestId) {
    normalized.requestId = finalRequestId;
    normalized.warnings.push(
      'API orchestration aligned requestId with the outer request envelope.',
    );
  }

  applyInteractionInput(normalized, request);

  const validation = isNormalizedContractValid(normalized);
  if (!validation.valid) {
    throw new Error(
      `Normalized contract invalid: ${validation.errors
        .map((error) => `${error.field}: ${error.reason}`)
        .join(' | ')}`,
    );
  }

  if (validation.warnings.length > 0) {
    normalized.warnings.push(
      ...validation.warnings.map((warning) => `${warning.field}: ${warning.reason}`),
    );
  }

  const prepared: PreparedApiRequest = {
    requestId: finalRequestId,
    contract: normalized,
    lookupBundle: request.lookupBundle ?? createEmptyLookupBundle(),
    provider: resolveProvider(request),
    confirmed: request.interactionInput?.confirmation?.confirmed ?? false,
    dryRun: request.dryRun ?? request.providerConfig?.mode === 'dryrun',
  };

  if (request.metadata) {
    prepared.metadata = request.metadata;
  }

  return prepared;
}

async function materializeContract(
  request: ApiOrchestrationRequest,
): Promise<NormalizedContract> {
  if (request.normalizedContract) {
    return cloneContract(request.normalizedContract);
  }

  if (!request.contractInput) {
    throw new Error(
      'Orchestration request requires either normalizedContract or contractInput.',
    );
  }

  if (!isContractInputValid(request.contractInput)) {
    throw new Error('Contract input is invalid for orchestration.');
  }

  if (!request.contractParser) {
    throw new Error(
      'contractParser is required when orchestration receives raw contract input.',
    );
  }

  return cloneContract(await request.contractParser.parse(request.contractInput));
}

function applyInteractionInput(
  contract: NormalizedContract,
  request: ApiOrchestrationRequest,
): void {
  const correctionInput = request.interactionInput?.correction;
  const recheckInput = request.interactionInput?.recheck;

  if (correctionInput && 'doctorConfirmedCorrection' in correctionInput) {
    contract.visitContext.doctorConfirmedCorrection =
      correctionInput.doctorConfirmedCorrection;
  }

  if (recheckInput?.confirmedPatientId) {
    contract.patientClues.patientId = recheckInput.confirmedPatientId;
    contract.patientClues.existingPatientClaim =
      recheckInput.existingPatientClaim ?? true;
    contract.patientClues.newPatientClaim = false;
  } else if (
    recheckInput &&
    'existingPatientClaim' in recheckInput &&
    recheckInput.existingPatientClaim !== undefined
  ) {
    contract.patientClues.existingPatientClaim =
      recheckInput.existingPatientClaim;
  }
}

function resolveProvider(request: ApiOrchestrationRequest) {
  if (request.provider) {
    return request.provider;
  }

  const config = request.providerConfig;
  if (!config || config.mode === 'dryrun') {
    return createDryRunAirtableProvider();
  }

  if (config.mode === 'mock') {
    return createMockAirtableProvider();
  }

  if (config.mode === 'real') {
    if (!config.baseId || !config.apiToken) {
      throw new Error(
        'Real Airtable provider config requires baseId and apiToken.',
      );
    }

    return createAirtableProvider({
      baseId: config.baseId,
      apiToken: config.apiToken,
      requestExecutor: 'real',
    });
  }

  return createDryRunAirtableProvider();
}

function cloneContract(contract: NormalizedContract): NormalizedContract {
  const findingsContext: NormalizedContract['findingsContext'] = {
    ...contract.findingsContext,
    toothItems: contract.findingsContext.toothItems.map((item) => ({
      ...item,
      branches: item.branches.map((branch) => ({
        ...branch,
        payload: { ...branch.payload },
      })),
    })),
  };

  if (contract.findingsContext.findingsPresent) {
    findingsContext.findingsPresent = {
      ...contract.findingsContext.findingsPresent,
    };
  }

  return {
    ...contract,
    patientClues: { ...contract.patientClues },
    visitContext: { ...contract.visitContext },
    findingsContext,
    warnings: [...contract.warnings],
  };
}
