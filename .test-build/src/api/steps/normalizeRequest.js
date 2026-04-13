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
            throw new Error('Real Airtable provider config requires baseId and apiToken.');
        }
        return createAirtableProvider({
            baseId: config.baseId,
            apiToken: config.apiToken,
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
