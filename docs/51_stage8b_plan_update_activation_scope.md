# 51. Stage 8B PLAN Update Activation Scope

Status: implemented conservative activation scope  
Date: 2026-04-13

## 1. Purpose

Stage 8B activates only the minimal safe `PLAN` same-date update path.

It does not activate:

- `DR` update
- `DX` update
- `RAD` update
- `OP` update
- multi-tooth PLAN update
- split-case or close-case coupled PLAN behavior
- ambiguous reassignment behavior

## 2. PLAN Update Semantics Lock

### 2.1 How the existing PLAN row is targeted

The active Stage 8B rule is:

- same-date `PLAN` update is allowed only when an explicit existing `Treatment Plan` record id is already present in current-state lookups
- the write plan carries that exact Airtable row target in `target.entityRef`
- the provider adapter does not infer or guess the target row

### 2.2 When PLAN update is allowed

`PLAN` update is active only when all of the following are true:

- branch is exactly `PLAN`
- action is `update_snapshot`
- visit is resolved to the same-date existing visit
- tooth scope is single-tooth
- an explicit existing `Treatment Plan` row target exists

### 2.3 When PLAN create must still be used

`PLAN` create remains the active path when:

- the visit is a later-date continuation or new-date event
- a new `Treatment Plan` row is being written for a new visit

Stage 8B does not convert same-date ambiguous `PLAN` correction into create automatically.

### 2.4 What remains blocked

`PLAN` update remains blocked when:

- no explicit existing `Treatment Plan` row target was resolved
- tooth scope is multi-tooth or unresolved
- same-date correction path is ambiguous
- broader case transition behavior would need to be inferred

## 3. Exact PLAN Update Mapping Activated

Stage 8B activates exact update mapping for the current narrow PLAN writable subset:

- `Pulp therapy`
- `Restoration design`
- `Restoration material`
- `Implant placement`
- `Scan file link`

Guarded on update:

- `Visit ID`
- `Tooth number`
- `Record name`
- `Case ID`

## 4. Link Behavior In Stage 8B

Stage 8B does not broaden explicit link behavior.

For same-date `PLAN` update:

- no new Case link family is activated
- Stage 6 child-side explicit link behavior remains unchanged
- this task only activates the exact snapshot-row update path

## 5. Validation Added

Stage 8B validation now requires:

- one safe same-date `PLAN` update scenario with explicit row targeting
- one blocked same-date `PLAN` update scenario without explicit row targeting
- continued passing of safe `PLAN` create
- continued passing of the full golden suite and API examples

## 6. Truth Boundary

Stage 8B does not claim:

- broad non-PRE update activation
- automatic create-on-missing for same-date `PLAN` correction
- broader row-resolution semantics for other branches
- broad Case semantic expansion

It does claim:

- minimal safe `PLAN` same-date update is active when exact row targeting is already explicit
- ambiguous same-date `PLAN` correction remains fail-closed
