# Case Activation Remaining Blockers

This document records exactly what remains blocked after the conservative Stage 5 Case activation.

## 1. Still-Blocked Case Behaviors

The following are still intentionally blocked:
- `split_case`
- `close_case`
- ambiguous case reassignment
- multi-tooth Case activation
- explicit Case link actions
- snapshot `Case ID` writes as an active runtime path
- non-PRE branch activation
- generalized latest synthesis population

## 2. Why `split_case` Is Still Blocked

Still unresolved:
- status transition sequencing between old and new cases
- exact use of `Episode status = split`
- exact `Parent Case ID` runtime behavior
- safe ordering across old-case update, new-case create, and linked branch continuation
- replay/idempotence safety for partial failures

Important current schema fact:
- `Parent Case ID` is currently a text field in `airtable_schema.json`, not a linked-record field

That means split lineage behavior is not safe to activate casually.

## 3. Why `close_case` Is Still Blocked

Still unresolved:
- what exact state transitions must accompany closure
- whether closure requires branch-derived synthesis recomputation first
- whether follow-up state must be updated at the same time
- whether a close can be reversed safely on replay/retry

## 4. Why Ambiguous Continuity Must Stay Blocked

Ambiguous continuity includes cases like:
- continue requested but no case found
- multiple tooth scope where the current runtime still carries only one Case action slot
- unclear reassignment between active and newly intended episodes

Stage 5 now blocks these at resolution/readiness level rather than pretending they are executable.

## 5. Why Explicit Link Writes Are Still Blocked

Still unresolved:
- whether `Visits.Cases` or `Cases.Visits` is the authoritative write side
- whether snapshot `Case ID` should be written directly during snapshot create/update or via separate link actions
- exact linked-record payload shape for the current provider abstraction
- replay behavior if one side of a bidirectional relationship succeeds and another fails

## 6. Why Non-PRE Branches Stay Blocked

Even with Case activation, the following branches remain blocked:
- `RAD`
- `OP`
- `DX`
- `PLAN`
- `DR`

Reason:
- branch-specific payload mapping
- branch-specific option coverage
- branch-specific create vs update rules
- branch-specific record-name behavior
are still not activated

## 7. Schema Facts That Must Continue To Be Treated Carefully

From `docs/33_post_migration_schema_confirmation.md`:
- `Cases.Parent Case ID` is text
- `Cases.Latest Visit ID` is text

So Stage 5 may write deterministic text values there where explicitly locked,
but must not pretend those are live linked-record semantics.

## 8. What Next Stage Must Decide

The next Case/link stage must explicitly decide:
- authoritative write side for Visit/Case links
- authoritative write side for Snapshot/Case links
- whether to widen latest synthesis beyond `Latest Visit ID` and open-status maintenance
- how split lineage will work with the current text-backed `Parent Case ID`
- whether any further Airtable schema change is required before split/close activation
