# Release Notes

Tag: `v0.9-safe-runtime-snapshot`

## Current active scope
- patient / visit runtime
- PRE create + limited same-date update
- safe case-aware subset
- child-side explicit Case links
- narrow safe single-tooth create for `PLAN / DR / DX / RAD / OP`
- narrow safe same-date update for `PLAN / DR / DX / RAD / OP` when explicit existing row targeting is already known
- preview-first / confirm-to-execute / truthful blocked states

## Intentionally blocked scope
- same-date create-on-missing
- multi-tooth update behavior
- `split_case`
- `close_case`
- ambiguous reassignment behavior
- inverse Case-side explicit branch-link writes
- broader case/link expansion beyond the current safe subset

## Branching rule
The next work must continue in a new branch only.
