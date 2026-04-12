# 54. Remaining Blockers After Batch Activation

Status: post-batch blocker inventory  
Date: 2026-04-13

## 1. Snapshot Update Blockers Still Present

The following still remain blocked for `PLAN / DR / DX / RAD / OP`:

- same-date correction when no explicit existing row target is available
- automatic create-on-missing for same-date correction
- multi-tooth update activation

## 2. Case Blockers Still Present

Still blocked:

- `split_case`
- `close_case`
- ambiguous case reassignment
- broader case transition activation beyond the current minimal subset

## 3. Link Blockers Still Present

Still blocked:

- inverse Case-side explicit branch-link writes
- broader explicit link families beyond the current child-side active subset
- visit-to-patient explicit link writes
- snapshot-to-visit explicit link writes

## 4. PRE Limitation Still Present

`PRE` update remains active, but still in its current limited mapped shape rather than full-field completeness.

## 5. Replay And Resume Blockers Still Present

Still blocked or unverified:

- broader replay-safe resume beyond the current validated rules
- richer resume semantics after high-risk partial completion

## 6. Final Truth Boundary

The repo is now broader than the original safe PRE-only update baseline, but it is not fully unconstrained.

It still relies on:

- explicit row targeting for non-PRE same-date updates
- single-tooth safe scope
- truthful blocking where row targeting or continuity semantics are unresolved
