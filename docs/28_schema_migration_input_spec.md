# 28. Schema Migration Input Spec

Status: Stage 1 migration input spec  
Date: 2026-04-12

## 1. Purpose

This document is a human-usable Airtable migration input spec for the target canon.

It defines what must exist in Airtable for the target schema destination.

It does not claim:

- that the target schema already exists
- that schema migration has already been executed
- that runtime activation should happen immediately after schema creation

## 2. Current vs Target Reading Rule

Current Airtable truth is taken from `airtable_schema.json`.

Target schema truth is taken from:

- `docs/20_target_schema_canon.md`
- `docs/21_record_identity_and_upsert_rules.md`
- `docs/22_target_schema_vs_current_airtable_gap.md`

When this document says "required", it means:

- required for the future target canon
- not necessarily present today

## 3. Target Tables

Target tables that must exist:

1. `Patients`
2. `Visits`
3. `Cases`
4. `Pre-op Clinical Findings`
5. `Radiographic Findings`
6. `Operative Findings`
7. `Diagnosis`
8. `Treatment Plan`
9. `Doctor Reasoning`

Current reuse posture:

- reuse all existing non-Case tables above
- add `Cases` as a new table

## 4. Table-by-Table Input Spec

## 4.1 Patients

Table name:

- `Patients`

Required target fields:

- `Patients ID`
  - type: primary text field
- `Birth year`
  - type: number
- `Gender`
  - type: single select
  - required options:
    - `Male`
    - `Female`
- `First visit date`
  - type: date
- `Medical alert`
  - type: multiline text
- `Visits`
  - type: linked records to `Visits`
- `Cases`
  - type: linked records to `Cases`

Current-state note:

- all fields except `Cases` are already visible in `airtable_schema.json`

## 4.2 Visits

Table name:

- `Visits`

Required target fields:

- `Visit ID`
  - type: primary text field
- `Patient ID`
  - type: linked records to `Patients`
- `Date`
  - type: date
- `Visit type`
  - type: single select
  - required options:
    - `first visit`
    - `recall`
    - `emergency`
- `Chief Complaint`
  - type: multiline text
- `Pain level`
  - type: number
- `Cases`
  - type: linked records to `Cases`
- `Pre-op Clinical Findings`
  - type: linked records to `Pre-op Clinical Findings`
- `Radiographic Findings`
  - type: linked records to `Radiographic Findings`
- `Operative Findings`
  - type: linked records to `Operative Findings`
- `Diagnosis`
  - type: linked records to `Diagnosis`
- `Treatment Plan`
  - type: linked records to `Treatment Plan`
- `Doctor Reasoning`
  - type: linked records to `Doctor Reasoning`

Current-state note:

- all fields except `Cases` are already visible in `airtable_schema.json`

## 4.3 Cases

Table name:

- `Cases`

Required target fields:

- `Case ID`
  - type: primary text field
- `Patient ID`
  - type: linked records to `Patients`
- `Tooth number`
  - type: single line text
- `Episode start date`
  - type: date
- `Episode status`
  - type: single select
  - required options:
    - `open`
    - `monitoring`
    - `closed`
    - `split`
- `Parent Case ID`
  - type: linked records to `Cases`
  - optional
- `Visits`
  - type: linked records to `Visits`
- `Pre-op Clinical Findings`
  - type: linked records to `Pre-op Clinical Findings`
- `Radiographic Findings`
  - type: linked records to `Radiographic Findings`
- `Operative Findings`
  - type: linked records to `Operative Findings`
- `Diagnosis`
  - type: linked records to `Diagnosis`
- `Treatment Plan`
  - type: linked records to `Treatment Plan`
- `Doctor Reasoning`
  - type: linked records to `Doctor Reasoning`
- `Latest Visit ID`
  - type: linked records to `Visits`
- `Latest summary`
  - type: multiline text
- `Latest working diagnosis`
  - type: multiline text
- `Latest working plan`
  - type: multiline text
- `Follow-up pending`
  - type: single select
  - required options:
    - `yes`
    - `no`
- `Case notes`
  - type: multiline text

Current-state note:

- `Cases` is not visible in `airtable_schema.json`
- all fields above are target-state requirements, not current-state claims

## 4.4 Pre-op Clinical Findings

Table name:

- `Pre-op Clinical Findings`

Required shared structural fields:

- `Record name`
  - type: single line text
- `Visit ID`
  - type: linked records to `Visits`
- `Case ID`
  - type: linked records to `Cases`
- `Tooth number`
  - type: single line text

Required branch fields from current extracted starting canon:

- `Symptom`
  - type: multiple select
  - required options:
    - `cold sensitivity`
    - `bite pain`
    - `pain on release`
    - `chewing pain`
    - `spontaneous pain`
    - `none`
