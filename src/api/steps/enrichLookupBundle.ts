import type { ApiOrchestrationRequest } from '../../types/api.js';
import type { NormalizedContract } from '../../types/contract.js';
import type {
  CaseCandidateLookupResult,
  CaseLookupResult,
  CurrentStateLookupBundle,
  PatientLookupResult,
} from '../../resolution/index.js';
import { caseFields, patientFields } from '../../providers/airtable/mappingRegistry.js';

const DIRECT_CASE_LOOKUP_KEY = '__direct_case__';

interface RealProviderConfig {
  kind: 'airtable';
  mode: 'real';
  baseId: string;
  apiToken: string;
  apiBaseUrl?: string;
}

interface AirtableListResponse {
  records: AirtableRecord[];
}

interface AirtableRecord {
  id: string;
  fields: Record<string, unknown>;
}

export async function enrichLookupBundle(
  request: ApiOrchestrationRequest,
  contract: NormalizedContract,
  lookupBundle: CurrentStateLookupBundle,
): Promise<void> {
  const providerConfig = getRealProviderConfig(request.providerConfig);
  if (!providerConfig) {
    return;
  }

  const directCaseId = extractDirectCaseId(contract.caseUpdates);
  if (directCaseId) {
    let directCaseLookup: CaseLookupResult | null = null;
    try {
      directCaseLookup = await resolveCaseLookupByCaseId(
        providerConfig,
        directCaseId,
        lookupBundle.caseLookups[DIRECT_CASE_LOOKUP_KEY] ?? {
          found: true,
          caseId: directCaseId,
        },
      );
    } catch (error) {
      lookupBundle.providerNotes = mergeProviderNotes(
        lookupBundle.providerNotes,
        getLookupErrorMessage(error),
      );
    }

    if (directCaseLookup) {
      lookupBundle.caseLookups[DIRECT_CASE_LOOKUP_KEY] = directCaseLookup;
    }
  }

  const patientId = contract.patientClues.patientId?.trim();
  if (!patientId) {
    return;
  }

  let patientLookup = lookupBundle.patientLookup;
  try {
    patientLookup = await resolvePatientLookup(
      providerConfig,
      patientId,
      lookupBundle.patientLookup,
    );
  } catch (error) {
    lookupBundle.providerNotes = mergeProviderNotes(
      lookupBundle.providerNotes,
      getLookupErrorMessage(error),
    );
  }
  lookupBundle.patientLookup = patientLookup;

  if (contract.continuityIntent !== 'continue_case') {
    return;
  }

  const touchedTeeth = [...new Set(
    contract.findingsContext.toothItems
      .map((item) => item.toothNumber?.trim())
      .filter((tooth): tooth is string => Boolean(tooth)),
  )];

  if (touchedTeeth.length !== 1) {
    return;
  }

  const toothNumber = touchedTeeth[0]!;
  const currentCaseLookup = lookupBundle.caseLookups[toothNumber];

  if (currentCaseLookup?.caseId && !currentCaseLookup.recordId) {
    let exactCaseLookup: CaseLookupResult | null = null;
    try {
      exactCaseLookup = await resolveCaseLookupByCaseId(
        providerConfig,
        currentCaseLookup.caseId,
        currentCaseLookup,
      );
    } catch (error) {
      lookupBundle.providerNotes = mergeProviderNotes(
        lookupBundle.providerNotes,
        getLookupErrorMessage(error),
      );
    }

    if (exactCaseLookup?.recordId) {
      lookupBundle.caseLookups[toothNumber] = exactCaseLookup;
      return;
    }
  }

  if (!patientLookup.recordId) {
    return;
  }

  let candidates: CaseCandidateLookupResult[] = [];
  try {
    candidates = await discoverCaseCandidates(
      providerConfig,
      patientLookup.recordId,
      toothNumber,
    );
  } catch (error) {
    lookupBundle.providerNotes = mergeProviderNotes(
      lookupBundle.providerNotes,
      getLookupErrorMessage(error),
    );
    return;
  }

  if (candidates.length === 1) {
    const candidate = candidates[0]!;
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

function getRealProviderConfig(
  providerConfig: ApiOrchestrationRequest['providerConfig'],
): RealProviderConfig | null {
  if (
    providerConfig?.kind === 'airtable' &&
    providerConfig.mode === 'real' &&
    providerConfig.baseId &&
    providerConfig.apiToken
  ) {
    return providerConfig as RealProviderConfig;
  }

  return null;
}

async function resolvePatientLookup(
  config: RealProviderConfig,
  patientId: string,
  currentLookup: PatientLookupResult,
): Promise<PatientLookupResult> {
  if (currentLookup.recordId) {
    return currentLookup;
  }

  const record = await findRecordByFieldValue(config, 'Patients', patientFields.patientId.fieldName, patientId, [
    patientFields.patientId.fieldName,
    patientFields.birthYear.fieldName,
    patientFields.gender.fieldName,
    patientFields.firstVisitDate.fieldName,
  ]);
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

async function resolveCaseLookupByCaseId(
  config: RealProviderConfig,
  caseId: string,
  currentLookup: CaseLookupResult,
): Promise<CaseLookupResult | null> {
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
    ...withDefined(
      'latestVisitDate',
      extractDateFromVisitId(readString(record.fields[caseFields.latestVisitId.fieldName])),
    ),
    ...withDefined('latestSummary', readString(record.fields[caseFields.latestSummary.fieldName])),
    ...withDefined('status', normalizeCaseStatus(record.fields[caseFields.episodeStatus.fieldName])),
  };
}

async function discoverCaseCandidates(
  config: RealProviderConfig,
  patientRecordId: string,
  toothNumber: string,
): Promise<CaseCandidateLookupResult[]> {
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
      ...withDefined(
        'latestVisitDate',
        extractDateFromVisitId(readString(record.fields[caseFields.latestVisitId.fieldName])),
      ),
      ...withDefined('latestSummary', readString(record.fields[caseFields.latestSummary.fieldName])),
      status: normalizeCaseStatus(record.fields[caseFields.episodeStatus.fieldName]) ?? 'unknown',
    }) satisfies CaseCandidateLookupResult)
    .sort(compareCaseCandidates);
}

