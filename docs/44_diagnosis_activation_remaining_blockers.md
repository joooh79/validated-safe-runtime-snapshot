# Diagnosis Activation Remaining Blockers

This document records exactly what remains blocked after the conservative Stage 7C `Diagnosis` activation.

## 1. Still-Blocked DX Behaviors

Still intentionally blocked:
- DX update
- multi-tooth DX writes
- ambiguous DX create-vs-update selection
- DX behavior attached to `split_case`
- DX behavior attached to `close_case`
- DX activation that depends on `RAD` or `OP`

## 2. Why DX Update Is Still Blocked

Still unresolved:
- exact same-date DX row lookup / resolution
- whether update should target an already existing DX snapshot row or create a missing row
- exact replay/idempotence behavior for same-date DX correction

Stage 7C therefore keeps DX update blocked rather than guessing.

## 3. Why Multi-Tooth DX Writes Stay Blocked

Current runtime constraint:
- the Case-aware active path is still intentionally single-tooth-first

So DX activation stays limited to that same single-tooth path.

## 4. Why DX Must Stay Case-Aware

Stage 7C does not activate a case-free DX path.

Reason:
- current non-PRE expansion is intentionally happening inside the Case-aware runtime
- DX create must stay aligned with active Case and explicit link behavior rather than widening a parallel uncoupled path

## 5. Why Other Branches Stay Blocked

Still blocked:
- `RAD`
- `OP`

Reason:
- each branch still needs its own exact payload mapping
- each branch still needs its own exact create/update rule
- each branch still needs its own validation expansion

Stage 7C activates only `DX`, not a generalized non-PRE switch.

## 6. Why Split/Close-Related DX Behavior Stays Blocked

Still unresolved:
- whether DX rows should be relinked, superseded, or left historical during split
- whether close transitions imply any DX state update
- how DX continuity interacts with case lineage and closure state

These must remain blocked until split/close activation is designed explicitly.

## 7. Next DX Decisions Still Needed

A later stage must still decide:
- exact DX update path
- whether same-date DX correction requires dedicated row lookup support
- whether additional DX payload fields need validation-driven activation
- whether DX latest-synthesis coupling should widen beyond the current minimal path
