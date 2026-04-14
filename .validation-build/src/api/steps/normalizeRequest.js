import { isContractInputValid, isNormalizedContractValid } from '../../contract/guards.js';
import { createEmptyLookupBundle } from '../../resolution/index.js';
import { createAirtableProvider, createDryRunAirtableProvider, createMockAirtableProvider, } from '../../providers/airtable/index.js';
export async function normalizeRequest(request) {
    const contract = await materializeContract(request);
    const finalRequestId = request.requestId ?? contract.requestId;
    const normalized = cloneContract(contract);
    if (normalized.requestId !== finalRequestId) {
        normalized.requestId = finalRequestId;
        normalized.warnings.push('API orchestration aligned requestId with the outer request envelope.');
    }
    applyInteractionInput(normalized, request);
    applyWorkflowClaimDefaults(normalized);
    normalizeFindingsPayloadKeys(normalized);
    const validation = isNormalizedContractValid(normalized);
    if (!validation.valid) {
        throw new Error(`Normalized contract invalid: ${validation.errors
            .map((error) => `${error.field}: ${error.reason}`)
            .join(' | ')}`);
    }
    if (validation.warnings.length > 0) {
        normalized.warnings.push(...validation.warnings.map((warning) => `${warning.field}: ${warning.reason}`));
    }
    const lookupBundle = cloneLookupBundle(request.lookupBundle ?? createEmptyLookupBundle());
    normalizeSnapshotLookupCurrentValues(lookupBundle);
    applyInteractionLookupPatch(lookupBundle, request);
    const prepared = {
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
async function materializeContract(request) {
    if (request.normalizedContract) {
        return cloneContract(request.normalizedContract);
    }
    if (!request.contractInput) {
        throw new Error('Orchestration request requires either normalizedContract or contractInput.');
    }
    if (!isContractInputValid(request.contractInput)) {
        throw new Error('Contract input is invalid for orchestration.');
    }
    if (!request.contractParser) {
        throw new Error('contractParser is required when orchestration receives raw contract input.');
    }
    return cloneContract(await request.contractParser.parse(request.contractInput));
}
function applyInteractionInput(contract, request) {
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
    }
    else if (recheckInput &&
        'existingPatientClaim' in recheckInput &&
        recheckInput.existingPatientClaim !== undefined) {
        contract.patientClues.existingPatientClaim =
            recheckInput.existingPatientClaim;
    }
}
function applyWorkflowClaimDefaults(contract) {
    if (contract.workflowIntent !== 'new_patient_new_visit') {
        return;
    }
    if (contract.patientClues.newPatientClaim === undefined &&
        contract.patientClues.existingPatientClaim !== true) {
        contract.patientClues.newPatientClaim = true;
        contract.patientClues.existingPatientClaim = false;
        return;
    }
    if (contract.patientClues.newPatientClaim === true &&
        contract.patientClues.existingPatientClaim === undefined) {
        contract.patientClues.existingPatientClaim = false;
    }
}
function applyInteractionLookupPatch(lookupBundle, request) {
    const recheckInput = request.interactionInput?.recheck;
    if (!recheckInput?.confirmedPatientId) {
        return;
    }
    const currentLookup = lookupBundle.patientLookup;
    const patchedLookup = {
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
function resolveProvider(request) {
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
            throw new Error('Real Airtable mode requires AIRTABLE_BASE_ID and AIRTABLE_API_TOKEN on the server.');
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
function cloneContract(contract) {
    const findingsContext = {
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
function cloneLookupBundle(lookupBundle) {
    const cloned = {
        patientLookup: { ...lookupBundle.patientLookup },
        sameDateVisitLookup: { ...lookupBundle.sameDateVisitLookup },
        caseLookups: Object.fromEntries(Object.entries(lookupBundle.caseLookups).map(([key, value]) => [
            key,
            { ...value },
        ])),
    };
    if (lookupBundle.targetVisitLookup) {
        cloned.targetVisitLookup = { ...lookupBundle.targetVisitLookup };
    }
    if (lookupBundle.snapshotLookups) {
        const snapshotLookups = Object.fromEntries(Object.entries(lookupBundle.snapshotLookups).flatMap(([branch, records]) => records
            ? [
                [
                    branch,
                    Object.fromEntries(Object.entries(records).map(([tooth, record]) => [
                        tooth,
                        {
                            ...record,
                            ...(record.currentValues
                                ? { currentValues: { ...record.currentValues } }
                                : {}),
                        },
                    ])),
                ],
            ]
            : []));
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
function normalizeFindingsPayloadKeys(contract) {
    for (const toothItem of contract.findingsContext.toothItems) {
        for (const branch of toothItem.branches) {
            branch.payload = normalizeBranchPayload(branch.branch, branch.payload ?? {});
        }
    }
}
function normalizeBranchPayload(branch, payload) {
    const fieldMap = BRANCH_FIELD_KEY_MAP[branch];
    if (!fieldMap) {
        return { ...payload };
    }
    const normalized = { ...payload };
    for (const [rawKey, canonicalKey] of Object.entries(fieldMap)) {
        if (!(rawKey in payload) || canonicalKey in normalized) {
            continue;
        }
        normalized[canonicalKey] = normalizeBranchPayloadValue(branch, canonicalKey, payload[rawKey]);
    }
    return normalized;
}
function normalizeBranchPayloadValue(branch, field, value) {
    if (branch === 'PRE' && field === 'symptom' && Array.isArray(value)) {
        return value.length === 1 ? value[0] : value;
    }
    return value;
}
function normalizeSnapshotLookupCurrentValues(lookupBundle) {
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
            const rawFields = getSnapshotLookupRawFields(record);
            if (!rawFields) {
                continue;
            }
            const currentValues = mapSnapshotRawFieldsToCurrentValues(branch, rawFields);
            if (Object.keys(currentValues).length > 0) {
                record.currentValues = currentValues;
            }
        }
    }
}
function getSnapshotLookupRawFields(record) {
    const fields = record.fields ?? record.fieldValues;
    if (!fields || typeof fields !== 'object' || Array.isArray(fields)) {
        return null;
    }
    return fields;
}
function mapSnapshotRawFieldsToCurrentValues(branch, rawFields) {
    switch (branch) {
        case 'PRE': {
            const currentValues = {};
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
const BRANCH_FIELD_KEY_MAP = {
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
