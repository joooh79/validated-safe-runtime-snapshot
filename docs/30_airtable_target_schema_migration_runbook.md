# 30. Airtable Target Schema Migration Runbook

Status: Stage 2 / Stage 3 migration runbook  
Date: 2026-04-12

## 1. Purpose

This runbook defines how to migrate Airtable toward the target canon safely.

It is a schema migration document only.
It does not activate runtime sender behavior.

It must be read alongside:

- `docs/20_target_schema_canon.md`
- `docs/21_record_identity_and_upsert_rules.md`
- `docs/22_target_schema_vs_current_airtable_gap.md`
- `docs/28_schema_migration_input_spec.md`
- `docs/31_airtable_build_order_and_dependency_plan.md`
- `docs/32_post_migration_sender_activation_entry_conditions.md`

## 2. Current Truth vs Migration Truth

### 2.1 Current runtime truth

Current active runtime baseline remains:

- patient
- visit
- PRE snapshot
- preview-first
- truthful blocked-before-write behavior

Currently blocked:

- case writes
- explicit link writes
- non-PRE snapshot writes

### 2.2 Migration truth

This runbook is about changing Airtable structure so the future target canon can exist.

Migration completion does not mean:

- runtime Case activation
- runtime explicit link activation
- runtime non-PRE activation

Those remain later stages.

## 3. Migration Posture

### 3.1 Additive-first

Migration posture is:

- additive-first
- non-destructive by default
- reuse existing aligned tables where possible

This is not a replacement migration.

### 3.2 Current tables that remain

These current tables remain in place:

- `Patients`
- `Visits`
- `Pre-op Clinical Findings`
- `Radiographic Findings`
- `Operative Findings`
- `Diagnosis`
- `Treatment Plan`
- `Doctor Reasoning`

### 3.3 New table that must be added

New table required:

- `Cases`

## 4. Airtable Objects That Must Exist After Migration

## 4.1 New table

Required new table:

- `Cases`

Required fields on `Cases`:

- `Case ID`
- `Patient ID`
- `Tooth number`
- `Episode start date`
- `Episode status`
- `Parent Case ID`
- `Visits`
- `Pre-op Clinical Findings`
- `Radiographic Findings`
- `Operative Findings`
- `Diagnosis`
- `Treatment Plan`
- `Doctor Reasoning`
- `Latest Visit ID`
- `Latest summary`
- `Latest working diagnosis`
- `Latest working plan`
- `Follow-up pending`
- `Case notes`

## 4.2 New fields on existing tables

Required additions on existing tables:

- `Patients.Cases`
- `Visits.Cases`
- `Pre-op Clinical Findings.Case ID`
- `Radiographic Findings.Case ID`
- `Operative Findings.Case ID`
- `Diagnosis.Case ID`
- `Treatment Plan.Case ID`
- `Doctor Reasoning.Case ID`

## 4.3 Required links

Required links after migration:

- `Patients.Cases` ↔ `Cases.Patient ID`
- `Visits.Cases` ↔ `Cases.Visits`
- each snapshot table `Case ID` ↔ corresponding branch-link field on `Cases`
- `Cases.Latest Visit ID` ↔ `Visits`
- `Cases.Parent Case ID` ↔ `Cases`

Already-existing links expected to remain:

- `Visits.Patient ID`
- each snapshot table `Visit ID`
- `Patients.Visits`
- existing visit-to-snapshot branch links

## 5. Option Sets That Must Exist

## 5.1 New option sets required

These option-bearing fields are target-canon additions and must be created with these options:

### `Cases.Episode status`

Required options:

- `open`
- `monitoring`
- `closed`
- `split`

### `Cases.Follow-up pending`

Required options:

- `yes`
- `no`

## 5.2 Existing option sets that should be preserved

For existing branch tables and currently visible existing tables:

- preserve the currently extracted option sets as the starting canon
- do not re-invent option labels
- do not rename existing options casually during this migration stage

This applies to existing option-bearing fields already visible in `airtable_schema.json`, including:

- `Patients.Gender`
- `Visits.Visit type`
- branch-specific option fields on PRE / RAD / OP / DX / PLAN / DR

## 5.3 What this runbook does not require

This runbook does not require:

- renaming current branch fields
- broad option cleanup outside target-canon additions
- speculative option normalization not explicitly required by canon docs

## 6. What Must Not Be Deleted Yet

Do not delete during this migration:

- any current non-Case table
- any currently visible reusable field needed by the current runtime baseline
- any existing option set currently used by reusable fields
- any current visit/snapshot structural links already visible in `airtable_schema.json`

Do not perform destructive cleanup yet for:

- inconsistent current record values
- historical record identity cleanup
- historical case backfill decisions

Those are separate follow-on decisions.

## 7. Manual Verification Required After Airtable Changes

Migration is not complete just because fields were added.

A human must verify all of the following after Airtable changes:

### 7.1 Table existence

- `Cases` exists
- all current reusable tables still exist

### 7.2 Field existence

- every field listed in `docs/28_schema_migration_input_spec.md` now exists where required

### 7.3 Link verification

- link fields point to the intended target tables
- reciprocal/inverse links exist where Airtable creates them
- `Cases.Patient ID` links to `Patients`
- `Cases.Visits` links to `Visits`
- each snapshot `Case ID` links to `Cases`
- `Visits.Cases` links to `Cases`
- `Patients.Cases` links to `Cases`

### 7.4 Option verification

- `Episode status` contains exactly:
  - `open`
  - `monitoring`
  - `closed`
  - `split`
- `Follow-up pending` contains exactly:
  - `yes`
  - `no`

### 7.5 No destructive drift

- no reusable table was removed
- no required existing field was deleted
- no current runtime-critical field name changed casually

## 8. Pause Rules

Pause the migration immediately if any of the following is true:

- `Cases` cannot be created as specified
- a required linked field points to the wrong table
- a required field name conflicts with an unexpected existing object
- required option sets on new Case fields cannot be created as specified
- existing reusable tables or fields appear at risk of deletion/replacement
- the build diverges from `docs/28_schema_migration_input_spec.md`

When paused:

- do not continue with sender activation work
- keep runtime blocked as-is
- document the exact schema mismatch

## 9. Rollback Posture

Rollback posture is conservative:

- stop the migration if incomplete
- do not activate sender changes
- prefer leaving additive schema objects unused over deleting them quickly

This is safer than destructive rollback.

If partial migration exists:

- current runtime still remains the active runtime baseline
- blocked write families stay blocked
- sender activation must not begin until manual verification says the migration is complete enough

## 10. Completion Definition

This migration runbook is satisfied only when:

- all required target-canon schema objects exist in Airtable
- manual verification is complete
- no destructive drift occurred
- the resulting state satisfies the entry conditions in `docs/32_post_migration_sender_activation_entry_conditions.md`

At that point:

- Airtable is structurally ready for later sender activation work

But:

- runtime activation is still a separate later step
