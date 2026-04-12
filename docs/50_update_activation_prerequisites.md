# 50. Update Activation Prerequisites

Status: Stage 8A preparation  
Date: 2026-04-13

## 1. Purpose

This document defines what must be true before any additional snapshot branch update behavior is activated beyond the currently active `PRE` update path.

It separates:

- current runtime truth
- canon-required update behavior
- per-branch activation prerequisites
- validation evidence required before activation

## 2. Current Runtime Truth

Currently active update behavior:

- `PRE` same-date update is active

Currently blocked update behavior:

- `PLAN`
- `DR`
- `DX`
- `RAD`
- `OP`

Current blocking reason:

- schema exists
- create mappings exist
- exact same-date row-resolution and update-vs-create semantics are not yet activated

## 3. Shared Prerequisites For Any New Branch Update Activation

Before activating a branch update, all of the following must be explicit:

### 3.1 Identity and row targeting

- same-date correction path is confirmed
- visit is resolved to the existing same-date visit
- tooth scope is single-tooth and resolved
- branch is explicit
- runtime can target the exact existing snapshot row for `(visit_id, tooth_number, branch_code)`

### 3.2 Missing-row behavior

The branch activation must explicitly choose and document:

- if same-date correction finds the existing row: update
- if same-date correction does not find the row: create

This is the canon rule.

That behavior must be implemented deliberately rather than assumed implicitly.

### 3.3 Writable update subset

The runtime must explicitly define:

- which fields may be updated on same-date correction
- which fields remain guarded
- which fields are omitted by rule

This must be branch-specific.

### 3.4 Replay and idempotence expectations

Before activation, the branch must define:

- whether repeated preview/confirm flow targets the same row deterministically
- whether a retry after partial failure remains safe
- whether update payload generation is stable for the same resolved correction

### 3.5 Validation evidence

Before activation, the branch must add golden coverage for:

- safe same-date update
- missing-row-on-correction behavior, if activated
- blocked ambiguity path
- preservation of current create behavior

## 4. Branch-Specific Prerequisites

### 4.1 PRE

Status:

- already active

Before any PRE completeness expansion:

- widen update field coverage intentionally instead of implicitly
- document which PRE fields may be updated on correction
- add validation for any newly writable PRE fields

### 4.2 PLAN

Status:

- recommended first next activation target

Activation prerequisites:

- explicitly resolve same-date `PLAN` row identity by `(visit_id, tooth_number, PLAN)`
- implement exact provider update mapping for active PLAN fields
- lock missing-row-on-correction rule
- define precise writable PLAN update subset:
  - `Pulp therapy`
  - `Restoration design`
  - `Restoration material`
  - `Implant placement`
  - `Scan file link`
- add truthful blocked path for ambiguous PLAN update cases if any remain
- add golden coverage for safe PLAN update

Why PLAN can go first:

- comparatively compact field set
- straightforward create mapping already exists
- no numeric field
- no currently active multi-select field

### 4.3 DR

Status:

- not first; needs more semantic locking

Activation prerequisites:

- explicitly resolve same-date `DR` row identity by `(visit_id, tooth_number, DR)`
- define overwrite semantics for `Decision factor` multi-select update
- define exact writable update subset for:
  - `Decision factor`
  - `Remaining cusp thickness decision`
  - `Functional cusp involvement`
  - `Crack progression risk`
  - `Occlusal risk`
  - `Reasoning notes`
- confirm replay-safe handling for repeated multi-select correction writes
- add golden coverage for safe DR update and blocked ambiguity

Why DR should wait:

- multi-select update behavior is a real semantic choice, not just field plumbing

### 4.4 DX

Status:

- likely ready after PLAN

Activation prerequisites:

- explicitly resolve same-date `DX` row identity by `(visit_id, tooth_number, DX)`
- define overwrite semantics for `Structural diagnosis` multi-select update
- define exact writable update subset for:
  - `Structural diagnosis`
  - `Pulp diagnosis`
  - `Crack severity`
  - `Occlusion risk`
  - `Restorability`
- lock missing-row-on-correction rule
- add golden coverage for safe DX update and blocked ambiguity

Why DX is favorable after PLAN:

- identity rule is clear
- field set is moderate
- only one active multi-select field needs explicit overwrite semantics

### 4.5 RAD

Status:

- needs more semantic locking

Activation prerequisites:

- explicitly resolve same-date `RAD` row identity by `(visit_id, tooth_number, RAD)`
- define overwrite semantics for `Caries location` multi-select update
- define exact writable update subset for:
  - `Radiograph type`
  - `Radiographic caries depth`
  - `Secondary caries`
  - `Caries location`
  - `Pulp chamber size`
  - `Periapical lesion`
  - `Radiographic fracture sign`
  - `Radiograph link`
- confirm how evidentiary fields should behave on correction
- add golden coverage for safe RAD update and blocked ambiguity

Why RAD should not go before PLAN:

- richer mixed field set
- greater risk of imprecise update semantics around evidence-bearing fields

### 4.6 OP

Status:

- last update candidate among currently activated non-PRE branches

Activation prerequisites:

- explicitly resolve same-date `OP` row identity by `(visit_id, tooth_number, OP)`
- define exact writable update subset for the full OP field set
- lock overwrite semantics for:
  - `Crack location` multi-select
  - `Remaining cusp thickness (mm)` numeric field
  - procedural/proof fields such as `Intraoral photo link`
- confirm whether all current create fields are correction-writable or whether a narrower update subset is safer
- add golden coverage for safe OP update and blocked ambiguity

Why OP should stay last:

- highest branch complexity
- greatest risk of accidental partial overwrite
- requires the most explicit update contract

## 5. Branch-By-Branch Readiness Table

| Branch | Current update state | Readiness | First remaining blocker |
| --- | --- | --- | --- |
| `PRE` | active | already active | broader update-field coverage still incomplete |
| `PLAN` | blocked | update-likely-ready next | exact row targeting + provider update mapping |
| `DR` | blocked | needs more semantic locking | multi-select overwrite semantics |
| `DX` | blocked | update-likely-ready after PLAN | multi-select overwrite semantics for structural diagnosis |
| `RAD` | blocked | needs more semantic locking | evidence-bearing mixed-field correction rules |
| `OP` | blocked | still ambiguous | widest update surface and highest overwrite complexity |

## 6. Minimum Validation Pack For A Branch Update Activation

Before activating any blocked branch update, add at minimum:

1. one safe same-date update golden scenario for that branch
2. one blocked ambiguity scenario for that branch
3. preservation of existing create scenario for that branch
4. continued passing:
   - `npm run typecheck`
   - `npm run validate:golden`
   - `npm run api:examples`

## 7. Recommended Next Branch

Recommended first next branch for update activation:

- `PLAN`

Recommended follow-on order:

1. `PLAN`
2. `DX`
3. `DR`
4. `RAD`
5. `OP`

## 8. What Stays Blocked Until Explicit Activation

Until a branch-specific update activation branch lands, the following stay blocked:

- all blocked non-PRE same-date snapshot updates
- split-case coupled branch update behavior
- close-case coupled branch update behavior
- ambiguous reassignment behavior
- multi-tooth update activation

## 9. Practical Hand-off

The next activation branch should start with `PLAN` update.

That branch should not begin by widening planner behavior broadly.

It should first make the following explicit:

- exact same-date row target source
- exact PLAN writable update subset
- exact missing-row-on-correction handling
- exact validation scenarios proving safe update behavior
