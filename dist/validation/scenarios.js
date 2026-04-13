/**
 * Golden Case Scenario Definitions
 *
 * Explicit test fixtures for the currently supported safe slice.
 */
/**
 * GC_SAFE_NEW_VISIT
 * Existing patient + safe new visit on different date
 * Expected: execution_ready, create_patient (attach) + create_visit
 */
export const GC_SAFE_NEW_VISIT = {
    id: 'GC_SAFE_NEW_VISIT',
    title: 'Safe New Visit - Existing Patient',
    description: 'Existing patient creates a new visit on a safe (non-conflicting) date',
    currentStateLookup: {
        patientSearch: {
            found: true,
            patientId: 'pat_existing_12345',
        },
        visitSearch: {
            found: false, // No visit on this date
        },
    },
    contractInputSummary: {
        workflowIntent: 'existing_patient_new_visit',
        patientClues: ['patient_id_provided', 'no_conflict'],
        visitDate: '2024-04-12',
        findings: [{ tooth: '11', branch: 'PRE' }],
    },
};
export const GC_SAFE_NEW_VISIT_EXPECTATION = {
    patientResolutionStatus: 'resolved_existing_patient',
    visitResolutionStatus: 'create_new_visit',
    caseResolutionStatus: 'none',
    readinessStatus: 'ready_for_write_plan',
    planReadiness: 'execution_ready',
    allowedActionTypes: ['attach_existing_patient', 'create_visit', 'create_snapshot'],
    forbiddenActionTypes: ['create_patient', 'create_case', 'link_visit_to_patient'],
    shouldExecute: true,
    executionStatus: 'success',
    shouldWrite: true,
    replayEligible: false,
};
/**
 * GC_SAME_DATE_UPDATE
 * Same-date visit exists, intentional update/correction path
 * Expected: execution_ready, attach_patient + update_visit
 */
export const GC_SAME_DATE_UPDATE = {
    id: 'GC_SAME_DATE_UPDATE',
    title: 'Same-Date Update - Intentional Correction',
    description: 'Same-date visit exists; user explicitly chooses correction/update path',
    currentStateLookup: {
        patientSearch: {
            found: true,
            patientId: 'pat_existing_12345',
        },
        visitSearch: {
            found: true,
            visitId: 'vis_same_date_001',
            date: '2024-04-12',
        },
    },
    contractInputSummary: {
        workflowIntent: 'existing_visit_update',
        patientClues: ['patient_id_provided', 'same_date_known'],
        visitDate: '2024-04-12',
        findings: [{ tooth: '11', branch: 'PRE' }],
    },
};
export const GC_SAME_DATE_UPDATE_EXPECTATION = {
    patientResolutionStatus: 'resolved_existing_patient',
    visitResolutionStatus: 'update_existing_visit_same_date',
    caseResolutionStatus: 'none',
    readinessStatus: 'ready_for_write_plan',
    planReadiness: 'execution_ready',
    allowedActionTypes: ['attach_existing_patient', 'no_op_visit', 'update_snapshot'],
    forbiddenActionTypes: ['create_visit', 'create_patient', 'create_case'],
    shouldExecute: true,
    executionStatus: 'success',
    shouldWrite: true,
    replayEligible: false,
};
/**
 * GC_SAME_DATE_CORRECTION_REQUIRED
 * Same-date visit exists; new visit claim without explicit correction confirmation
 * Expected: blocked_requires_correction, plan => preview_only/blocked, no write
 */
export const GC_SAME_DATE_CORRECTION_REQUIRED = {
    id: 'GC_SAME_DATE_CORRECTION_REQUIRED',
    title: 'Same-Date Correction Required',
    description: 'Same-date conflict detected; user chose create_new_visit without explicit confirmation',
    currentStateLookup: {
        patientSearch: {
            found: true,
            patientId: 'pat_existing_12345',
        },
        visitSearch: {
            found: true,
            visitId: 'vis_same_date_001',
            date: '2024-04-12',
        },
    },
    contractInputSummary: {
        workflowIntent: 'existing_patient_new_visit', // conflicting intent
        patientClues: ['patient_id_provided', 'same_date_conflict_unresolved'],
        visitDate: '2024-04-12',
        findings: [],
    },
};
export const GC_SAME_DATE_CORRECTION_REQUIRED_EXPECTATION = {
    patientResolutionStatus: 'resolved_existing_patient',
    visitResolutionStatus: 'correction_needed_same_date_conflict',
    readinessStatus: 'blocked_requires_correction',
    planReadiness: 'blocked',
    allowedActionTypes: [],
    forbiddenActionTypes: ['create_visit', 'update_visit'],
    shouldExecute: false,
    shouldWrite: false,
    intentionallyBlocked: true,
    blockReason: 'same-date conflict requires explicit correction confirmation',
};
/**
 * GC_PATIENT_RECHECK_REQUIRED
 * Patient claimed but not found in state lookup
 * Expected: blocked_requires_recheck, no write
 */
export const GC_PATIENT_RECHECK_REQUIRED = {
    id: 'GC_PATIENT_RECHECK_REQUIRED',
    title: 'Patient Recheck Required',
    description: 'Patient was referenced but not found in current state; recheck required',
    currentStateLookup: {
        patientSearch: {
            found: false, // Patient not found despite being claimed
            candidateIds: [],
        },
    },
    contractInputSummary: {
        workflowIntent: 'existing_patient_new_visit',
        patientClues: ['patient_id_provided_but_not_found'],
        visitDate: '2024-04-12',
        findings: [],
    },
};
export const GC_PATIENT_RECHECK_REQUIRED_EXPECTATION = {
    patientResolutionStatus: 'recheck_required_patient_not_found',
    readinessStatus: 'blocked_requires_recheck',
    planReadiness: 'blocked',
    shouldExecute: false,
    shouldWrite: false,
    intentionallyBlocked: true,
    blockReason: 'patient recheck required before write',
};
/**
 * GC_DUPLICATE_SUSPICION
 * Multiple candidate patients found with similar clues
 * Expected: blocked_requires_correction, no write
 */
