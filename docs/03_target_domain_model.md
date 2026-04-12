# Target Domain Model

## Core model

The rebuilt sender uses a 4-entity model:

- Patient
- Visit
- Case
- Snapshot

## Patient

Patient is identity resolution.

Sender responsibilities:
- resolve existing patient
- create new patient only when safe
- detect duplicate suspicion
- block unsafe identity creation

## Visit

Visit is a date event.

Rules:
- visit is visit-level, not tooth-level
- later date means new visit by default
- same-date correction may resolve to existing visit update
- visit identity remains date-based

## Case

Case is continuity identity for:
- same tooth
- same episode

Case holds:
- latest synthesis
- continuity state
- follow-up pending / active / closed style meaning

Case does not replace visit snapshot truth.

## Snapshot

Snapshot rows are visit-time truth.

Conceptual branches:
- PRE
- RAD
- OP
- DX
- PLAN
- DR

Rules:
- new visit usually means new snapshot rows
- same-date correction may update existing same-date snapshot rows
- later-date continuation must create new snapshot rows and link them to the continuing case

## Hard separation

- snapshot = past/date truth
- case = current continuity/latest synthesis
