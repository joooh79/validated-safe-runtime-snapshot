import type {
  ApiOrchestrationRequest,
  PreparedApiRequest,
} from '../../types/api.js';
import type { NormalizedContract } from '../../types/contract.js';
import type { CurrentStateLookupBundle } from '../../resolution/index.js';
import type { SnapshotBranch } from '../../types/core.js';
import { isContractInputValid, isNormalizedContractValid } from '../../contract/guards.js';
import { createEmptyLookupBundle } from '../../resolution/index.js';
import {
  createAirtableProvider,
  createDryRunAirtableProvider,
  createMockAirtableProvider,
} from '../../providers/airtable/index.js';
import { enrichLookupBundle } from './enrichLookupBundle.js';

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
  applyWorkflowClaimDefaults(normalized);
  normalizeWorkflowIntentForVisitlessMutations(normalized);
  inferWorkflowIntent(normalized);
  normalizeFindingsPayloadKeys(normalized);

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

  const lookupBundle = cloneLookupBundle(
    request.lookupBundle ?? createEmptyLookupBundle(),
  );
  normalizeSnapshotLookupCurrentValues(lookupBundle);
  applyInteractionLookupPatch(lookupBundle, request);
  await enrichLookupBundle(request, normalized, lookupBundle);

  const prepared: PreparedApiRequest = {
    requestId: finalRequestId,
    contract: normalized,
    lookupBundle,
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
  const caseSelectionInput = request.interactionInput?.caseSelection;

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

  if (caseSelectionInput?.toothNumber) {
    const targetTooth = contract.findingsContext.toothItems.find(
      (item) => item.toothNumber === caseSelectionInput.toothNumber,
    );
    if (!targetTooth) {
      contract.warnings.push(
        `interactionInput.caseSelection tooth ${caseSelectionInput.toothNumber} was not present in findingsContext.`,
      );
    }
  }
}

function applyWorkflowClaimDefaults(
  contract: NormalizedContract,
): void {
  if (contract.workflowIntent !== 'new_patient_new_visit') {
    return;
  }

  if (
    contract.patientClues.newPatientClaim === undefined &&
    contract.patientClues.existingPatientClaim !== true
  ) {
    contract.patientClues.newPatientClaim = true;
    contract.patientClues.existingPatientClaim = false;
    return;
  }

  if (
    contract.patientClues.newPatientClaim === true &&
    contract.patientClues.existingPatientClaim === undefined
  ) {
    contract.patientClues.existingPatientClaim = false;
  }
}

function inferWorkflowIntent(contract: NormalizedContract): void {
  if (contract.workflowIntent !== 'unknown') {
    return;
  }

  const hasVisitContext =
    hasMeaningfulValue(contract.visitContext.visitDate) ||
    hasMeaningfulValue(contract.visitContext.targetVisitDate) ||
    hasMeaningfulValue(contract.visitContext.targetVisitId) ||
    hasMeaningfulValue(contract.visitContext.targetVisitClue) ||
    hasMeaningfulValue(contract.visitContext.visitType) ||
    hasMeaningfulValue(contract.visitContext.chiefComplaint);
  const hasFindings = contract.findingsContext.toothItems.length > 0;
  const hasPatientUpdateContent =
    hasMeaningfulValue(contract.patientClues.patientId) &&
    (hasMeaningfulValue(contract.patientClues.birthYear) ||
      hasMeaningfulValue(contract.patientClues.genderHint));
  const hasDirectCaseUpdate =
    !hasVisitContext &&
    !hasFindings &&
    hasMeaningfulValue(resolveDirectCaseUpdateCaseId(contract.caseUpdates));

  if (!hasVisitContext && !hasFindings && hasPatientUpdateContent) {
    contract.workflowIntent = 'patient_update';
    return;
  }

  if (hasDirectCaseUpdate) {
    contract.workflowIntent = 'case_update';
  }
}

