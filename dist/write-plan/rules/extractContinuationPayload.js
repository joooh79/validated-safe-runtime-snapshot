const CASE_SYNTHESIS_FIELD_ALIASES = {
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
export function extractContinuationPayload(toothItems) {
    const caseIntendedChangesByTooth = {};
    const followUpIntendedChangesByTooth = {};
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
