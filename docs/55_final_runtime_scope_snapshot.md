# 55. Final Runtime Scope Snapshot

Status: post-batch runtime summary  
Date: 2026-04-13

## 1. Active Runtime Scope

Active now:

- preview-first orchestration
- patient safe attach/create handling
- visit create and same-date update handling
- minimal Case activation:
  - `create_case`
  - safe existing-case latest update
- active explicit child-side Case links for:
  - `Visits.Cases`
  - `Pre-op Clinical Findings.Case ID`
  - `Treatment Plan.Case ID`
  - `Doctor Reasoning.Case ID`
  - `Diagnosis.Case ID`
  - `Radiographic Findings.Case ID`
  - `Operative Findings.Case ID`

Snapshot runtime:

- `PRE`
  - create active
  - limited same-date update active
- `PLAN`
  - narrow safe create active
  - narrow safe same-date update active with explicit row target
- `DR`
  - narrow safe create active
  - narrow safe same-date update active with explicit row target
- `DX`
  - narrow safe create active
  - narrow safe same-date update active with explicit row target
- `RAD`
  - narrow safe create active
  - narrow safe same-date update active with explicit row target
- `OP`
  - narrow safe create active
  - narrow safe same-date update active with explicit row target

## 2. Still Blocked

Still blocked:

- `split_case`
- `close_case`
- ambiguous reassignment behavior
- same-date create-on-missing for non-PRE branches
- multi-tooth update activation
- inverse Case-side explicit branch-link writes

## 3. Validation State

The validated runtime snapshot after this batch is green:

- `npm run typecheck`
- `npm run validate:golden`
- `npm run api:examples`

## 4. Summary

The repo now supports the full currently safe single-tooth branch set for:

- create on later-date/new-visit paths
- update on same-date correction paths when exact existing row targeting is already explicit

Anything broader than that remains intentionally fail-closed.
