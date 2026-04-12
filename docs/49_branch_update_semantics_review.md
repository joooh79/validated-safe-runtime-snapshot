# 49. Branch Update Semantics Review

Status: Stage 8A review and activation preparation  
Date: 2026-04-13

## 1. Purpose

This document reviews snapshot update semantics branch by branch for:

- `PRE`
- `PLAN`
- `DR`
- `DX`
- `RAD`
- `OP`

It is not an activation document.

Its purpose is to make explicit:

- what the target canon requires
- what the runtime already does
- what still blocks branch update activation
- which branch is the safest next update candidate

## 2. Current Runtime vs Target Canon

### 2.1 Current runtime baseline

Current active runtime behavior is:

- preview-first
- truthful blocking
- safe `create_case`
- safe existing-case latest update
- explicit Case link subset for active branches
- narrow create activation for `PRE / PLAN / DR / DX / RAD / OP`
- active same-date snapshot update only for `PRE`

Current non-PRE update runtime behavior is:

- planner may emit `update_snapshot` on same-date correction
- provider adapter blocks `PLAN / DR / DX / RAD / OP` before write
- blocked reason is now specific: exact same-date row-resolution and update-vs-create semantics are not yet activated

### 2.2 Target canon

From [docs/21_record_identity_and_upsert_rules.md](/Users/mbp-joohyung/Downloads/smr-next-non-pre-canon-confirm%20copy%202/docs/21_record_identity_and_upsert_rules.md):

- snapshot identity is `(visit_id, tooth_number, branch_code)`
- exactly one snapshot row exists per visit / tooth / branch
- same-date correction updates the existing row
- if the row is not found on same-date correction path, create is allowed
- record name remains deterministic: `{Visit ID}-{Tooth number}-{BRANCH CODE}`

This means the target canon already defines the high-level rule for all six snapshot branches.

What the canon does not by itself operationalize is:

- how the sender proves the exact Airtable row being updated
- what branch-specific field subset is allowed on update
- whether missing-row-on-correction is already safe to activate in this runtime
- what validation evidence is required before enabling each branch

## 3. Shared Update Rule

The shared target rule for all snapshot branches is:

1. Resolve patient safely.
2. Resolve visit as same-date correction.
3. Resolve the target snapshot row by `(visit_id, tooth_number, branch_code)`.
4. If found, update that row.
5. If not found on same-date correction path, create that branch row for the same visit.
6. Do not create a duplicate row for the same visit / tooth / branch.

That shared rule is canon-valid.

The remaining activation problem is implementation precision, not target-direction uncertainty.

## 4. Branch Review

### 4.1 PRE

Current runtime state:

- `PRE` update is already active.
- same-date correction can produce `update_snapshot` and the provider can map that update.

Current identity basis:

- record identity is still consistent with canon:
  - `Visit ID`
  - `Tooth number`
  - branch `PRE`
  - deterministic record name `{Visit ID}-{Tooth number}-PRE`

Current safe rule:

- same-date correction updates the existing `Pre-op Clinical Findings` row
- later-date continuation creates a new PRE row

Current limitation:

- runtime PRE update mapping is still narrower than PRE create mapping
- only a limited subset is currently written on update:
  - `Symptom`
  - `Visible crack`
- broader PRE field update coverage is not fully activated in the provider mapper yet

Readiness classification:

- `PRE` is already active for update
- not the next activation target
- still worth a later completeness pass because update field coverage is narrower than canon intent

### 4.2 PLAN

Current runtime state:

- `PLAN` create is active on the narrow safe path
- `PLAN` update is blocked before write

Current identity basis:

- canon record identity is explicit:
  - `Visit ID`
  - `Tooth number`
  - branch `PLAN`
  - record name `{Visit ID}-{Tooth number}-PLAN`

Why update is still unsafe today:

- the planner does not yet prove the exact existing Airtable `PLAN` record id for same-date correction
- provider update logic is not yet implemented
- missing-row-on-correction behavior is not yet locked in this runtime
- allowed writable update subset has not yet been explicitly locked

