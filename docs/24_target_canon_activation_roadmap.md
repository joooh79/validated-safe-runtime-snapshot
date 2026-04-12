# 24. Target Canon Activation Roadmap

Status: roadmap for future activation  
Date: 2026-04-12

## 1. Purpose

This document defines the staged path from:

- the current validated runtime baseline

to:

- the future target canon defined in:
  - `docs/20_target_schema_canon.md`
  - `docs/21_record_identity_and_upsert_rules.md`
  - `docs/22_target_schema_vs_current_airtable_gap.md`

This is not an activation document.
It does not claim the target schema is already live in Airtable.
It does not widen the current validated runtime.

## 2. Current Truth vs Future Truth

### 2.1 Current runtime truth

Current active runtime baseline:

- validated safe slice is active
- preview-first is active
- confirm-to-execute is active
- truthful correction / recheck / hard-stop / no-op / blocked-before-write handling is active
- patient / visit / PRE snapshot remain the validated write scope

Currently blocked:

- case writes
- explicit link writes
- non-PRE snapshot writes
- canon-confirm-required mappings not yet activation-verified
- advanced replay-safe resume beyond the current validated rules

### 2.2 Future target-canon truth

Future destination:

- Patient / Visit / Case / Snapshot model
- Cases table exists in Airtable
- Visits, Patients, and snapshot tables carry the target Case-aware links
- identity and upsert behavior follow `docs/21_record_identity_and_upsert_rules.md`
- non-PRE branches activate under branch-specific target-canon mappings

This future state is not the same thing as the current runtime.

## 3. Roadmap Principles

- preserve the validated safe slice until each later stage is explicitly validated
- treat Airtable migration and sender activation as separate milestones
- keep activation additive and conservative where possible
- do not guess schema details that are not canon-confirmed
- do not widen blocked scope before prerequisites are satisfied
- preserve visit-based historical snapshot truth throughout migration and cutover
- preserve Case as continuity/latest synthesis rather than historical overwrite

## 4. Stage Model

## Stage 0. Baseline Hold

Goal:

- keep the current validated baseline stable while the target-canon path is defined

What exists now:

- safe slice runtime is validated
- target canon exists only as future design truth

Must remain blocked:

- case writes
- explicit link writes
- non-PRE writes

Why this stage matters:

- later stages are unsafe if the baseline drifts first

## Stage 1. Activation Preparation

Goal:

- prepare the workspace so future implementation follows the target canon rather than the current Airtable shape

Work:

- lock roadmap/docs/acceptance criteria
- identify exact schema deltas from `docs/22_target_schema_vs_current_airtable_gap.md`
- identify which runtime pieces are already target-canon-aware versus runtime-blocked
- define validation additions needed before each activation stage

Must still remain blocked:

- all currently blocked write families

Exit condition:

- roadmap, migration plan, and stage acceptance criteria are explicit enough for implementation branches to work without guessing

## Stage 2. Schema Migration Preparation

Goal:

- prepare the Airtable migration safely before any sender activation

Work:

- confirm migration is additive first, not destructive replacement
- prepare Cases-table creation plan
- prepare Case-link field addition plan for Patients, Visits, and snapshot tables
- prepare rollout order and rollback checkpoints
- decide how historical data will be handled:
  - backfill before cutover
  - forward-fill only for newly activated writes
  - staged backfill after schema creation but before broader cutover

Cannot activate earlier because:

- the current Airtable schema does not yet match the target Case-aware model
- sender activation before schema readiness would force guessed mappings or hidden behavior widening

## Stage 3. Airtable Target-Schema Migration

Goal:

- make Airtable structurally capable of receiving target-canon writes

Required schema changes from current docs:

- add `Cases` table
- add `Patients.Cases`
- add `Visits.Cases`
- add `Case ID` linked field to each snapshot table
- add target Case lifecycle/latest-synthesis fields described in `docs/20_target_schema_canon.md`

Reuse from current base:

- Patients
- Visits
- PRE / RAD / OP / DX / PLAN / DR tables
- current branch field vocabularies where canon docs say they are reusable starting canon

Must still remain blocked after schema creation:

- case writes
- explicit link writes
- non-PRE writes

Why:

- structural readiness is necessary but not sufficient
- sender/runtime mappings, lookup rules, and validation still need activation work

## Stage 4. Sender Target-Schema Adapter Preparation

Goal:

- make the sender able to understand the target schema in mapping/preflight terms before enabling new writes

Work:

- add non-executable or fail-closed mapping sections for target Case-aware structures
- align provider registry and preflight to the migrated schema
- add lookup/read-path support for target identities where needed
- add validation fixtures that prove unsupported paths still block before write

Must still remain blocked:

- case writes
- explicit link writes
- non-PRE writes

Cannot activate earlier because:

- mapping presence alone is not enough
- create/update/upsert behavior and duplicate safety must be validated first

## Stage 5. Case Activation

Goal:

- activate Case-aware runtime behavior under the target canon

Scope:

- `create_case`
- `continue_case`
- `update_case_latest_synthesis`
- later `close_case` / `split_case` only if separately validated

Prerequisites:

