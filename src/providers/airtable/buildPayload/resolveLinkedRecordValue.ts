import type { AirtableAdapterError } from '../types.js';
import { canonConfirmRequiredError } from '../errors.js';
import { normalizeLinkedRef } from './normalizeAirtableValue.js';

export interface ResolveLinkedRecordValueInput {
  dependencyActionId: string | undefined;
  resolvedRefs: Record<string, string> | undefined;
  requireRuntimeRefs?: boolean;
  fallbackRef: string | undefined;
  canonField: string;
  table: string;
  missingRefMessage: string;
}

export function resolveLinkedRecordRef(
  input: ResolveLinkedRecordValueInput,
): string | AirtableAdapterError {
  const {
    dependencyActionId,
    resolvedRefs,
    requireRuntimeRefs = false,
    fallbackRef,
    canonField,
    table,
    missingRefMessage,
  } = input;

  if (dependencyActionId) {
    if (!requireRuntimeRefs) {
      return `preflight_${dependencyActionId}`;
    }

    const resolvedRef = resolvedRefs?.[dependencyActionId];
    if (resolvedRef) {
      return resolvedRef;
    }
  }

  if (typeof fallbackRef === 'string' && fallbackRef.trim()) {
    const normalized = normalizeLinkedRef(fallbackRef);
    if (!isAdapterError(normalized)) {
      return normalized;
    }
  }

  return canonConfirmRequiredError(canonField, table, missingRefMessage);
}

export function buildLinkedRecordCell(
  input: ResolveLinkedRecordValueInput,
): string[] | AirtableAdapterError {
  const resolved = resolveLinkedRecordRef(input);
  if (isAdapterError(resolved)) {
    return resolved;
  }

  return [resolved];
}

export function toLinkedRecordCell(recordId: string): string[] {
  return [recordId];
}

function isAdapterError(value: unknown): value is AirtableAdapterError {
  return typeof value === 'object' && value !== null && 'type' in value;
}
