# Stage 4 Sender Target-Adapter Changes

This document records the Stage 4 sender-side preparation work completed after the Airtable target-schema migration.

This is not full activation.
This does not turn on Case writes.
This does not turn on explicit link writes.
This does not turn on non-PRE snapshot writes.

## 1. Stage 4 Goal

Stage 4 makes the sender adapter and mapping layer truthfully aware of the migrated Airtable schema while preserving fail-closed runtime behavior for unresolved semantics.

## 2. Files Updated

Code:
- `src/providers/airtable/types.ts`
- `src/providers/airtable/mappingRegistry.ts`
- `src/providers/airtable/index.ts`
- `src/providers/airtable/createAirtableProvider.ts`
- `src/providers/airtable/buildPayload/mapSnapshotAction.ts`
- `src/providers/airtable/buildPayload/handleUnsupportedAction.ts`
- `src/providers/airtable/buildPayload/mapPatientAction.ts`
- `src/providers/airtable/buildPayload/mapVisitAction.ts`
- `src/write-plan/rules/buildCaseActions.ts`
- `src/write-plan/rules/buildLinkActions.ts`

Docs:
- `docs/33_post_migration_schema_confirmation.md`
- `docs/34_stage4_sender_target_adapter_changes.md`

## 3. What Is Now Schema-Confirmed And Adapter-Preparably Mapped

The registry now uses exact migrated Airtable identities for:
- `Patients`
- `Visits`
- `Cases`
- `Pre-op Clinical Findings`
- `Radiographic Findings`
- `Operative Findings`
- `Diagnosis`
- `Treatment Plan`
- `Doctor Reasoning`

The registry now includes exact mapping sections for:
- active patient fields
- active visit fields
- PRE fields under the real migrated table label
- `Patients.Cases`
- `Visits.Cases`
- `Cases` core fields
- `Cases` branch-link fields
- every snapshot table `Case ID` field
- `Episode status` option set
- `Follow-up pending` option set

## 4. Executable Adapter Alignment Done In Stage 4

The active PRE mapper was aligned to the migrated table label:
- old runtime alias: `PreOp`
- migrated Airtable label: `Pre-op Clinical Findings`

The provider dry-run/mock fallback for same-date PRE updates was aligned to the same migrated label.

Blocked error reasons were tightened so they no longer imply the schema is missing when the real blocker is semantic activation work.

## 5. What Is Now Likely Activation-Ready Next

Likely next activation surface:
- Case activation preparation against the exact `Cases` table fields now visible in schema
- PRE-to-Case association design against the exact PRE `Case ID` field
- Case latest-synthesis field activation planning using:
  - `Latest summary`
  - `Latest working diagnosis`
  - `Latest working plan`

Why this is next:
- the structural schema pieces for Case-aware execution now exist
- Stage 4 removed the old ambiguity around missing tables/fields
- remaining blockers are now mostly semantic rather than structural

## 6. What Remains Blocked And Why

### 6.1 Case writes

Still blocked because the schema does not decide:
- Case ID generation/runtime record-name behavior
- continuation vs split resolution write rules
- create vs update vs upsert rules
- whether `Parent Case ID` and `Latest Visit ID` should remain text-backed or require further schema change
- safe sequencing between Case creation, snapshot creation, and synthesis updates

### 6.2 Explicit link writes

Still blocked because the schema does not decide:
- which side of each bidirectional link is the authoritative write side
- the exact linked-record payload shape the sender should standardize on
- replay/idempotence behavior for repeated explicit link attempts
- whether some links should stay implicit through snapshot/Case writes instead of becoming standalone actions

### 6.3 Non-PRE snapshot writes

Still blocked because each branch still needs:
- branch-specific writable payload mapping
- branch-specific option normalization coverage
- branch-specific record-name behavior confirmation
- create vs update behavior confirmation
- sequencing confirmation relative to Case activation

Covered blocked branches:
- `RAD`
- `OP`
- `DX`
- `PLAN`
- `DR`

## 7. Recommended Next Activation Order

1. Stage 5 Case activation design and implementation.
2. PRE Case-link activation inside that Case-aware path, still fail-closed on ambiguity.
3. Stage 6 explicit link activation only after authoritative write-side and replay rules are chosen.
4. Stage 7 non-PRE activation one branch at a time under the Case-aware model.

## 8. Runtime Change Boundary

What did change:
- the active PRE adapter now points at the real migrated Airtable table label
- mapping definitions now reflect the real migrated schema instead of placeholders and old aliases
- blocked errors now state the real remaining blockers more precisely

What did not change:
- preview-first discipline
- current safe-slice scope
- truthful block/correction/recheck behavior
- Case execution support
- explicit link execution support
- non-PRE snapshot execution support

## 9. Stage 4 Exit Condition

Stage 4 is complete when:
- the adapter no longer drifts back to the old pre-migration table aliases
- the mapping registry reflects the migrated schema exactly where confirmed
- unsupported paths stay fail-closed for semantic reasons rather than pretending the schema is absent
- the current validation baseline remains green