- Stages 0 through 4 complete
- Cases table exists in Airtable
- exact Case field mappings are verified
- `case_id` targeting and duplicate-prevention behavior are verified
- same-date correction and later-date continuation behavior are validated against Case/latest-synthesis rules
- historical data/backfill strategy is decided

Cannot activate earlier because:

- Case is the main schema gap between current runtime and target canon
- Case activation before schema and identity readiness risks continuity corruption

## Stage 6. Explicit Link Activation

Goal:

- activate explicit link writes only after Case-aware schema and behavior are stable

Scope:

- `link_visit_to_patient`
- `link_snapshot_to_visit`
- `link_snapshot_to_case`

Prerequisites:

- Stage 5 complete or at minimum Case activation-ready structures are proven stable
- linked-record field names are verified in the migrated Airtable base
- provider write shape for linked-record fields is verified
- replay/idempotence rules for re-running link actions are defined and tested

Cannot activate earlier because:

- current workspace evidence does not prove whether explicit link actions are required or exactly how they should be written
- link activation before Case activation would add structure before continuity behavior is trustworthy

## Stage 7. Non-PRE Branch Activation Under Target Canon

Goal:

- activate `RAD`, `OP`, `DX`, `PLAN`, and `DR` safely under the target schema

Required approach:

- branch-by-branch, not all at once

Per-branch prerequisites:

- exact table identity confirmed
- exact writable field names confirmed
- exact option mappings confirmed where applicable
- same-date update versus later-date create rules validated
- snapshot identity and duplicate-prevention behavior validated
- Case-aware fields available where required by target schema

Why this must wait:

- current runtime validates PRE only
- non-PRE branch evidence is incomplete or uneven
- broad activation would widen the runtime beyond the canon-confirmed surface

## Stage 8. Expanded Validation and Cutover

Goal:

- move from staged activation to a trusted target-canon runtime

Work:

- expand golden cases
- expand API examples
- validate mixed success/blocked/partial-failure paths for new action families
- confirm regression guard coverage across current safe slice and new target-canon scope
- decide whether legacy/current runtime behavior can be retired from fallback posture

Cutover condition:

- target-canon schema is live
- activated runtime behavior is validated
- blocked-before-write still protects any remaining unverified scope

## 5. Dependency Order By Blocked Scope

### 5.1 Case writes

Dependency order:

1. Stage 1 roadmap/validation prep
2. Stage 2 schema migration prep
3. Stage 3 Airtable schema migration
4. Stage 4 sender mapping/preflight preparation
5. Stage 5 case activation

Why not earlier:

- the current base does not yet expose the target Case table and links

### 5.2 Explicit link writes

Dependency order:

1. Stage 3 migrated schema must exist
2. Stage 4 sender/preflight must understand the target fields
3. Stage 5 Case behavior must be stable enough to anchor Case-related links
4. Stage 6 explicit link activation

Why not earlier:

- linked-record field truth and write shape are not yet activation-confirmed

### 5.3 Non-PRE branches

Dependency order:

1. Stage 3 migrated schema must exist where target Case fields are required
2. Stage 4 sender/preflight preparation
3. Stage 5 Case activation for continuity-aware behavior
4. Stage 7 branch-by-branch non-PRE activation

Why not earlier:

- branch-specific mapping truth is incomplete
- target-canon continuity behavior should be stable before expanding branch scope

### 5.4 Record identity and upsert rule changes

Dependency order:

1. Stage 2 planning and migration prep
2. Stage 3 schema readiness
3. Stage 4 sender read-path and mapping preparation
4. Stage 5 and Stage 7 activation in the affected entities/branches

Why not earlier:

- deterministic identity is part of activation safety, not just documentation
- partial enforcement without migrated schema risks inconsistent targeting

## 6. Validation Strategy By Stage

### Stage 0 through Stage 2

Must keep passing:

- `npm run typecheck`
- `npm run validate:golden`
- `npm run api:examples`

Regression if:

- safe slice behavior changes
- blocked scope stops blocking truthfully

### Stage 3

Must validate:

- Airtable schema migration completed as planned
- no runtime widening happened merely because schema now exists

Regression if:

- sender starts writing newly added fields/tables without explicit activation work

### Stage 4

Must validate:

- fail-closed provider behavior remains intact
- target-aware mappings do not silently widen execution
- new preflight coverage blocks incomplete mappings before write

### Stage 5 through Stage 7

Must validate:

- new success fixtures for newly activated scope
- blocked fixtures for missing/unsafe mappings
- same-date correction behavior remains truthful
- historical snapshot truth remains visit-based
- duplicate-prevention and idempotence behavior are explicit

### Stage 8

Must validate:

- expanded golden suite
- expanded API examples
- cutover checklist completion
- rollback path or rollback posture is documented for remaining risk windows

## 7. Conservative Conclusion

The next executable stage is Stage 1, not feature activation.

Before any Case activation:

- Airtable target-schema migration must be prepared and completed
- sender mapping/preflight must be updated conservatively

Before any non-PRE activation:

- the same schema/mapping prerequisites must be complete
- Case-aware target behavior should already be stable

The roadmap is therefore:

- baseline hold
- schema preparation
- schema migration
- sender preparation
- case activation
- explicit link activation
- branch-by-branch non-PRE activation
- expanded validation and cutover
