# Current Make Behavior Inventory

## Status

This is a reference-only behavior inventory used to preserve critical behavior during sender replacement.

It is:
- a behavior recovery document
- a regression prevention document

It is not:
- a live current-state proof
- a target architecture doc

## High-level role of Make in the current system

Make currently acts as more than a transport layer.
It owns or participates in:
- patient lookup
- same-date visit lookup
- gate decision shaping
- correction / recheck / hard-stop behavior
- visit create/update behavior
- findings child-row create/update behavior
- business-facing response shaping

## Route families

### 1. Same-date correction family
Entry pattern:
- patient resolves
- same-date visit exists
- doctor intent conflicts with current-state evidence

Observed meaning:
- correction_required when same-date exists and correction is not yet confirmed
- hard_stop when same-date exists and the user explicitly keeps new-visit stance
- normal pass when existing_visit_update already aligns or correction is positively confirmed

Preserve in rebuild:
- same-date lookup before write
- correction-required vs hard-stop distinction
- resend eligibility distinction

### 2. Patient not found recheck family
Entry pattern:
- existing-patient-like claim
- patient lookup miss

Observed meaning:
- write blocked
- recheck requested
- resend allowed
- no blind fallback create

Preserve in rebuild:
- recheck flow
- preserved clinical content across recheck
- bounded retry / no infinite loop

### 3. Existing patient new visit family
Entry pattern:
- patient resolves as existing
- new visit intent
- no same-date blocking conflict

Observed meaning:
- existing patient attach
- new visit create
- findings rows create under the new visit

### 4. Existing visit update family
Entry pattern:
- target visit already exists
- update/correction intent is active

Observed meaning:
- update existing visit context
- update or create child rows depending on current child state
- no blind duplicate append

### 5. New patient new visit family
Entry pattern:
- patient does not safely resolve as existing
- new patient path is allowed

Observed meaning:
- patient create or safely resolved attach
- visit create
- findings rows create

## Confirmed preserved meanings

- same-date correction exists and matters
- patient recheck exists and matters
- Make currently gates write safety
- current response meanings include correction_required, recheck_required, hard_stop, normal pass
- sender preview-first behavior exists before actual send

## Hidden behavior risks to preserve

- lookup results directly shape gate behavior
- update-vs-create distinctions may be hidden in route logic
- current sender-side response interpretation is coupled to current downstream behavior
- write order assumptions matter

## Confirmed vs likely vs unverified

### Confirmed
- same-date correction family
- patient-not-found recheck family
- resend eligibility differences
- Make-centered write gating
- preview-first upstream behavior

### Likely
- branch-specific update/create quirks
- distributed no-op behavior across sender + Make
- route-specific child-row targeting nuances

### Unverified
- full live behavior of every current Make module at this moment
- all parser/tokenization quirks
- all edge-case artifact emission details
