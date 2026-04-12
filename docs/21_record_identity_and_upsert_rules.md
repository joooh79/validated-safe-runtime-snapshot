# 21. Record Identity and Upsert Rules

Status: target canon draft for future sender + future Airtable alignment  
Date: 2026-04-12

## 1. Purpose

This document defines the exact target rules for:

- record identity
- record name
- create vs update vs upsert
- same-date correction
- later-date continuation
- duplicate prevention

These rules are the intended future canon for sender behavior and future Airtable alignment.

## 2. Canonical identity rules

### 2.1 Patient identity

Canonical identity key:
- `patient_id`

Target storage field:
- `Patients.Patients ID`

Rules:
- patient rows are unique by `patient_id`
- new patient create only when no existing patient resolves safely
- patient update uses the existing patient row keyed by `patient_id`
- duplicate suspicion must block before write if identity is not safe

### 2.2 Visit identity

Canonical identity key:
- `visit_id`

Target rule:
- `VISIT-{patient_id}-{YYYYMMDD}`

Examples:
- `VISIT-910001-20260412`
- `VISIT-123456-20221008`

Target storage field:
- `Visits.Visit ID`

Rules:
- one visit row per patient per visit date
- same-date correction updates the existing visit row
- later-date continuation always creates a new visit row
- sender must never create a second visit row for the same patient and same date

### 2.3 Case identity

Canonical identity key:
- `case_id`

Target rule:
- `CASE-{patient_id}-{tooth_number}-{YYYYMMDD}`

Where:
- `YYYYMMDD` = episode start date, not arbitrary write date

Examples:
- `CASE-910001-14-20260412`
- `CASE-123456-36-20221001`

Target storage field:
- `Cases.Case ID`

Rules:
- Case identity is based on patient + tooth + episode start date
- a later split creates a new Case with a new episode start date and therefore a new `case_id`
- sender must not create a second active case with the same `case_id`

### 2.4 Snapshot identity

Canonical snapshot identity key:
- `visit_id + tooth_number + branch_code`

Branch codes:
- `PRE`
- `RAD`
- `OP`
- `DX`
- `PLAN`
- `DR`

Rules:
- exactly one snapshot row per visit / tooth / branch
- same-date correction updates the existing row
- later-date continuation creates a new row because the visit is new

## 3. Canonical record name rules

### 3.1 Patient record name

Target value:
- same as `patient_id`

Field:
- `Patients ID`

### 3.2 Visit record name

Target value:
- same as `visit_id`

Field:
- `Visit ID`

### 3.3 Case record name

Target value:
- same as `case_id`

Field:
- `Case ID`

### 3.4 Snapshot record name

Target value:
- `{Visit ID}-{Tooth number}-{BRANCH CODE}`

Examples:
- `VISIT-910001-20260412-14-PRE`
- `VISIT-910001-20260412-14-DX`
- `VISIT-910001-20260419-14-PLAN`

Field:
- `Record name`

Rule:
- record name is deterministic and derived from visit identity, tooth number, and branch
- no suffix/index is used in the target canon
- if a same-date correction arrives, update the existing row with the same record name
- if a later-date continuation arrives, the new visit creates a new record name automatically

## 4. Create / update / upsert rules

### 4.1 Patients

Create:
- when patient is safely resolved as new

Update:
- when patient already exists and relevant patient-level data changed

Upsert rule:
- effectively upsert by `patient_id`, but sender should resolve first and then choose create/update explicitly

### 4.2 Visits

Create:
- when no same-date visit exists and visit is a new date event

Update:
- same-date correction path only

Upsert rule:
- upsert by `visit_id`
- sender should not create blindly; it must resolve same-date conflict first

### 4.3 Cases

Create:
- `create_case`
- `split_case` result creating a new continuity episode

Continue:
- `continue_case` attaches new visit/snapshots to the existing case row

Update:
- latest synthesis fields
- latest visit link
- follow-up pending
- status transitions

Close:
- update `Episode status = closed`

Split:
- old case updated to `Episode status = split`
- new case created with new `case_id`
- `Parent Case ID` on new case links back to old case

Upsert rule:
- never silent-blind upsert by weak similarity
- continue only when target case resolution is safe
- otherwise block and require correction or more explicit continuity input

### 4.4 Snapshot rows

Create:
- new visit + branch payload for that tooth/branch

Update:
- same-date correction only

Upsert rule:
- resolve by `(visit_id, tooth_number, branch_code)`
- if found on same-date correction path: update
- if not found on same-date correction path: create
- if later-date continuation: create new row because visit identity changed

## 5. Same-date correction rules

Same-date correction means:
- same patient
- same visit date
- existing visit already exists
- correction is explicitly confirmed or the visit intent is already `existing_visit_update`

Effects:
- update existing Visit row
- update existing snapshot rows for affected branches
- recompute latest Case synthesis if a Case link exists
- do not create a new Visit row
- do not create duplicate snapshot rows for the same visit/tooth/branch

## 6. Later-date continuation rules

Later-date continuation means:
- later visit date
- same tooth
- same clinical episode / same continuity case

Effects:
- create new Visit row
- create new snapshot rows for the new visit
- continue the existing Case
- update latest Case synthesis fields
- never overwrite earlier visit snapshot rows

## 7. Duplicate prevention rules

### 7.1 Patient
- no duplicate patient row when existing patient safely resolves
- duplicate suspicion blocks before write

### 7.2 Visit
- no second visit row for same patient and same date

### 7.3 Case
- no second active case row for same patient / tooth / episode start date

### 7.4 Snapshot
- no second row for same visit / tooth / branch

## 8. Idempotence rules

The sender should be idempotent against canonical identity:

- patient updates keyed by `patient_id`
- visit writes keyed by `visit_id`
- case writes keyed by `case_id`
- snapshot writes keyed by `(visit_id, tooth_number, branch_code)`

Idempotence does not mean blind overwrite.
It means deterministic targeting plus safe create/update choice.

## 9. What must never be overwritten

The following must never be overwritten by later continuity updates:

- prior visit rows
- prior snapshot rows from earlier visits
- prior same-visit snapshot rows except in same-date correction context

Case latest synthesis fields may change over time.
Historical visit/snapshot truth must not.