function normalizeWorkflowIntentForVisitlessMutations(
  contract: NormalizedContract,
): void {
  const hasVisitContext =
    hasMeaningfulValue(contract.visitContext.visitDate) ||
    hasMeaningfulValue(contract.visitContext.targetVisitDate) ||
    hasMeaningfulValue(contract.visitContext.targetVisitId) ||
    hasMeaningfulValue(contract.visitContext.targetVisitClue) ||
    hasMeaningfulValue(contract.visitContext.visitType) ||
    hasMeaningfulValue(contract.visitContext.chiefComplaint);
  const hasFindings = contract.findingsContext.toothItems.length > 0;
  const hasPatientUpdateContent =
    hasMeaningfulValue(contract.patientClues.patientId) &&
    (hasMeaningfulValue(contract.patientClues.birthYear) ||
      hasMeaningfulValue(contract.patientClues.genderHint));
  const hasDirectCaseUpdate =
    hasMeaningfulValue(resolveDirectCaseUpdateCaseId(contract.caseUpdates));

  if (!hasVisitContext && !hasFindings && hasPatientUpdateContent) {
    if (contract.workflowIntent !== 'patient_update') {
      if (contract.workflowIntent !== 'unknown') {
        contract.warnings.push(
          `workflowIntent ${contract.workflowIntent} was normalized to patient_update because no visit or findings content was present.`,
        );
      }
      contract.workflowIntent = 'patient_update';
    }
    return;
  }

  if (!hasVisitContext && !hasFindings && hasDirectCaseUpdate) {
    if (contract.workflowIntent !== 'case_update') {
      if (contract.workflowIntent !== 'unknown') {
        contract.warnings.push(
          `workflowIntent ${contract.workflowIntent} was normalized to case_update because no visit or findings content was present.`,
        );
      }
      contract.workflowIntent = 'case_update';
    }
  }
}

function applyInteractionLookupPatch(
  lookupBundle: CurrentStateLookupBundle,
  request: ApiOrchestrationRequest,
): void {
  const recheckInput = request.interactionInput?.recheck;
  const caseSelectionInput = request.interactionInput?.caseSelection;

  if (recheckInput?.confirmedPatientId) {
    const currentLookup = lookupBundle.patientLookup;
    const patchedLookup: CurrentStateLookupBundle['patientLookup'] = {
      found: true,
      patientId: recheckInput.confirmedPatientId,
    };

    if (currentLookup.birthYear !== undefined) {
      patchedLookup.birthYear = currentLookup.birthYear;
    }

    if (currentLookup.gender !== undefined) {
      patchedLookup.gender = currentLookup.gender;
    }

    if (currentLookup.firstVisitDate !== undefined) {
      patchedLookup.firstVisitDate = currentLookup.firstVisitDate;
    }

    lookupBundle.patientLookup = patchedLookup;
  }

  if (!caseSelectionInput?.toothNumber || !caseSelectionInput.selectedCaseId) {
    return;
  }

  const candidateEntries = lookupBundle.caseCandidateLookups?.[caseSelectionInput.toothNumber];
  const selectedCandidate = candidateEntries?.find(
    (candidate) => candidate.caseId === caseSelectionInput.selectedCaseId,
  );

  if (!selectedCandidate) {
    lookupBundle.providerNotes = mergeProviderNotes(
      lookupBundle.providerNotes,
      `case selection ${caseSelectionInput.selectedCaseId} did not match any candidate for tooth ${caseSelectionInput.toothNumber}`,
    );
    return;
  }

  lookupBundle.caseLookups[caseSelectionInput.toothNumber] = {
    found: true,
    ...(selectedCandidate.caseId ? { caseId: selectedCandidate.caseId } : {}),
    ...(selectedCandidate.recordId ? { recordId: selectedCandidate.recordId } : {}),
    ...(selectedCandidate.toothNumber ? { toothNumber: selectedCandidate.toothNumber } : {}),
    ...(selectedCandidate.episodeIdentifier
      ? { episodeIdentifier: selectedCandidate.episodeIdentifier }
      : {}),
    ...(selectedCandidate.episodeStartDate
      ? { episodeStartDate: selectedCandidate.episodeStartDate }
      : {}),
    ...(selectedCandidate.latestVisitDate
      ? { latestVisitDate: selectedCandidate.latestVisitDate }
      : {}),
    ...(selectedCandidate.latestSummary
      ? { latestSummary: selectedCandidate.latestSummary }
      : {}),
    ...(selectedCandidate.status ? { status: selectedCandidate.status } : {}),
    reason: 'interaction_case_selection_applied',
  };

  lookupBundle.caseCandidateLookups = {
    ...(lookupBundle.caseCandidateLookups ?? {}),
    [caseSelectionInput.toothNumber]: [selectedCandidate],
  };
}

function mergeProviderNotes(
  existing: string | undefined,
  next: string,
): string {
  if (!existing) {
    return next;
  }

  return `${existing}; ${next}`;
}

