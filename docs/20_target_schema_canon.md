# 20. Target Schema Canon

Status: target canon draft for future sender + future Airtable alignment  
Date: 2026-04-12

## 1. Purpose

This document defines the **target schema canon** for the sender-first system.

This is **not** a statement that the current Airtable base already matches this target.
This document is the intended future schema that the sender should ultimately write to, and that Airtable should be migrated to match.

This canon deliberately preserves the project's core model:

- Patient = identity layer
- Visit = date event
- Case = continuity / latest synthesis layer
- Snapshot rows = visit-time truth

## 2. Design commitments

The target schema canon is locked to these commitments:

1. Visit remains a date event.
2. Snapshot rows remain visit-time truth.
3. Same-date correction may update an existing visit and existing snapshot rows.
4. Later-date continuation must create a new visit and new snapshot rows.
5. Case is a real first-class table in the target design.
6. Case stores continuity / latest synthesis and must not overwrite historical visit snapshot truth.
7. Snapshot identity is visit-based, not case-based.
8. Case links to visits and snapshots, but does not replace them.

## 3. Target tables

The target schema uses these tables:

1. Patients
2. Visits
3. Cases
4. Pre-op Clinical Findings
5. Radiographic Findings
6. Operative Findings
7. Diagnosis
8. Treatment Plan
9. Doctor Reasoning

### 3.1 Reuse vs new target objects

- Reuse current base concepts where already aligned:
  - Patients
  - Visits
  - PRE / RAD / OP / DX / PLAN / DR tables
- Add in target schema:
  - Cases table
  - Case-linked fields on Visits
  - Case-linked fields on each snapshot table

## 4. Patients table — target canon

Table name: `Patients`

Target fields:

- `Patients ID` — primary text field; canonical patient identifier
- `Birth year` — number
- `Gender` — single select
- `First visit date` — date
- `Medical alert` — multiline text
- `Visits` — linked records to Visits
- `Cases` — linked records to Cases

Notes:

- `Patients ID` is retained as the Airtable field label to reduce migration friction with the current base.
- In sender logic, the semantic variable remains `patient_id`.
- Patients do not carry longitudinal tooth-specific reasoning directly; that belongs to Cases.

## 5. Visits table — target canon

Table name: `Visits`

Target fields:

- `Visit ID` — primary text field; canonical visit identifier
- `Patient ID` — linked records to Patients
- `Date` — date
- `Visit type` — single select
- `Chief Complaint` — multiline text
- `Pain level` — number
- `Cases` — linked records to Cases
- `Pre-op Clinical Findings` — linked records to Pre-op Clinical Findings
- `Radiographic Findings` — linked records to Radiographic Findings
- `Operative Findings` — linked records to Operative Findings
- `Diagnosis` — linked records to Diagnosis
- `Treatment Plan` — linked records to Treatment Plan
- `Doctor Reasoning` — linked records to Doctor Reasoning

Notes:

- Visit is the event anchor.
- A Visit may link to one or more Cases, but Visit itself is not the continuity container.
- Snapshot rows are linked to Visit and optionally surfaced back through Visit link fields.

## 6. Cases table — target canon

Table name: `Cases`

Case is a **real Airtable table** in the target design.

### 6.1 Purpose

Case exists to store continuity and latest synthesis for the same tooth and same clinical episode over time.

Case is not allowed to replace or overwrite visit-time rows.

### 6.2 Target fields

- `Case ID` — primary text field
- `Patient ID` — linked records to Patients
- `Tooth number` — single line text
- `Episode start date` — date
- `Episode status` — single select
- `Parent Case ID` — linked records to Cases; optional, used for split lineage
- `Visits` — linked records to Visits
- `Pre-op Clinical Findings` — linked records to Pre-op Clinical Findings
- `Radiographic Findings` — linked records to Radiographic Findings
- `Operative Findings` — linked records to Operative Findings
- `Diagnosis` — linked records to Diagnosis
- `Treatment Plan` — linked records to Treatment Plan
- `Doctor Reasoning` — linked records to Doctor Reasoning
- `Latest Visit ID` — linked records to Visits
- `Latest summary` — multiline text
- `Latest working diagnosis` — multiline text
- `Latest working plan` — multiline text
- `Follow-up pending` — single select
- `Case notes` — multiline text

