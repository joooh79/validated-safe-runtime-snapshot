/**
 * Example Execution Results for Different Scenarios
 *
 * These are minimal fixtures showing what execution results look like
 * for representative execution outcomes.
 *
 * Used for testing, documentation, and rapid prototyping.
 */
/**
 * Example 1: Successful Execution
 * Scenario: All plan actions execute successfully
 */
export const successfulExecutionExample = {
    planId: 'plan_example01',
    requestId: 'req_12345',
    status: 'success',
    actionResults: [
        {
            actionId: 'action_aaa1_1',
            actionType: 'attach_existing_patient',
            status: 'success',
            providerRef: 'pat_existing_001_attached',
        },
    ],
    completedActionIds: ['action_aaa1_1'],
    failedActionIds: [],
    skippedActionIds: [],
    createdRefs: {},
    updatedRefs: {},
    replayEligible: false,
    summary: '✓ Execution complete: 1 action(s) succeeded',
};
/**
 * Example 2: Partial Success Execution
 * Scenario: Some actions succeed, some fail; partial progress made
 */
export const partialSuccessExecutionExample = {
    planId: 'plan_example02',
    requestId: 'req_12346',
    status: 'partial_success',
    actionResults: [
        {
            actionId: 'action_aaa2_1',
            actionType: 'create_patient',
            status: 'success',
            providerRef: 'pat_new_12345',
        },
        {
            actionId: 'action_aaa2_2',
            actionType: 'create_visit',
            status: 'failed',
            errorMessage: 'Provider returned error: invalid visit date',
        },
    ],
    completedActionIds: ['action_aaa2_1'],
    failedActionIds: ['action_aaa2_2'],
    skippedActionIds: [],
    createdRefs: {
        patient_action_aaa2_1: 'pat_new_12345',
    },
    updatedRefs: {},
    replayEligible: true,
    summary: '⚠ Partial success: 1 action(s) succeeded, 1 failed',
};
/**
 * Example 3: Blocked Before Write
 * Scenario: Plan was not execution-ready; no actions attempted
 */
export const blockedExecutionExample = {
    planId: 'plan_example03',
    requestId: 'req_12347',
    status: 'blocked_before_write',
    actionResults: [],
    completedActionIds: [],
    failedActionIds: [],
    skippedActionIds: [],
    createdRefs: {},
    updatedRefs: {},
    replayEligible: false,
    summary: '🛑 Execution blocked: plan not ready for write',
};
/**
 * Example 4: No-Op Execution
 * Scenario: Plan had only no-op actions; nothing to execute
 */
export const noOpExecutionExample = {
    planId: 'plan_example04',
    requestId: 'req_12348',
    status: 'no_op',
    actionResults: [
        {
            actionId: 'action_aaa4_1',
            actionType: 'no_op_patient',
            status: 'no_op',
        },
    ],
    completedActionIds: [],
    failedActionIds: [],
    skippedActionIds: [],
    createdRefs: {},
    updatedRefs: {},
    replayEligible: false,
    summary: 'ℹ No-op: no executable actions',
};
/**
 * Example 5: Failed After Partial Write
 * Scenario: First action succeeds, second fails, third is skipped due to dependency
 */
export const failedAfterPartialExample = {
    planId: 'plan_example05',
    requestId: 'req_12349',
    status: 'failed_after_partial_write',
    actionResults: [
        {
            actionId: 'action_aaa5_1',
            actionType: 'create_patient',
            status: 'success',
            providerRef: 'pat_new_99999',
        },
        {
            actionId: 'action_aaa5_2',
            actionType: 'create_visit',
            status: 'failed',
            errorMessage: 'Provider error: visit table write failed',
        },
        {
            actionId: 'action_aaa5_3',
            actionType: 'create_snapshot',
            status: 'skipped',
            errorMessage: 'upstream dependency failed: action_aaa5_2',
        },
    ],
    completedActionIds: ['action_aaa5_1'],
    failedActionIds: ['action_aaa5_2'],
    skippedActionIds: ['action_aaa5_3'],
    createdRefs: {
        patient_action_aaa5_1: 'pat_new_99999',
    },
    updatedRefs: {},
    replayEligible: true,
    summary: '✗ Execution failed after partial write: 1 succeeded, 1 failed [Warnings: Some actions blocked by upstream failures]',
};
/**
 * Example 6: Failed Before Any Write
 * Scenario: First action fails before any successful writes
 */
export const failedBeforeAnyWriteExample = {
    planId: 'plan_example06',
    requestId: 'req_12350',
    status: 'failed_before_any_write',
    actionResults: [
        {
            actionId: 'action_aaa6_1',
            actionType: 'create_patient',
            status: 'failed',
            errorMessage: 'Provider error: patient creation rejected',
        },
        {
            actionId: 'action_aaa6_2',
            actionType: 'create_visit',
            status: 'skipped',
            errorMessage: 'upstream dependency failed: action_aaa6_1',
        },
    ],
    completedActionIds: [],
    failedActionIds: ['action_aaa6_1'],
    skippedActionIds: ['action_aaa6_2'],
    createdRefs: {},
    updatedRefs: {},
    replayEligible: false,
    summary: '✗ Execution failed before any write',
};