- `Symptom reproducible`
  - type: single select
  - required options:
    - `yes`
    - `no`
    - `not tested`
- `Visible crack`
  - type: single select
  - required options:
    - `none`
    - `suspected`
    - `visible`
- `Crack detection method`
  - type: multiple select
  - required options:
    - `visual`
    - `transillumination`
    - `bite test`
    - `photo magnification`
    - `N/A`
- `Functional Cusp - involvement`
  - type: single select
  - required options:
    - `yes`
    - `no`
    - `uncertain`
- `Pulp - EPT`
  - type: single select
  - required options:
    - `positive`
    - `weak`
    - `negative`
    - `not tested`
- `Pulp - cold test`
  - type: single select
  - required options:
    - `normal`
    - `sensitive`
    - `lingering`
    - `none`
    - `not tested`
- `existing restorations`
  - type: single select
  - required options:
    - `none`
    - `composite`
    - `amalgam`
    - `gold inlay`
    - `ceramic inlay/onlay`
    - `crown`
- `Existing restoration size`
  - type: single select
  - required options:
    - `small`
    - `moderate`
    - `large`
- `Occlusal wear`
  - type: single select
  - required options:
    - `none`
    - `mild`
    - `moderate`
    - `severe`
- `Structure estimation - suspected cusp thin?`
  - type: single select
  - required options:
    - `no`
    - `possible`
    - `likely`
- `Margin estimation - suspected subgingival margin`
  - type: single select
  - required options:
    - `no`
    - `possible`
    - `clear`
- `Rubber Dam Feasibility`
  - type: single select
  - required options:
    - `easy`
    - `difficult`
    - `impossible`

Current-state note:

- all fields above except `Case ID` are already visible in `airtable_schema.json`

## 4.5 Radiographic Findings

Table name:

- `Radiographic Findings`

Required shared structural fields:

- `Record name`
- `Visit ID`
- `Case ID`
- `Tooth number`

Required branch fields from current extracted starting canon:

- `Radiograph type`
  - options:
    - `bitewing`
    - `periapical`
    - `panoramic`
    - `CBCT`
- `Radiographic caries depth`
  - options:
    - `none`
    - `enamel`
    - `outer dentin`
    - `middle dentin`
    - `deep dentin`
- `Secondary caries`
  - options:
    - `none`
    - `suspected`
    - `clear`
- `Caries location`
  - options:
    - `mesial`
    - `distal`
    - `occlusal`
    - `cervical`
    - `root`
    - `N/A`
- `Pulp chamber size`
  - options:
    - `large`
    - `normal`
    - `narrow`
    - `very narrow`
- `Periapical lesion`
  - options:
    - `none`
    - `suspected`
    - `present`
- `Radiographic fracture sign`
  - options:
    - `none`
    - `possible fracture`
    - `clear fracture`
- `Radiograph link`
  - type: url

Current-state note:

- all fields above except `Case ID` are already visible in `airtable_schema.json`

## 4.6 Operative Findings

Table name:

- `Operative Findings`

Required shared structural fields:

- `Record name`
- `Visit ID`
- `Case ID`
- `Tooth number`

Required branch fields from current extracted starting canon:

- `Rubber dam isolation`
  - options:
    - `isolated`
    - `difficult but isolated`
    - `not possible`
- `Caries depth (actual)`
  - options:
    - `enamel`
    - `outer dentin`
    - `middle dentin`
    - `deep dentin`
    - `pulp exposure`
- `Soft dentin remaining`
  - options:
    - `none`
    - `minimal`
    - `intentional`
- `Crack confirmed`
  - options:
    - `none`
    - `enamel crack`
    - `dentin crack`
    - `deep crack`
    - `split tooth`
- `Crack location`
  - options:
    - `mesial marginal ridge`
    - `distal marginal ridge`
    - `central groove`
    - `buccal`
    - `palatal`
    - `unknown`
    - `N/A`
- `Remaining cusp thickness (mm)`
  - type: number
- `Subgingival margin`
  - options:
    - `no`
    - `supragingival`
    - `slightly subgingival`
    - `deep subgingival`
- `Deep marginal elevation`
  - options:
    - `not needed`
    - `performed`
- `IDS/resin coating`
  - options:
    - `none`
    - `performed`
- `Resin core build up type`
  - options:
    - `none`
    - `standard core`
    - `fiber reinforced core`
    - `standard resin core`
- `Occlusal loading test`
  - options:
    - `not performed`
    - `performed`
- `Loading test result`
  - options:
    - `complete relief`
    - `partial relief`
    - `no change`
    - `worse`
    - `N/A`
- `Intraoral photo link`
  - type: url

