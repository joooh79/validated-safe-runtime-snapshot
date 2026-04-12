# Stage 6 Explicit Link Activation Scope

This document defines the exact conservative Stage 6 explicit-link scope.

This is not broad link activation.
This does not activate non-PRE snapshot links.
This does not activate split/close-related links.

## 1. Stage 6 Goal

Stage 6 activates the smallest safe explicit-link behavior needed to connect the now-active Case paths to Airtable linked-record fields.

The active runtime still preserves:
- preview-first
- confirm-to-execute
- truthful blocked-before-write behavior
- fail-closed behavior for unresolved or unsupported link semantics

## 2. Link Semantics Lock

### 2.1 Authoritative write side

Stage 6 locks the authoritative write side as:
- `Visits.Cases` for visit-to-case linking
- `Pre-op Clinical Findings.Case ID` for PRE snapshot-to-case linking

Stage 6 does not write the inverse side explicitly.

Not written explicitly in Stage 6:
- `Cases.Visits`
- `Cases.Pre-op Clinical Findings`

Reason:
- the repo already follows the child-side link-write pattern for active linked fields such as:
  - `Visits.Patient ID`
  - `Pre-op Clinical Findings.Visit ID`
- the migrated schema confirms the linked-field inverse relationship exists
- Stage 6 keeps the same narrow pattern instead of inventing a new bidirectional write discipline

### 2.2 When `Visits.Cases` is written

`Visits.Cases` is written only when:
- Stage 5 Case behavior is active for the request
- case status is `create_case` or `continue_case`
- the flow remains inside the single-tooth safe path
- the flow remains PRE-only for snapshot content

### 2.3 When `Cases.Visits` is written

`Cases.Visits` is not written explicitly in Stage 6.

Stage 6 treats one-sided write as sufficient within the current adapter/runtime model.

### 2.4 When snapshot `Case ID` is written

Snapshot `Case ID` is written only when:
- branch is exactly `PRE`
- the Case path is safely active
- the snapshot row is already being created or updated in the active safe slice

### 2.5 One-sided write rule

Stage 6 rule:
- write only the authoritative child-side field
- do not also perform a second explicit inverse write in the same stage

This keeps sequencing simpler and avoids broadening replay/idempotence risk.

## 3. Activated Explicit Link Behaviors

### 3.1 `link_visit_to_case`

Activated now:
- updates `Visits.Cases`
- used for both safe `create_case` and safe `continue_case`

### 3.2 `link_snapshot_to_case`

Activated now only for:
- `PRE`

This updates:
- `Pre-op Clinical Findings.Case ID`

## 4. Not Activated In Stage 6

Still not activated:
- `link_visit_to_patient`
- `link_snapshot_to_visit`
- non-PRE snapshot-to-case links
- any explicit write to `Cases.Visits`
- any explicit write to Case reverse branch-link fields
- any split/close-related link sequence

## 5. Practical Runtime Boundary

Stage 6 should be understood as:
- minimal Case-link activation only
- one-sided child-field writes only
- no broad link model activation
- no non-PRE widening
- no weakening of ambiguity blocking
