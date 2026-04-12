# 26. Activation Stage Acceptance Criteria

Status: stage acceptance criteria  
Date: 2026-04-12

## 1. Purpose

This document defines acceptance criteria for each activation stage in:

- `docs/24_target_canon_activation_roadmap.md`
- `docs/25_schema_migration_and_runtime_cutover_plan.md`

Each stage includes:

- entry condition
- work scope
- forbidden shortcuts
- completion criteria
- validation criteria
- handoff criteria

## 2. Stage Criteria

## Stage 0. Baseline Hold

Entry condition:

- current validated safe slice is passing

Work scope:

- preserve current validated behavior
- prevent accidental widening while roadmap work happens

Forbidden shortcuts:

- activating blocked write families
- changing current baseline truth to match future target canon by assumption

Completion criteria:

- baseline status is clearly documented
- blocked scope is still clearly blocked

Validation criteria:

- if any code changed:
  - `npm run typecheck`
  - `npm run validate:golden`
  - `npm run api:examples`

Handoff criteria:

- Stage 1 can start from a stable, documented baseline

## Stage 1. Activation Preparation

Entry condition:

- Stage 0 complete

Work scope:

- roadmap docs
- migration planning
- acceptance criteria
- dependency ordering
- validation planning

Forbidden shortcuts:

- claiming Airtable migration is already complete
- claiming current runtime already follows the full target canon
- mixing roadmap language with activation status

Completion criteria:

- roadmap stages are explicit
- prerequisites are explicit for case writes, explicit links, and non-PRE branches
- current truth and future truth are kept separate

Validation criteria:

- docs are internally consistent with `docs/20`, `docs/21`, and `docs/22`

Handoff criteria:

- next branch can begin schema migration preparation without guessing order or prerequisites

## Stage 2. Schema Migration Preparation

Entry condition:

- Stage 1 complete

Work scope:

- define additive schema migration
- define historical-data posture
- define cutover sequencing
- define rollback posture

Forbidden shortcuts:

- directly activating sender mappings before schema preparation is complete
- assuming a destructive replacement is needed without evidence

Completion criteria:

- required schema additions are enumerated
- sequencing is explicit
- dependencies for Case and link activation are explicit

Validation criteria:

- plan is consistent with `docs/22_target_schema_vs_current_airtable_gap.md`
- plan is consistent with:
  - `docs/30_airtable_target_schema_migration_runbook.md`
  - `docs/31_airtable_build_order_and_dependency_plan.md`
  - `docs/32_post_migration_sender_activation_entry_conditions.md`

Handoff criteria:

- Airtable schema migration work can begin with a defined order and risk posture

## Stage 3. Airtable Target-Schema Migration

Entry condition:

- Stage 2 complete
- migration execution plan approved outside this workspace

Work scope:

- add Cases table
- add required link fields
- add required Case lifecycle/latest-synthesis fields

Forbidden shortcuts:

- deleting or replacing current reusable tables casually
- activating runtime writes just because new fields/tables now exist

Completion criteria:

- target-canon-required schema additions exist
- existing reusable tables remain intact
- current validated runtime is still not widened

Validation criteria:

- migrated schema matches the planned additive changes
- sender still blocks unsupported scope truthfully
- manual verification evidence exists per `docs/30_airtable_target_schema_migration_runbook.md`

Handoff criteria:

- Stage 4 can update sender mappings against the migrated schema

## Stage 4. Sender Target-Schema Adapter Preparation

Entry condition:

- Stage 3 complete

Work scope:

- add target-aware fail-closed mappings
- align preflight to migrated schema
- add validation fixtures for missing or incomplete mappings

Forbidden shortcuts:

- enabling new write families before create/update/upsert rules are verified
- silently treating target-aware mapping presence as activation

Completion criteria:

- sender can preflight target-canon structures without widening runtime execution
- missing mappings still block before write

Validation criteria:

- current baseline validations still pass if code changed
- new preflight coverage exists for newly visible target structures

Handoff criteria:

- Stage 5 can activate Case behavior on top of a target-aware, fail-closed adapter

## Stage 5. Case Activation

Entry condition:

- Stage 4 complete
- Cases schema exists
- Case identity and field mappings are verified
- historical-data posture is decided

Work scope:

- activate Case create/continue/latest-synthesis behavior first
- keep close/split separate unless independently validated

Forbidden shortcuts:

- case activation without `case_id` duplicate-prevention rules
- overwriting historical snapshot truth with Case latest synthesis
- broad activation of close/split without dedicated validation

Completion criteria:

- Case writes execute only on activation-ready paths
- same-date correction remains same-date-safe
- later-date continuation uses Case continuity without rewriting historical rows

Validation criteria:

- new Case success fixtures pass
- blocked Case fixtures still block when mappings are incomplete or unsafe
- existing safe-slice validations still pass if code changed

Handoff criteria:

- explicit link activation can begin with Case continuity behavior already stable

## Stage 6. Explicit Link Activation

Entry condition:

- Stage 5 complete or Case-ready structures proven stable enough to anchor link behavior
- exact linked-record field names are verified
- exact provider write shape is verified

Work scope:

- activate explicit link writes one family at a time if needed

Forbidden shortcuts:

- assuming identifier fields already prove explicit link-write shape
- activating all link families at once without isolated validation

Completion criteria:

- activated link writes are duplicate-safe enough for replay expectations
- missing link mapping still blocks before write

Validation criteria:

- link success fixtures pass
- link blocked fixtures pass
- replay/idempotence expectations are documented and tested

Handoff criteria:

- non-PRE activation can rely on stable structural linking behavior

## Stage 7. Non-PRE Branch Activation Under Target Canon

Entry condition:

- Stage 6 complete
- schema and Case-aware structures are stable

Work scope:

- activate `RAD`, `OP`, `DX`, `PLAN`, `DR` one branch at a time

Forbidden shortcuts:

- bulk enabling all non-PRE branches
- using partial branch evidence as if it were full activation proof

Completion criteria:

- each activated branch has verified table/field/option mapping
- each activated branch has verified identity/upsert behavior
- unactivated branches remain blocked

Validation criteria:

- branch-specific success fixtures pass
- branch-specific blocked fixtures pass for missing mappings
- existing safe-slice validations still pass if code changed

Handoff criteria:

- Stage 8 can assess broader cutover with known activated branch scope

## Stage 8. Expanded Validation And Cutover

Entry condition:

- Stage 7 complete for the intended activation scope

Work scope:

- expand golden suite
- expand API examples
- confirm operational cutover posture

Forbidden shortcuts:

- claiming full target-canon coverage without validation evidence
- removing blocked-before-write protection for anything still unverified

Completion criteria:

- intended target-canon scope is validated
- remaining blocked scope, if any, is explicitly documented
- cutover decision is evidence-backed

Validation criteria:

- expanded success, blocked, no-op, and partial-failure coverage exists
- regression guard still protects preview-first and historical truth boundaries

Handoff criteria:

- runtime/cutover owners have a clear evidence pack for go/no-go decisions

## 3. Global Regression Rules

At every stage, the following count as regressions:

- preview-first is bypassed
- blocked scope writes before it is activation-ready
- same-date correction truth is weakened
- patient duplicate correction / recheck truth is weakened
- historical visit snapshot truth is overwritten by continuity/latest synthesis logic
- current validated baseline stops passing when it should still be preserved

## 4. Practical Use

The next branch should use this document as the gatekeeper for Stage 1 and Stage 2 work.

It should not be used as permission to skip directly to:

- Case activation
- explicit link activation
- non-PRE activation