Current-state note:

- all fields above except `Case ID` are already visible in `airtable_schema.json`

## 4.7 Diagnosis

Table name:

- `Diagnosis`

Required shared structural fields:

- `Record name`
- `Visit ID`
- `Case ID`
- `Tooth number`

Required branch fields from current extracted starting canon:

- `Structural diagnosis`
  - options:
    - `intact tooth`
    - `primary caries`
    - `secondary caries`
    - `cracked tooth`
    - `cusp fracture`
    - `split tooth`
    - `root fracture`
    - `N/A`
- `Pulp diagnosis`
  - options:
    - `normal pulp`
    - `reversible pulpitis`
    - `irreversible pulpitis`
    - `necrotic pulp`
    - `previously treated`
- `Crack severity`
  - options:
    - `none`
    - `superficial crack`
    - `dentin crack`
    - `deep crack`
    - `split tooth`
- `Occlusion risk`
  - options:
    - `normal`
    - `heavy occlusion`
    - `bruxism suspected`
- `Restorability`
  - options:
    - `restorable`
    - `questionable`
    - `non-restorable`

Current-state note:

- all fields above except `Case ID` are already visible in `airtable_schema.json`

## 4.8 Treatment Plan

Table name:

- `Treatment Plan`

Required shared structural fields:

- `Record name`
- `Visit ID`
- `Case ID`
- `Tooth number`

Required branch fields from current extracted starting canon:

- `Pulp therapy`
  - options:
    - `none`
    - `VPT`
    - `RCT`
- `Restoration design`
  - options:
    - `direct composite`
    - `inlay`
    - `onlay`
    - `overlay`
    - `crown`
    - `implant crown`
    - `extraction`
- `Restoration material`
  - options:
    - `composite`
    - `ultimate`
    - `e.max`
    - `zirconia`
    - `gold`
    - `none`
- `Implant placement`
  - options:
    - `not planned`
    - `planned`
    - `placed`
- `Scan file link`
  - type: url

Current-state note:

- all fields above except `Case ID` are already visible in `airtable_schema.json`

## 4.9 Doctor Reasoning

Table name:

- `Doctor Reasoning`

Required shared structural fields:

- `Record name`
- `Visit ID`
- `Case ID`
- `Tooth number`

Required branch fields from current extracted starting canon:

- `Decision factor`
  - options:
    - `remaining cusp thickness`
    - `functional cusp involvement`
    - `crack depth`
    - `caries depth`
    - `pulp status`
    - `occlusion`
    - `subgingival margin`
    - `N/A`
- `Remaining cusp thickness decision`
  - options:
    - `>1.5 mm cusp preserved`
    - `<1.5 mm cusp coverage`
- `Functional cusp involvement`
  - options:
    - `yes`
    - `no`
- `Crack progression risk`
  - options:
    - `low`
    - `moderate`
    - `high`
- `Occlusal risk`
  - options:
    - `normal`
    - `heavy occlusion`
    - `bruxism suspected`
- `Reasoning notes`
  - type: multiline text

Current-state note:

- all fields above except `Case ID` are already visible in `airtable_schema.json`

## 5. Target Identity Inputs

These are schema-adjacent requirements that Airtable build/update owners should know before runtime activation.

### 5.1 Visit identity

- storage field: `Visits.Visit ID`
- target rule: `VISIT-{patient_id}-{YYYYMMDD}`

### 5.2 Case identity

- storage field: `Cases.Case ID`
- target rule: `CASE-{patient_id}-{tooth_number}-{YYYYMMDD}`

### 5.3 Snapshot identity

- storage field: `Record name`
- target rule: `{Visit ID}-{Tooth number}-{BRANCH CODE}`

## 6. Link Requirements

Target operational links that Airtable must support:

- Patient ↔ Visits
- Patient ↔ Cases
- Visit ↔ Cases
- Visit ↔ Snapshot rows
- Case ↔ Visits
- Case ↔ Snapshot rows

Required direct target fields:

- `Visits.Patient ID`
- `Cases.Patient ID`
- `Visits.Cases`
- `Cases.Visits`
- each snapshot table: `Visit ID`
- each snapshot table: `Case ID`

## 7. Build/Update Notes For Human Operators

- Do not remove existing reusable tables to satisfy this spec.
- Add missing Case-aware structure first.
- Do not assume runtime should start writing new fields immediately after schema creation.
- After schema changes, sender/runtime still remains blocked until later activation stages.

## 8. Completion Definition For This Spec

This spec is ready for Stage 2 and Stage 3 when a human Airtable operator can use it to:

- create the `Cases` table
- add the missing Case-linked fields
- verify reused tables/fields against the target canon

without having to infer missing target structure from scattered docs.
