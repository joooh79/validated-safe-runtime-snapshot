# PLAN Activation Remaining Blockers

This document records exactly what remains blocked after the conservative Stage 7A `Treatment Plan` activation.

## 1. Still-Blocked PLAN Behaviors

Still intentionally blocked:
- PLAN update
- multi-tooth PLAN writes
- ambiguous PLAN create-vs-update selection
- PLAN behavior attached to `split_case`
- PLAN behavior attached to `close_case`
- PLAN activation that depends on `DR`, `DX`, `RAD`, or `OP`

## 2. Why PLAN Update Is Still Blocked

Still unresolved:
- exact same-date PLAN row lookup / resolution
- whether update should target an already existing PLAN snapshot row or create a missing row
- exact replay/idempotence behavior for same-date PLAN correction

Stage 7A therefore keeps PLAN update blocked rather than guessing.

## 3. Why Multi-Tooth PLAN Writes Stay Blocked

Current runtime constraint:
- the Case-aware active path is still intentionally single-tooth-first

So PLAN activation stays limited to that same single-tooth path.

## 4. Why PLAN Must Stay Case-Aware

Stage 7A does not activate a case-free PLAN path.

Reason:
- current non-PRE expansion is intentionally happening inside the Case-aware runtime
- PLAN create must stay aligned with active Case and explicit link behavior rather than widening a parallel uncoupled path

## 5. Why Other Branches Stay Blocked

Still blocked:
- `DR`
- `DX`
- `RAD`
- `OP`

Reason:
- each branch still needs its own exact payload mapping
- each branch still needs its own exact create/update rule
- each branch still needs its own validation expansion

Stage 7A activates only `PLAN`, not a generalized non-PRE switch.

## 6. Why Split/Close-Related PLAN Behavior Stays Blocked

Still unresolved:
- whether PLAN rows should be relinked, superseded, or left historical during split
- whether close transitions imply any PLAN state update
- how PLAN continuity interacts with case lineage and closure state

These must remain blocked until split/close activation is designed explicitly.

## 7. Next PLAN Decisions Still Needed

A later stage must still decide:
- exact PLAN update path
- whether same-date PLAN correction requires dedicated row lookup support
- whether additional PLAN payload fields need validation-driven activation
- whether PLAN latest-synthesis coupling should widen beyond the current minimal path