function hasMeaningfulValue(value: unknown): boolean {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === 'string') {
    return value.trim().length > 0;
  }

  return true;
}

function resolveDirectCaseUpdateCaseId(
  caseUpdates: NormalizedContract['caseUpdates'],
): string | undefined {
  if (!caseUpdates) {
    return undefined;
  }

  const entries = Array.isArray(caseUpdates) ? caseUpdates : [caseUpdates];
  for (const entry of entries) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      continue;
    }

    if (typeof entry.caseId === 'string' && entry.caseId.trim()) {
      return entry.caseId.trim();
    }

    if (typeof entry['Case ID'] === 'string' && entry['Case ID'].trim()) {
      return entry['Case ID'].trim();
    }
  }

  return undefined;
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
        'Real Airtable mode requires AIRTABLE_BASE_ID and AIRTABLE_API_TOKEN on the server.',
      );
    }

    return createAirtableProvider({
      baseId: config.baseId,
      apiToken: config.apiToken,
      ...(config.apiBaseUrl ? { apiBaseUrl: config.apiBaseUrl } : {}),
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
    ...(contract.caseUpdates !== undefined
      ? {
          caseUpdates: Array.isArray(contract.caseUpdates)
            ? contract.caseUpdates.map((item) => ({ ...item }))
            : { ...contract.caseUpdates },
        }
      : {}),
    warnings: [...contract.warnings],
  };
}

function cloneLookupBundle(
  lookupBundle: CurrentStateLookupBundle,
): CurrentStateLookupBundle {
  const cloned: CurrentStateLookupBundle = {
    patientLookup: { ...lookupBundle.patientLookup },
    sameDateVisitLookup: { ...lookupBundle.sameDateVisitLookup },
    caseLookups: Object.fromEntries(
      Object.entries(lookupBundle.caseLookups).map(([key, value]) => [
        key,
        { ...value },
      ]),
    ),
  };

  if (lookupBundle.targetVisitLookup) {
    cloned.targetVisitLookup = { ...lookupBundle.targetVisitLookup };
  }

  if (lookupBundle.caseCandidateLookups) {
    cloned.caseCandidateLookups = Object.fromEntries(
      Object.entries(lookupBundle.caseCandidateLookups).map(([key, value]) => [
        key,
        value.map((candidate) => ({ ...candidate })),
      ]),
    );
  }

  if (lookupBundle.snapshotLookups) {
    const snapshotLookups = Object.fromEntries(
      Object.entries(lookupBundle.snapshotLookups).flatMap(([branch, records]) =>
        records
          ? [
              [
                branch,
                Object.fromEntries(
                  Object.entries(records).map(([tooth, record]) => [
                    tooth,
                    {
                      ...record,
                      ...(record.currentValues
                        ? { currentValues: { ...record.currentValues } }
                        : {}),
                    },
                  ]),
                ),
              ],
            ]
          : [],
      ),
    ) as NonNullable<CurrentStateLookupBundle['snapshotLookups']>;

    cloned.snapshotLookups = snapshotLookups;
  }

  if (lookupBundle.ambiguityHints) {
    cloned.ambiguityHints = [...lookupBundle.ambiguityHints];
  }

  if (lookupBundle.providerNotes) {
    cloned.providerNotes = lookupBundle.providerNotes;
  }

  return cloned;
}

function normalizeFindingsPayloadKeys(
  contract: NormalizedContract,
): void {
  for (const toothItem of contract.findingsContext.toothItems) {
    for (const branch of toothItem.branches) {
      branch.payload = normalizeBranchPayload(
        branch.branch,
        branch.payload ?? {},
      );
    }
  }
}

function normalizeBranchPayload(
  branch: SnapshotBranch,
  payload: Record<string, unknown>,
): Record<string, unknown> {
  const fieldMap = BRANCH_FIELD_KEY_MAP[branch];
  if (!fieldMap) {
    return { ...payload };
  }

  const normalized: Record<string, unknown> = { ...payload };

  for (const [rawKey, canonicalKey] of Object.entries(fieldMap)) {
    if (!(rawKey in payload) || canonicalKey in normalized) {
      continue;
    }

    normalized[canonicalKey] = normalizeBranchPayloadValue(
      branch,
      canonicalKey,
      payload[rawKey],
    );
  }

  return normalized;
}

