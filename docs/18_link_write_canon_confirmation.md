# Link Write Canon Confirmation

## Purpose

This document records the current canon boundary for explicit link writes.

It is intentionally conservative.

It does not activate any link write path.

## Scope Reviewed

Reviewed evidence in this workspace:

- `AGENTS.md`
- `README.md`
- `RELEASE_SNAPSHOT.md`
- `RELEASE_READINESS.md`
- `HANDOFF.md`
- `VALIDATION_REPORT.md`
- `docs/12_airtable_canon_reference.md`
- `docs/13_option_mapping_reference.md`
- `docs/15_validated_safe_slice_baseline.md`
- `docs/16_next_expansion_order.md`
- `notes/canon_locked_items.md`
- `notes/canon_unverified_items.md`
- `src/providers/airtable/mappingRegistry.ts`
- `src/providers/airtable/createAirtableProvider.ts`
- `src/write-plan/rules/buildLinkActions.ts`
- `src/types/write-plan.ts`

Requested-but-missing workspace reference:

- `docs/17_case_write_canon_confirmation.md`
  This file does not exist in the current workspace, so it provides no additional canon evidence for this review.

## Explicitly Confirmed

The following are explicitly confirmed from the current workspace references:

- Explicit link write activation is not part of the validated safe slice.
- `link_visit_to_patient`, `link_snapshot_to_visit`, and `link_snapshot_to_case` are currently blocked action families.
- The write-plan schema intentionally reserves explicit link action families.
- The write-plan engine currently keeps `includeExplicitLinks: false`.
- The Airtable provider blocks all `entityType === 'link'` actions as `canon_confirm_required`.

Identifier fields that are explicitly visible in the extracted Airtable reference:

- `Visits` includes a `Patient ID` field.
- `Visits` includes a `Visit ID` field.
- `Pre-op Clinical Findings` includes a `Visit ID` field.
- `Treatment Plan` includes a `Visit ID` field.
- `Doctor Reasoning` includes a `Visit ID` field.

These confirm identifier-bearing fields exist in the extracted reference.
They do not by themselves confirm explicit linked-record writes.

## Partially Confirmed

### Visit to patient

Partially confirmed:

- Visit rows carry a `Patient ID` field in the extracted reference.
- The current safe slice already writes visit-side patient association data inside `create_visit`.

Not confirmed:

- that `Visits -> Patient ID` is an Airtable linked-record field rather than a scalar identifier field
- that a separate `link_visit_to_patient` write is required
- the exact relationship field name for an explicit link write, if any
- the exact provider write shape for that relationship field

Current truthful reading:

- visit-to-patient association data is partially evidenced through the visit row shape
- explicit visit-to-patient link writes are not canon-confirmed

### Snapshot to visit

Partially confirmed:

- PRE snapshot rows carry `Visit ID` in the extracted reference
- non-PRE extracted reference sections also show `Visit ID` as an identifier field
- the current safe slice already writes PRE snapshot-side visit association data inside `create_snapshot`

Not confirmed:

- that snapshot `Visit ID` is a linked-record field rather than a scalar identifier field
- that a separate `link_snapshot_to_visit` write is required
- the exact relationship field name for an explicit link write, if any
- the exact provider write shape for that relationship field

Current truthful reading:

- snapshot-to-visit association data is partially evidenced through snapshot row fields
- explicit snapshot-to-visit link writes are not canon-confirmed

### Snapshot to case

Conceptually confirmed only:

- the domain model requires later-date continuation to create new snapshot rows and link them to the continuing case

Not confirmed:

- any Airtable case table mapping
- any snapshot-side case relationship field
- any exact field name for snapshot-to-case linking
- any provider write shape for snapshot-to-case linking

Current truthful reading:

- snapshot-to-case is a domain requirement
- snapshot-to-case is not canon-confirmed at the Airtable mapping level

## Unverified Or Blocked

The following remain unverified or blocked:

- exact Airtable relationship field names for explicit visit-to-patient linking
- exact Airtable relationship field names for explicit snapshot-to-visit linking
- exact Airtable relationship field names for explicit snapshot-to-case linking
- exact linked-record write shape for any explicit link action
- whether explicit link fields expect Airtable record IDs, scalar external IDs, arrays, or another provider shape
- any case-table field mapping needed before snapshot-to-case linking could be activated
- any live-base confirmation that explicit link actions are required instead of identifier-field writes already present in visit/snapshot rows
- any explicit idempotence rule for re-running a link action after a partial failure
- any explicit duplicate-correction rule for link writes beyond the current general replay guidance

## Why Activation Is Still Blocked

### `link_visit_to_patient`

Blocked because:

- table existence is partially known, but no explicit relationship field mapping is confirmed
- linked-record field truth is not confirmed
- linked-record write shape is not confirmed
- it is not confirmed whether the current visit-row `Patient ID` write already represents the intended linkage
- replay/idempotence behavior for a separate explicit link action is not explicitly confirmed

### `link_snapshot_to_visit`

Blocked because:

- PRE snapshot table existence is partially known, but no explicit relationship field mapping is confirmed
- linked-record field truth is not confirmed
- linked-record write shape is not confirmed
- it is not confirmed whether the current snapshot-row `Visit ID` write already represents the intended linkage
- replay/idempotence behavior for a separate explicit link action is not explicitly confirmed

For non-PRE branches, activation is additionally blocked by branch write scope that is still intentionally unverified.

### `link_snapshot_to_case`

Blocked because:

- case write canon is still blocked
- no case table mapping is confirmed in the reviewed workspace references
- no snapshot-to-case relationship field is confirmed
- linked-record write shape is not confirmed
- replay/idempotence behavior is not explicitly confirmed

## Required Before Safe Activation

Before any explicit link write is activated, the workspace still needs:

- live-base confirmation of the exact relationship field names
- live-base confirmation of whether those fields are true linked-record fields or scalar identifier fields
- canon-confirmed provider write shape for each relationship field
- clear table ownership for each link target
- explicit duplicate-safe / replay-safe behavior for partially completed link sequences
- targeted validation cases that prove blocked-before-write behavior remains truthful when any required link mapping is missing
- targeted success cases that prove explicit link writes do not widen beyond the intended safe scope

## Conservative Conclusion

Current conclusion:

- no explicit link write mapping is fully canon-confirmed from the current workspace references
- visit-to-patient and snapshot-to-visit are only partially confirmed through identifier-field presence, not through explicit link-write canon
- snapshot-to-case remains unverified at the Airtable mapping level
- the correct current posture is to keep explicit link writes blocked and document the exact missing canon
