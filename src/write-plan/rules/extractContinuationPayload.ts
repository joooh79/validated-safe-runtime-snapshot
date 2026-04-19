import type { CaseUpdatesInput, ToothFindingsItem } from '../../types/contract.js';

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
} as const;

const POST_DELIVERY_FOLLOW_UP_FIELD_ALIASES = {
  followUpDate: ['followUpDate', 'Follow-up date'],
  followUpResult: ['followUpResult', 'Follow-up result'],
  issueSummary: ['issueSummary', 'Issue summary'],
  followUpNotes: ['followUpNotes', 'Follow-up notes'],
} as const;

export interface ContinuationPayloadExtraction {
  caseIntendedChangesByTooth: Record<string, Record<string, unknown>>;
  followUpIntendedChangesByTooth: Record<string, Record<string, unknown>>;
}

export function extractContinuationPayload(
  input: {
    toothItems: ToothFindingsItem[] | undefined;
    caseUpdates?: CaseUpdatesInput;
  },
): ContinuationPayloadExtraction {
  const { toothItems, caseUpdates } = input;
  const caseIntendedChangesByTooth: Record<string, Record<string, unknown>> = {};
  const followUpIntendedChangesByTooth: Record<string, Record<string, unknown>> = {};
  const knownToothNumbers = new Set(
    (toothItems ?? [])
      .map((toothItem) => toothItem.toothNumber?.trim())
      .filter((toothNumber): toothNumber is string => Boolean(toothNumber)),
  );

  for (const toothItem of toothItems ?? []) {
    const toothNumber = toothItem.toothNumber?.trim();
    if (!toothNumber) {
      continue;
    }

    const caseIntendedChanges = collectAliasedValues(
      toothItem,
      CASE_SYNTHESIS_FIELD_ALIASES,
    );
    if (Object.keys(caseIntendedChanges).length > 0) {
      caseIntendedChangesByTooth[toothNumber] = caseIntendedChanges;
    }

    const followUpIntendedChanges = collectAliasedValues(
      toothItem,
      POST_DELIVERY_FOLLOW_UP_FIELD_ALIASES,
    );
    if (Object.keys(followUpIntendedChanges).length > 0) {
      followUpIntendedChangesByTooth[toothNumber] = followUpIntendedChanges;
    }
  }

  mergeCaseUpdatesIntoToothMap(
    caseIntendedChangesByTooth,
    caseUpdates,
    knownToothNumbers,
  );

  return {
    caseIntendedChangesByTooth,
    followUpIntendedChangesByTooth,
  };
}

function collectAliasedValues(
  toothItem: ToothFindingsItem,
  aliases: Record<string, readonly string[]>,
): Record<string, unknown> {
  const collected: Record<string, unknown> = {};

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

function readAliasedPayloadValue(
  payload: Record<string, unknown>,
  candidateKeys: readonly string[],
): unknown {
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

function isMeaningfulPayloadValue(value: unknown): boolean {
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

function mergeCaseUpdatesIntoToothMap(
  caseIntendedChangesByTooth: Record<string, Record<string, unknown>>,
  caseUpdates: CaseUpdatesInput | undefined,
  knownToothNumbers: Set<string>,
): void {
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
        mergeRecognizedCaseUpdate(
          caseIntendedChangesByTooth,
          toothNumber,
          rawUpdate,
          knownToothNumbers,
        );
      }
      continue;
    }

    if ('items' in entry && Array.isArray(entry.items)) {
      for (const item of entry.items) {
        const toothNumber = resolveCaseUpdateToothNumber(item, knownToothNumbers);
        mergeRecognizedCaseUpdate(
          caseIntendedChangesByTooth,
          toothNumber,
          item,
          knownToothNumbers,
        );
      }
      continue;
    }

    const toothNumber = resolveCaseUpdateToothNumber(entry, knownToothNumbers);
    mergeRecognizedCaseUpdate(
      caseIntendedChangesByTooth,
      toothNumber,
      entry,
      knownToothNumbers,
    );
  }
}

function mergeRecognizedCaseUpdate(
  caseIntendedChangesByTooth: Record<string, Record<string, unknown>>,
  toothNumber: string | undefined,
  rawUpdate: unknown,
  knownToothNumbers: Set<string>,
): void {
  if (!toothNumber || !isRecord(rawUpdate) || !knownToothNumbers.has(toothNumber)) {
    return;
  }

  const recognizedUpdate = collectAliasedValuesFromPayload(
    rawUpdate,
    CASE_SYNTHESIS_FIELD_ALIASES,
  );
  if (Object.keys(recognizedUpdate).length === 0) {
    return;
  }

  caseIntendedChangesByTooth[toothNumber] = {
    ...(caseIntendedChangesByTooth[toothNumber] ?? {}),
    ...recognizedUpdate,
  };
}

function collectAliasedValuesFromPayload(
  payload: Record<string, unknown>,
  aliases: Record<string, readonly string[]>,
): Record<string, unknown> {
  const collected: Record<string, unknown> = {};

  for (const [targetKey, candidateKeys] of Object.entries(aliases)) {
    const value = readAliasedPayloadValue(payload, candidateKeys);
    if (value !== undefined) {
      collected[targetKey] = value;
    }
  }

  return collected;
}

function resolveCaseUpdateToothNumber(
  entry: unknown,
  knownToothNumbers: Set<string>,
): string | undefined {
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
