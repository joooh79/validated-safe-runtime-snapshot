/**
 * Assertion Helpers
 *
 * Specific assertions for each validation stage.
 */

import type { StateResolutionResult } from '../types/resolution.js';
import type { WritePlan } from '../types/write-plan.js';
import type { ExecutionResult } from '../types/execution.js';
import type { AssertionResult } from './types.js';

/**
 * Assert resolution status
 */
export function assertResolutionStatus(
  result: StateResolutionResult,
  expectedPatientStatus?: string,
  expectedVisitStatus?: string,
  expectedCaseStatus?: string,
): AssertionResult {
  const actual = {
    patientStatus: result.patient.status,
    visitStatus: result.visit.status,
    caseStatus: result.caseResolution.status,
  };
  const expected = {
    patientStatus: expectedPatientStatus,
    visitStatus: expectedVisitStatus,
    caseStatus: expectedCaseStatus,
  };

  const passed =
    (!expectedPatientStatus || result.patient.status === expectedPatientStatus) &&
    (!expectedVisitStatus || result.visit.status === expectedVisitStatus) &&
    (!expectedCaseStatus || result.caseResolution.status === expectedCaseStatus);

  return {
    name: 'Resolution status matches expected',
    expected,
    actual,
    passed,
  };
}

/**
 * Assert readiness status
 */
export function assertReadinessStatus(
  result: StateResolutionResult,
  expectedReadiness?: string,
): AssertionResult {
  const actual = result.readiness;
  const passed = !expectedReadiness || actual === expectedReadiness;

  return {
    name: 'Readiness status matches expected',
    expected: expectedReadiness,
    actual,
    passed,
  };
}

/**
 * Assert plan readiness
 */
export function assertPlanReadiness(
  plan: WritePlan,
  expectedReadiness?: 'execution_ready' | 'preview_only' | 'blocked',
): AssertionResult {
  const actual = plan.readiness;
  const passed = !expectedReadiness || actual === expectedReadiness;

  return {
    name: 'Plan readiness matches expected',
    expected: expectedReadiness,
    actual,
    passed,
  };
}

/**
 * Assert execution status
 */
export function assertExecutionStatus(
  result: ExecutionResult,
  expectedStatus?: string,
): AssertionResult {
  const actual = result.status;
  const passed = !expectedStatus || actual === expectedStatus;

  return {
    name: 'Execution status matches expected',
    expected: expectedStatus,
    actual,
    passed,
  };
}

/**
 * Assert actions present
 */
export function assertActionsPresent(
  plan: WritePlan,
  allowedTypes?: string[],
): AssertionResult {
  const actualTypes = plan.actions.map((a) => a.actionType);
  const validActions = allowedTypes
    ? actualTypes.every((t) => allowedTypes.includes(t))
    : true;

  return {
    name: 'All actions are in allowed list',
    expected: allowedTypes,
    actual: actualTypes,
    passed: validActions,
    details: validActions ? 'All actions allowed' : 'Some actions not in allowed list',
  };
}

/**
 * Assert actions not present
 */
export function assertActionsForbidden(
  plan: WritePlan,
  forbiddenTypes?: string[],
): AssertionResult {
  const actualTypes = plan.actions.map((a) => a.actionType);
  const noForbidden = forbiddenTypes
    ? !actualTypes.some((t) => forbiddenTypes.includes(t))
    : true;

  const forbiddenFound = actualTypes.filter((t) => forbiddenTypes?.includes(t) || false);

  return {
    name: 'No forbidden actions present',
    expected: 'none of: ' + (forbiddenTypes?.join(', ') || 'unknown'),
    actual: forbiddenFound.length > 0 ? forbiddenFound : 'none',
    passed: noForbidden,
    details:
      forbiddenFound.length > 0 ? `Found forbidden actions: ${forbiddenFound.join(', ')}` : 'None found',
  };
}

/**
 * Assert no actual writes occurred
 */
export function assertNoWrites(result: ExecutionResult): AssertionResult {
  const actualWrites =
    Object.keys(result.createdRefs).length + Object.keys(result.updatedRefs).length;
  const passed = actualWrites === 0;

  return {
    name: 'No writes occurred',
    expected: { createdRefs: 0, updatedRefs: 0 },
    actual: { createdRefs: Object.keys(result.createdRefs).length, updatedRefs: Object.keys(result.updatedRefs).length },
    passed,
  };
}

/**
 * Assert writes occurred
 */
export function assertWritesOccurred(result: ExecutionResult): AssertionResult {
  const actualWrites =
    Object.keys(result.createdRefs).length + Object.keys(result.updatedRefs).length;
  const passed = actualWrites > 0;

  return {
    name: 'Writes occurred',
    expected: '> 0',
    actual: actualWrites,
    passed,
  };
}

/**
 * Assert replay eligibility
 */
export function assertReplayEligibility(
  result: ExecutionResult,
  expectedEligible?: boolean,
): AssertionResult {
  const actual = result.replayEligible;
  const passed = expectedEligible === undefined || actual === expectedEligible;

  return {
    name: 'Replay eligibility matches expected',
    expected: expectedEligible,
    actual,
    passed,
  };
}

/**
 * Assert blocking behavior
 */
export function assertBlocking(plan: WritePlan, shouldBeBlocked: boolean): AssertionResult {
  const isBlocked = plan.readiness === 'blocked' || plan.readiness === 'preview_only';
  const passed = isBlocked === shouldBeBlocked;

  return {
    name: `Plan ${shouldBeBlocked ? 'is' : 'is not'} blocked`,
    expected: shouldBeBlocked ? 'blocked/preview_only' : 'execution_ready',
    actual: plan.readiness,
    passed,
  };
}

/**
 * Assert action count
 */
export function assertActionCount(plan: WritePlan, expectedCount?: number): AssertionResult {
  const actual = plan.actions.length;
  const passed = expectedCount === undefined || actual === expectedCount;

  return {
    name: `Action count ${expectedCount ? `is ${expectedCount}` : 'matches'}`,
    expected: expectedCount,
    actual,
    passed,
  };
}
