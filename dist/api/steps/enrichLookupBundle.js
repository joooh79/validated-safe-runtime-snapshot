import { caseFields, patientFields } from '../../providers/airtable/mappingRegistry.js';
const DIRECT_CASE_LOOKUP_KEY = '__direct_case__';
export async function enrichLookupBundle(request, contract, lookupBundle) {
    const providerConfig = getRealProviderConfig(request.providerConfig);
    if (!providerConfig) {
        return;
    }
    const directCaseId = extractDirectCaseId(contract.caseUpdates);
    if (directCaseId) {
        const directCaseLookup = await resolveCaseLookupByCaseId(providerConfig, directCaseId, lookupBundle.caseLookups[DIRECT_CASE_LOOKUP_KEY] ?? {
            found: true,
            caseId: directCaseId,
        });
        if (directCaseLookup) {
            lookupBundle.caseLookups[DIRECT_CASE_LOOKUP_KEY] = directCaseLookup;
        }
    }
    const patientId = contract.patientClues.patientId?.trim();
    if (!patientId) {
        return;
    }
    const patientLookup = await resolvePatientLookup(providerConfig, patientId, lookupBundle.patientLookup);
    lookupBundle.patientLookup = patientLookup;
    if (contract.continuityIntent !== 'continue_case') {
        return;
    }
    const touchedTeeth = [...new Set(contract.findingsContext.toothItems
            .map((item) => item.toothNumber?.trim())
            .filter((tooth) => Boolean(tooth)))];
    if (touchedTeeth.length !== 1) {
        return;
    }
    const toothNumber = touchedTeeth[0];
    const currentCaseLookup = lookupBundle.caseLookups[toothNumber];
    if (currentCaseLookup?.caseId && !currentCaseLookup.recordId) {
        const exactCaseLookup = await resolveCaseLookupByCaseId(providerConfig, currentCaseLookup.caseId, currentCaseLookup);
        if (exactCaseLookup?.recordId) {
            lookupBundle.caseLookups[toothNumber] = exactCaseLookup;
            return;
        }
    }
    if (!patientLookup.recordId) {
        return;
    }
    const candidates = await discoverCaseCandidates(providerConfig, patientLookup.recordId, toothNumber);
    if (candidates.length === 1) {
        const candidate = candidates[0];
        lookupBundle.caseLookups[toothNumber] = {
            found: true,
            ...(candidate.caseId ? { caseId: candidate.caseId } : {}),
            ...(candidate.recordId ? { recordId: candidate.recordId } : {}),
            ...(candidate.toothNumber ? { toothNumber: candidate.toothNumber } : {}),
            ...(candidate.episodeStartDate ? { episodeStartDate: candidate.episodeStartDate } : {}),
            ...(candidate.latestVisitDate ? { latestVisitDate: candidate.latestVisitDate } : {}),
            ...(candidate.latestSummary ? { latestSummary: candidate.latestSummary } : {}),
            ...(candidate.status ? { status: candidate.status } : {}),
        };
        return;
    }
    if (candidates.length > 1) {
        lookupBundle.caseCandidateLookups = {
            ...(lookupBundle.caseCandidateLookups ?? {}),
            [toothNumber]: candidates,
        };
    }
}
function getRealProviderConfig(providerConfig) {
    if (providerConfig?.kind === 'airtable' &&
        providerConfig.mode === 'real' &&
        providerConfig.baseId &&
        providerConfig.apiToken) {
        return providerConfig;
    }
    return null;
}
async function resolvePatientLookup(config, patientId, currentLookup) {
    if (currentLookup.recordId) {
        return currentLookup;
    }
    const formula = `{${patientFields.patientId.fieldName}}='${escapeFormulaString(patientId)}'`;
    const records = await fetchRecords(config, 'Patients', formula, [
        patientFields.patientId.fieldName,
        patientFields.birthYear.fieldName,
        patientFields.gender.fieldName,
        patientFields.firstVisitDate.fieldName,
    ]);
    const record = records[0];
    if (!record) {
        return currentLookup;
    }
    return {
        found: true,
        patientId,
        recordId: record.id,
        ...(withDefined('birthYear', readString(record.fields[patientFields.birthYear.fieldName]))),
        ...(withDefined('gender', readString(record.fields[patientFields.gender.fieldName]))),
        ...(withDefined('firstVisitDate', readString(record.fields[patientFields.firstVisitDate.fieldName]))),
    };
}
async function resolveCaseLookupByCaseId(config, caseId, currentLookup) {
    const formula = `{${caseFields.caseId.fieldName}}='${escapeFormulaString(caseId)}'`;
    const records = await fetchRecords(config, 'Cases', formula, [
        caseFields.caseId.fieldName,
        caseFields.toothNumber.fieldName,
        caseFields.episodeStartDate.fieldName,
        caseFields.episodeStatus.fieldName,
        caseFields.latestVisitId.fieldName,
        caseFields.latestSummary.fieldName,
    ]);
    const record = records[0];
    if (!record) {
        return null;
    }
    return {
        ...currentLookup,
        found: true,
        caseId,
        recordId: record.id,
        ...withDefined('toothNumber', readString(record.fields[caseFields.toothNumber.fieldName])),
        ...withDefined('episodeStartDate', readString(record.fields[caseFields.episodeStartDate.fieldName])),
        ...withDefined('latestVisitDate', extractDateFromVisitId(readString(record.fields[caseFields.latestVisitId.fieldName]))),
        ...withDefined('latestSummary', readString(record.fields[caseFields.latestSummary.fieldName])),
        ...withDefined('status', normalizeCaseStatus(record.fields[caseFields.episodeStatus.fieldName])),
    };
}
async function discoverCaseCandidates(config, patientRecordId, toothNumber) {
    const formula = `{${caseFields.toothNumber.fieldName}}='${escapeFormulaString(toothNumber)}'`;
    const records = await fetchRecords(config, 'Cases', formula, [
        caseFields.caseId.fieldName,
        caseFields.patientId.fieldName,
        caseFields.toothNumber.fieldName,
        caseFields.episodeStartDate.fieldName,
        caseFields.episodeStatus.fieldName,
        caseFields.latestVisitId.fieldName,
        caseFields.latestSummary.fieldName,
    ]);
    return records
        .filter((record) => linkedRecordIncludes(record.fields[caseFields.patientId.fieldName], patientRecordId))
        .map((record) => ({
        ...withDefined('caseId', readString(record.fields[caseFields.caseId.fieldName])),
        recordId: record.id,
        ...withDefined('toothNumber', readString(record.fields[caseFields.toothNumber.fieldName])),
        ...withDefined('episodeStartDate', readString(record.fields[caseFields.episodeStartDate.fieldName])),
        ...withDefined('latestVisitDate', extractDateFromVisitId(readString(record.fields[caseFields.latestVisitId.fieldName]))),
        ...withDefined('latestSummary', readString(record.fields[caseFields.latestSummary.fieldName])),
        status: normalizeCaseStatus(record.fields[caseFields.episodeStatus.fieldName]) ?? 'unknown',
    }))
        .sort(compareCaseCandidates);
}
async function fetchRecords(config, tableName, filterByFormula, fields) {
    const apiBaseUrl = (config.apiBaseUrl ?? 'https://api.airtable.com/v0').replace(/\/$/, '');
    const url = new URL(`${apiBaseUrl}/${encodeURIComponent(config.baseId)}/${encodeURIComponent(tableName)}`);
    url.searchParams.set('filterByFormula', filterByFormula);
    url.searchParams.set('maxRecords', '10');
    for (const field of fields) {
        url.searchParams.append('fields[]', field);
    }
    const response = await fetch(url, {
        headers: {
            Authorization: `Bearer ${config.apiToken}`,
        },
    });
    if (!response.ok) {
        return [];
    }
    const body = await response.json();
    return Array.isArray(body.records) ? body.records : [];
}
function escapeFormulaString(value) {
    return value.replaceAll('\\', '\\\\').replaceAll("'", "\\'");
}
function readString(value) {
    if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed ? trimmed : undefined;
    }
    if (typeof value === 'number') {
        return String(value);
    }
    return undefined;
}
function linkedRecordIncludes(value, recordId) {
    return Array.isArray(value) && value.some((item) => item === recordId);
}
function extractDateFromVisitId(value) {
    if (!value) {
        return undefined;
    }
    const match = value.match(/(\d{4})(\d{2})(\d{2})$/);
    if (!match) {
        return undefined;
    }
    return `${match[1]}-${match[2]}-${match[3]}`;
}
function extractDirectCaseId(caseUpdates) {
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
function normalizeCaseStatus(value) {
    const normalized = readString(value)?.toLowerCase();
    if (normalized === 'open' || normalized === 'closed' || normalized === 'split') {
        return normalized;
    }
    if (normalized === 'monitoring') {
        return 'unknown';
    }
    return normalized ? 'unknown' : undefined;
}
function compareCaseCandidates(left, right) {
    const leftOpenScore = left.status === 'open' ? 1 : 0;
    const rightOpenScore = right.status === 'open' ? 1 : 0;
    if (leftOpenScore !== rightOpenScore) {
        return rightOpenScore - leftOpenScore;
    }
    const leftLatest = left.latestVisitDate ?? left.episodeStartDate ?? '';
    const rightLatest = right.latestVisitDate ?? right.episodeStartDate ?? '';
    return rightLatest.localeCompare(leftLatest);
}
function withDefined(key, value) {
    return value === undefined ? {} : { [key]: value };
}