export const GC_DUPLICATE_SUSPICION = {
    id: 'GC_DUPLICATE_SUSPICION',
    title: 'Duplicate Suspicion',
    description: 'Multiple candidate patients found; duplicate suspected',
    currentStateLookup: {
        patientSearch: {
            found: false, // Multiple candidates, no clear match
            candidateIds: ['pat_candidate_001', 'pat_candidate_002', 'pat_candidate_003'],
        },
    },
    contractInputSummary: {
        workflowIntent: 'new_patient_new_visit',
        patientClues: ['patient_clues_match_multiple_records'],
        visitDate: '2024-04-12',
        findings: [],
    },
};
export const GC_DUPLICATE_SUSPICION_EXPECTATION = {
    patientResolutionStatus: 'correction_needed_patient_duplicate_suspicion',
    readinessStatus: 'blocked_requires_correction',
    planReadiness: 'blocked',
    shouldExecute: false,
    shouldWrite: false,
    intentionallyBlocked: true,
    blockReason: 'patient duplicate suspicion requires correction',
};
/**
 * GC_NEW_PATIENT_AUTO_CASE_CREATE
 * New patient + new visit + continuity none should auto-create a case
 */
export const GC_NEW_PATIENT_AUTO_CASE_CREATE = {
    id: 'GC_NEW_PATIENT_AUTO_CASE_CREATE',
    title: 'New Patient Auto Case Create',
    description: 'New patient new visit with continuity none should create patient, visit, case, and snapshots',
    currentStateLookup: {
        patientSearch: {
            found: false,
            patientId: '916872',
        },
        visitSearch: {
            found: false,
        },
    },
    contractInputSummary: {
        workflowIntent: 'new_patient_new_visit',
        continuityIntent: 'none',
        patientClues: ['patient_id_provided'],
        visitDate: '2022-10-13',
        findings: [
            { tooth: '14', branch: 'PRE' },
            { tooth: '14', branch: 'RAD' },
            { tooth: '14', branch: 'OP' },
            { tooth: '14', branch: 'DR' },
        ],
    },
};
export const GC_NEW_PATIENT_AUTO_CASE_CREATE_EXPECTATION = {
    patientResolutionStatus: 'create_new_patient',
    visitResolutionStatus: 'create_new_visit',
    caseResolutionStatus: 'create_case',
    readinessStatus: 'ready_for_write_plan',
    planReadiness: 'execution_ready',
    allowedActionTypes: [
        'create_patient',
        'create_visit',
        'create_case',
        'create_snapshot',
        'link_visit_to_case',
        'link_snapshot_to_case',
    ],
    shouldExecute: true,
    executionStatus: 'success',
    shouldWrite: true,
};
/**
 * GC_NEW_PATIENT_AUTO_CASE_MULTI_TOOTH
 * New patient + new visit + continuity none should create one case per tooth
 */
export const GC_NEW_PATIENT_AUTO_CASE_MULTI_TOOTH = {
    id: 'GC_NEW_PATIENT_AUTO_CASE_MULTI_TOOTH',
    title: 'New Patient Auto Case Multi Tooth',
    description: 'New patient multi-tooth episode should auto-create one case per touched tooth',
    currentStateLookup: {
        patientSearch: {
            found: false,
            patientId: '916873',
        },
        visitSearch: {
            found: false,
        },
    },
    contractInputSummary: {
        workflowIntent: 'new_patient_new_visit',
        continuityIntent: 'none',
        patientClues: ['patient_id_provided'],
        visitDate: '2022-10-14',
        findings: [
            { tooth: '14', branch: 'PRE' },
            { tooth: '15', branch: 'PRE' },
        ],
    },
};
export const GC_NEW_PATIENT_AUTO_CASE_MULTI_TOOTH_EXPECTATION = {
    patientResolutionStatus: 'create_new_patient',
    visitResolutionStatus: 'create_new_visit',
    caseResolutionStatus: 'create_case',
    readinessStatus: 'ready_for_write_plan',
    planReadiness: 'execution_ready',
    allowedActionTypes: [
        'create_patient',
        'create_visit',
        'create_case',
        'create_snapshot',
        'link_snapshot_to_case',
    ],
    shouldExecute: true,
    executionStatus: 'success',
    shouldWrite: true,
};
/**
 * GC_NEW_PATIENT_FOUND_CONFLICT
 * New patient flow must still protect against existing-patient conflicts
 */
export const GC_NEW_PATIENT_FOUND_CONFLICT = {
    id: 'GC_NEW_PATIENT_FOUND_CONFLICT',
    title: 'New Patient Found Conflict',
    description: 'New patient workflow must not blindly create a duplicate when lookup finds an existing patient',
    currentStateLookup: {
        patientSearch: {
            found: true,
            patientId: '916874',
        },
        visitSearch: {
            found: false,
        },
    },
    contractInputSummary: {
        workflowIntent: 'new_patient_new_visit',
        continuityIntent: 'none',
        patientClues: ['patient_id_provided'],
        visitDate: '2022-10-15',
        findings: [{ tooth: '14', branch: 'PRE' }],
    },
};
export const GC_NEW_PATIENT_FOUND_CONFLICT_EXPECTATION = {
    patientResolutionStatus: 'correction_needed_patient_duplicate_suspicion',
    readinessStatus: 'blocked_requires_correction',
    planReadiness: 'blocked',
    shouldExecute: false,
    shouldWrite: false,
    intentionallyBlocked: true,
    blockReason: 'new patient conflict still requires correction when an existing patient is found',
};
/**
 * GC_SAFE_CREATE_CASE
 * Explicit single-tooth create_case on a later-date visit
 * Expected: execution_ready, create_case executes successfully
 */
