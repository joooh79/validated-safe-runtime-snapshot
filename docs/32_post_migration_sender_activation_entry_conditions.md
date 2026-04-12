# 32. Post-Migration Sender Activation Entry Conditions

Status: post-migration entry conditions  
Date: 2026-04-12

## 1. Purpose

This document defines what must be true after Airtable migration before sender activation stages may begin.

It separates:

- Airtable migration completion
- sender activation readiness
- reasons something must remain blocked

It does not activate any runtime behavior by itself.

## 2. Current Runtime Boundary

Until the conditions below are met and later implementation stages are completed, the runtime baseline remains:

- patient
- visit
- PRE snapshot
- preview-first
- truthful blocking for unsupported mappings

Still blocked:

- case writes
- explicit link writes
- non-PRE snapshot writes

## 3. Stage 4 Entry Conditions

Stage 4 is sender target-schema adapter preparation.

Before Stage 4 begins, all of the following must be true in Airtable:

### 3.1 Required structure exists

- `Cases` table exists
- `Patients.Cases` exists
- `Visits.Cases` exists
- `Case ID` exists on:
  - `Pre-op Clinical Findings`
  - `Radiographic Findings`
  - `Operative Findings`
  - `Diagnosis`
  - `Treatment Plan`
  - `Doctor Reasoning`

### 3.2 Required Case fields exist

- `Case ID`
- `Patient ID`
- `Tooth number`
- `Episode start date`
- `Episode status`
- `Parent Case ID`
- `Visits`
- branch-link fields on `Cases`
- `Latest Visit ID`
- `Latest summary`
- `Latest working diagnosis`
- `Latest working plan`
- `Follow-up pending`
- `Case notes`

### 3.3 Required Case option sets exist

- `Episode status` contains:
  - `open`
  - `monitoring`
  - `closed`
  - `split`
- `Follow-up pending` contains:
  - `yes`
  - `no`

### 3.4 Manual verification evidence exists

- a human has checked the migrated schema against `docs/28_schema_migration_input_spec.md`
- no reusable current table was deleted
- no runtime-critical existing field was casually renamed or removed

If any of the above is false:

- Stage 4 must not begin

## 4. Stage 5 Case Activation Entry Conditions

Before any Case activation work begins, all Stage 4 entry conditions must already be true, plus:

### 4.1 Sender preparation status

- Stage 4 sender target-adapter preparation is complete enough to preflight target schema fail-closed
- sender mapping boundaries for Case fields are explicit
- missing Case mappings still block before write

### 4.2 Case-specific Airtable evidence

- `Cases.Patient ID` is verified to link to `Patients`
- `Cases.Visits` is verified to link to `Visits`
- `Cases.Latest Visit ID` is verified to link to `Visits`
- Case-to-branch link fields are verified on `Cases`
- snapshot `Case ID` fields are verified to link to `Cases`

### 4.3 Case readiness evidence

- Case identity fields required for `case_id` targeting exist
- lifecycle/latest-synthesis fields required for early Case activation exist
- historical-data posture is explicitly decided

If any of the above is false:

- case writes must remain blocked

## 5. Stage 6 Explicit Link Activation Entry Conditions

Before explicit link activation begins, all Stage 5 entry conditions must already be true, plus:

### 5.1 Linked-record field truth is verified

- the exact Airtable linked fields that explicit link actions would target are known
- it is verified whether separate explicit link actions are actually required
- the intended link-write shape is known well enough for provider design

### 5.2 Replay/idempotence posture is explicit

- expected replay behavior for repeated link writes is defined
- duplicate-safe expectations for partial link completion are defined

### 5.3 Case continuity posture is stable enough

- Case activation scope is stable enough that Case-related links are meaningful and safe to add

If any of the above is false:

- explicit link writes must remain blocked

## 6. Stage 7 Non-PRE Activation Entry Conditions

Before any non-PRE activation begins, all earlier stage entry conditions must already be true, plus:

### 6.1 Schema readiness across non-PRE tables

- each non-PRE table still exists:
  - `Radiographic Findings`
  - `Operative Findings`
  - `Diagnosis`
  - `Treatment Plan`
  - `Doctor Reasoning`
- each of those tables has:
  - `Record name`
  - `Visit ID`
  - `Case ID`
  - `Tooth number`

### 6.2 Case-aware structure is stable

- `Cases` branch-link fields exist for all non-PRE tables
- Case activation is at least stable enough for continuation/latest-synthesis behavior

### 6.3 Branch-specific sender evidence exists

For the branch being activated:

- exact writable field set is verified
- exact option coverage is verified
- create-vs-update behavior is verified under target-canon identity rules
- blocked-before-write behavior is defined for any still-missing mapping

If any of the above is false:

- that branch must remain blocked

## 7. Evidence Required To Say Migration Is Complete Enough

Migration is complete enough to start sender activation only when there is evidence for all of the following:

- target-canon-required Airtable tables/fields/links exist
- required Case option sets exist
- reusable existing tables remain intact
- schema matches `docs/28_schema_migration_input_spec.md`
- build order completed successfully per `docs/31_airtable_build_order_and_dependency_plan.md`
- pause conditions were not ignored
- a human verification pass was completed and recorded

## 8. Evidence Required To Keep Something Blocked

Keep a scope blocked if any of the following is true:

### 8.1 For Case activation

- `Cases` table missing
- required Case fields missing
- required Case links missing
- historical-data posture unresolved
- sender preflight cannot target Case fail-closed yet

### 8.2 For explicit link activation

- linked-record target fields are not precisely verified
- link-write shape is not precisely verified
- replay/idempotence behavior is unresolved

### 8.3 For non-PRE activation

- branch-specific writable field truth is incomplete
- branch-specific option truth is incomplete
- branch-specific create-vs-update truth is incomplete
- Case-aware schema is incomplete

## 9. Practical Go / No-Go Rule

Go for later sender activation work only if:

- Airtable migration is structurally complete
- manual verification evidence exists
- later sender preparation can still stay fail-closed until each scope is activated deliberately

No-go if:

- schema is partially migrated
- verification is incomplete
- any required dependency for the target scope is missing

In no-go state:

- runtime baseline remains unchanged
- blocked scopes remain blocked
