# 23. Target Canon Alignment Review

Status: conservative alignment review  
Date: 2026-04-12

## 1. Purpose

This document reviews how the current repo aligns with the new target schema canon in:

- `docs/20_target_schema_canon.md`
- `docs/21_record_identity_and_upsert_rules.md`
- `docs/22_target_schema_vs_current_airtable_gap.md`

This is not an activation document.
It records what already fits, what still reflects the current validated runtime/current Airtable shape, and what future activation work will need to migrate.

## 2. What Already Fits The Target Canon

### 2.1 Core data model direction is already visible

The repo already reserves the future four-entity model in important places:

- `src/types/core.ts` includes `patient`, `visit`, `case`, and `snapshot`
- `src/types/write-plan.ts` includes Case and explicit-link action families
- `src/write-plan/buildWritePlan.ts` already composes patient, visit, case, snapshot, and link planning layers

This means the planning surface is already shaped more like the target canon than the old single-surface Airtable shape.

### 2.2 Historical truth boundary already fits target canon

The validated runtime already preserves the most important behavioral truth from the target canon:

- visit remains the event anchor
- snapshot truth remains visit-based
- same-date correction updates same-date state rather than creating duplicates
- later-date continuation is treated as a new visit path
- Case/latest continuity does not overwrite historical snapshot truth

This alignment is visible in the baseline docs and snapshot planning comments, even though full Case execution is still blocked.

### 2.3 Preview-first and truthful blocking already fit the future direction

The current baseline already protects future target-canon activation by preserving:

- preview-first orchestration
- confirm-to-execute
- truthful `correction_required`
- truthful `recheck_required`
- truthful `hard_stop`
- truthful `blocked_before_write`

That matters because future schema activation should happen on top of truthful planning and blocking, not by widening runtime behavior speculatively.

## 3. What Still Reflects Current Runtime Or Current Airtable Shape

### 3.1 Airtable adapter remains intentionally narrower than the target canon

The Airtable provider surface still reflects the current validated safe slice rather than the full target canon:

- `src/providers/airtable/mappingRegistry.ts` only carries active mappings for Patients, Visits, and PRE
- `src/providers/airtable/buildPayload/mapSnapshotAction.ts` activates PRE only
- `src/providers/airtable/createAirtableProvider.ts` blocks case actions, explicit link actions, and non-PRE snapshot writes through fail-closed mapping checks

This is correct for the current runtime baseline.
It is not yet target-canon-complete.

### 3.2 Internal adapter naming still reflects the current implementation layer

Some provider-side identifiers still reflect current adapter shape instead of target table labels:

- the runtime alias `PreOp` is still used in the Airtable adapter/types
- the target canon names that table `Pre-op Clinical Findings`

This is currently an implementation alias, not a canonical target-schema claim.
It should stay as-is until explicit activation/migration work changes the provider layer safely.

### 3.3 Case-aware planning exists, but execution is not activated

The repo already exposes future-facing Case concepts in planning:

- `src/write-plan/rules/buildCaseActions.ts`
- `src/write-plan/rules/buildLinkActions.ts`
- `src/types/write-plan.ts`

But those actions are still runtime-blocked because the current Airtable base does not yet expose the target Case schema and link model.

### 3.4 Snapshot planning is broader than current execution support

`src/write-plan/buildWritePlan.ts` and `src/write-plan/rules/buildSnapshotActions.ts` can still express branch-aware snapshot intent beyond PRE.

That is useful as a planning surface, but current execution support remains intentionally narrower:

- non-PRE branches are still blocked in the provider adapter
- Case-linked snapshot execution is still blocked
- exact target activation must follow branch-specific mapping verification

## 4. What Future Activation Will Need To Migrate

### 4.1 Cases table activation

Future activation will need to add real, executable support for:

- `Cases` table mapping
- `Case ID` identity handling
- case lifecycle fields
- latest synthesis fields
- safe Case create/update/close/split behavior

That work must follow `docs/20_target_schema_canon.md` and `docs/21_record_identity_and_upsert_rules.md`, not the current Airtable base shape.

### 4.2 Case-aware link model activation

Future activation will need explicit, verified handling for:

- `Patients.Cases`
- `Visits.Cases`
- snapshot-table `Case ID`
- any explicit linked-record write shape required by Airtable

This remains blocked until the base is migrated and the linked-record write path is confirmed.

### 4.3 Snapshot table activation beyond PRE

Future activation will need:

- target table-name alignment for PRE / RAD / OP / DX / PLAN / DR
- branch-specific writable field mappings
- branch-specific option mappings
- branch-specific create vs update rules under the target identity canon

The repo should continue treating non-PRE activation as branch-by-branch work, not a bulk enablement step.

### 4.4 Identity/upsert standardization

Future activation should make runtime behavior explicitly follow the target canon for:

- `visit_id`
- `case_id`
- snapshot record-name identity
- deterministic create vs update behavior

The current repo already points in this direction, but full runtime enforcement should wait for activation work and targeted validation.

## 5. Practical Alignment Conclusion

Current repo truth:

- the validated runtime baseline is still the safe slice
- current Airtable shape is not the same thing as the new target canon
- the target canon is now the future design source of truth

Practical implication:

- docs and planning should now point future work toward the target canon
- runtime execution should remain conservative until schema migration and activation work are performed deliberately
- no engineer should interpret the new canon docs as permission to activate Case or link writes immediately