export const GC_SAFE_CREATE_CASE = {
    id: 'GC_SAFE_CREATE_CASE',
    title: 'Safe Create Case',
    description: 'Existing patient, explicit single-tooth create_case request, PRE-only safe slice',
    currentStateLookup: {
        patientSearch: {
            found: true,
            patientId: 'pat_existing_12345',
        },
        visitSearch: {
            found: false,
        },
    },
    contractInputSummary: {
        workflowIntent: 'existing_patient_new_visit',
        continuityIntent: 'create_case',
        patientClues: ['patient_id_provided'],
        visitDate: '2024-04-13',
        findings: [{ tooth: '11', branch: 'PRE' }],
    },
};
export const GC_SAFE_CREATE_CASE_EXPECTATION = {
    patientResolutionStatus: 'resolved_existing_patient',
    visitResolutionStatus: 'create_new_visit',
    caseResolutionStatus: 'create_case',
    readinessStatus: 'ready_for_write_plan',
    planReadiness: 'execution_ready',
    allowedActionTypes: [
        'attach_existing_patient',
        'create_visit',
        'create_case',
        'create_snapshot',
        'link_visit_to_case',
        'link_snapshot_to_case',
    ],
    forbiddenActionTypes: ['split_case', 'close_case', 'link_visit_to_patient'],
    shouldExecute: true,
    executionStatus: 'success',
    shouldWrite: true,
};
/**
 * GC_SAFE_CONTINUE_CASE
 * Safe continuation on an existing case
 * Expected: execution_ready, latest-case update executes successfully
 */
export const GC_SAFE_CONTINUE_CASE = {
    id: 'GC_SAFE_CONTINUE_CASE',
    title: 'Safe Continue Case',
    description: 'Existing patient, existing case, later-date PRE continuation with minimal case update',
    currentStateLookup: {
        patientSearch: {
            found: true,
            patientId: 'pat_existing_12345',
        },
        visitSearch: {
            found: false,
        },
        caseSearch: {
            found: true,
            caseId: 'case_existing_001',
        },
    },
    contractInputSummary: {
        workflowIntent: 'existing_patient_new_visit',
        continuityIntent: 'continue_case',
        patientClues: ['patient_id_provided'],
        visitDate: '2024-04-19',
        findings: [{ tooth: '11', branch: 'PRE' }],
    },
};
export const GC_SAFE_CONTINUE_CASE_EXPECTATION = {
    patientResolutionStatus: 'resolved_existing_patient',
    visitResolutionStatus: 'create_new_visit',
    caseResolutionStatus: 'continue_case',
    readinessStatus: 'ready_for_write_plan',
    planReadiness: 'execution_ready',
    allowedActionTypes: [
        'attach_existing_patient',
        'create_visit',
        'create_snapshot',
        'update_case_latest_synthesis',
        'link_visit_to_case',
        'link_snapshot_to_case',
    ],
    forbiddenActionTypes: ['create_case', 'split_case', 'close_case', 'link_visit_to_patient'],
    shouldExecute: true,
    executionStatus: 'success',
    shouldWrite: true,
};
/**
 * GC_SAFE_PLAN_CREATE
 * Safe PLAN create on the single-tooth Case-aware path
 * Expected: execution_ready, PLAN snapshot create succeeds
 */
export const GC_SAFE_PLAN_CREATE = {
    id: 'GC_SAFE_PLAN_CREATE',
    title: 'Safe PLAN Create',
    description: 'Existing patient, existing case, later-date PLAN snapshot create on the safe single-tooth path',
    currentStateLookup: {
        patientSearch: {
            found: true,
            patientId: 'pat_existing_12345',
        },
        visitSearch: {
            found: false,
        },
        caseSearch: {
            found: true,
            caseId: 'case_existing_001',
        },
    },
    contractInputSummary: {
        workflowIntent: 'existing_patient_new_visit',
        continuityIntent: 'continue_case',
        patientClues: ['patient_id_provided'],
        visitDate: '2024-04-26',
        findings: [{ tooth: '11', branch: 'PLAN' }],
    },
};
export const GC_SAFE_PLAN_CREATE_EXPECTATION = {
    patientResolutionStatus: 'resolved_existing_patient',
    visitResolutionStatus: 'create_new_visit',
    caseResolutionStatus: 'continue_case',
    readinessStatus: 'ready_for_write_plan',
    planReadiness: 'execution_ready',
    allowedActionTypes: [
        'attach_existing_patient',
        'create_visit',
        'create_snapshot',
        'update_case_latest_synthesis',
        'link_visit_to_case',
        'link_snapshot_to_case',
    ],
    forbiddenActionTypes: ['create_case', 'split_case', 'close_case'],
    shouldExecute: true,
    executionStatus: 'success',
    shouldWrite: true,
};
/**
 * GC_SAFE_PLAN_UPDATE
 * Same-date PLAN correction with an explicit existing PLAN row target
 * Expected: execution_ready, PLAN snapshot update succeeds
 */
export const GC_SAFE_PLAN_UPDATE = {
    id: 'GC_SAFE_PLAN_UPDATE',
    title: 'Safe PLAN Update',
    description: 'Same-date PLAN correction proceeds only when an explicit existing PLAN row target is available',
    currentStateLookup: {
        patientSearch: {
            found: true,
            patientId: 'pat_existing_12345',
        },
        visitSearch: {
            found: true,
            visitId: 'vis_same_date_001',
            date: '2024-04-12',
        },
        caseSearch: {
            found: true,
            caseId: 'case_existing_001',
        },
        snapshotSearch: [
            {
                found: true,
                branch: 'PLAN',
                tooth: '11',
                recordId: 'rec_plan_same_date_001',
                visitId: 'vis_same_date_001',
                recordName: 'vis_same_date_001-11-PLAN',
            },
        ],
    },
    contractInputSummary: {
        workflowIntent: 'existing_visit_update',
        continuityIntent: 'continue_case',
        patientClues: ['patient_id_provided', 'same_date_known'],
        visitDate: '2024-04-12',
        findings: [{ tooth: '11', branch: 'PLAN' }],
    },
};
export const GC_SAFE_PLAN_UPDATE_EXPECTATION = {
    patientResolutionStatus: 'resolved_existing_patient',
    visitResolutionStatus: 'update_existing_visit_same_date',
    caseResolutionStatus: 'none',
    readinessStatus: 'ready_for_write_plan',
    planReadiness: 'execution_ready',
    allowedActionTypes: ['attach_existing_patient', 'no_op_visit', 'update_snapshot'],
    forbiddenActionTypes: ['create_visit', 'create_snapshot', 'create_case'],
    shouldExecute: true,
    executionStatus: 'success',
    shouldWrite: true,
};
/**
 * GC_SAFE_DR_CREATE
 * Safe DR create on the single-tooth Case-aware path
 * Expected: execution_ready, DR snapshot create succeeds
 */
