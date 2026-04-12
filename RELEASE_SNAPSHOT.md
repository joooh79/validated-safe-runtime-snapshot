# Release Snapshot

## Snapshot Label

- `validated-safe-slice-snapshot`
- Date: 2026-04-13

## What This Snapshot Validates

This snapshot freezes the currently validated sender baseline.

Validated safe slice:

- patient
- visit
- PRE snapshot
- minimal Stage 5 Case activation:
  - safe `create_case`
  - safe existing-case continuation update
- minimal Stage 6 explicit link activation:
  - `Visits.Cases`
  - `Pre-op Clinical Findings.Case ID`
  - `Treatment Plan.Case ID`
  - `Doctor Reasoning.Case ID`
  - `Diagnosis.Case ID`
  - `Radiographic Findings.Case ID`
  - `Operative Findings.Case ID`
- minimal Stage 7A `Treatment Plan` activation:
  - safe PLAN create
  - `Treatment Plan.Case ID`
- minimal Stage 8B `Treatment Plan` update activation:
  - safe PLAN same-date update with explicit existing row target
- minimal Stage 7B `Doctor Reasoning` activation:
  - safe DR create
  - safe DR same-date update with explicit existing row target
  - `Doctor Reasoning.Case ID`
- minimal Stage 7C `Diagnosis` activation:
  - safe DX create
  - safe DX same-date update with explicit existing row target
  - `Diagnosis.Case ID`
- minimal Stage 7D `Radiographic Findings` activation:
  - safe RAD create
  - safe RAD same-date update with explicit existing row target
  - `Radiographic Findings.Case ID`
- minimal Stage 7E `Operative Findings` activation:
  - safe OP create
  - safe OP same-date update with explicit existing row target
  - `Operative Findings.Case ID`
- preview-first orchestration
- confirm-to-execute for safe supported paths
- truthful `correction_required`
- truthful `recheck_required`
- truthful `hard_stop`
- truthful `no_op`
- truthful `blocked_before_write`

## What Remains Intentionally Blocked Or Unverified

- broad case writes beyond the minimal Stage 5 subset
- broad explicit link writes beyond the minimal Stage 6 subset
- same-date create-on-missing behavior for non-PRE branches
- multi-tooth non-PRE update behavior
- canon-confirm-required mappings not yet verified
- advanced replay-safe resume beyond the current validated rules

These areas are preserved as blocked on purpose in this snapshot.

## Passing Commands

```bash
npm run typecheck
npm run validate:golden
npm run api:examples
```

## Key Baseline Docs

- `README.md`
- `RELEASE_READINESS.md`
- `HANDOFF.md`
- `VALIDATION_REPORT.md`
- `docs/15_validated_safe_slice_baseline.md`
- `docs/16_next_expansion_order.md`

## Future Work Must Not Break

- preview-first discipline
- same-date correction behavior
- patient duplicate suspicion and patient recheck behavior
- truthful blocked-before-write behavior for unsupported mappings
- no-op distinction
- visit-based historical snapshot truth
- passing golden-suite status for the validated safe slice

## Snapshot Truth Boundary

This snapshot is a validated baseline for conservative future expansion.

It is not a claim that the full sender scope is release-ready.

# RELEASE_SNAPSHOT

Release tag: `v0.9-safe-runtime-snapshot`

Release posture: **validated safe runtime snapshot**

## What is active now
- patient / visit runtime
- PRE create + limited same-date update
- safe `create_case`
- safe existing-case latest update
- child-side explicit Case links
- `PLAN / DR / DX / RAD / OP` narrow safe create
- `PLAN / DR / DX / RAD / OP` narrow safe same-date update with explicit existing row target
- preview-first / confirm-to-execute / truthful blocked states

## What is intentionally blocked now
- same-date create-on-missing
- multi-tooth update behavior
- `split_case`
- `close_case`
- ambiguous reassignment behavior
- inverse Case-side explicit branch-link writes
- broader case/link expansion beyond the current safe subset

## Validation snapshot
- `npm run typecheck` passed
- `npm run validate:golden` passed with `26/26`
- `npm run api:examples` passed

## Publishing rule
Publish as a snapshot of the current validated safe runtime.
Do not publish it as a full production-complete case platform.

## Branching rule
The next work must continue in a **new branch**, not on the release snapshot branch.
