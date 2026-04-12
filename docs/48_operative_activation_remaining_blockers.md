# Operative Activation Remaining Blockers

This document records exactly what remains blocked after the conservative Stage 7E `Operative Findings` activation.

## 1. Still-Blocked OP Behaviors

Still intentionally blocked:
- OP update
- multi-tooth OP writes
- ambiguous OP create-vs-update selection
- OP behavior attached to `split_case`
- OP behavior attached to `close_case`
- any broader non-PRE activation beyond the narrow create subset

## 2. Why OP Update Is Still Blocked

Still unresolved:
- exact same-date OP row lookup / resolution
- whether update should target an already existing OP snapshot row or create a missing row
- exact replay/idempotence behavior for same-date OP correction

Stage 7E therefore keeps OP update blocked rather than guessing.

## 3. Why Multi-Tooth OP Writes Stay Blocked

Current runtime constraint:
- the Case-aware active path is still intentionally single-tooth-first

So OP activation stays limited to that same single-tooth path.

## 4. Why OP Must Stay Case-Aware

Stage 7E does not activate a case-free OP path.

Reason:
- current non-PRE expansion is intentionally happening inside the Case-aware runtime
- OP create must stay aligned with active Case and explicit link behavior rather than widening a parallel uncoupled path

## 5. Why Split/Close-Related OP Behavior Stays Blocked

Still unresolved:
- whether OP rows should be relinked, superseded, or left historical during split
- whether close transitions imply any OP state update
- how OP continuity interacts with case lineage and closure state

These must remain blocked until split/close activation is designed explicitly.

## 6. Why Broader OP Activation Stays Blocked

Still unresolved:
- broader OP semantics beyond create-only single-tooth flows
- any widening that would imply same-date update activation
- any widening that would imply broader replay guarantees

Stage 7E activates only the narrow create subset.

## 7. Next OP Decisions Still Needed

A later stage must still decide:
- exact OP update path
- whether same-date OP correction requires dedicated row lookup support
- whether additional OP payload fields need validation-driven activation
- whether OP latest-synthesis coupling should widen beyond the current minimal path
