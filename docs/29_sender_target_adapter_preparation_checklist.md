# 29. Sender Target-Adapter Preparation Checklist

Status: Stage 1 sender preparation checklist  
Date: 2026-04-12

## 1. Purpose

This document identifies the exact sender-side areas that will need change later for target-canon activation.

It is still a preparation document.
It does not authorize runtime widening.

## 2. Current Runtime Boundary

Current active runtime baseline:

- patient
- visit
- PRE snapshot

Current fail-closed behavior that must remain intact:

- case actions blocked
- explicit link actions blocked
- non-PRE snapshot actions blocked
- missing canon mappings block before write

## 3. File-Level Preparation Map

## 3.1 `src/providers/airtable/mappingRegistry.ts`

Future work later:

- add `Cases` table field refs
- add `Patients.Cases` field ref
- add `Visits.Cases` field ref
- add `Case ID` field refs for every snapshot table
- add branch mappings for `RAD`, `OP`, `DX`, `PLAN`, `DR`
- add Case option mappings:
  - `Episode status`
  - `Follow-up pending`

Can be prepared now without changing runtime:

- document reserved sections for:
  - Cases table mappings
  - Case-link field mappings
  - per-branch non-PRE mappings
- keep these sections empty or marked `canon-confirm-required`

Must not happen now:

- active executable mappings for blocked action families

## 3.2 `src/providers/airtable/createAirtableProvider.ts`

Future work later:

- teach preflight how to reason about migrated target-canon structures
- allow executable Case actions only after target mappings are complete
- allow executable explicit link actions only after linked-record write shape is verified
- allow executable non-PRE snapshot actions one branch at a time

Can be prepared now without changing runtime:

- add comments/TODO boundaries for post-migration activation order
- identify where Stage 4 target-aware preflight hooks will live

Must not happen now:

- changing `getActionMappingError` behavior to permit blocked families
- weakening dry-run/mock fail-closed behavior

## 3.3 `src/providers/airtable/buildPayload/mapSnapshotAction.ts`

Future work later:

- align PRE table naming/mapping to final migrated target schema if needed
- add per-branch mappers for:
  - `RAD`
  - `OP`
  - `DX`
  - `PLAN`
  - `DR`
- add `Case ID` handling for snapshot writes after migrated schema exists
- enforce target snapshot identity/update-vs-create behavior

Can be prepared now without changing runtime:

- reserve clear per-branch TODO boundaries
- reserve Case-link insertion points in comments only

Must not happen now:

- enable non-PRE mapping
- add executable `Case ID` payload writes

## 3.4 `src/providers/airtable/buildPayload/handleUnsupportedAction.ts`

Future work later:

- narrow unsupported errors as each target family becomes activation-ready

Can be prepared now without changing runtime:

- document future staged de-blocking order in comments

Must not happen now:

- relaxing unsupported-action blocking

## 3.5 `src/providers/airtable/types.ts`

Future work later:

- reconcile runtime adapter table identifiers with migrated target schema
- add additional table identifiers only when they are activation-ready

Can be prepared now without changing runtime:

- keep comments explicit that runtime aliases are not target-state claims

Must not happen now:

- broadening adapter type unions in a way that implies activation

## 3.6 `src/write-plan/buildWritePlan.ts`

Future work later:

- use target-aware branch/content inference only when read-path and activation rules are ready
- align case/link planning behavior with migrated schema and activation flags

Can be prepared now without changing runtime:

- document where Stage 4 target-aware read/preflight handoff will connect

Must not happen now:

- enabling explicit links
- changing branch inference into active execution widening

## 3.7 `src/write-plan/rules/buildCaseActions.ts`

Future work later:

- separate Stage 5 activation scope:
  - `create_case`
  - `continue_case`
  - `update_case_latest_synthesis`
- later decide on `close_case` / `split_case`
- align guarded fields and payload intent to target Case lifecycle/latest-synthesis structure

Can be prepared now without changing runtime:

- mark sub-boundaries between:
  - early Case activation
  - later Case lifecycle activation

Must not happen now:

- activating executable Case writes

## 3.8 `src/write-plan/rules/buildLinkActions.ts`

Future work later:

- decide whether explicit link actions are needed as separate runtime actions after migrated schema exists
- if needed, stage activation by link family:
  - visit to patient
  - snapshot to visit
  - snapshot to case
- align replay/idempotence expectations for partial link completion

Can be prepared now without changing runtime:

- keep `includeExplicitLinks: false`
- document activation dependencies on migrated linked-record field truth

Must not happen now:

- turning on explicit link action generation

## 3.9 `src/write-plan/rules/buildSnapshotActions.ts`

Future work later:

- make branch activation reflect actual enabled branch scope
- align same-date update versus later-date create rules with target-canon identity handling
- incorporate Case-aware structure safely after migrated schema exists

Can be prepared now without changing runtime:

- document branch-by-branch activation posture

Must not happen now:

- enabling non-PRE execution

## 3.10 `src/types/write-plan.ts`

Future work later:

- keep action-family vocabulary aligned to staged activation
- possibly refine target metadata once target runtime paths are active

Can be prepared now without changing runtime:

- comments only

Must not happen now:

- any type change that implies blocked actions are supported now

## 3.11 Read/Lookup Surface Not Yet Finalized

Future work later:

- add read-path support for:
  - Case lookup by `case_id`
  - Visit lookup by canonical `visit_id`
  - Snapshot lookup by `visit_id + tooth_number + branch_code`
- align same-date correction and later-date continuation reads to target-canon identity rules

Current Stage 1 note:

- exact implementation location is not yet frozen in the requested files
- this remains a later Stage 4 preparation item

## 4. Preparation Work That Is Safe Now

Safe now:

- docs
- comments
- TODO boundaries
- placeholder sections with fail-closed posture
- validation planning

Not safe now:

- enabling any blocked write family
- adding guessed provider payloads
- adding guessed Airtable field names or option values beyond canon docs and `airtable_schema.json`

## 5. Stage 4 Preparation Targets

By the start of Stage 4, the sender side should be ready to do all of the following without widening runtime earlier:

- add target-aware field refs for migrated Airtable structures
- keep missing mappings fail-closed
- add Case preflight support
- add target-linked field preflight support
- add branch-by-branch non-PRE preflight support
- add validation fixtures for migrated-schema-but-still-blocked states

## 6. Sender-Side Blockers Requiring Explicit Decisions

### 6.1 Explicit link-write posture

Decision needed:

- should explicit link writes remain separate runtime actions after migration
- or should some link intent be satisfied inside row writes where linked fields are written directly

### 6.2 Case activation scope

Decision needed:

- whether Stage 5 activates only create/continue/latest-synthesis first
- whether close/split wait for a later stage

### 6.3 Historical-data posture

Decision needed:

- whether target Case-aware reads will need historical backfill before activation

### 6.4 Non-PRE first branch

Decision needed:

- which branch is first after PRE

## 7. Completion Definition For This Checklist

This checklist is complete when the next branch can identify:

- exactly which sender files will change later
- what those files need to support
- what can be prepared before runtime activation
- what must remain blocked until later stages

without confusing Stage 1 preparation with feature activation.
