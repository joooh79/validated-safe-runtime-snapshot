const CASE_SYNTHESIS_FIELD_ALIASES = {
    episodeStatus: ['episodeStatus', 'Episode status'],
    latestSummary: ['latestSummary', 'Latest summary'],
    latestWorkingDiagnosis: ['latestWorkingDiagnosis', 'Latest working diagnosis'],
    latestWorkingPlan: ['latestWorkingPlan', 'Latest working plan'],
    finalProsthesisPlanDate: ['finalProsthesisPlanDate', 'Final prosthesis plan date'],
    finalPrepAndScanDate: ['finalPrepAndScanDate', 'Final prep & scan date'],
    finalProsthesisDeliveryDate: [
        'finalProsthesisDeliveryDate',
        'Final prosthesis delivery date',
    ],
    latestPostDeliveryFollowUpDate: [
        'latestPostDeliveryFollowUpDate',
        'Latest post-delivery follow-up date',
    ],
    latestPostDeliveryFollowUpResult: [
        'latestPostDeliveryFollowUpResult',
        'Latest post-delivery follow-up result',
    ],
};
const POST_DELIVERY_FOLLOW_UP_FIELD_ALIASES = {
    followUpDate: ['followUpDate', 'Follow-up date'],
    followUpResult: ['followUpResult', 'Follow-up result'],
    issueSummary: ['issueSummary', 'Issue summary'],
    followUpNotes: ['followUpNotes', 'Follow-up notes'],
};
export function extractContinuationPayload(input) {
    const { toothItems, caseUpdates } = input;
    const caseIntendedChangesByTooth = {};
    const followUpIntendedChangesByTooth = {};
    const knownToothNumbers = new Set((toothItems ?? [])
        .map((toothItem) => toothItem.toothNumber?.trim())
        .filter((toothNumber) => Boolean(toothNumber)));
    for (const toothItem of toothItems ?? []) {
        const toothNumber = toothItem.toothNumber?.trim();
        if (!toothNumber) {
            continue;
        }
        const caseIntendedChanges = collectAliasedValues(toothItem, CASE_SYNTHESIS_FIELD_ALIASES);
        if (Object.keys(caseIntendedChanges).length > 0) {
            caseIntendedChangesByTooth[toothNumber] = caseIntendedChanges;
        }
        const followUpIntendedChanges = collectAliasedValues(toothItem, POST_DELIVERY_FOLLOW_UP_FIELD_ALIASES);
        if (Object.keys(followUpIntendedChanges).length > 0) {
            followUpIntendedChangesByTooth[toothNumber] = followUpIntendedChanges;
        }
    }
    mergeCaseUpdatesIntoToothMap(caseIntendedChangesByTooth, caseUpdates, knownToothNumbers);
    return {
        caseIntendedChangesByTooth,
        followUpIntendedChangesByTooth,
    };
}
function collectAliasedValues(toothItem, aliases) {
    const collected = {};
    for (const branch of toothItem.branches) {
        const payload = branch.payload ?? {};
        for (const [targetKey, candidateKeys] of Object.entries(aliases)) {
            if (targetKey in collected) {
                continue;
            }
            const value = readAliasedPayloadValue(payload, candidateKeys);
            if (value !== undefined) {
                collected[targetKey] = value;
            }
        }
    }
    return collected;
}
function readAliasedPayloadValue(payload, candidateKeys) {
    for (const key of candidateKeys) {
        if (!(key in payload)) {
            continue;
        }
        const value = payload[key];
        if (isMeaningfulPayloadValue(value)) {
            return value;
        }
    }
    return undefined;
}
function isMeaningfulPayloadValue(value) {
    if (value === undefined || value === null) {
        return false;
    }
    if (typeof value === 'string') {
        return value.trim().length > 0;
    }
    if (Array.isArray(value)) {
        return value.length > 0;
    }
    return true;
}
function mergeCaseUpdatesIntoToothMap(caseIntendedChangesByTooth, caseUpdates, knownToothNumbers) {
    if (!caseUpdates) {
        return;
    }
    const entries = Array.isArray(caseUpdates) ? caseUpdates : [caseUpdates];
    for (const entry of entries) {
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
            continue;
        }
        if ('byTooth' in entry && isRecord(entry.byTooth)) {
            for (const [toothNumber, rawUpdate] of Object.entries(entry.byTooth)) {
                mergeRecognizedCaseUpdate(caseIntendedChangesByTooth, toothNumber, rawUpdate, knownToothNumbers);
            }
            continue;
        }
        if ('items' in entry && Array.isArray(entry.items)) {
            for (const item of entry.items) {
                const toothNumber = resolveCaseUpdateToothNumber(item, knownToothNumbers);
                mergeRecognizedCaseUpdate(caseIntendedChangesByTooth, toothNumber, item, knownToothNumbers);
            }
            continue;
        }
        const toothNumber = resolveCaseUpdateToothNumber(entry, knownToothNumbers);
        mergeRecognizedCaseUpdate(caseIntendedChangesByTooth, toothNumber, entry, knownToothNumbers);
    }
}
function mergeRecognizedCaseUpdate(caseIntendedChangesByTooth, toothNumber, rawUpdate, knownToothNumbers) {
    if (!toothNumber || !isRecord(rawUpdate) || !knownToothNumbers.has(toothNumber)) {
        return;
    }
    const recognizedUpdate = collectAliasedValuesFromPayload(rawUpdate, CASE_SYNTHESIS_FIELD_ALIASES);
    if (Object.keys(recognizedUpdate).length === 0) {
        return;
    }
    caseIntendedChangesByTooth[toothNumber] = {
        ...(caseIntendedChangesByTooth[toothNumber] ?? {}),
        ...recognizedUpdate,
    };
}
function collectAliasedValuesFromPayload(payload, aliases) {
    const collected = {};
    for (const [targetKey, candidateKeys] of Object.entries(aliases)) {
        const value = readAliasedPayloadValue(payload, candidateKeys);
        if (value !== undefined) {
            collected[targetKey] = value;
        }
    }
    return collected;
}
function resolveCaseUpdateToothNumber(entry, knownToothNumbers) {
    if (!isRecord(entry)) {
        return knownToothNumbers.size === 1 ? [...knownToothNumbers][0] : undefined;
    }
    const directToothNumber = typeof entry.toothNumber === 'string'
        ? entry.toothNumber.trim()
        : undefined;
    if (directToothNumber) {
        return directToothNumber;
    }
    return knownToothNumbers.size === 1 ? [...knownToothNumbers][0] : undefined;
}
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
