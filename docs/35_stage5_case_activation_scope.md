# Stage 5 Case Activation Scope

This document defines the exact conservative Stage 5 Case scope that is now active.

This is not broad Case activation.
This is not explicit link activation.
This is not non-PRE activation.

## 1. Stage 5 Goal

Stage 5 activates the smallest safe Case runtime behavior needed to move beyond the previous always-blocked Case state.

The active runtime still preserves:
- preview-first
- confirm-to-execute
- truthful correction / recheck / hard-stop / no-op / blocked-before-write
- fail-closed handling for unresolved or unsupported semantics

## 2. Activated Case Behaviors

### 2.1 `create_case`

Activated now only when all of the following are true:
- Case resolution status is exactly `create_case`
- there is exactly one tooth in scope
- visit date is explicit
- patient identity is already resolved
- runtime remains inside the currently safe PRE-oriented validated slice

Active write behavior:
- create a `Cases` row
- set `Case ID`
- set `Patient ID`
- set `Tooth number`
- set `Episode start date`
- set `Episode status = open`
- set `Latest Visit ID` as a deterministic visit identity string

Stage 5 does not also activate:
- `Cases.Visits`
- `Visits.Cases`
- snapshot `Case ID`
- Case-side reverse branch links

### 2.2 `continue_case`

Activated now only as a minimal safe existing-case update.

Activated only when all of the following are true:
- Case resolution status is exactly `continue_case`
- the existing target case is already resolved safely
- there is exactly one tooth in scope
- visit date is explicit
- patient identity is already resolved

Active write behavior:
- update the existing `Cases` row
- set `Latest Visit ID` as a deterministic visit identity string
- keep `Episode status = open`

This Stage 5 continuation path does not yet activate:
- explicit visit-to-case linked-record writes
- explicit snapshot-to-case linked-record writes
- broader latest synthesis field population beyond the narrow safe update slot

## 3. Runtime Semantics Lock

### 3.1 Case identity rule now used

Stage 5 uses the canon rule from `docs/21_record_identity_and_upsert_rules.md`:
- `CASE-{patient_id}-{tooth_number}-{YYYYMMDD}`

Where:
- `patient_id` is the currently resolved patient identity token carried by the runtime
- `tooth_number` is the single active tooth in scope
- `YYYYMMDD` comes from the visit date / episode start date

### 3.2 When `create_case` is allowed

`create_case` is allowed only when:
- continuity intent resolves explicitly to `create_case`
- the sender has a single-tooth case target
- the sender has an exact visit date
- patient identity is not unresolved

### 3.3 When `continue_case` is allowed

`continue_case` is allowed only when:
- continuity intent or safe single-tooth inference resolves to an existing specific case
- that existing case id is already resolved
- the case continuation is not ambiguous

### 3.4 When Case behavior must stay blocked

Case behavior stays blocked when:
- case continuity is ambiguous
- continuation is requested but the target case is not found
- more than one tooth is in scope for the Case operation
- `split_case` is requested
- `close_case` is requested
- patient identity needed for Case activation is not yet concretely resolved

## 4. Link Write Lock

Stage 5 deliberately keeps explicit Case relationship writes narrower than the full target canon.

Written now:
- `Cases.Patient ID` during `create_case`

Not written yet:
- `Visits.Cases`
- `Cases.Visits`
- snapshot-table `Case ID`
- Case-side reverse branch links as an explicit sender action

Reason:
- authoritative write side
- replay behavior
- and cross-action ref sequencing
remain unresolved enough that these paths must still stay fail-closed

## 5. What Stage 5 Does Not Activate

Still blocked:
- `split_case`
- `close_case`
- explicit link actions
- non-PRE snapshot writes
- ambiguous case reassignment behavior
- multi-tooth Case activation
- parent/lineage behavior using `Parent Case ID`
- fully generalized latest synthesis writes

## 6. Practical Stage 5 Boundary

Stage 5 should be understood as:
- minimal Case row activation
- minimal safe existing-case update activation
- no broad continuity model activation
- no hidden schema invention
- no weakening of blocked behavior
