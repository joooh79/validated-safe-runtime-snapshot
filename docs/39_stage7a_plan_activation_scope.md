# Stage 7A PLAN Activation Scope

This document defines the exact conservative Stage 7A `Treatment Plan` activation scope.

This is not broad non-PRE activation.
This does not activate `DR`, `DX`, `RAD`, or `OP`.
This does not activate `split_case` or `close_case`.

## 1. Stage 7A Goal

Stage 7A activates the smallest safe `Treatment Plan` snapshot path under the current Case-aware runtime.

The runtime still preserves:
- preview-first
- confirm-to-execute
- fail-closed blocking for unresolved semantics
- Case/link behavior from Stages 5 and 6 without broadening it

## 2. PLAN Semantics Lock

### 2.1 When PLAN create is allowed

`PLAN` create is allowed only when all of the following are true:
- snapshot action is `create_snapshot`
- branch is exactly `PLAN`
- scope is single-tooth
- a resolved visit is present
- Case-aware runtime is active for the request
  - existing resolved case continuation, or
  - safe `create_case` path already in the plan
- current branch set stays inside the minimal active PRE/PLAN boundary

### 2.2 When PLAN update is allowed

Stage 7A does not activate PLAN update.

Reason:
- exact same-date PLAN row resolution is still unresolved
- exact update-vs-create behavior for PLAN is still unresolved

### 2.3 PLAN record identity

Stage 7A uses the canon snapshot identity and record-name rule already locked in `docs/21_record_identity_and_upsert_rules.md`:
- identity: `visit_id + tooth_number + branch_code`
- record name: `{Visit ID}-{Tooth number}-{BRANCH CODE}`

For PLAN specifically:
- branch code is `PLAN`

Stage 7A does not invent any alternate PLAN record-name behavior.

## 3. PLAN Links

### 3.1 PLAN -> Visit

PLAN create writes:
- `Treatment Plan.Visit ID`

This remains the authoritative child-side visit link, consistent with the existing snapshot model.

### 3.2 PLAN -> Case

PLAN create path relies on the active explicit link stage for Case association:
- `link_snapshot_to_case` now supports `PLAN`
- authoritative field: `Treatment Plan.Case ID`

Stage 7A does not also write the inverse Case-side branch link explicitly.

## 4. Exact PLAN Fields Activated

Stage 7A activates exact schema-confirmed field awareness for:
- `Record name`
- `Visit ID`
- `Tooth number`
- `Pulp therapy`
- `Restoration design`
- `Restoration material`
- `Implant placement`
- `Scan file link`
- `Case ID` for explicit link activation

## 5. Exact PLAN Options Activated

Stage 7A activates exact option mappings for:

### `Pulp therapy`
- `none`
- `VPT`
- `RCT`

### `Restoration design`
- `direct composite`
- `inlay`
- `onlay`
- `overlay`
- `crown`
- `implant crown`
- `extraction`

### `Restoration material`
- `composite`
- `ultimate`
- `e.max`
- `zirconia`
- `gold`
- `none`

### `Implant placement`
- `not planned`
- `planned`
- `placed`

## 6. What Stage 7A Activates

Activated now:
- safe PLAN create path
- exact PLAN table mapping
- exact PLAN writable field mappings
- exact PLAN option normalization
- explicit PLAN-to-Case link activation through `Treatment Plan.Case ID`

## 7. What Stage 7A Does Not Activate

Still blocked:
- PLAN update
- multi-tooth PLAN writes
- ambiguous PLAN create-vs-update decisions
- PLAN behavior coupled to `split_case` / `close_case`
- DR / DX / RAD / OP activation
- any broader non-PRE activation pattern
