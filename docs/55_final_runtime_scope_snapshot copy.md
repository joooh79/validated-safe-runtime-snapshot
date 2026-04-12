# Final Runtime Scope Snapshot

## Snapshot name
`v0.9-safe-runtime-snapshot`

## Active runtime scope
The final active runtime scope in this snapshot is:
- patient
- visit
- PRE snapshot
- safe `create_case`
- safe existing-case latest update
- child-side explicit Case links for `Visit` plus `PRE / PLAN / DR / DX / RAD / OP`
- single-tooth branch create support for `PRE / PLAN / DR / DX / RAD / OP`
- single-tooth same-date update support for:
  - PRE in its current limited mapped shape
  - PLAN / DR / DX / RAD / OP when an explicit existing row target is already known
- preview-first orchestration
- confirm-to-execute
- truthful `correction_required / recheck_required / hard_stop / no_op / blocked_before_write`

## Intentionally blocked runtime scope
The final intentionally blocked scope in this snapshot is:
- same-date create-on-missing
- multi-tooth update behavior
- `split_case`
- `close_case`
- ambiguous reassignment behavior
- inverse Case-side explicit branch-link writes
- broader case/link expansion beyond the current safe subset

## Validation state
- `npm run typecheck` passed
- `npm run validate:golden` passed with `26/26`
- `npm run api:examples` passed

## Release rule
This scope is suitable for repository publication as a **validated safe runtime snapshot**.
Any additional activation work must happen in a new branch.
