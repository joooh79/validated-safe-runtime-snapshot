import type { ToothFindingsItem } from '../../types/contract.js';

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
  toothItems: ToothFindingsItem[] | undefined,
): ContinuationPayloadExtraction {
  const caseIntendedChangesByTooth: Record<string, Record<string, unknown>> = {};
  const followUpIntendedChangesByTooth: Record<string, Record<string, unknown>> = {};

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
