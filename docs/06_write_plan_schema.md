# Write Plan Schema

## Purpose

The sender must not jump directly from resolution into provider calls.
It must first generate an explicit write plan.

## Plan role

A write plan is the sender's explicit execution intent.

It says:
- what was resolved
- what will be created / updated / linked / skipped
- in what order
- with what dependencies
- with what replay/no-op safety markers

## Plan-level requirements

A valid write plan contains:
- plan identity
- source resolution summary
- ordered actions
- dependencies
- preview summary source
- replay/duplicate-safe metadata

## Allowed action families

### Patient actions
- create_patient
- update_patient
- attach_existing_patient
- no_op_patient

### Visit actions
- create_visit
- update_visit
- no_op_visit

### Case actions
- create_case
- update_case_latest_synthesis
- close_case
- split_case
- no_op_case

### Snapshot actions
- create_snapshot
- update_snapshot
- no_op_snapshot

### Link actions
- link_snapshot_to_visit
- link_snapshot_to_case
- link_visit_to_patient
- no_op_link

## Per-action concepts

Every action should preserve:
- action_id
- action_type
- action_order
- entity_type
- target_mode
- target identity
- intended changes
- dependency ids
- duplicate-safe marker
- replay-eligible-if-failed marker
- preview visibility marker

## Ordering rules

Recommended default order:
1. patient action
2. visit action
3. case action
4. snapshot actions
5. link actions
6. case latest synthesis update
7. logging/finalization

## Snapshot rules inside write planning

- same-date correction mainly drives `update_snapshot`
- later-date continuation mainly drives `create_snapshot`
- snapshot identity stays visit-based
- case latest synthesis update must not replace snapshot truth

## No-op rules

No-op is valid.
The plan must preserve no-op meaning explicitly enough for:
- preview
- execution
- result normalization
- replay handling

## Blocking rule

Blocked resolution outcomes must not produce execution-ready plans.
They may only produce preview/explanation summaries.

## Replay readiness

Write plans should preserve enough metadata for:
- failed-plan storage
- duplicate-safe replay
- partial success traceability
