# Radiographic Activation Remaining Blockers

This document records exactly what remains blocked after the conservative Stage 7D `Radiographic Findings` activation.

## 1. Still-Blocked RAD Behaviors

Still intentionally blocked:
- RAD update
- multi-tooth RAD writes
- ambiguous RAD create-vs-update selection
- RAD behavior attached to `split_case`
- RAD behavior attached to `close_case`
- RAD activation that depends on `OP`

## 2. Why RAD Update Is Still Blocked

Still unresolved:
- exact same-date RAD row lookup / resolution
- whether update should target an already existing RAD snapshot row or create a missing row
- exact replay/idempotence behavior for same-date RAD correction

Stage 7D therefore keeps RAD update blocked rather than guessing.

## 3. Why Multi-Tooth RAD Writes Stay Blocked

Current runtime constraint:
- the Case-aware active path is still intentionally single-tooth-first

So RAD activation stays limited to that same single-tooth path.

## 4. Why RAD Must Stay Case-Aware

Stage 7D does not activate a case-free RAD path.

Reason:
- current non-PRE expansion is intentionally happening inside the Case-aware runtime
- RAD create must stay aligned with active Case and explicit link behavior rather than widening a parallel uncoupled path

## 5. Why OP Stays Blocked

Still blocked:
- `OP`

Reason:
- OP still needs its own exact payload mapping
- OP still needs its own exact create/update rule
- OP still needs its own validation expansion

Stage 7D activates only `RAD`, not a generalized non-PRE switch.

## 6. Why Split/Close-Related RAD Behavior Stays Blocked

Still unresolved:
- whether RAD rows should be relinked, superseded, or left historical during split
- whether close transitions imply any RAD state update
- how RAD continuity interacts with case lineage and closure state

These must remain blocked until split/close activation is designed explicitly.

## 7. Next RAD Decisions Still Needed

A later stage must still decide:
- exact RAD update path
- whether same-date RAD correction requires dedicated row lookup support
- whether additional RAD payload fields need validation-driven activation
- whether RAD latest-synthesis coupling should widen beyond the current minimal path
