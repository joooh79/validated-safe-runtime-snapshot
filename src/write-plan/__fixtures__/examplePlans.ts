/**
 * Example WritePlans for different scenarios  
 *
 * These are minimal fixtures showing what plans look like
 * for representative resolution results.
 *
 * Used for testing, documentation, and rapid prototyping.
 */

import type { WritePlan } from '../../types/write-plan.js';

/**
 * Example 1: New Visit Plan
 * Scenario: Existing patient adds a new safe visit on a different date
 */
export const newVisitPlanExample: WritePlan = {
  planId: 'plan_example01',
  requestId: 'req_12345',
  inputHash: 'hash_abc123',
  resolution: {} as any,
  warnings: [],
  readiness: 'execution_ready',
  actions: [
    {
      actionId: 'action_aaa1_1',
      actionOrder: 1,
      actionType: 'attach_existing_patient',
      entityType: 'patient',
      targetMode: 'attach_existing',
      target: { patientId: 'pat_existing_001' },
      payloadIntent: { intendedChanges: {}, guardedFields: [] },
      dependsOnActionIds: [],
      blockers: [],
      safety: { duplicateSafe: true, replayEligibleIfFailed: false },
      previewVisible: true,
    },
  ],
  preview: {
    patientAction: 'Use existing patient',
    visitAction: 'Create new visit',
    caseAction: 'Create new case/episode',
    snapshotActions: [],
    warnings: [],
    nextStep: 'confirm',
  },
  replay: { replaySourcePlanId: 'plan_example01', replayVersion: 1, safeResumePoints: [] },
};
