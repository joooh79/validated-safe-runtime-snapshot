# State Resolution Rules

## Purpose

This document defines the core decision layer for the rebuilt sender.

The State Resolution Engine must finish before write planning begins.

## Required input concepts

- workflow intent
- continuity intent
- patient clues
- visit context
- findings context
- current-state lookup results

## Required output concepts

- patient resolution result
- visit resolution result
- case resolution result
- correction / recheck / hard-stop result
- ambiguity result
- execution readiness result
- preview-facing human summary

## Patient resolution outcomes

Allowed conceptual outcomes:
- resolved_existing_patient
- create_new_patient
- correction_needed_patient_duplicate_suspicion
- recheck_required_patient_not_found
- unresolved_ambiguous_patient
- hard_stop_patient_resolution

Rules:
- existing-like claim + miss => recheck, not blind create
- duplicate suspicion => correction needed, not blind create
- unresolved ambiguity => block write

## Visit resolution outcomes

Allowed conceptual outcomes:
- create_new_visit
- update_existing_visit_same_date
- correction_needed_same_date_conflict
- hard_stop_same_date_keep_new_visit_claim
- unresolved_visit_ambiguity

Rules:
- same-date existence is routing evidence, not automatic intent override
- same-date + existing_visit_update intent => update_existing_visit_same_date
- same-date + new_visit + no correction confirmation => correction needed
- same-date + new_visit + explicit keep-new stance => hard stop
- no same-date conflict => create_new_visit if otherwise safe

## Case resolution outcomes

Allowed conceptual outcomes:
- create_case
- continue_case
- close_case
- split_case
- none
- unresolved_case_ambiguity

Rules:
- later-date same episode => continue_case
- same tooth but clearly new episode => create_case or split_case
- same-date correction is primarily visit correction first
- user input must not require Airtable record refs
- user input should not require exact episode start date in normal continuation flow
- `continue_case` should prefer sender-side candidate discovery from patient + tooth + current-state evidence
- if exactly one safe candidate case is found, sender may auto-resolve `continue_case`
- if multiple plausible candidates exist, sender must surface candidate selection/confirmation before write
- if no plausible candidate exists, sender must block or recheck rather than inventing a target case
- execution-ready continuation requires both business identity and provider record refs to be resolved internally

### Case continuity inputs

User-provided continuity clues may include:
- `patientId`
- `toothNumber`
- `visitDate`
- `continuityIntent`
- clinical findings / reasoning that imply continuation

User-provided continuity clues must not require:
- Airtable `recordId`
- exact provider link refs
- exact historical episode start date in ordinary use

### Case continuity lookup responsibility

Sender responsibility:
- resolve the existing patient row
- discover candidate Cases for the patient
- narrow candidates by tooth number and continuity-safe heuristics
- resolve the Airtable Case row ref when a single safe candidate exists
- surface candidates for confirmation if more than one plausible Case remains

Preferred candidate ranking signals:
- same patient
- same tooth
- open episode status
- most recent linked/latest visit
- strongest continuity-compatible summary / diagnosis evidence

## Ambiguity rules

Ambiguity must never be silently converted into write.

Allowed ambiguity outcomes:
- correction needed
- recheck required
- hard stop
- blocked unresolved
- preview requiring user confirmation

Forbidden ambiguity behavior:
- blind create
- blind attach
- silent overwrite

## Readiness results

Allowed readiness outcomes:
- ready_for_write_plan
- blocked_requires_correction
- blocked_requires_recheck
- blocked_hard_stop
- blocked_unresolved

Only `ready_for_write_plan` may proceed into a send-ready write plan.
All other results may produce preview/explanation only.

## Resolution must preserve

- same-date correction
- patient duplication correction
- recheck behavior
- visit-safe routing
- case continuity resolution
- ambiguity blocking before write
