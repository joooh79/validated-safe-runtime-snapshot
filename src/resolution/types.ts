import type { SnapshotBranch } from '../types/core.js';

/**
 * Provider-neutral lookup bundle
 *
 * This shape allows the resolution engine to work without provider-specific calls.
 * The bundle is pre-populated by the contract engine or API layer with results
 * from actual lookups (Airtable, etc.).
 */

export interface PatientLookupResult {
  found: boolean;
  patientId?: string;
  birthYear?: string | number;
  gender?: string;
  firstVisitDate?: string;
  duplicateSuspicion?: boolean;
  candidateIds?: string[];
  reason?: string;
}

export interface VisitLookupResult {
  found: boolean;
  visitId?: string;
  patientId?: string;
  visitDate?: string;
  visitType?: string;
  reason?: string;
}

export interface SameDateVisitLookupResult {
  found: boolean;
  visitId?: string;
  patientId?: string;
  visitDate?: string;
  reason?: string;
}

export interface CaseLookupResult {
  found: boolean;
  caseId?: string;
  toothNumber?: string;
  episodeIdentifier?: string;
  latestStatus?: string;
  reason?: string;
}

export interface SnapshotLookupResult {
  found: boolean;
  recordId?: string;
  visitId?: string;
  toothNumber?: string;
  branch?: SnapshotBranch;
  recordName?: string;
  reason?: string;
}

export interface CurrentStateLookupBundle {
  /** Patient lookup for the claimed patient identity */
  patientLookup: PatientLookupResult;

  /** Visit lookup for a same-date visit (if visitDate matches) */
  sameDateVisitLookup: SameDateVisitLookupResult;

  /** Visit lookup for the specific target visit (if targetVisitId provided) */
  targetVisitLookup?: VisitLookupResult;

  /** Case lookup results indexed by tooth number or episode key */
  caseLookups: Record<string, CaseLookupResult>;

  /**
   * Explicit snapshot row lookup results for same-date correction targeting.
   *
   * Keyed by branch, then tooth number, so the planner can attach an exact
   * existing row target without inventing provider lookup behavior.
   */
  snapshotLookups?: Partial<Record<SnapshotBranch, Record<string, SnapshotLookupResult>>>;

  /** Any additional ambiguity hints from external sources */
  ambiguityHints?: string[];

  /** Provider-specific error or limitation info */
  providerNotes?: string;
}

/**
 * Minimal lookup bundle for "no lookups performed yet"
 * Used for dry-run or preview-only scenarios
 */
export function createEmptyLookupBundle(): CurrentStateLookupBundle {
  return {
    patientLookup: { found: false, reason: 'lookup_not_performed' },
    sameDateVisitLookup: { found: false, reason: 'lookup_not_performed' },
    caseLookups: {},
  };
}
