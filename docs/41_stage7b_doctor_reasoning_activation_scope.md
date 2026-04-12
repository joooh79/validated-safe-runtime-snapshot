# Stage 7B Doctor Reasoning Activation Scope

This document defines the exact conservative Stage 7B `Doctor Reasoning` activation scope.

This is not broad non-PRE activation.
This does not activate `DX`, `RAD`, or `OP`.
This does not activate `split_case` or `close_case`.

## 1. Stage 7B Goal

Stage 7B activates the smallest safe `Doctor Reasoning` snapshot path under the current Case-aware runtime.

The runtime still preserves:
- preview-first
- confirm-to-execute
- fail-closed blocking for unresolved semantics
- Stage 5 Case behavior without widening split / close / ambiguous reassignment
- Stage 6 explicit link behavior using the authoritative child-side link field
- Stage 7A PLAN behavior unchanged

## 2. DR Semantics Lock

### 2.1 When DR create is allowed

`DR` create is allowed only when all of the following are true:
- snapshot action is `create_snapshot`
- branch is exactly `DR`
- scope is single-tooth
- a resolved visit is present
- Case-aware runtime is active for the request
  - existing resolved case continuation, or
  - safe `create_case` path already in the plan
- current branch set stays inside the minimal active PRE / PLAN / DR boundary

### 2.2 When DR update is allowed

Stage 7B does not activate DR update.

Reason:
- exact same-date DR row resolution is still unresolved
- exact update-vs-create behavior for DR is still unresolved

### 2.3 DR record identity

Stage 7B uses the canon snapshot identity and record-name rule already locked in `docs/21_record_identity_and_upsert_rules.md`:
- identity: `visit_id + tooth_number + branch_code`
- record name: `{Visit ID}-{Tooth number}-{BRANCH CODE}`

For DR specifically:
- branch code is `DR`

Stage 7B does not invent any alternate DR record-name behavior.

## 3. DR Links

### 3.1 DR -> Visit

DR create writes:
- `Doctor Reasoning.Visit ID`

This remains the authoritative child-side visit link, consistent with the existing snapshot model.

### 3.2 DR -> Case

DR create path relies on the active explicit link stage for Case association:
- `link_snapshot_to_case` now supports `DR`
- authoritative field: `Doctor Reasoning.Case ID`

Stage 7B does not also write the inverse Case-side branch link explicitly.

## 4. Exact DR Fields Activated

Stage 7B activates exact schema-confirmed field awareness for:
- `Record name`
- `Visit ID`
- `Tooth number`
- `Decision factor`
- `Remaining cusp thickness decision`
- `Functional cusp involvement`
- `Crack progression risk`
- `Occlusal risk`
- `Reasoning notes`
- `Case ID` for explicit link activation

## 5. Exact DR Options Activated

Stage 7B activates exact option mappings for:

### `Decision factor`
- `remaining cusp thickness`
- `functional cusp involvement`
- `crack depth`
- `caries depth`
- `pulp status`
- `occlusion`
- `subgingival margin`
- `N/A`

### `Remaining cusp thickness decision`
- `>1.5 mm cusp preserved`
- `<1.5 mm cusp coverage`

### `Functional cusp involvement`
- `yes`
- `no`

### `Crack progression risk`
- `low`
- `moderate`
- `high`

### `Occlusal risk`
- `normal`
- `heavy occlusion`
- `bruxism suspected`

## 6. What Stage 7B Activates

Activated now:
- safe DR create path
- exact DR table mapping
- exact DR writable field mappings
- exact DR option normalization
- explicit DR-to-Case link activation through `Doctor Reasoning.Case ID`

## 7. What Stage 7B Does Not Activate

Still blocked:
- DR update
- multi-tooth DR writes
- ambiguous DR create-vs-update decisions
- DR behavior coupled to `split_case` / `close_case`
- DX / RAD / OP activation
- any broader non-PRE activation pattern
