# 27. Stage 1 Activation Preparation Checklist

Status: Stage 1 preparation checklist  
Date: 2026-04-12

## 1. Purpose

This document executes Stage 1 from `docs/24_target_canon_activation_roadmap.md`.

It is a preparation checklist only.
It does not activate:

- case writes
- explicit link writes
- non-PRE snapshot writes

It keeps separate:

- current runtime baseline
- target canon
- schema migration preparation
- future activation work

## 2. Current Baseline Guard

Current runtime truth that must remain unchanged during Stage 1:

- validated safe slice remains the active runtime baseline
- preview-first remains mandatory
- confirm-to-execute remains mandatory for supported writes
- truthful correction / recheck / hard-stop / no-op / blocked-before-write handling remains active
- patient / visit / PRE snapshot remains the only validated write scope

Still blocked:

- case writes
- explicit link writes
- non-PRE snapshot writes
- canon-confirm-required mappings not yet activation-verified

## 3. Stage 1 Exit Target

Stage 1 is complete only when:

- Stage 2 schema migration work can begin without guessing
- Stage 3 schema execution work has a human-usable Airtable input spec
- Stage 4 sender target-adapter preparation work has exact file/module boundaries
- unresolved owner decisions are explicit rather than hidden

## 4. Airtable-Side Preparation

These items must be prepared before Stage 2 and Stage 3.

### 4.1 Migration scope must be frozen

- Confirm that migration posture is additive-first, not destructive replacement.
- Confirm that current reusable tables remain:
  - Patients
  - Visits
  - Pre-op Clinical Findings
  - Radiographic Findings
  - Operative Findings
  - Diagnosis
  - Treatment Plan
  - Doctor Reasoning
- Confirm that the new structural addition is the `Cases` table plus required Case-linked fields.

### 4.2 Human-ready Airtable build spec must exist

- Prepare an exact table/field/link/option input spec for target canon.
- Separate:
  - already visible current Airtable structures
  - target-canon-required additions
  - target options that are new versus reused
- Mark any item that still requires human/live-base confirmation before build execution.

### 4.3 Schema delta must be explicit

- Enumerate the missing target structures:
  - `Cases` table
  - `Patients.Cases`
  - `Visits.Cases`
  - `Case ID` linked field on every snapshot table
  - Case lifecycle/latest-synthesis fields
- Confirm which current fields are reusable starting canon versus new additions.

### 4.4 Migration sequencing inputs must be prepared

- Define schema creation order:
  - create `Cases`
  - add `Patients.Cases`
  - add `Visits.Cases`
  - add `Case ID` to snapshot tables
  - add remaining Case lifecycle/latest-synthesis fields
- Define the dependency boundary:
  - Stage 3 creates structure only
  - runtime remains blocked until later activation stages

## 5. Sender-Side Preparation

These items must be prepared before Stage 2 and Stage 4.

### 5.1 File-level change boundaries must be explicit

Stage 1 must identify the exact files that will need later work:

- `src/providers/airtable/mappingRegistry.ts`
- `src/providers/airtable/createAirtableProvider.ts`
- `src/providers/airtable/buildPayload/mapSnapshotAction.ts`
- `src/providers/airtable/buildPayload/handleUnsupportedAction.ts`
- `src/providers/airtable/types.ts`
- `src/write-plan/buildWritePlan.ts`
- `src/write-plan/rules/buildCaseActions.ts`
- `src/write-plan/rules/buildLinkActions.ts`
- `src/write-plan/rules/buildSnapshotActions.ts`
- `src/types/write-plan.ts`
- any future read/lookup layer used to resolve target `visit_id`, `case_id`, and snapshot identity safely

### 5.2 Current fail-closed posture must stay intact

Stage 1 preparation must preserve:

- provider preflight blocking for unsupported mappings
- blocked execution of all case actions
- blocked execution of all explicit link actions
- blocked execution of all non-PRE snapshot actions

### 5.3 Target-aware preparation boundary must be explicit

Allowed future-preparation work after Stage 1 but before activation:

- reserved mapping sections for Case-aware schema
- target-aware preflight checks
- placeholder lookup/read-path hooks
- validation fixtures for target-canon missing-mapping failures

Not allowed in Stage 1:

- executable Case payload mapping
- executable explicit link payload mapping
- executable non-PRE payload mapping
- any runtime enablement flag that widens current execution

### 5.4 Identity/upsert preparation must be separated from activation

Stage 1 must identify later sender work for:

- `visit_id` targeting
- `case_id` targeting
- snapshot identity targeting by `visit_id + tooth_number + branch_code`
- same-date update versus later-date create behavior

But Stage 1 must not implement those runtime changes yet.

## 6. Validation-Side Preparation

These items must be prepared before Stage 2 through Stage 5.

### 6.1 Existing regression guard must remain the baseline

Current regression guard remains:

- `npm run typecheck`
- `npm run validate:golden`
- `npm run api:examples`

### 6.2 New validation inventory must be planned

Future validations that must be prepared for later stages:

- schema-migrated but runtime-still-blocked checks
- Case preflight blocked checks
- Case activation success cases
- explicit link blocked and success cases
- per-branch non-PRE blocked and success cases
- identity/upsert duplicate-prevention checks
- later-date continuation versus same-date correction checks under Case-aware behavior

### 6.3 Regression definition must stay explicit

At minimum, later stages must still treat these as regressions:

- preview-first bypass
- blocked scope writing early
- same-date correction behavior weakening
- patient duplicate correction / recheck weakening
- historical visit snapshot truth being overwritten by Case/latest logic

## 7. Owner Decisions Still Required

These items cannot be silently decided by implementation branches.

### 7.1 Historical data posture

Owner decision required:

- forward-fill only for new target-canon writes
- staged historical backfill before broader cutover
- mixed phased approach

Why this is blocked:

- Case continuity and cutover safety depend on how historical rows participate

### 7.2 Airtable migration execution ownership

Owner decision required:

- who will create/update Airtable schema
- who will verify the migrated structure against this repo’s input spec
- who signs off that migration is complete enough for Stage 4

### 7.3 Explicit link-write necessity after migration

Owner decision required:

- whether runtime should use separate explicit link actions where migrated linked-record fields exist
- or whether identifier-bearing row writes already satisfy required linkage in some paths

Why this is blocked:

- current workspace confirms conceptual target links, but not final executable linked-record write posture

### 7.4 Case activation scope order

Owner decision required:

- whether Stage 5 activates only:
  - `create_case`
  - `continue_case`
  - `update_case_latest_synthesis`
- and defers `close_case` / `split_case`

Why this matters:

- conservative ordering lowers continuity risk

### 7.5 Branch activation order after PRE

Owner decision required:

- which non-PRE branch activates first

Recommended conservative posture:

- pick one branch
- validate it fully
- keep the others blocked

## 8. Stage 1 Completion Checklist

- Current baseline truth is restated clearly.
- Airtable-side migration inputs are explicit.
- Sender-side future change boundaries are explicit.
- Validation-side future additions are explicit.
- Owner decisions are listed instead of hidden.
- No runtime behavior was widened.

## 9. Practical Handoff

If this document is complete, the next branch should be able to do Stage 2 work by:

- preparing exact Airtable migration execution
- preparing sender fail-closed target-adapter updates
- preparing validation additions

without guessing what Stage 1 was supposed to establish.
