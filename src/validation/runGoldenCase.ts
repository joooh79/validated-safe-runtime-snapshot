/**
 * Golden Case Runner
 *
 * Executes a single scenario through the full sender stack:
 * 1. Resolution
 * 2. Write Plan
 * 3. Execution
 * 4. Validation
 */

import type { StateResolutionResult } from '../types/resolution.js';
import type { WritePlan } from '../types/write-plan.js';
import type { ExecutionResult } from '../types/execution.js';
import type { NormalizedContract } from '../types/contract.js';
import type { DirectWriteProvider } from '../types/provider.js';
import type {
  GoldenCaseInput,
  GoldenCaseExpectation,
  GoldenCaseResult,
  StageValidationResult,
  AssertionResult,
} from './types.js';
import type { CurrentStateLookupBundle } from '../resolution/index.js';
import { resolveState } from '../resolution/index.js';
import { buildWritePlan } from '../write-plan/index.js';
import { executeWritePlan } from '../execution/index.js';
import {
  assertResolutionStatus,
  assertReadinessStatus,
  assertPlanReadiness,
  assertExecutionStatus,
  assertActionsPresent,
  assertActionsForbidden,
  assertNoWrites,
  assertWritesOccurred,
  assertReplayEligibility,
  assertBlocking,
} from './assertions.js';
import {
  createContractFromScenario,
  createLookupBundleFromScenario,
  createSnapshotBranchIntentsFromScenario,
} from './fixtures.js';
import { createDryRunAirtableProvider } from '../providers/airtable/index.js';
import { createFakeProvider } from '../execution/__fixtures__/fakeProvider.js';

/**
 * Run a single golden case through the full stack
 */
export async function runGoldenCase(
  input: GoldenCaseInput,
  expectation: GoldenCaseExpectation,
  lookupBundle?: CurrentStateLookupBundle,
  provider?: DirectWriteProvider,
): Promise<GoldenCaseResult> {
  const stages: StageValidationResult[] = [];

  try {
    const scenarioLookupBundle = lookupBundle ?? createLookupBundleFromScenario(input);
    const scenarioProvider = provider
      ? { provider, note: 'Execution provider: caller-supplied override.' }
      : getScenarioProvider(input);
    const notes: string[] = [scenarioProvider.note];

    // Stage 1: Resolution
    const resolutionAssertions: AssertionResult[] = [];
    let resolution: StateResolutionResult | null = null;

    try {
      const contract: NormalizedContract = createContractFromScenario(input);
      resolution = await resolveState(contract, scenarioLookupBundle);

      if (expectation.patientResolutionStatus || expectation.visitResolutionStatus) {
        resolutionAssertions.push(
          assertResolutionStatus(
            resolution,
            expectation.patientResolutionStatus,
            expectation.visitResolutionStatus,
            expectation.caseResolutionStatus,
          ),
        );
      }

      if (expectation.readinessStatus) {
        resolutionAssertions.push(assertReadinessStatus(resolution, expectation.readinessStatus));
      }
    } catch (err) {
      resolutionAssertions.push({
        name: 'Resolution executed without error',
        expected: 'no error',
        actual: err instanceof Error ? err.message : String(err),
        passed: false,
      });
    }

    stages.push({
      stage: 'resolution',
      passed: resolutionAssertions.every((a) => a.passed),
      assertions: resolutionAssertions,
      output: resolution,
    });

    // Stage 2: Write Plan
    const planAssertions: AssertionResult[] = [];
    let plan: WritePlan | null = null;

    if (resolution) {
      try {
        plan = await buildWritePlan({
          resolution,
          snapshotBranchIntents: createSnapshotBranchIntentsFromScenario(input),
          snapshotLookups: scenarioLookupBundle.snapshotLookups,
        });

        if (expectation.planReadiness) {
          planAssertions.push(assertPlanReadiness(plan, expectation.planReadiness));
        }

        if (expectation.shouldExecute !== undefined) {
          planAssertions.push(assertBlocking(plan, !expectation.shouldExecute));
        }

        if ((expectation.allowedActionTypes?.length ?? 0) > 0) {
          planAssertions.push(assertActionsPresent(plan, expectation.allowedActionTypes));
        }

        if ((expectation.forbiddenActionTypes?.length ?? 0) > 0) {
          planAssertions.push(assertActionsForbidden(plan, expectation.forbiddenActionTypes));
        }
      } catch (err) {
        planAssertions.push({
          name: 'Write plan generated without error',
          expected: 'no error',
          actual: err instanceof Error ? err.message : String(err),
          passed: false,
        });
      }
    }

    stages.push({
      stage: 'plan',
      passed: planAssertions.every((a) => a.passed),
      assertions: planAssertions,
      output: plan,
    });

    // Stage 3: Execution
    const executionAssertions: AssertionResult[] = [];
    let execution: ExecutionResult | null = null;

    if (plan) {
      try {
        execution = await executeWritePlan({ plan, provider: scenarioProvider.provider });

        if (expectation.executionStatus) {
          executionAssertions.push(assertExecutionStatus(execution, expectation.executionStatus));
        }

        if (expectation.shouldWrite === false) {
          executionAssertions.push(assertNoWrites(execution));
        } else if (expectation.shouldWrite === true) {
          executionAssertions.push(assertWritesOccurred(execution));
        }

        if (expectation.replayEligible !== undefined) {
          executionAssertions.push(assertReplayEligibility(execution, expectation.replayEligible));
        }
      } catch (err) {
        executionAssertions.push({
          name: 'Execution completed without error',
          expected: 'no error',
          actual: err instanceof Error ? err.message : String(err),
          passed: false,
        });
      }
    }

    stages.push({
      stage: 'execution',
      passed: executionAssertions.every((a) => a.passed),
      assertions: executionAssertions,
      output: execution,
    });

    // Summary
    const passed = stages.every((s) => s.passed);
    const summary = passed
      ? `✓ Scenario passed: ${input.title}`
      : `✗ Scenario failed: ${input.title}`;

    if (expectation.intentionallyBlocked) {
      notes.push(`Intentionally blocked: ${expectation.blockReason}`);
    }

    return {
      scenarioId: input.id,
      title: input.title,
      passed,
      stages,
      summary,
      notes,
    };
  } catch (err) {
    return {
      scenarioId: input.id,
      title: input.title,
      passed: false,
      stages,
      summary: `✗ Scenario crashed: ${input.title}`,
      notes: [err instanceof Error ? err.message : String(err)],
    };
  }
}

function getScenarioProvider(
  input: GoldenCaseInput,
): { provider: DirectWriteProvider; note: string } {
  if (input.id === 'GC_PARTIAL_FAILURE') {
    return {
      provider: createFakeProvider('failMiddle'),
      note: 'Execution provider: fake provider with mid-sequence failure.',
    };
  }

  return {
    provider: createDryRunAirtableProvider(),
    note: 'Execution provider: Airtable dry-run adapter.',
  };
}
