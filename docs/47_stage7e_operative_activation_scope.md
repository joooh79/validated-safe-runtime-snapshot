# Stage 7E Operative Activation Scope

This document defines the exact conservative Stage 7E `Operative Findings` activation scope.

This is not broad non-PRE activation.
This does not activate any broader Case, link, or same-date snapshot update behavior.
This does not activate `split_case` or `close_case`.

## 1. Stage 7E Goal

Stage 7E activates the smallest safe `Operative Findings` snapshot path under the current Case-aware runtime.

The runtime still preserves:
- preview-first
- confirm-to-execute
- fail-closed blocking for unresolved semantics
- Stage 5 Case behavior without widening split / close / ambiguous reassignment
- Stage 6 explicit link behavior using the authoritative child-side link field
- Stage 7A / 7B / 7C / 7D create-only branch behavior unchanged

## 2. OP Semantics Lock

### 2.1 When OP create is allowed

`OP` create is allowed only when all of the following are true:
- snapshot action is `create_snapshot`
- branch is exactly `OP`
- scope is single-tooth
- a resolved visit is present
- Case-aware runtime is active for the request
  - existing resolved case continuation, or
  - safe `create_case` path already in the plan
- current branch set stays inside the minimal active PRE / PLAN / DR / DX / RAD / OP boundary

### 2.2 When OP update is allowed

Stage 7E does not activate OP update.

Reason:
- exact same-date OP row resolution is still unresolved
- exact update-vs-create behavior for OP is still unresolved

### 2.3 OP record identity

Stage 7E uses the canon snapshot identity and record-name rule already locked in `docs/21_record_identity_and_upsert_rules.md`:
- identity: `visit_id + tooth_number + branch_code`
- record name: `{Visit ID}-{Tooth number}-{BRANCH CODE}`

For OP specifically:
- branch code is `OP`

Stage 7E does not invent any alternate OP record-name behavior.

## 3. OP Links

### 3.1 OP -> Visit

OP create writes:
- `Operative Findings.Visit ID`

This remains the authoritative child-side visit link, consistent with the existing snapshot model.

### 3.2 OP -> Case

OP create path relies on the active explicit link stage for Case association:
- `link_snapshot_to_case` now supports `OP`
- authoritative field: `Operative Findings.Case ID`

Stage 7E does not also write the inverse Case-side branch link explicitly.

## 4. Exact OP Fields Activated

Stage 7E activates exact schema-confirmed field awareness for:
- `Record name`
- `Visit ID`
- `Tooth number`
- `Rubber dam isolation`
- `Caries depth (actual)`
- `Soft dentin remaining`
- `Crack confirmed`
- `Crack location`
- `Remaining cusp thickness (mm)`
- `Subgingival margin`
- `Deep marginal elevation`
- `IDS/resin coating`
- `Resin core build up type`
- `Occlusal loading test`
- `Loading test result`
- `Intraoral photo link`
- `Case ID` for explicit link activation

## 5. Exact OP Options Activated

Stage 7E activates exact option mappings for:

### `Rubber dam isolation`
- `isolated`
- `difficult but isolated`
- `not possible`

### `Caries depth (actual)`
- `enamel`
- `outer dentin`
- `middle dentin`
- `deep dentin`
- `pulp exposure`

### `Soft dentin remaining`
- `none`
- `minimal`
- `intentional`

### `Crack confirmed`
- `none`
- `enamel crack`
- `dentin crack`
- `deep crack`
- `split tooth`

### `Crack location`
- `mesial marginal ridge`
- `distal marginal ridge`
- `central groove`
- `buccal`
- `palatal`
- `unknown`
- `N/A`

### `Subgingival margin`
- `no`
- `supragingival`
- `slightly subgingival`
- `deep subgingival`

### `Deep marginal elevation`
- `not needed`
- `performed`

### `IDS/resin coating`
- `none`
- `performed`

### `Resin core build up type`
- `none`
- `standard core`
- `fiber reinforced core`
- `standard resin core`

### `Occlusal loading test`
- `not performed`
- `performed`

### `Loading test result`
- `complete relief`
- `partial relief`
- `no change`
- `worse`
- `N/A`

## 6. What Stage 7E Activates

Activated now:
- safe OP create path
- exact OP table mapping
- exact OP writable field mappings
- exact OP option normalization
- exact OP numeric normalization for `Remaining cusp thickness (mm)`
- explicit OP-to-Case link activation through `Operative Findings.Case ID`

## 7. What Stage 7E Does Not Activate

Still blocked:
- OP update
- multi-tooth OP writes
- ambiguous OP create-vs-update decisions
- OP behavior coupled to `split_case` / `close_case`
- any broader activation beyond this narrow create subset
