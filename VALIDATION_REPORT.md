# Validation Report

## Execution status

- Date: 2026-04-13
- Typecheck: passed via `npm run typecheck`
- Golden suite command: `npm run validate:golden`
- Runnable validation entrypoint: available at `npm run validate:golden`
- Suite result: 26/26 scenarios passed

All scenario executions used deterministic providers:
- Dry-run Airtable adapter for all scenarios except `GC_PARTIAL_FAILURE`
- Fake provider with deliberate mid-sequence failure for `GC_PARTIAL_FAILURE`

## Scenarios executed

- `GC_SAFE_NEW_VISIT`
- `GC_SAME_DATE_UPDATE`
- `GC_SAME_DATE_CORRECTION_REQUIRED`
- `GC_PATIENT_RECHECK_REQUIRED`
- `GC_DUPLICATE_SUSPICION`
- `GC_SAFE_CREATE_CASE`
- `GC_SAFE_CONTINUE_CASE`
- `GC_SAFE_PLAN_CREATE`
- `GC_SAFE_PLAN_UPDATE`
- `GC_SAFE_DR_CREATE`
- `GC_SAFE_DR_UPDATE`
- `GC_SAFE_DX_CREATE`
- `GC_SAFE_DX_UPDATE`
- `GC_SAFE_RAD_CREATE`
- `GC_SAFE_RAD_UPDATE`
- `GC_SAFE_OP_CREATE`
- `GC_SAFE_OP_UPDATE`
- `GC_BLOCKED_CASE_AMBIGUITY`
- `GC_BLOCKED_CASE_MAPPING`
- `GC_BLOCKED_PLAN_UPDATE`
- `GC_BLOCKED_DR_UPDATE`
- `GC_BLOCKED_DX_UPDATE`
- `GC_BLOCKED_RAD_UPDATE`
- `GC_BLOCKED_OP_UPDATE`
- `GC_NO_OP`
- `GC_PARTIAL_FAILURE`

## Passed cleanly

- `GC_SAFE_NEW_VISIT`
  Resolution now stays in the safe slice: `case=none`, `readiness=ready_for_write_plan`.
  Plan stays within supported actions: `attach_existing_patient`, `create_visit`, `create_snapshot`.
  Execution finished as `success` in dry-run.
- `GC_SAME_DATE_UPDATE`
  Resolution stays in the safe slice: `case=none`, `readiness=ready_for_write_plan`.
  Plan stays within supported actions: `attach_existing_patient`, `update_visit`, `update_snapshot`.
  Execution finished as `success` in dry-run.

## Safe Case activation now covered

- `GC_SAFE_CREATE_CASE`
  Resolution reaches `case=create_case` safely.
  Plan now includes `create_case` plus the minimal explicit Case-link actions.
  Execution finishes as `success` in dry-run.
- `GC_SAFE_CONTINUE_CASE`
  Resolution reaches `case=continue_case` safely.
  Plan now includes the minimal `update_case_latest_synthesis` continuation update plus the minimal explicit Case-link actions.
  Execution finishes as `success` in dry-run.

## Safe PLAN activation now covered

- `GC_SAFE_PLAN_CREATE`
  Resolution stays on the safe Case-aware continuation path.
  Plan now includes safe `PLAN` snapshot create plus Case-linking.
  Execution finishes as `success` in dry-run.
- `GC_SAFE_PLAN_UPDATE`
  Resolution stays on the same-date correction path.
  Plan now includes safe `PLAN` snapshot update only when an explicit existing PLAN row target is available.
  Execution finishes as `success` in dry-run.

## Safe DR activation now covered

- `GC_SAFE_DR_CREATE`
  Resolution stays on the safe Case-aware continuation path.
  Plan now includes safe `DR` snapshot create plus Case-linking.
  Execution finishes as `success` in dry-run.
- `GC_SAFE_DR_UPDATE`
  Resolution stays on the same-date correction path.
  Plan now includes safe `DR` snapshot update only when an explicit existing DR row target is available.
  Execution finishes as `success` in dry-run.

## Safe DX activation now covered

- `GC_SAFE_DX_CREATE`
  Resolution stays on the safe Case-aware continuation path.
  Plan now includes safe `DX` snapshot create plus Case-linking.
  Execution finishes as `success` in dry-run.
- `GC_SAFE_DX_UPDATE`
  Resolution stays on the same-date correction path.
  Plan now includes safe `DX` snapshot update only when an explicit existing DX row target is available.
  Execution finishes as `success` in dry-run.

## Safe RAD activation now covered

- `GC_SAFE_RAD_CREATE`
  Resolution stays on the safe Case-aware continuation path.
  Plan now includes safe `RAD` snapshot create plus Case-linking.
  Execution finishes as `success` in dry-run.
