# Execution and Retry Replay

## Purpose

This document defines how the rebuilt sender executes direct writes and handles partial failure safely.

## Core principle

Execution flow:
1. resolution
2. write plan
3. preview/confirmation
4. execution
5. normalized result
6. failed-plan recording if needed
7. retry/replay handling

## Execution result classes

- success
- partial_success
- blocked_before_write
- failed_after_partial_write
- failed_before_any_write
- no_op

## Partial failure

Partial failure is first-class.

Examples:
- snapshots succeed, case latest synthesis update fails
- visit succeeds, one branch child action fails
- case create succeeds, linking fails

The sender must:
- record exactly what succeeded
- record exactly what failed
- avoid pretending clean success
- support safe replay when possible

## Failed-plan storage

When execution is not clean success, store:
- plan id
- request id
- input hash
- resolution summary
- action list
- completed actions
- failed actions
- replay eligibility
- known created/updated refs
- provider response fragments needed for debugging

## Replay rules

Replay is explicit reuse of a recorded failed/incomplete plan.

Replay may proceed only when:
- prior completion state is known
- duplicate risk is controlled
- remaining targets are still trustworthy

Replay must be blocked when:
- prior write completion state is unknown
- identity targeting is no longer trustworthy
- correction is required first

## Retry rules

Retry is not the same as replay.

- retry = re-attempting a failed action or plan
- replay = explicit reuse of a recorded failed/incomplete plan artifact

High-risk identity decisions must not be blindly auto-retried.

## Duplicate-safe requirement

The sender must avoid duplicate recreate behavior during retry/replay:
- do not recreate patient blindly
- do not recreate visit blindly
- do not recreate snapshot blindly
- do not overwrite historical snapshots accidentally

## Logging layers

- resolution log
- plan log
- execution log
- replay log

## Minimum v1 requirements

- explicit write plan
- partial failure recording
- failed plan storage
- replay support
- duplicate-safe retry behavior
- structured normalized result
- clear no-op behavior
