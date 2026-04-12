# Stage 7D Radiographic Activation Scope

This document defines the exact conservative Stage 7D `Radiographic Findings` activation scope.

This is not broad non-PRE activation.
This does not activate `OP`.
This does not activate `split_case` or `close_case`.

## 1. Stage 7D Goal

Stage 7D activates the smallest safe `Radiographic Findings` snapshot path under the current Case-aware runtime.

The runtime still preserves:
- preview-first
- confirm-to-execute
- fail-closed blocking for unresolved semantics
- Stage 5 Case behavior without widening split / close / ambiguous reassignment
- Stage 6 explicit link behavior using the authoritative child-side link field
- Stage 7A PLAN behavior unchanged
- Stage 7B DR behavior unchanged
- Stage 7C DX behavior unchanged

## 2. RAD Semantics Lock

### 2.1 When RAD create is allowed

`RAD` create is allowed only when all of the following are true:
- snapshot action is `create_snapshot`
- branch is exactly `RAD`
- scope is single-tooth
- a resolved visit is present
- Case-aware runtime is active for the request
  - existing resolved case continuation, or
  - safe `create_case` path already in the plan
- current branch set stays inside the minimal active PRE / PLAN / DR / DX / RAD boundary

### 2.2 When RAD update is allowed

Stage 7D does not activate RAD update.

Reason:
- exact same-date RAD row resolution is still unresolved
- exact update-vs-create behavior for RAD is still unresolved

### 2.3 RAD record identity

Stage 7D uses the canon snapshot identity and record-name rule already locked in `docs/21_record_identity_and_upsert_rules.md`:
- identity: `visit_id + tooth_number + branch_code`
- record name: `{Visit ID}-{Tooth number}-{BRANCH CODE}`

For RAD specifically:
- branch code is `RAD`

Stage 7D does not invent any alternate RAD record-name behavior.

## 3. RAD Links

### 3.1 RAD -> Visit

RAD create writes:
- `Radiographic Findings.Visit ID`

This remains the authoritative child-side visit link, consistent with the existing snapshot model.

### 3.2 RAD -> Case

RAD create path relies on the active explicit link stage for Case association:
- `link_snapshot_to_case` now supports `RAD`
- authoritative field: `Radiographic Findings.Case ID`

Stage 7D does not also write the inverse Case-side branch link explicitly.

## 4. Exact RAD Fields Activated

Stage 7D activates exact schema-confirmed field awareness for:
- `Record name`
- `Visit ID`
- `Tooth number`
- `Radiograph type`
- `Radiographic caries depth`
- `Secondary caries`
- `Caries location`
- `Pulp chamber size`
- `Periapical lesion`
- `Radiographic fracture sign`
- `Radiograph link`
- `Case ID` for explicit link activation

## 5. Exact RAD Options Activated

Stage 7D activates exact option mappings for:

### `Radiograph type`
- `bitewing`
- `periapical`
- `panoramic`
- `CBCT`

### `Radiographic caries depth`
- `none`
- `enamel`
- `outer dentin`
- `middle dentin`
- `deep dentin`

### `Secondary caries`
- `none`
- `suspected`
- `clear`

### `Caries location`
- `mesial`
- `distal`
- `occlusal`
- `cervical`
- `root`
- `N/A`

### `Pulp chamber size`
- `large`
- `normal`
- `narrow`
- `very narrow`

### `Periapical lesion`
- `none`
- `suspected`
- `present`

### `Radiographic fracture sign`
- `none`
- `possible fracture`
- `clear fracture`

## 6. What Stage 7D Activates

Activated now:
- safe RAD create path
- exact RAD table mapping
- exact RAD writable field mappings
- exact RAD option normalization
- explicit RAD-to-Case link activation through `Radiographic Findings.Case ID`

## 7. What Stage 7D Does Not Activate

Still blocked:
- RAD update
- multi-tooth RAD writes
- ambiguous RAD create-vs-update decisions
- RAD behavior coupled to `split_case` / `close_case`
- OP activation
- any broader non-PRE activation pattern
