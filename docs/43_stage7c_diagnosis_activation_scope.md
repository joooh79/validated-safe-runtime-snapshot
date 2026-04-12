# Stage 7C Diagnosis Activation Scope

This document defines the exact conservative Stage 7C `Diagnosis` activation scope.

This is not broad non-PRE activation.
This does not activate `RAD` or `OP`.
This does not activate `split_case` or `close_case`.

## 1. Stage 7C Goal

Stage 7C activates the smallest safe `Diagnosis` snapshot path under the current Case-aware runtime.

The runtime still preserves:
- preview-first
- confirm-to-execute
- fail-closed blocking for unresolved semantics
- Stage 5 Case behavior without widening split / close / ambiguous reassignment
- Stage 6 explicit link behavior using the authoritative child-side link field
- Stage 7A PLAN behavior unchanged
- Stage 7B DR behavior unchanged

## 2. DX Semantics Lock

### 2.1 When DX create is allowed

`DX` create is allowed only when all of the following are true:
- snapshot action is `create_snapshot`
- branch is exactly `DX`
- scope is single-tooth
- a resolved visit is present
- Case-aware runtime is active for the request
  - existing resolved case continuation, or
  - safe `create_case` path already in the plan
- current branch set stays inside the minimal active PRE / PLAN / DR / DX boundary

### 2.2 When DX update is allowed

Stage 7C does not activate DX update.

Reason:
- exact same-date DX row resolution is still unresolved
- exact update-vs-create behavior for DX is still unresolved

### 2.3 DX record identity

Stage 7C uses the canon snapshot identity and record-name rule already locked in `docs/21_record_identity_and_upsert_rules.md`:
- identity: `visit_id + tooth_number + branch_code`
- record name: `{Visit ID}-{Tooth number}-{BRANCH CODE}`

For DX specifically:
- branch code is `DX`

Stage 7C does not invent any alternate DX record-name behavior.

## 3. DX Links

### 3.1 DX -> Visit

DX create writes:
- `Diagnosis.Visit ID`

This remains the authoritative child-side visit link, consistent with the existing snapshot model.

### 3.2 DX -> Case

DX create path relies on the active explicit link stage for Case association:
- `link_snapshot_to_case` now supports `DX`
- authoritative field: `Diagnosis.Case ID`

Stage 7C does not also write the inverse Case-side branch link explicitly.

## 4. Exact DX Fields Activated

Stage 7C activates exact schema-confirmed field awareness for:
- `Record name`
- `Visit ID`
- `Tooth number`
- `Structural diagnosis`
- `Pulp diagnosis`
- `Crack severity`
- `Occlusion risk`
- `Restorability`
- `Case ID` for explicit link activation

## 5. Exact DX Options Activated

Stage 7C activates exact option mappings for:

### `Structural diagnosis`
- `intact tooth`
- `primary caries`
- `secondary caries`
- `cracked tooth`
- `cusp fracture`
- `split tooth`
- `root fracture`
- `N/A`

### `Pulp diagnosis`
- `normal pulp`
- `reversible pulpitis`
- `irreversible pulpitis`
- `necrotic pulp`
- `previously treated`

### `Crack severity`
- `none`
- `superficial crack`
- `dentin crack`
- `deep crack`
- `split tooth`

### `Occlusion risk`
- `normal`
- `heavy occlusion`
- `bruxism suspected`

### `Restorability`
- `restorable`
- `questionable`
- `non-restorable`

## 6. What Stage 7C Activates

Activated now:
- safe DX create path
- exact DX table mapping
- exact DX writable field mappings
- exact DX option normalization
- explicit DX-to-Case link activation through `Diagnosis.Case ID`

## 7. What Stage 7C Does Not Activate

Still blocked:
- DX update
- multi-tooth DX writes
- ambiguous DX create-vs-update decisions
- DX behavior coupled to `split_case` / `close_case`
- RAD / OP activation
- any broader non-PRE activation pattern
