# Doctor Reasoning Activation Remaining Blockers

This document records exactly what remains blocked after the conservative Stage 7B `Doctor Reasoning` activation.

## 1. Still-Blocked DR Behaviors

Still intentionally blocked:
- DR update
- multi-tooth DR writes
- ambiguous DR create-vs-update selection
- DR behavior attached to `split_case`
- DR behavior attached to `close_case`
- DR activation that depends on `DX`, `RAD`, or `OP`

## 2. Why DR Update Is Still Blocked

Still unresolved:
- exact same-date DR row lookup / resolution
- whether update should target an already existing DR snapshot row or create a missing row
- exact replay/idempotence behavior for same-date DR correction

Stage 7B therefore keeps DR update blocked rather than guessing.

## 3. Why Multi-Tooth DR Writes Stay Blocked

Current runtime constraint:
- the Case-aware active path is still intentionally single-tooth-first

So DR activation stays limited to that same single-tooth path.

## 4. Why DR Must Stay Case-Aware

Stage 7B does not activate a case-free DR path.

Reason:
- current non-PRE expansion is intentionally happening inside the Case-aware runtime
- DR create must stay aligned with active Case and explicit link behavior rather than widening a parallel uncoupled path

## 5. Why Other Branches Stay Blocked

Still blocked:
- `DX`
- `RAD`
- `OP`

Reason:
- each branch still needs its own exact payload mapping
- each branch still needs its own exact create/update rule
- each branch still needs its own validation expansion

Stage 7B activates only `DR`, not a generalized non-PRE switch.

## 6. Why Split/Close-Related DR Behavior Stays Blocked

Still unresolved:
- whether DR rows should be relinked, superseded, or left historical during split
- whether close transitions imply any DR state update
- how DR continuity interacts with case lineage and closure state

These must remain blocked until split/close activation is designed explicitly.

## 7. Next DR Decisions Still Needed

A later stage must still decide:
- exact DR update path
- whether same-date DR correction requires dedicated row lookup support
- whether additional DR payload fields need validation-driven activation
- whether DR latest-synthesis coupling should widen beyond the current minimal path