async function findRecordByFieldValue(
  config: RealProviderConfig,
  tableName: string,
  fieldName: string,
  fieldValue: string,
  fields: string[],
): Promise<AirtableRecord | undefined> {
  for (const formula of buildFieldValueFormulas(fieldName, fieldValue)) {
    const records = await fetchRecords(config, tableName, formula, fields);
    if (records[0]) {
      return records[0];
    }
  }

  const normalizedValue = fieldValue.trim();
  let offset: string | undefined;
 
  do {

    const page = await fetchRecordsPage(config, tableName, fields, {
      ...(offset ? { offset } : {}),
      maxRecords: 100,
    });
    const matchedRecord = page.records.find(
      (record) => readString(record.fields[fieldName]) === normalizedValue,
    );
    if (matchedRecord) {
      return matchedRecord;
    }

    offset = page.offset;
  } while (offset);

  return undefined;
}

async function fetchRecords(
  config: RealProviderConfig,
  tableName: string,
  filterByFormula: string,
  fields: string[],
): Promise<AirtableRecord[]> {
  const page = await fetchRecordsPage(config, tableName, fields, {
    filterByFormula,
    maxRecords: 10,
  });
  return page.records;
}

async function fetchRecordsPage(
  config: RealProviderConfig,
  tableName: string,
  fields: string[],
  options: {
    filterByFormula?: string;
    offset?: string;
    maxRecords: number;
  },
): Promise<{ records: AirtableRecord[]; offset?: string }> {
  const apiBaseUrl = (config.apiBaseUrl ?? 'https://api.airtable.com/v0').replace(/\/$/, '');
  const url = new URL(
    `${apiBaseUrl}/${encodeURIComponent(config.baseId)}/${encodeURIComponent(tableName)}`,
  );

  if (options.filterByFormula) {
    url.searchParams.set('filterByFormula', options.filterByFormula);
  }
  if (options.offset) {
    url.searchParams.set('offset', options.offset);
  }
  url.searchParams.set('maxRecords', String(options.maxRecords));
  for (const field of fields) {
    url.searchParams.append('fields[]', field);
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${config.apiToken}`,
    },
  });

  const rawBody = await response.text();
  if (!response.ok) {
    throw new Error(
      `Airtable lookup failed for ${tableName}: ${extractLookupError(response.status, rawBody)}`,
    );
  }

  let body: AirtableListResponse & { offset?: string };
  try {
    body = rawBody.trim()
      ? JSON.parse(rawBody) as AirtableListResponse & { offset?: string }
      : { records: [] };
  } catch {
    throw new Error(`Airtable lookup failed for ${tableName}: invalid JSON response body.`);
  }

  return {
    records: Array.isArray(body.records) ? body.records : [],
    ...(typeof body.offset === 'string'
      ? { offset: body.offset }
      : {}),
  };
}

function extractLookupError(status: number, rawBody: string): string {
  if (rawBody.trim()) {
    try {
      const parsed = JSON.parse(rawBody) as unknown;
      if (isRecord(parsed)) {
        const nestedError = parsed.error;
        if (isRecord(nestedError) && typeof nestedError.message === 'string') {
          return nestedError.message;
        }

        if (typeof parsed.message === 'string') {
          return parsed.message;
        }
      }
    } catch {
      return rawBody;
    }

    return rawBody;
  }

  return `HTTP ${status}`;
}

function escapeFormulaString(value: string): string {
  return value.replaceAll('\\', '\\\\').replaceAll("'", "\\'");
}

function buildFieldValueFormulas(
  fieldName: string,
  fieldValue: string,
): string[] {
  const normalizedValue = fieldValue.trim();
  const formulas = [
    `{${fieldName}}='${escapeFormulaString(normalizedValue)}'`,
    `TRIM({${fieldName}}&"")='${escapeFormulaString(normalizedValue)}'`,
  ];

  if (/^\d+$/.test(normalizedValue)) {
    formulas.push(`VALUE({${fieldName}})=${Number(normalizedValue)}`);
  }

  return [...new Set(formulas)];
}

function readString(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
  }

  if (typeof value === 'number') {
    return String(value);
  }

  return undefined;
}

function linkedRecordIncludes(value: unknown, recordId: string): boolean {
  return Array.isArray(value) && value.some((item) => item === recordId);
}

function extractDateFromVisitId(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const match = value.match(/(\d{4})(\d{2})(\d{2})$/);
  if (!match) {
    return undefined;
  }

  return `${match[1]}-${match[2]}-${match[3]}`;
}

function extractDirectCaseId(
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

function normalizeCaseStatus(
  value: unknown,
): 'open' | 'closed' | 'split' | 'unknown' | undefined {
  const normalized = readString(value)?.toLowerCase();
  if (normalized === 'open' || normalized === 'closed' || normalized === 'split') {
    return normalized;
  }

  if (normalized === 'monitoring') {
    return 'unknown';
  }

  return normalized ? 'unknown' : undefined;
}

function compareCaseCandidates(
  left: CaseCandidateLookupResult,
  right: CaseCandidateLookupResult,
): number {
  const leftOpenScore = left.status === 'open' ? 1 : 0;
  const rightOpenScore = right.status === 'open' ? 1 : 0;
  if (leftOpenScore !== rightOpenScore) {
    return rightOpenScore - leftOpenScore;
  }

  const leftLatest = left.latestVisitDate ?? left.episodeStartDate ?? '';
  const rightLatest = right.latestVisitDate ?? right.episodeStartDate ?? '';
  return rightLatest.localeCompare(leftLatest);
}

function withDefined<K extends string, V>(
  key: K,
  value: V | undefined,
): Partial<Record<K, V>> {
  return value === undefined ? {} : { [key]: value } as Record<K, V>;
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

function getLookupErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