Why PLAN is relatively favorable:

- field set is comparatively compact
- branch semantics are comparatively straightforward
- no numeric field normalization complexity
- no multi-select requirement in the currently active create field set

Readiness classification:

- update-likely-ready next

### 4.3 DR

Current runtime state:

- `DR` create is active on the narrow safe path
- `DR` update is blocked before write

Current identity basis:

- canon record identity is explicit:
  - `Visit ID`
  - `Tooth number`
  - branch `DR`
  - record name `{Visit ID}-{Tooth number}-DR`

Why update is still unsafe today:

- provider update logic is not yet implemented
- same-date target row proof is not yet explicit in runtime
- update field subset is not yet locked
- multi-select update behavior for `Decision factor` needs exact replay-safe handling

Readiness classification:

- needs more semantic locking

### 4.4 DX

Current runtime state:

- `DX` create is active on the narrow safe path
- `DX` update is blocked before write

Current identity basis:

- canon record identity is explicit:
  - `Visit ID`
  - `Tooth number`
  - branch `DX`
  - record name `{Visit ID}-{Tooth number}-DX`

Why update is still unsafe today:

- provider update logic is not yet implemented
- exact same-date row targeting is not yet runtime-explicit
- update field subset is not yet locked
- multi-select update behavior for `Structural diagnosis` needs explicit overwrite semantics

Readiness classification:

- update-likely-ready after `PLAN`

### 4.5 RAD

Current runtime state:

- `RAD` create is active on the narrow safe path
- `RAD` update is blocked before write

Current identity basis:

- canon record identity is explicit:
  - `Visit ID`
  - `Tooth number`
  - branch `RAD`
  - record name `{Visit ID}-{Tooth number}-RAD`

Why update is still unsafe today:

- provider update logic is not yet implemented
- exact same-date row targeting is not yet runtime-explicit
- update field subset is not yet locked
- branch has mixed select, multi-select, and link-like evidence fields that need exact correction semantics

Readiness classification:

- needs more semantic locking

### 4.6 OP

Current runtime state:

- `OP` create is active on the narrow safe path
- `OP` update is blocked before write

Current identity basis:

- canon record identity is explicit:
  - `Visit ID`
  - `Tooth number`
  - branch `OP`
  - record name `{Visit ID}-{Tooth number}-OP`

Why update is still unsafe today:

- provider update logic is not yet implemented
- exact same-date row targeting is not yet runtime-explicit
- widest field set among activated non-PRE branches
- includes numeric, single-select, multi-select, and procedural/proof fields
- highest risk of accidental partial overwrite without an explicit update contract

Readiness classification:

- still blocked due to ambiguity

## 5. Readiness Classification Summary

### 5.1 Already active

- `PRE`

### 5.2 Update-likely-ready next

- `PLAN`
- `DX`

### 5.3 Needs more semantic locking

- `DR`
- `RAD`

### 5.4 Still blocked due to ambiguity

- `OP`

## 6. Recommended Next Activation Order

Recommended next update activation order:

1. `PLAN`
2. `DX`
3. `DR`
4. `RAD`
5. `OP`

Reasoning:

- `PLAN` is the narrowest non-PRE update surface.
- `DX` has a clear identity rule and moderate field complexity.
- `DR` and `RAD` both need more explicit multi-select/update treatment.
- `OP` has the highest field and overwrite complexity and should stay last.

## 7. What Must Not Change During Stage 8A

Stage 8A does not activate:

- `PLAN` update
- `DR` update
- `DX` update
- `RAD` update
- `OP` update
- `split_case`
- `close_case`
- ambiguous reassignment behavior

Stage 8A does not change:

- preview-first
- current Case behavior
- active narrow create paths
- active explicit Case-link subset

## 8. Practical Conclusion

The target canon already supports branch updates conceptually for all snapshot branches.

The current activation gap is operational:

- exact row targeting
- explicit create-vs-update decision lock
- branch-specific writable update subset
- replay-safe validation evidence

The safest next update activation candidate is `PLAN`.
