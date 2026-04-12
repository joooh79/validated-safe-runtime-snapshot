# 25. Schema Migration And Runtime Cutover Plan

Status: migration and cutover plan  
Date: 2026-04-12

## 1. Purpose

This document separates:

- Airtable schema migration work
- sender/runtime activation work
- final cutover work

It keeps current runtime truth and future target-canon truth separate.

Detailed Stage 2 / Stage 3 operator docs now live in:

- `docs/30_airtable_target_schema_migration_runbook.md`
- `docs/31_airtable_build_order_and_dependency_plan.md`
- `docs/32_post_migration_sender_activation_entry_conditions.md`

## 2. Current State

Current Airtable-visible structure:

- Patients
- Visits
- Pre-op Clinical Findings
- Radiographic Findings
- Operative Findings
- Diagnosis
- Treatment Plan
- Doctor Reasoning

Current runtime activation:

- patient
- visit
- PRE snapshot

Current runtime blocked:

- case writes
- explicit link writes
- non-PRE writes

## 3. Target State

Target canon requires:

- Cases table
- Patients linked to Cases
- Visits linked to Cases
- each snapshot table linked to Cases
- target record identity and upsert behavior from `docs/21_record_identity_and_upsert_rules.md`

## 4. Migration Shape

### 4.1 Migration should be additive first

The migration should be treated as additive first, not destructive replacement.

Additive changes required by current canon docs:

- add `Cases` table
- add `Patients.Cases`
- add `Visits.Cases`
- add `Case ID` linked field to every snapshot table
- add target Case lifecycle/latest-synthesis fields

Why additive first:

- current validated runtime must remain safe while migration work is happening
- additive changes reduce cutover risk
- sender activation can remain blocked until mappings and validation are ready

### 4.2 Existing tables can be reused

Per the target canon and gap analysis, these current tables should be reused rather than replaced:

- Patients
- Visits
- PRE / RAD / OP / DX / PLAN / DR tables

What changes:

- they gain target-canon structural fields/links where required

What this document does not claim:

- any required table rename
- any destructive replacement of existing tables

### 4.3 New Case table must exist before Case activation

The `Cases` table is the central structural gap between current Airtable and the target canon.

Therefore:

- no runtime Case activation should happen before the `Cases` table exists
- no snapshot-to-case or visit-to-case activation should happen before the required Case-linked fields exist

## 5. Schema Changes Needed

## 5.1 New table required

Required new table:

- `Cases`

Required field groups on `Cases` from the target canon:

- identity:
  - `Case ID`
  - `Patient ID`
  - `Tooth number`
  - `Episode start date`
- lifecycle:
  - `Episode status`
  - `Parent Case ID`
  - `Follow-up pending`
- relationship:
  - `Visits`
  - branch links for snapshot tables
  - `Latest Visit ID`
- latest synthesis:
  - `Latest summary`
  - `Latest working diagnosis`
  - `Latest working plan`
  - `Case notes`

## 5.2 New or changed fields on existing tables

Required additions:

- `Patients.Cases`
- `Visits.Cases`
- `Case ID` linked field on:
  - `Pre-op Clinical Findings`
  - `Radiographic Findings`
  - `Operative Findings`
  - `Diagnosis`
  - `Treatment Plan`
  - `Doctor Reasoning`

Already reusable:

- `Patients ID`
- `Visit ID`
- `Visit ID` on snapshot tables
- `Record name` on snapshot tables
- branch-specific fields/options where current canon docs say they are reusable starting canon

## 5.3 Renames are not a required assumption here

This workspace does not need to assume destructive renames.

Roadmap posture:

- add missing target-canon structure first
- only consider renames if a later migration plan requires them explicitly
- do not block Stage 1 planning on rename decisions that are not required by the canon docs

## 6. Runtime Changes Needed

## 6.1 Changes that can happen before schema migration

Allowed before schema migration:

- docs and roadmap work
- acceptance criteria
- non-executable scaffolding
- fail-closed provider preparation
- validation fixture design
- preflight tightening

Not allowed before schema migration:

- case execution support
- explicit link execution support
- snapshot-to-case execution support
- runtime assumptions that Cases already exists

## 6.2 Changes that must wait until after schema migration

Must wait until schema migration is complete:

- executable Cases-table mapping
- executable Case-linked snapshot mapping
- executable explicit link writes
- runtime logic that depends on target Case fields existing

## 6.3 Sender/runtime cutover work after schema migration

After schema migration, sender work should proceed in this order:

1. target-aware mapping/preflight preparation
2. Case activation
3. explicit link activation
4. non-PRE activation branch-by-branch
5. expanded validation and cutover

## 7. Historical Data Migration

## 7.1 Historical data decision is required

The roadmap must explicitly decide how historical rows will participate in the target Case-aware model.

Possible conservative choices:

- forward-fill only:
  - new writes populate Cases and Case links
  - older rows remain without complete Case backfill initially
- staged backfill:
  - add schema first
  - then backfill historical Case relationships before broader cutover

This document does not claim which choice is already approved.

## 7.2 Why historical migration matters

Historical migration matters because:

- Case is the continuity/latest synthesis layer
- snapshot truth must remain visit-based
- later-date continuation depends on trustworthy continuity linking

If historical backfill is incomplete, activation scope may need to stay limited or explicitly forward-only at first.

## 8. Dual-Write vs Cutover

## 8.1 Dual-write is not the default assumption here

This workspace should not assume dual-write unless a later operational plan explicitly requires it.

Current conservative posture:

- migrate schema additively
- keep new runtime families blocked until validated
- activate one scope at a time under the target schema

## 8.2 Preferred cutover posture

Preferred cutover posture from current evidence:

- no hidden dual-write
- explicit stage gates
- explicit validation before each activation step
- blocked-before-write remains the fallback when a mapping is incomplete

## 9. Rollback And Risk Controls

## 9.1 Schema migration rollback posture

Because migration is additive-first, rollback should prefer:

- stop runtime activation
- keep newly added schema unused
- preserve current validated baseline behavior

This is safer than destructive schema rollback.

## 9.2 Runtime activation rollback posture

For each activation stage:

- activation should be separately gated
- new write families should be isolated enough to disable independently
- existing safe-slice behavior must remain intact

## 9.3 Risk controls

Required controls:

- preview-first remains mandatory
- blocked-before-write remains truthful for missing mappings
- no broad enablement of multiple blocked families at once
- branch-by-branch activation for non-PRE
- clear validation evidence before expanding scope

## 10. Cutover Sequencing

Recommended sequencing:

1. Stage 0 baseline hold
2. Stage 1 roadmap/acceptance prep
3. Stage 2 schema migration prep
4. Stage 3 additive Airtable schema migration
5. Stage 4 sender mapping/preflight preparation against migrated schema
6. Stage 5 Case activation
7. Stage 6 explicit link activation
8. Stage 7 non-PRE activation branch-by-branch
9. Stage 8 expanded validation and cutover

## 11. What Must Happen Before Specific Activations

### Before any Case activation

Must already be complete:

- roadmap and acceptance criteria
- Airtable target-schema migration preparation
- additive schema migration creating the Cases table and required link fields
- sender mapping/preflight preparation for target-canon structures

### Before any non-PRE activation

Must already be complete:

- all schema prerequisites above
- Case-aware target behavior stable enough for continuity-safe operation
- per-branch mapping and validation for the branch being activated

## 12. Practical Conclusion

The path is:

- additive schema migration first
- sender/runtime activation second
- cutover only after stage-by-stage validation

This keeps:

- current validated runtime truth intact
- target canon as the future destination
- migration risk controlled and reversible in practice