export const GC_SAFE_DR_CREATE = {
    id: 'GC_SAFE_DR_CREATE',
    title: 'Safe DR Create',
    description: 'Existing patient, existing case, later-date DR snapshot create on the safe single-tooth path',
    currentStateLookup: {
        patientSearch: {
            found: true,
            patientId: 'pat_existing_12345',
        },
        visitSearch: {
            found: false,
        },
        caseSearch: {
            found: true,
            caseId: 'case_existing_001',
        },
    },
    contractInputSummary: {
        workflowIntent: 'existing_patient_new_visit',
        continuityIntent: 'continue_case',
        patientClues: ['patient_id_provided'],
        visitDate: '2024-04-27',
        findings: [{ tooth: '11', branch: 'DR' }],
    },
};
export const GC_SAFE_DR_CREATE_EXPECTATION = {
    patientResolutionStatus: 'resolved_existing_patient',
    visitResolutionStatus: 'create_new_visit',
    caseResolutionStatus: 'continue_case',
    readinessStatus: 'ready_for_write_plan',
    planReadiness: 'execution_ready',
    allowedActionTypes: [
        'attach_existing_patient',
        'create_visit',
        'create_snapshot',
        'update_case_latest_synthesis',
        'link_visit_to_case',
        'link_snapshot_to_case',
    ],
    forbiddenActionTypes: ['create_case', 'split_case', 'close_case'],
    shouldExecute: true,
    executionStatus: 'success',
    shouldWrite: true,
};
/**
 * GC_SAFE_DR_UPDATE
 * Same-date DR correction with an explicit existing DR row target
 * Expected: execution_ready, DR snapshot update succeeds
 */
export const GC_SAFE_DR_UPDATE = {
    id: 'GC_SAFE_DR_UPDATE',
    title: 'Safe DR Update',
    description: 'Same-date DR correction proceeds only when an explicit existing DR row target is available',
    currentStateLookup: {
        patientSearch: {
            found: true,
            patientId: 'pat_existing_12345',
        },
        visitSearch: {
            found: true,
            visitId: 'vis_same_date_001',
            date: '2024-04-12',
        },
        caseSearch: {
            found: true,
            caseId: 'case_existing_001',
        },
        snapshotSearch: [
            {
                found: true,
                branch: 'DR',
                tooth: '11',
                recordId: 'rec_dr_same_date_001',
                visitId: 'vis_same_date_001',
                recordName: 'vis_same_date_001-11-DR',
            },
        ],
    },
    contractInputSummary: {
        workflowIntent: 'existing_visit_update',
        continuityIntent: 'continue_case',
        patientClues: ['patient_id_provided', 'same_date_known'],
        visitDate: '2024-04-12',
        findings: [{ tooth: '11', branch: 'DR' }],
    },
};
export const GC_SAFE_DR_UPDATE_EXPECTATION = {
    patientResolutionStatus: 'resolved_existing_patient',
    visitResolutionStatus: 'update_existing_visit_same_date',
    caseResolutionStatus: 'none',
    readinessStatus: 'ready_for_write_plan',
    planReadiness: 'execution_ready',
    allowedActionTypes: ['attach_existing_patient', 'no_op_visit', 'update_snapshot'],
    forbiddenActionTypes: ['create_visit', 'create_snapshot', 'create_case'],
    shouldExecute: true,
    executionStatus: 'success',
    shouldWrite: true,
};
/**
 * GC_SAFE_DX_CREATE
 * Safe DX create on the single-tooth Case-aware path
 * Expected: execution_ready, DX snapshot create succeeds
 */
export const GC_SAFE_DX_CREATE = {
    id: 'GC_SAFE_DX_CREATE',
    title: 'Safe DX Create',
    description: 'Existing patient, existing case, later-date DX snapshot create on the safe single-tooth path',
    currentStateLookup: {
        patientSearch: {
            found: true,
            patientId: 'pat_existing_12345',
        },
        visitSearch: {
            found: false,
        },
        caseSearch: {
            found: true,
            caseId: 'case_existing_001',
        },
    },
    contractInputSummary: {
        workflowIntent: 'existing_patient_new_visit',
        continuityIntent: 'continue_case',
        patientClues: ['patient_id_provided'],
        visitDate: '2024-04-28',
        findings: [{ tooth: '11', branch: 'DX' }],
    },
};
export const GC_SAFE_DX_CREATE_EXPECTATION = {
    patientResolutionStatus: 'resolved_existing_patient',
    visitResolutionStatus: 'create_new_visit',
    caseResolutionStatus: 'continue_case',
    readinessStatus: 'ready_for_write_plan',
    planReadiness: 'execution_ready',
    allowedActionTypes: [
        'attach_existing_patient',
        'create_visit',
        'create_snapshot',
        'update_case_latest_synthesis',
        'link_visit_to_case',
        'link_snapshot_to_case',
    ],
    forbiddenActionTypes: ['create_case', 'split_case', 'close_case'],
    shouldExecute: true,
    executionStatus: 'success',
    shouldWrite: true,
};
/**
 * GC_SAFE_DX_UPDATE
 * Same-date DX correction with an explicit existing DX row target
 * Expected: execution_ready, DX snapshot update succeeds
 */
export const GC_SAFE_DX_UPDATE = {
    id: 'GC_SAFE_DX_UPDATE',
    title: 'Safe DX Update',
    description: 'Same-date DX correction proceeds only when an explicit existing DX row target is available',
    currentStateLookup: {
        patientSearch: {
            found: true,
            patientId: 'pat_existing_12345',
        },
        visitSearch: {
            found: true,
            visitId: 'vis_same_date_001',
            date: '2024-04-12',
        },
        caseSearch: {
            found: true,
            caseId: 'case_existing_001',
        },
        snapshotSearch: [
            {
                found: true,
                branch: 'DX',
                tooth: '11',
                recordId: 'rec_dx_same_date_001',
                visitId: 'vis_same_date_001',
                recordName: 'vis_same_date_001-11-DX',
            },
        ],
    },
    contractInputSummary: {
        workflowIntent: 'existing_visit_update',
        continuityIntent: 'continue_case',
        patientClues: ['patient_id_provided', 'same_date_known'],
        visitDate: '2024-04-12',
        findings: [{ tooth: '11', branch: 'DX' }],
    },
};
export const GC_SAFE_DX_UPDATE_EXPECTATION = {
    patientResolutionStatus: 'resolved_existing_patient',
    visitResolutionStatus: 'update_existing_visit_same_date',
    caseResolutionStatus: 'none',
    readinessStatus: 'ready_for_write_plan',
    planReadiness: 'execution_ready',
    allowedActionTypes: ['attach_existing_patient', 'no_op_visit', 'update_snapshot'],
    forbiddenActionTypes: ['create_visit', 'create_snapshot', 'create_case'],
    shouldExecute: true,
    executionStatus: 'success',
    shouldWrite: true,
};
/**
 * GC_SAFE_RAD_CREATE
 * Safe RAD create on the single-tooth Case-aware path
 * Expected: execution_ready, RAD snapshot create succeeds
 */
