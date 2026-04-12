# 22. Target Schema vs Current Airtable Gap

Status: target-vs-current gap analysis  
Date: 2026-04-12

## 1. Purpose

This document compares:

- the intended target schema canon
- the current Airtable schema visible in `airtable_schema.json`

The purpose is to show what already aligns, what conflicts, and what must change before the future sender can target the full model.

## 2. Current Airtable truth (from `airtable_schema.json`)

Current visible tables:

- Patients
- Visits
- Pre-op Clinical Findings
- Radiographic Findings
- Operative Findings
- Diagnosis
- Treatment Plan
- Doctor Reasoning

Current visible structural truths:

- Visits already links to Patients through `Patient ID`
- each snapshot table already links to Visits through `Visit ID`
- non-PRE branch tables already exist
- field names and option vocabularies already exist for PRE / RAD / OP / DX / PLAN / DR

Current missing truth:

- no Cases table visible
- no Case-linked fields visible on Visits
- no Case-linked fields visible on snapshot tables
- no current Airtable evidence for target case lifecycle fields
- no current Airtable evidence for target case latest synthesis fields

## 3. What already matches target canon

### 3.1 Patients table
Matches broadly:
- Patients table exists
- `Patients ID` exists
- patient demographic/alert fields already exist
- Patients ↔ Visits relationship already exists

### 3.2 Visits table
Matches broadly:
- Visits table exists
- `Visit ID` exists
- `Patient ID` linked field exists
- date + visit type + complaint + pain fields exist
- visit ↔ snapshot branch relationships already exist

### 3.3 Snapshot branch tables
Matches broadly:
- PRE / RAD / OP / DX / PLAN / DR tables already exist
- `Record name` exists
- `Visit ID` linked field exists
- `Tooth number` exists
- branch-specific field vocabularies already exist
- many option sets already exist

## 4. What does not match target canon yet

### 4.1 Cases table missing
Target requires:
- Cases table
- Case identity
- Case lifecycle fields
- latest synthesis fields
- Case ↔ Visit links
- Case ↔ Snapshot links

Current Airtable:
- none of this is visible

### 4.2 Snapshot tables missing `Case ID`
Target requires every snapshot table to have:
- `Case ID` linked field

Current Airtable:
- no snapshot table shows `Case ID`

### 4.3 Visits missing `Cases` link
Target requires:
- `Visits.Cases` linked field

Current Airtable:
- not visible

### 4.4 Patients missing `Cases` link
Target requires:
- `Patients.Cases` linked field

Current Airtable:
- not visible

## 5. Record identity and record name comparison

### 5.1 Visits
Current:
- `Visit ID` field exists

Target:
- retain `Visit ID`
- enforce deterministic value rule: `VISIT-{patient_id}-{YYYYMMDD}`

Gap:
- current field exists
- value rule may need to be standardized if current data is inconsistent

### 5.2 Snapshot rows
Current:
- `Record name` exists in each snapshot table

Target:
- enforce deterministic value rule: `{Visit ID}-{Tooth number}-{BRANCH CODE}`

Gap:
- field exists
- value rule may need migration/cleanup if current data does not follow this format

### 5.3 Case rows
Current:
- no Case table visible

Target:
- `Case ID` primary field with deterministic rule `CASE-{patient_id}-{tooth_number}-{YYYYMMDD}`

Gap:
- full table creation required

## 6. Link model comparison

### Current
- Patient ↔ Visit: present
- Visit ↔ Snapshot: present
- Case ↔ anything: absent

### Target
- Patient ↔ Visit: required
- Patient ↔ Case: required
- Visit ↔ Snapshot: required
- Visit ↔ Case: required
- Case ↔ Snapshot: required

Gap:
- all Case-related links require schema change

## 7. Migration requirements

To move current Airtable toward target canon, at minimum:

1. add `Cases` table
2. add `Cases.Patient ID`
3. add `Cases.Visits`
4. add branch links on Cases:
   - Pre-op Clinical Findings
   - Radiographic Findings
   - Operative Findings
   - Diagnosis
   - Treatment Plan
   - Doctor Reasoning
5. add `Visits.Cases`
6. add `Patients.Cases`
7. add `Case ID` linked field to every snapshot table
8. add Case lifecycle / latest synthesis fields:
   - Episode start date
   - Episode status
   - Parent Case ID
   - Latest Visit ID
   - Latest summary
   - Latest working diagnosis
   - Latest working plan
   - Follow-up pending
   - Case notes

## 8. What can be reused with minimal change

Likely reusable with minimal structural change:

- existing Patients table
- existing Visits table
- existing PRE / RAD / OP / DX / PLAN / DR tables
- most existing branch field vocabularies
- most existing branch option sets

## 9. What must stay blocked until migration

The following must remain blocked until Airtable is changed to match target canon:

- case create/write/update/close/split
- snapshot-to-case writes
- visit-to-case writes
- patient-to-case writes
- any sender behavior that assumes Cases already exists in Airtable

## 10. Practical implication

The current safe slice remains valid and useful.
But the **full intended model cannot be activated in Airtable until the base is migrated toward the target canon defined in `docs/20_target_schema_canon.md` and `docs/21_record_identity_and_upsert_rules.md`.**

That means the next true activation milestone is not another confirmation note.
It is a schema migration step.
