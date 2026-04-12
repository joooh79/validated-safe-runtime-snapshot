# 31. Airtable Build Order And Dependency Plan

Status: Stage 2 / Stage 3 dependency plan  
Date: 2026-04-12

## 1. Purpose

This document defines the recommended order for building the target Airtable schema.

It is for human operators preparing or executing Airtable changes.

It does not activate sender behavior.

## 2. Build Principles

- additive-first
- current reusable tables stay in place
- create structure before considering sender activation
- stop if any dependency is incomplete
- do not combine schema build with runtime activation

## 3. Dependency Overview

### 3.1 Existing reusable base objects

These already exist and should remain in place before introducing `Cases`:

- `Patients`
- `Visits`
- `Pre-op Clinical Findings`
- `Radiographic Findings`
- `Operative Findings`
- `Diagnosis`
- `Treatment Plan`
- `Doctor Reasoning`

These are prerequisites because new Case links point back to them.

### 3.2 New central object

`Cases` is the new central target object.

Many later additions depend on it:

- `Patients.Cases`
- `Visits.Cases`
- each snapshot table `Case ID`
- `Cases.Patient ID`
- `Cases.Visits`
- branch-link fields on `Cases`
- `Cases.Latest Visit ID`
- `Cases.Parent Case ID`

## 4. Recommended Airtable Build Order

## Step 1. Freeze current reusable structure

Before creating anything new:

- confirm existing reusable tables are present
- confirm no destructive cleanup is in progress
- confirm the human operator is using `docs/28_schema_migration_input_spec.md`

Why first:

- later linked fields depend on these existing tables

## Step 2. Create `Cases` table shell

Create:

- `Cases`

Add first-pass fields:

- `Case ID`
- `Patient ID`
- `Tooth number`
- `Episode start date`
- `Episode status`
- `Parent Case ID`
- `Visits`
- `Latest Visit ID`
- `Follow-up pending`
- `Latest summary`
- `Latest working diagnosis`
- `Latest working plan`
- `Case notes`

Why this order:

- other tables will need to link into `Cases`
- the `Cases` table must exist before those fields can be created cleanly

## Step 3. Add Case-to-branch links on `Cases`

Add fields on `Cases`:

- `Pre-op Clinical Findings`
- `Radiographic Findings`
- `Operative Findings`
- `Diagnosis`
- `Treatment Plan`
- `Doctor Reasoning`

Why now:

- keeps all Case-side target links defined before adding reciprocal fields elsewhere

## Step 4. Add new link field to `Patients`

Add:

- `Patients.Cases`

Dependency:

- `Cases` must already exist

## Step 5. Add new link field to `Visits`

Add:

- `Visits.Cases`

Dependency:

- `Cases` must already exist

## Step 6. Add `Case ID` to each snapshot table

Add:

- `Pre-op Clinical Findings.Case ID`
- `Radiographic Findings.Case ID`
- `Operative Findings.Case ID`
- `Diagnosis.Case ID`
- `Treatment Plan.Case ID`
- `Doctor Reasoning.Case ID`

Dependency:

- `Cases` must already exist

Why after Step 2:

- snapshot tables need a real target Case table to link to

## Step 7. Verify option-bearing Case fields

Verify or create the option sets on:

- `Cases.Episode status`
- `Cases.Follow-up pending`

Required options:

- `Episode status`
  - `open`
  - `monitoring`
  - `closed`
  - `split`
- `Follow-up pending`
  - `yes`
  - `no`

Dependency:

- those fields must already exist on `Cases`

## Step 8. Manual verification pass

Verify:

- every required table exists
- every required field exists
- every linked field points to the intended table
- no current reusable object was deleted or renamed casually

Dependency:

- all build steps above completed

## 5. What Must Exist Before Specific Milestones

### 5.1 Before `Cases` can be introduced

Must already exist and remain intact:

- `Patients`
- `Visits`
- all current snapshot branch tables

Why:

- the target `Cases` table links back to them

### 5.2 Before sender mapping activation can begin

Must already exist:

- `Cases`
- all required fields on `Cases`
- `Patients.Cases`
- `Visits.Cases`
- `Case ID` on every snapshot table
- verified Case option sets
- manual verification evidence that the migration matches the input spec

Why:

- Stage 4 sender preparation needs a stable post-migration target to map against

### 5.3 Before any Case activation can begin

Must already exist:

- everything required for sender mapping activation
- verified Case identity-bearing fields and lifecycle/latest-synthesis fields
- verified Case-to-visit and Case-to-snapshot link structure

### 5.4 Before any non-PRE activation can begin

Must already exist:

- the complete migrated Case-aware schema
- `Case ID` on every non-PRE snapshot table
- stable Case-side branch links on `Cases`
- completed sender-side Stage 4 preparation
- later Stage 5 Case activation readiness

## 6. Recommended Human Implementation Order

Recommended operator order:

1. confirm current reusable tables remain intact
2. create `Cases`
3. add core Case identity/lifecycle fields
4. add Case relationship fields to `Cases`
5. add `Patients.Cases`
6. add `Visits.Cases`
7. add `Case ID` to PRE / RAD / OP / DX / PLAN / DR tables
8. verify `Episode status` and `Follow-up pending` options
9. run manual schema verification against `docs/28_schema_migration_input_spec.md`
10. declare migration either:
   - complete enough for Stage 4 sender preparation
   - or incomplete and still blocked

## 7. Pause Conditions During Build

Pause if:

- a required field cannot be created as specified
- a linked field points to the wrong table
- a current reusable table appears inconsistent with the input spec
- a required Case field conflicts with an unexpected existing object
- any step would require deleting reusable current-runtime structure

## 8. Practical Result

If this build order is followed:

- the Airtable base becomes structurally target-canon-capable
- the migration remains additive-first
- sender activation can begin later from a verified schema

If this build order is not complete:

- sender activation must not begin
- blocked scope stays blocked