### 6.3 Case option canon

`Episode status` options:

- `open`
- `monitoring`
- `closed`
- `split`

`Follow-up pending` options:

- `yes`
- `no`

### 6.4 Case storage boundary

Case stores:

- continuity identity
- latest synthesis
- latest working diagnosis
- latest working plan
- follow-up status
- lineage for split cases

Case does **not** store:

- the only truth of a visit
- the only truth of a procedure
- the only truth of a diagnosis at a given visit
- overwritten historical snapshot content

## 7. Snapshot branch tables — target canon

Snapshot rows remain separate branch tables.

Each branch table represents **visit-time truth** for that branch.

### 7.1 Shared target fields across all snapshot tables

Every snapshot table must contain:

- `Record name` — canonical snapshot record name value
- `Visit ID` — linked records to Visits
- `Case ID` — linked records to Cases
- `Tooth number` — single line text

Additional branch fields are branch-specific.

### 7.2 Branch-specific tables

#### PRE
Table name: `Pre-op Clinical Findings`

Use the current branch concept and field vocabulary as starting canon.
Retain visit-time diagnostic/pre-operative truth.

#### RAD
Table name: `Radiographic Findings`

Use the current branch concept and field vocabulary as starting canon.
Retain visit-time radiographic truth.

#### OP
Table name: `Operative Findings`

Use the current branch concept and field vocabulary as starting canon.
Retain visit-time operative/procedure truth.

#### DX
Table name: `Diagnosis`

Use the current branch concept and field vocabulary as starting canon.
Retain visit-time diagnosis truth.

#### PLAN
Table name: `Treatment Plan`

Use the current branch concept and field vocabulary as starting canon.
Retain visit-time treatment planning truth.

#### DR
Table name: `Doctor Reasoning`

Use the current branch concept and field vocabulary as starting canon.
Retain visit-time reasoning truth.

## 8. Field vocabulary rule for snapshot branches

For PRE / RAD / OP / DX / PLAN / DR:

- Existing field names and existing option sets extracted from `airtable_schema.json` are the **starting field canon** unless explicitly revised later.
- The required structural additions in the target schema are:
  - `Case ID` linked field on every snapshot table
  - target record identity and upsert rules from `docs/21_record_identity_and_upsert_rules.md`

## 9. Link model — target canon

Required operational links:

- Patient ↔ Visits
- Patient ↔ Cases
- Visit ↔ Cases
- Visit ↔ Snapshot rows
- Case ↔ Visits
- Case ↔ Snapshot rows

### 9.1 Required direct links

Required:

- `Visits.Patient ID`
- `Cases.Patient ID`
- `Visits.Cases`
- `Cases.Visits`
- each snapshot table: `Visit ID`
- each snapshot table: `Case ID`

### 9.2 Operational priority

Operationally important link directions:

1. snapshot → visit
2. snapshot → case
3. visit → patient
4. case → patient

Inverse links are useful, but sender logic should assume the forward write shape above.

## 10. Sender write target summary

The future sender should target:

- Patients table by canonical patient identity
- Visits table by canonical visit identity
- Cases table by canonical case identity
- branch tables by canonical snapshot identity

Sender should not treat current Airtable shape as final truth when it conflicts with this target canon.

## 11. What this document does not claim

This document does not claim that the current Airtable base already has:

- a Cases table
- Case-linked fields on Visits
- Case-linked fields on snapshot tables
- target record identity / upsert behavior

Those are target-state requirements, not current-state claims.
