# Link Activation Remaining Blockers

This document records what remains blocked after the conservative Stage 6 explicit-link activation.

## 1. Still-Blocked Link Behaviors

Still intentionally blocked:
- `link_visit_to_patient`
- `link_snapshot_to_visit`
- non-PRE snapshot-to-case links
- explicit writes to `Cases.Visits`
- explicit writes to Case reverse branch-link fields
- any link behavior attached to `split_case`
- any link behavior attached to `close_case`
- any ambiguous or multi-case reassignment path

## 2. Why Visit-to-Patient Explicit Linking Is Still Blocked

Reason:
- the active runtime already writes `Visits.Patient ID`
- adding a second explicit `link_visit_to_patient` action now would duplicate a relationship that is already established by the active write path
- that would widen replay and idempotence behavior without adding needed Stage 6 value

## 3. Why Snapshot-to-Visit Explicit Linking Is Still Blocked

Reason:
- the active PRE runtime already writes `Pre-op Clinical Findings.Visit ID`
- adding a second explicit snapshot-to-visit action would duplicate an already-established relationship

## 4. Why Non-PRE Snapshot-to-Case Links Stay Blocked

Reason:
- non-PRE branches are still blocked at the snapshot-write level
- Stage 6 must not activate links for branches whose underlying writes are not active

Blocked branches remain:
- `RAD`
- `OP`
- `DX`
- `PLAN`
- `DR`

## 5. Why Inverse-Side Case Link Writes Stay Blocked

Still not activated:
- explicit `Cases.Visits`
- explicit Case reverse branch-link field writes

Reason:
- Stage 6 intentionally avoids dual-sided link writes
- authoritative inverse-side behavior remains broader than the minimal safe need
- dual-sided writes would increase sequencing and retry complexity

## 6. Why Split/Close Link Paths Stay Blocked

Still unresolved:
- lineage behavior for split
- closure sequencing
- whether additional link cleanup or status-synchronized relinking is required
- replay safety if one relationship write succeeds and another fails

## 7. Why Ambiguous Link Reassignment Must Stay Blocked

Examples:
- multiple possible target cases
- continuation requested but no safe case target exists
- multi-tooth scope with the current single-case action model

These must remain blocked rather than guessed.

## 8. Next Link Decisions Still Needed

A future stage must still decide:
- whether `Cases.Visits` should ever be explicitly written or remain inverse-only
- whether Case reverse branch fields should remain inverse-only or become explicitly maintained
- whether broader link idempotence rules require additional dedupe safeguards
- whether any real-provider payload-shape normalization needs strengthening beyond the current adapter convention