export const GC_SAFE_RAD_CREATE = {
    id: 'GC_SAFE_RAD_CREATE',
    title: 'Safe RAD Create',
    description: 'Existing patient, existing case, later-date RAD snapshot create on the safe single-tooth path',
    currentStateLookup: {
        patientSearch: {
            found: true,
            patientId: 'pat_existing_12345',
        },
        visitSearch: {
            found: false,
        },
        caseSearch: {
            found: true,
            caseId: 'case_existing_001',
        },
    },
    contractInputSummary: {
        workflowIntent: 'existing_patient_new_visit',
        continuityIntent: 'continue_case',
        patientClues: ['patient_id_provided'],
        visitDate: '2024-04-29',
        findings: [{ tooth: '11', branch: 'RAD' }],
    },
};
export const GC_SAFE_RAD_CREATE_EXPECTATION = {
    patientResolutionStatus: 'resolved_existing_patient',
    visitResolutionStatus: 'create_new_visit',
    caseResolutionStatus: 'continue_case',
    readinessStatus: 'ready_for_write_plan',
    planReadiness: 'execution_ready',
    allowedActionTypes: [
        'attach_existing_patient',
        'create_visit',
        'create_snapshot',
        'update_case_latest_synthesis',
        'link_visit_to_case',
        'link_snapshot_to_case',
    ],
    forbiddenActionTypes: ['create_case', 'split_case', 'close_case'],
    shouldExecute: true,
    executionStatus: 'success',
    shouldWrite: true,
};
/**
 * GC_SAFE_RAD_UPDATE
 * Same-date RAD correction with an explicit existing RAD row target
 * Expected: execution_ready, RAD snapshot update succeeds
 */
export const GC_SAFE_RAD_UPDATE = {
    id: 'GC_SAFE_RAD_UPDATE',
    title: 'Safe RAD Update',
    description: 'Same-date RAD correction proceeds only when an explicit existing RAD row target is available',
    currentStateLookup: {
        patientSearch: {
            found: true,
            patientId: 'pat_existing_12345',
        },
        visitSearch: {
            found: true,
            visitId: 'vis_same_date_001',
            date: '2024-04-12',
        },
        caseSearch: {
            found: true,
            caseId: 'case_existing_001',
        },
        snapshotSearch: [
            {
                found: true,
                branch: 'RAD',
                tooth: '11',
                recordId: 'rec_rad_same_date_001',
                visitId: 'vis_same_date_001',
                recordName: 'vis_same_date_001-11-RAD',
            },
        ],
    },
    contractInputSummary: {
        workflowIntent: 'existing_visit_update',
        continuityIntent: 'continue_case',
        patientClues: ['patient_id_provided', 'same_date_known'],
        visitDate: '2024-04-12',
        findings: [{ tooth: '11', branch: 'RAD' }],
    },
};
export const GC_SAFE_RAD_UPDATE_EXPECTATION = {
    patientResolutionStatus: 'resolved_existing_patient',
    visitResolutionStatus: 'update_existing_visit_same_date',
    caseResolutionStatus: 'none',
    readinessStatus: 'ready_for_write_plan',
    planReadiness: 'execution_ready',
    allowedActionTypes: ['attach_existing_patient', 'no_op_visit', 'update_snapshot'],
    forbiddenActionTypes: ['create_visit', 'create_snapshot', 'create_case'],
    shouldExecute: true,
    executionStatus: 'success',
    shouldWrite: true,
};
/**
 * GC_SAFE_OP_CREATE
 * Safe OP create on the single-tooth Case-aware path
 * Expected: execution_ready, OP snapshot create succeeds
 */
export const GC_SAFE_OP_CREATE = {
    id: 'GC_SAFE_OP_CREATE',
    title: 'Safe OP Create',
    description: 'Existing patient, existing case, later-date OP snapshot create on the safe single-tooth path',
    currentStateLookup: {
        patientSearch: {
            found: true,
            patientId: 'pat_existing_12345',
        },
        visitSearch: {
            found: false,
        },
        caseSearch: {
            found: true,
            caseId: 'case_existing_001',
        },
    },
    contractInputSummary: {
        workflowIntent: 'existing_patient_new_visit',
        continuityIntent: 'continue_case',
        patientClues: ['patient_id_provided'],
        visitDate: '2024-04-30',
        findings: [{ tooth: '11', branch: 'OP' }],
    },
};
export const GC_SAFE_OP_CREATE_EXPECTATION = {
    patientResolutionStatus: 'resolved_existing_patient',
    visitResolutionStatus: 'create_new_visit',
    caseResolutionStatus: 'continue_case',
    readinessStatus: 'ready_for_write_plan',
    planReadiness: 'execution_ready',
    allowedActionTypes: [
        'attach_existing_patient',
        'create_visit',
        'create_snapshot',
        'update_case_latest_synthesis',
        'link_visit_to_case',
        'link_snapshot_to_case',
    ],
    forbiddenActionTypes: ['create_case', 'split_case', 'close_case'],
    shouldExecute: true,
    executionStatus: 'success',
    shouldWrite: true,
};
/**
 * GC_SAFE_OP_UPDATE
 * Same-date OP correction with an explicit existing OP row target
 * Expected: execution_ready, OP snapshot update succeeds
 */
