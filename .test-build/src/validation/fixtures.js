/**
 * Validation Fixtures Helpers
 *
 * Utilities for creating test scenarios and lookup bundles.
 */
import { createEmptyLookupBundle } from '../resolution/index.js';
/**
 * Create a lookup bundle for a specific scenario
 */
export function createScenarioLookupBundle(overrides = {}) {
    const baseBundle = createEmptyLookupBundle();
    return {
        ...baseBundle,
        ...overrides,
    };
}
/**
 * Create bundle with existing patient
 */
export function bundleWithExistingPatient(patientId) {
    const bundle = createEmptyLookupBundle();
    return {
        ...bundle,
        patientLookup: {
            found: true,
            patientId,
            firstVisitDate: '2020-01-01',
        },
    };
}
/**
 * Create bundle with same-date visit
 */
export function bundleWithSameDateVisit(patientId, visitId, date) {
    const bundle = bundleWithExistingPatient(patientId);
    return {
        ...bundle,
        sameDateVisitLookup: {
            found: true,
            visitId,
            visitDate: date,
        },
    };
}
/**
 * Create bundle with no patient found
 */
export function bundleWithNoPatient() {
    const bundle = createEmptyLookupBundle();
    return {
        ...bundle,
        patientLookup: {
            found: false,
            reason: 'patient_not_found',
        },
    };
}
/**
 * Create bundle with multiple candidate patients (duplicate suspicion)
 */
export function bundleWithDuplicateSuspicion() {
    const bundle = createEmptyLookupBundle();
    return {
        ...bundle,
        patientLookup: {
            found: false,
            duplicateSuspicion: true,
            candidateIds: ['pat_candidate_001', 'pat_candidate_002', 'pat_candidate_003'],
            reason: 'duplicate_suspicion',
        },
    };
}
/**
 * Create bundle with existing case
 */
export function bundleWithExistingCase(patientId, caseId, toothNumber) {
    const bundle = bundleWithExistingPatient(patientId);
    const key = toothNumber || 'case_default';
    const caseResult = {
        found: true,
        caseId,
    };
    if (toothNumber) {
        caseResult.toothNumber = toothNumber;
    }
    return {
        ...bundle,
        caseLookups: {
            [key]: caseResult,
        },
    };
}
export function createContractFromScenario(input) {
    const workflowIntent = input.contractInputSummary.workflowIntent;
    const patientSearch = input.currentStateLookup.patientSearch;
    const visitSearch = input.currentStateLookup.visitSearch;
    const patientClueTags = new Set(input.contractInputSummary.patientClues);
    const patientClues = {
        existingPatientClaim: workflowIntent === 'existing_patient_new_visit' ||
            workflowIntent === 'existing_visit_update',
        newPatientClaim: workflowIntent === 'new_patient_new_visit',
    };
    if (patientSearch?.patientId) {
        patientClues.patientId = patientSearch.patientId;
    }
    const visitContext = {
        visitDate: input.contractInputSummary.visitDate,
    };
    if (workflowIntent === 'existing_visit_update' && visitSearch?.visitId) {
        visitContext.targetVisitId = visitSearch.visitId;
    }
    if (workflowIntent === 'existing_visit_update' && visitSearch?.date) {
        visitContext.targetVisitDate = visitSearch.date;
    }
    if (patientClueTags.has('correction_confirmed')) {
        visitContext.doctorConfirmedCorrection = true;
    }
    else if (patientClueTags.has('keep_new_visit_confirmed')) {
        visitContext.doctorConfirmedCorrection = false;
    }
    const toothItems = (input.contractInputSummary.findings ?? []).map((finding) => ({
        toothNumber: finding.tooth,
        branches: [
            {
                branch: finding.branch,
                payload: {},
            },
        ],
    }));
    return {
        requestId: input.id,
        workflowIntent,
        continuityIntent: input.contractInputSummary.continuityIntent ??
            'none',
        patientClues,
        visitContext,
        findingsContext: {
            toothItems,
            findingsPresent: {},
        },
        warnings: [],
    };
}
export function createLookupBundleFromScenario(input) {
    const patientSearch = input.currentStateLookup.patientSearch;
    const visitSearch = input.currentStateLookup.visitSearch;
    const caseSearch = input.currentStateLookup.caseSearch;
    const snapshotSearch = input.currentStateLookup.snapshotSearch;
    const firstFindingTooth = input.contractInputSummary.findings?.[0]?.tooth;
    const patientLookup = patientSearch
        ? (() => {
            const lookup = {
                found: patientSearch.found,
            };
            if (patientSearch.patientId) {
                lookup.patientId = patientSearch.patientId;
            }
            if (patientSearch.candidateIds) {
                lookup.candidateIds = patientSearch.candidateIds;
                lookup.duplicateSuspicion = patientSearch.candidateIds.length > 1;
            }
            if (!patientSearch.found) {
                lookup.reason = 'scenario_lookup_patient_not_found';
            }
            return lookup;
        })()
        : { found: false, reason: 'scenario_lookup_patient_missing' };
    const sameDateVisitLookup = visitSearch
        ? (() => {
            const lookup = {
                found: visitSearch.found,
            };
            if (visitSearch.visitId) {
                lookup.visitId = visitSearch.visitId;
            }
            if (visitSearch.date) {
                lookup.visitDate = visitSearch.date;
            }
            if (!visitSearch.found) {
                lookup.reason = 'scenario_lookup_same_date_not_found';
            }
            return lookup;
        })()
        : { found: false, reason: 'scenario_lookup_same_date_missing' };
    const bundle = {
        patientLookup,
        sameDateVisitLookup,
        caseLookups: caseSearch?.found && caseSearch.caseId && firstFindingTooth
            ? {
                [firstFindingTooth]: {
                    found: true,
                    caseId: caseSearch.caseId,
                    toothNumber: firstFindingTooth,
                },
            }
            : {},
    };
    if (snapshotSearch && snapshotSearch.length > 0) {
        bundle.snapshotLookups = snapshotSearch.reduce((acc, snapshot) => {
            const branch = snapshot.branch;
            acc[branch] ||= {};
            const snapshotLookup = {
                found: snapshot.found,
                toothNumber: snapshot.tooth,
                branch,
            };
            if (snapshot.recordId) {
                snapshotLookup.recordId = snapshot.recordId;
            }
            if (snapshot.visitId) {
                snapshotLookup.visitId = snapshot.visitId;
            }
            if (snapshot.recordName) {
                snapshotLookup.recordName = snapshot.recordName;
            }
            if (!snapshot.found) {
                snapshotLookup.reason = 'scenario_lookup_snapshot_not_found';
            }
            acc[branch][snapshot.tooth] = snapshotLookup;
            return acc;
        }, {});
    }
    return bundle;
}
export function createSnapshotBranchIntentsFromScenario(input) {
    const findings = input.contractInputSummary.findings ?? [];
    const uniqueFindings = findings.filter((finding, index) => findings.findIndex((candidate) => candidate.branch === finding.branch && candidate.tooth === finding.tooth) === index);
    return uniqueFindings.map((finding) => ({
        branch: finding.branch,
        hasContent: true,
        isSameDateCorrection: input.contractInputSummary.workflowIntent === 'existing_visit_update',
        isContinuation: false,
        toothNumber: finding.tooth,
    }));
}
