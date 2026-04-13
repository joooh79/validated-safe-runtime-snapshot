import type { CurrentStateLookupBundle } from '../../resolution/index.js';
import type { SnapshotBranch } from '../../types/core.js';
import type { SnapshotBranchIntent } from './buildSnapshotActions.js';

const WRITABLE_SNAPSHOT_FIELDS: Partial<Record<SnapshotBranch, string[]>> = {
  PRE: ['symptom', 'visibleCrack'],
};

export function extractWritableSnapshotIntendedChanges(
  branch: SnapshotBranch,
  payload: Record<string, unknown>,
): Record<string, unknown> {
  const allowedFields = WRITABLE_SNAPSHOT_FIELDS[branch] ?? [];

  return Object.fromEntries(
    allowedFields.flatMap((field) => {
      if (!(field in payload)) {
        return [];
      }

      const value = payload[field];
      if (
        value === undefined ||
        value === null ||
        value === '' ||
        (Array.isArray(value) && value.length === 0)
      ) {
        return [];
      }

      return [[field, value]];
    }),
  );
}

export function snapshotBranchIntentProducesWrite(
  intent: SnapshotBranchIntent,
  snapshotLookups: CurrentStateLookupBundle['snapshotLookups'] | undefined,
): boolean {
  if (!intent.hasContent) {
    return false;
  }

  if (!intent.isSameDateCorrection) {
    return true;
  }

  return !shouldCollapseSnapshotUpdateToNoOp(
    snapshotLookups,
    intent.branch,
    intent.toothNumber,
    extractWritableSnapshotIntendedChanges(intent.branch, intent.payload ?? {}),
  );
}

export function shouldCollapseSnapshotUpdateToNoOp(
  snapshotLookups: CurrentStateLookupBundle['snapshotLookups'] | undefined,
  branch: SnapshotBranch,
  toothNumber: string | undefined,
  intendedChanges: Record<string, unknown>,
): boolean {
  if (!toothNumber || toothNumber === 'all') {
    return false;
  }

  if (Object.keys(intendedChanges).length === 0) {
    return false;
  }

  const snapshotLookup = snapshotLookups?.[branch]?.[toothNumber];
  if (!snapshotLookup?.found || !snapshotLookup.currentValues) {
    return false;
  }

  return Object.entries(intendedChanges).every(([field, incomingValue]) =>
    areSnapshotValuesEqual(branch, field, incomingValue, snapshotLookup.currentValues?.[field]),
  );
}

function areSnapshotValuesEqual(
  branch: SnapshotBranch,
  field: string,
  incomingValue: unknown,
  currentValue: unknown,
): boolean {
  return JSON.stringify(normalizeSnapshotComparableValue(branch, field, incomingValue)) ===
    JSON.stringify(normalizeSnapshotComparableValue(branch, field, currentValue));
}

function normalizeSnapshotComparableValue(
  branch: SnapshotBranch,
  field: string,
  value: unknown,
): unknown {
  if (branch === 'PRE' && field === 'symptom') {
    return normalizeStringList(value);
  }

  if (Array.isArray(value)) {
    return normalizeStringList(value);
  }

  if (typeof value === 'number') {
    return value;
  }

  if (value === undefined || value === null) {
    return '';
  }

  return String(value).trim();
}

function normalizeStringList(value: unknown): string[] {
  const values = Array.isArray(value)
    ? value
    : value === undefined || value === null || value === ''
      ? []
      : [value];

  return [...new Set(values.map((item) => String(item).trim()).filter(Boolean))].sort();
}