- `GC_SAFE_RAD_UPDATE`
  Resolution stays on the same-date correction path.
  Plan now includes safe `RAD` snapshot update only when an explicit existing RAD row target is available.
  Execution finishes as `success` in dry-run.

## Safe OP activation now covered

- `GC_SAFE_OP_CREATE`
  Resolution stays on the safe Case-aware continuation path.
  Plan now includes safe `OP` snapshot create plus Case-linking.
  Execution finishes as `success` in dry-run.
- `GC_SAFE_OP_UPDATE`
  Resolution stays on the same-date correction path.
  Plan now includes safe `OP` snapshot update only when an explicit existing OP row target is available.
  Execution finishes as `success` in dry-run.

## Intentionally blocked or unverified

- `GC_SAME_DATE_CORRECTION_REQUIRED`
  Blocked honestly before write because same-date correction confirmation was missing.
- `GC_PATIENT_RECHECK_REQUIRED`
  Blocked honestly before write because patient recheck was required.
- `GC_DUPLICATE_SUSPICION`
  Blocked honestly before write because duplicate suspicion required correction.
- `GC_BLOCKED_CASE_AMBIGUITY`
  Continuation target is unresolved.
  Readiness now blocks honestly as `blocked_unresolved` before write.
- `GC_BLOCKED_CASE_MAPPING`
  Plan still exposes the unsupported `split_case` action so the remaining gap stays visible.
  Provider preflight now blocks before any write, producing `blocked_before_write`.
- `GC_BLOCKED_PLAN_UPDATE`
  Same-date PLAN update remains blocked honestly before write when no explicit existing PLAN row target is available.
- `GC_BLOCKED_DR_UPDATE`
  Same-date DR update remains blocked honestly before write when no explicit existing DR row target is available.
- `GC_BLOCKED_DX_UPDATE`
  Same-date DX update remains blocked honestly before write when no explicit existing DX row target is available.
- `GC_BLOCKED_RAD_UPDATE`
  Same-date RAD update remains blocked honestly before write when no explicit existing RAD row target is available.
- `GC_BLOCKED_OP_UPDATE`
  Same-date OP update remains blocked honestly before write when no explicit existing OP row target is available.

## No-op and partial failure

- `GC_NO_OP`
  Plan readiness is now `preview_only`.
  Execution terminates as `no_op` with no writes.
- `GC_PARTIAL_FAILURE`
  Plan stays inside the safe supported action surface.
  Fake-provider execution still produces truthful `partial_success`.
  Replay eligibility remains `false`, aligned with the current duplicate-safety rules because a high-risk create completed before failure.

## Safe slice assessment

The current validated safe slice is now actually validated.

Validated now:
- safe supported flows finish as clean success
- blocked and unverified flows stop before write
- no-op remains distinct as `preview_only` / `no_op`
- partial failure remains distinct from full success

Still intentionally outside the validated slice:
- broad Case behavior beyond the minimal Stage 5 subset
- broad explicit link behavior beyond the minimal Stage 6 subset
- same-date create-on-missing behavior for non-PRE branches
- multi-tooth non-PRE update behavior
- replay-safe resumption after high-risk creates

## Highest-priority next gap

The next highest-priority implementation gap is no longer plan leakage from the safe slice.

The next gap is expanding supported surface deliberately, only after canon confirmation:
- broader Case support:
  - split / close
  - fuller latest synthesis behavior
- broader explicit Case-link support:
  - non-PRE snapshot-to-case links
  - inverse-side explicit Case link writes
  - visit-to-patient / snapshot-to-visit link actions if ever needed
- broader non-PRE support:
  - same-date create-on-missing for non-PRE branches
  - multi-tooth update activation
  - any broader update surface beyond the explicit-row-target contract
- richer replay behavior for partially completed plans with known safe resume points

# VALIDATION_REPORT

## Final validation result for release snapshot
- `npm run typecheck`: passed
- `npm run validate:golden`: passed
- `npm run api:examples`: passed

Golden suite count at this snapshot:
- `26/26` passed

## Active runtime scope verified by this snapshot
- preview-first request handling
- confirm-to-execute flow
- truthful `correction_required / recheck_required / hard_stop / no_op / blocked_before_write`
- safe case-aware runtime subset
- safe child-side Case linking subset
- narrow safe single-tooth create paths for `PRE / PLAN / DR / DX / RAD / OP`
- narrow safe same-date update subset for `PRE / PLAN / DR / DX / RAD / OP` where explicitly supported and row-target-safe

## Intentionally blocked scope preserved by this snapshot
- same-date create-on-missing
- multi-tooth update behavior
- `split_case`
- `close_case`
- ambiguous reassignment behavior
- inverse Case-side explicit branch-link writes
- broader case/link expansion beyond the current safe subset

## Release caution
This validation report supports a **safe runtime snapshot** release only.
It does not certify the blocked scope as production-ready.