export const GC_SAFE_OP_UPDATE = {
    id: 'GC_SAFE_OP_UPDATE',
    title: 'Safe OP Update',
    description: 'Same-date OP correction proceeds only when an explicit existing OP row target is available',
    currentStateLookup: {
        patientSearch: {
            found: true,
            patientId: 'pat_existing_12345',
        },
        visitSearch: {
            found: true,
            visitId: 'vis_same_date_001',
            date: '2024-04-12',
        },
        caseSearch: {
            found: true,
            caseId: 'case_existing_001',
        },
        snapshotSearch: [
            {
                found: true,
                branch: 'OP',
                tooth: '11',
                recordId: 'rec_op_same_date_001',
                visitId: 'vis_same_date_001',
                recordName: 'vis_same_date_001-11-OP',
            },
        ],
    },
    contractInputSummary: {
        workflowIntent: 'existing_visit_update',
        continuityIntent: 'continue_case',
        patientClues: ['patient_id_provided', 'same_date_known'],
        visitDate: '2024-04-12',
        findings: [{ tooth: '11', branch: 'OP' }],
    },
};
export const GC_SAFE_OP_UPDATE_EXPECTATION = {
    patientResolutionStatus: 'resolved_existing_patient',
    visitResolutionStatus: 'update_existing_visit_same_date',
    caseResolutionStatus: 'none',
    readinessStatus: 'ready_for_write_plan',
    planReadiness: 'execution_ready',
    allowedActionTypes: ['attach_existing_patient', 'no_op_visit', 'update_snapshot'],
    forbiddenActionTypes: ['create_visit', 'create_snapshot', 'create_case'],
    shouldExecute: true,
    executionStatus: 'success',
    shouldWrite: true,
};
/**
 * GC_BLOCKED_CASE_AMBIGUITY
 * Continuation requested but no safe case target exists
 * Expected: blocked_unresolved, no write
 */
export const GC_BLOCKED_CASE_AMBIGUITY = {
    id: 'GC_BLOCKED_CASE_AMBIGUITY',
    title: 'Blocked Case Ambiguity',
    description: 'Continuation requested but no matching existing case was found; runtime must stay blocked',
    currentStateLookup: {
        patientSearch: {
            found: true,
            patientId: 'pat_existing_12345',
        },
        visitSearch: {
            found: false,
        },
        caseSearch: {
            found: false,
        },
    },
    contractInputSummary: {
        workflowIntent: 'existing_patient_new_visit',
        continuityIntent: 'continue_case',
        patientClues: ['patient_id_provided'],
        visitDate: '2024-04-19',
        findings: [{ tooth: '11', branch: 'PRE' }],
    },
};
export const GC_BLOCKED_CASE_AMBIGUITY_EXPECTATION = {
    patientResolutionStatus: 'resolved_existing_patient',
    visitResolutionStatus: 'create_new_visit',
    caseResolutionStatus: 'unresolved_case_ambiguity',
    readinessStatus: 'blocked_unresolved',
    planReadiness: 'blocked',
    shouldExecute: false,
    shouldWrite: false,
    intentionallyBlocked: true,
    blockReason: 'case continuity is unresolved and must stay blocked',
};
/**
 * GC_BLOCKED_PLAN_UPDATE
 * Same-date PLAN correction without an explicit existing PLAN row target
 * Expected: provider adapter blocks honestly before write
 */
export const GC_BLOCKED_PLAN_UPDATE = {
    id: 'GC_BLOCKED_PLAN_UPDATE',
    title: 'Blocked PLAN Update',
    description: 'Same-date PLAN correction remains blocked when no explicit existing PLAN row target is available',
    currentStateLookup: {
        patientSearch: {
            found: true,
            patientId: 'pat_existing_12345',
        },
        visitSearch: {
            found: true,
            visitId: 'vis_same_date_001',
            date: '2024-04-12',
        },
        caseSearch: {
            found: true,
            caseId: 'case_existing_001',
        },
    },
    contractInputSummary: {
        workflowIntent: 'existing_visit_update',
        continuityIntent: 'continue_case',
        patientClues: ['patient_id_provided', 'same_date_known'],
        visitDate: '2024-04-12',
        findings: [{ tooth: '11', branch: 'PLAN' }],
    },
};
export const GC_BLOCKED_PLAN_UPDATE_EXPECTATION = {
    patientResolutionStatus: 'resolved_existing_patient',
    visitResolutionStatus: 'update_existing_visit_same_date',
    caseResolutionStatus: 'none',
    readinessStatus: 'ready_for_write_plan',
    planReadiness: 'execution_ready',
    shouldExecute: true,
    shouldWrite: false,
    intentionallyBlocked: true,
    blockReason: 'PLAN update remains blocked without an explicit existing PLAN row target',
};
/**
 * GC_BLOCKED_DR_UPDATE
 * Same-date DR correction without an explicit existing DR row target
 * Expected: provider adapter blocks honestly before write
 */
export const GC_BLOCKED_DR_UPDATE = {
    id: 'GC_BLOCKED_DR_UPDATE',
    title: 'Blocked DR Update',
    description: 'Same-date DR correction remains blocked when no explicit existing DR row target is available',
    currentStateLookup: {
        patientSearch: {
            found: true,
            patientId: 'pat_existing_12345',
        },
        visitSearch: {
            found: true,
            visitId: 'vis_same_date_001',
            date: '2024-04-12',
        },
        caseSearch: {
            found: true,
            caseId: 'case_existing_001',
        },
    },
    contractInputSummary: {
        workflowIntent: 'existing_visit_update',
        continuityIntent: 'continue_case',
        patientClues: ['patient_id_provided', 'same_date_known'],
        visitDate: '2024-04-12',
        findings: [{ tooth: '11', branch: 'DR' }],
    },
};
export const GC_BLOCKED_DR_UPDATE_EXPECTATION = {
    patientResolutionStatus: 'resolved_existing_patient',
    visitResolutionStatus: 'update_existing_visit_same_date',
    caseResolutionStatus: 'none',
    readinessStatus: 'ready_for_write_plan',
    planReadiness: 'execution_ready',
    shouldExecute: true,
    shouldWrite: false,
    intentionallyBlocked: true,
    blockReason: 'DR update remains blocked without an explicit existing DR row target',
};
/**
 * GC_BLOCKED_DX_UPDATE
 * Same-date DX correction without an explicit existing DX row target
 * Expected: provider adapter blocks honestly before write
 */