function normalizeBranchPayloadValue(
  branch: SnapshotBranch,
  field: string,
  value: unknown,
): unknown {
  if (branch === 'PRE' && field === 'symptom' && Array.isArray(value)) {
    return value.length === 1 ? value[0] : value;
  }

  return value;
}

function normalizeSnapshotLookupCurrentValues(
  lookupBundle: CurrentStateLookupBundle,
): void {
  if (!lookupBundle.snapshotLookups) {
    return;
  }

  for (const [branch, records] of Object.entries(lookupBundle.snapshotLookups)) {
    if (!records) {
      continue;
    }

    for (const record of Object.values(records)) {
      if (!record) {
        continue;
      }

      if (record.currentValues) {
        record.currentValues = { ...record.currentValues };
        continue;
      }

      const rawFields = getSnapshotLookupRawFields(
        record as unknown as Record<string, unknown>,
      );
      if (!rawFields) {
        continue;
      }

      const currentValues = mapSnapshotRawFieldsToCurrentValues(
        branch as SnapshotBranch,
        rawFields,
      );

      if (Object.keys(currentValues).length > 0) {
        record.currentValues = currentValues;
      }
    }
  }
}

function getSnapshotLookupRawFields(
  record: Record<string, unknown>,
): Record<string, unknown> | null {
  const fields = record.fields ?? record.fieldValues;
  if (!fields || typeof fields !== 'object' || Array.isArray(fields)) {
    return null;
  }

  return fields as Record<string, unknown>;
}

function mapSnapshotRawFieldsToCurrentValues(
  branch: SnapshotBranch,
  rawFields: Record<string, unknown>,
): Record<string, unknown> {
  switch (branch) {
    case 'PRE': {
      const currentValues: Record<string, unknown> = {};

      if ('Symptom' in rawFields) {
        currentValues.symptom = rawFields.Symptom;
      }

      if ('Visible crack' in rawFields) {
        currentValues.visibleCrack = rawFields['Visible crack'];
      }

      return currentValues;
    }

    default:
      return {};
  }
}

const BRANCH_FIELD_KEY_MAP: Partial<Record<SnapshotBranch, Record<string, string>>> = {
  PRE: {
    Symptom: 'symptom',
    'Symptom reproducible': 'symptomReproducible',
    'Visible crack': 'visibleCrack',
    'Crack detection method': 'crackDetectionMethod',
  },
  PLAN: {
    'Pulp therapy': 'pulpTherapy',
    'Restoration design': 'restorationDesign',
    'Restoration material': 'restorationMaterial',
    'Implant placement': 'implantPlacement',
    'Scan file link': 'scanFileLink',
  },
  DR: {
    'Decision factor': 'decisionFactors',
    'Remaining cusp thickness decision': 'remainingCuspThicknessDecision',
    'Functional cusp involvement': 'functionalCuspInvolvement',
    'Crack progression risk': 'crackProgressionRisk',
    'Occlusal risk': 'occlusalRisk',
    'Reasoning notes': 'reasoningNotes',
  },
  DX: {
    'Structural diagnosis': 'structuralDiagnosis',
    'Pulp diagnosis': 'pulpDiagnosis',
    'Crack severity': 'crackSeverity',
    'Occlusion risk': 'occlusionRisk',
    Restorability: 'restorability',
  },
  RAD: {
    'Radiograph type': 'radiographType',
    'Radiographic caries depth': 'radiographicCariesDepth',
    'Secondary caries': 'secondaryCaries',
    'Caries location': 'cariesLocation',
    'Pulp chamber size': 'pulpChamberSize',
    'Periapical lesion': 'periapicalLesion',
    'Radiographic fracture sign': 'radiographicFractureSign',
    'Radiograph link': 'radiographLink',
  },
  OP: {
    'Rubber dam isolation': 'rubberDamIsolation',
    'Caries depth (actual)': 'cariesDepthActual',
    'Soft dentin remaining': 'softDentinRemaining',
    'Crack confirmed': 'crackConfirmed',
    'Crack location': 'crackLocation',
    'Remaining cusp thickness (mm)': 'remainingCuspThicknessMm',
    'Subgingival margin': 'subgingivalMargin',
    'Deep marginal elevation': 'deepMarginalElevation',
    'IDS/resin coating': 'idsResinCoating',
    'Resin core build up type': 'resinCoreBuildUpType',
    'Occlusal loading test': 'occlusalLoadingTest',
    'Loading test result': 'loadingTestResult',
    'Intraoral photo link': 'intraoralPhotoLink',
  },
};