export const GC_BLOCKED_DX_UPDATE = {
    id: 'GC_BLOCKED_DX_UPDATE',
    title: 'Blocked DX Update',
    description: 'Same-date DX correction remains blocked when no explicit existing DX row target is available',
    currentStateLookup: {
        patientSearch: {
            found: true,
            patientId: 'pat_existing_12345',
        },
        visitSearch: {
            found: true,
            visitId: 'vis_same_date_001',
            date: '2024-04-12',
        },
        caseSearch: {
            found: true,
            caseId: 'case_existing_001',
        },
    },
    contractInputSummary: {
        workflowIntent: 'existing_visit_update',
        continuityIntent: 'continue_case',
        patientClues: ['patient_id_provided', 'same_date_known'],
        visitDate: '2024-04-12',
        findings: [{ tooth: '11', branch: 'DX' }],
    },
};
export const GC_BLOCKED_DX_UPDATE_EXPECTATION = {
    patientResolutionStatus: 'resolved_existing_patient',
    visitResolutionStatus: 'update_existing_visit_same_date',
    caseResolutionStatus: 'none',
    readinessStatus: 'ready_for_write_plan',
    planReadiness: 'execution_ready',
    shouldExecute: true,
    shouldWrite: false,
    intentionallyBlocked: true,
    blockReason: 'DX update remains blocked without an explicit existing DX row target',
};
/**
 * GC_BLOCKED_RAD_UPDATE
 * Same-date RAD correction without an explicit existing RAD row target
 * Expected: provider adapter blocks honestly before write
 */
export const GC_BLOCKED_RAD_UPDATE = {
    id: 'GC_BLOCKED_RAD_UPDATE',
    title: 'Blocked RAD Update',
    description: 'Same-date RAD correction remains blocked when no explicit existing RAD row target is available',
    currentStateLookup: {
        patientSearch: {
            found: true,
            patientId: 'pat_existing_12345',
        },
        visitSearch: {
            found: true,
            visitId: 'vis_same_date_001',
            date: '2024-04-12',
        },
        caseSearch: {
            found: true,
            caseId: 'case_existing_001',
        },
    },
    contractInputSummary: {
        workflowIntent: 'existing_visit_update',
        continuityIntent: 'continue_case',
        patientClues: ['patient_id_provided', 'same_date_known'],
        visitDate: '2024-04-12',
        findings: [{ tooth: '11', branch: 'RAD' }],
    },
};
export const GC_BLOCKED_RAD_UPDATE_EXPECTATION = {
    patientResolutionStatus: 'resolved_existing_patient',
    visitResolutionStatus: 'update_existing_visit_same_date',
    caseResolutionStatus: 'none',
    readinessStatus: 'ready_for_write_plan',
    planReadiness: 'execution_ready',
    shouldExecute: true,
    shouldWrite: false,
    intentionallyBlocked: true,
    blockReason: 'RAD update remains blocked without an explicit existing RAD row target',
};
/**
 * GC_BLOCKED_OP_UPDATE
 * Same-date OP correction without an explicit existing OP row target
 * Expected: provider adapter blocks honestly before write
 */
export const GC_BLOCKED_OP_UPDATE = {
    id: 'GC_BLOCKED_OP_UPDATE',
    title: 'Blocked OP Update',
    description: 'Same-date OP correction remains blocked when no explicit existing OP row target is available',
    currentStateLookup: {
        patientSearch: {
            found: true,
            patientId: 'pat_existing_12345',
        },
        visitSearch: {
            found: true,
            visitId: 'vis_same_date_001',
            date: '2024-04-12',
        },
        caseSearch: {
            found: true,
            caseId: 'case_existing_001',
        },
    },
    contractInputSummary: {
        workflowIntent: 'existing_visit_update',
        continuityIntent: 'continue_case',
        patientClues: ['patient_id_provided', 'same_date_known'],
        visitDate: '2024-04-12',
        findings: [{ tooth: '11', branch: 'OP' }],
    },
};
export const GC_BLOCKED_OP_UPDATE_EXPECTATION = {
    patientResolutionStatus: 'resolved_existing_patient',
    visitResolutionStatus: 'update_existing_visit_same_date',
    caseResolutionStatus: 'none',
    readinessStatus: 'ready_for_write_plan',
    planReadiness: 'execution_ready',
    shouldExecute: true,
    shouldWrite: false,
    intentionallyBlocked: true,
    blockReason: 'OP update remains blocked without an explicit existing OP row target',
};
/**
 * GC_BLOCKED_CASE_MAPPING
 * Split case remains intentionally unsupported
 * Expected: provider adapter blocks with canon-confirm-required, no write
 */
export const GC_BLOCKED_CASE_MAPPING = {
    id: 'GC_BLOCKED_CASE_MAPPING',
    title: 'Blocked Case Split Mapping',
    description: 'Scenario triggering split_case; provider adapter must block because split semantics are still intentionally unsupported',
    currentStateLookup: {
        patientSearch: {
            found: true,
            patientId: 'pat_existing_12345',
        },
        visitSearch: {
            found: false,
        },
        caseSearch: {
            found: true,
            caseId: 'case_existing_001',
        },
    },
    contractInputSummary: {
        workflowIntent: 'existing_patient_new_visit',
        continuityIntent: 'split_case',
        patientClues: ['patient_id_provided'],
        visitDate: '2024-04-13', // Different date (later)
        findings: [{ tooth: '11', branch: 'PRE' }],
    },
};
export const GC_BLOCKED_CASE_MAPPING_EXPECTATION = {
    patientResolutionStatus: 'resolved_existing_patient',
    visitResolutionStatus: 'create_new_visit',
    caseResolutionStatus: 'split_case',
    planReadiness: 'execution_ready', // Plan is ready
    shouldExecute: true,
    shouldWrite: false,
    intentionallyBlocked: true,
    blockReason: 'split_case remains intentionally blocked',
};
/**
 * GC_NO_OP
 * No meaningful write actions (e.g., no findings, no updates)
 * Expected: plan => no_op, no write
 */
export const GC_NO_OP = {
    id: 'GC_NO_OP',
    title: 'No-Op Scenario',
    description: 'No meaningful write actions detected',
    currentStateLookup: {
        patientSearch: {
            found: true,
            patientId: 'pat_existing_12345',
        },
        visitSearch: {
            found: true,
            visitId: 'vis_existing_001',
            date: '2024-04-12',
        },
    },
    contractInputSummary: {
        workflowIntent: 'existing_visit_update',
        patientClues: [],
        visitDate: '2024-04-12',
        findings: [], // No findings to write
    },
};
export const GC_NO_OP_EXPECTATION = {
    patientResolutionStatus: 'resolved_existing_patient',
    visitResolutionStatus: 'update_existing_visit_same_date',
    planReadiness: 'preview_only',
    shouldExecute: false,
    shouldWrite: false,
    executionStatus: 'no_op',
};
/**
 * GC_PARTIAL_FAILURE
 * Use fake provider to simulate partial success (first action succeeds, second fails)
 * Expected: execution => partial_success or failed_after_partial_write
 */
export const GC_PARTIAL_FAILURE = {
    id: 'GC_PARTIAL_FAILURE',
    title: 'Partial Failure Recovery',
    description: 'Plan execution with fake provider failing mid-sequence; partial success expected',
    currentStateLookup: {
        patientSearch: {
            found: true,
            patientId: 'pat_existing_12345',
        },
        visitSearch: {
            found: false,
        },
    },
    contractInputSummary: {
        workflowIntent: 'existing_patient_new_visit',
        patientClues: ['patient_id_provided'],
        visitDate: '2024-04-12',
        findings: [{ tooth: '11', branch: 'PRE' }],
    },
};
export const GC_PARTIAL_FAILURE_EXPECTATION = {
    patientResolutionStatus: 'resolved_existing_patient',
    visitResolutionStatus: 'create_new_visit',
    planReadiness: 'execution_ready',
    shouldExecute: true,
    shouldWrite: true,
    executionStatus: 'partial_success',
    replayEligible: false,
};
/**
 * All scenarios
 */
export const ALL_GOLDEN_CASES = [
    { input: GC_SAFE_NEW_VISIT, expectation: GC_SAFE_NEW_VISIT_EXPECTATION },
    { input: GC_SAME_DATE_UPDATE, expectation: GC_SAME_DATE_UPDATE_EXPECTATION },
    { input: GC_SAME_DATE_CORRECTION_REQUIRED, expectation: GC_SAME_DATE_CORRECTION_REQUIRED_EXPECTATION },
    { input: GC_PATIENT_RECHECK_REQUIRED, expectation: GC_PATIENT_RECHECK_REQUIRED_EXPECTATION },
    { input: GC_DUPLICATE_SUSPICION, expectation: GC_DUPLICATE_SUSPICION_EXPECTATION },
    { input: GC_NEW_PATIENT_AUTO_CASE_CREATE, expectation: GC_NEW_PATIENT_AUTO_CASE_CREATE_EXPECTATION },
    { input: GC_NEW_PATIENT_AUTO_CASE_MULTI_TOOTH, expectation: GC_NEW_PATIENT_AUTO_CASE_MULTI_TOOTH_EXPECTATION },
    { input: GC_NEW_PATIENT_FOUND_CONFLICT, expectation: GC_NEW_PATIENT_FOUND_CONFLICT_EXPECTATION },
    { input: GC_SAFE_CREATE_CASE, expectation: GC_SAFE_CREATE_CASE_EXPECTATION },
    { input: GC_SAFE_CONTINUE_CASE, expectation: GC_SAFE_CONTINUE_CASE_EXPECTATION },
    { input: GC_SAFE_PLAN_CREATE, expectation: GC_SAFE_PLAN_CREATE_EXPECTATION },
    { input: GC_SAFE_PLAN_UPDATE, expectation: GC_SAFE_PLAN_UPDATE_EXPECTATION },
    { input: GC_SAFE_DR_CREATE, expectation: GC_SAFE_DR_CREATE_EXPECTATION },
    { input: GC_SAFE_DR_UPDATE, expectation: GC_SAFE_DR_UPDATE_EXPECTATION },
    { input: GC_SAFE_DX_CREATE, expectation: GC_SAFE_DX_CREATE_EXPECTATION },
    { input: GC_SAFE_DX_UPDATE, expectation: GC_SAFE_DX_UPDATE_EXPECTATION },
    { input: GC_SAFE_RAD_CREATE, expectation: GC_SAFE_RAD_CREATE_EXPECTATION },
    { input: GC_SAFE_RAD_UPDATE, expectation: GC_SAFE_RAD_UPDATE_EXPECTATION },
    { input: GC_SAFE_OP_CREATE, expectation: GC_SAFE_OP_CREATE_EXPECTATION },
    { input: GC_SAFE_OP_UPDATE, expectation: GC_SAFE_OP_UPDATE_EXPECTATION },
    { input: GC_BLOCKED_CASE_AMBIGUITY, expectation: GC_BLOCKED_CASE_AMBIGUITY_EXPECTATION },
    { input: GC_BLOCKED_CASE_MAPPING, expectation: GC_BLOCKED_CASE_MAPPING_EXPECTATION },
    { input: GC_BLOCKED_PLAN_UPDATE, expectation: GC_BLOCKED_PLAN_UPDATE_EXPECTATION },
    { input: GC_BLOCKED_DR_UPDATE, expectation: GC_BLOCKED_DR_UPDATE_EXPECTATION },
    { input: GC_BLOCKED_DX_UPDATE, expectation: GC_BLOCKED_DX_UPDATE_EXPECTATION },
    { input: GC_BLOCKED_RAD_UPDATE, expectation: GC_BLOCKED_RAD_UPDATE_EXPECTATION },
    { input: GC_BLOCKED_OP_UPDATE, expectation: GC_BLOCKED_OP_UPDATE_EXPECTATION },
    { input: GC_NO_OP, expectation: GC_NO_OP_EXPECTATION },
    { input: GC_PARTIAL_FAILURE, expectation: GC_PARTIAL_FAILURE_EXPECTATION },
];
