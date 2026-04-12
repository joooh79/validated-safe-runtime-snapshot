# Non-PRE Snapshot Canon Confirmation

## Purpose

This document records the current canon boundary for non-PRE snapshot branches.

It is intentionally conservative.

It does not activate any non-PRE snapshot write path.

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
- `docs/18_link_write_canon_confirmation.md`
- `notes/canon_locked_items.md`
- `notes/canon_unverified_items.md`
- `src/providers/airtable/mappingRegistry.ts`
- `src/providers/airtable/createAirtableProvider.ts`
- `src/providers/airtable/buildPayload/mapSnapshotAction.ts`
- `src/types/write-plan.ts`

Requested-but-missing workspace reference:

- `docs/17_case_write_canon_confirmation.md`
  This file does not exist in the current workspace, so it provides no additional canon evidence for this review.

## Explicitly Confirmed

The following are explicitly confirmed from the current workspace references:

- Non-PRE snapshot writes are not part of the validated safe slice.
- Non-PRE snapshot writes remain intentionally blocked in the current release/readiness docs.
- The write-plan and type layers reserve these snapshot branches:
  - `RAD`
  - `OP`
  - `DX`
  - `PLAN`
  - `DR`
- Findings identity is branch-aware across snapshot branches:
  - record name pattern: `{Visit ID}-{Tooth number}-{BRANCH CODE}`
  - uniqueness rule: same visit + same tooth + same branch must not create duplicate records
- The Airtable provider currently supports only `PRE` snapshot mapping and blocks every other snapshot branch as `canon_confirm_required`.

These points confirm the blocked boundary and the branch-aware identity concept.
They do not by themselves confirm activation-ready non-PRE writes.

## Partially Confirmed

### Global non-PRE identity evidence

Partially confirmed for all non-PRE branches:

- the branch codes exist in the extracted canon
- non-PRE findings are expected to participate in the branch-aware record-name identity rule
- non-PRE findings are expected to remain visit-based snapshot truth rather than case-latest truth

Not confirmed for any non-PRE branch:

- exact Airtable lookup/upsert implementation for that identity rule
- whether `Record name` is the actual writable identity field used by the adapter
- exact search/read path used to decide update versus create

### `PLAN`

Partially confirmed:

- an extracted reference section exists for `Treatment Plan`
- the section shows these visible field names:
  - `Record name`
  - `Visit ID`
  - `Tooth number`
  - `Pulp therapy`
  - `Restoration design`
  - `Restoration material`
  - `Implant placement`
  - `Scan file link`
- the section shows visible option labels for:
  - `Pulp therapy`
  - `Restoration design`
  - `Restoration material`
  - `Implant placement`

Not confirmed:

- that `PLAN` maps to a concrete live Airtable table identity without further live-base confirmation
- that every listed field is writable in the final adapter path
- complete option coverage beyond the visible extracted list
- record lookup / upsert truth for `PLAN`
- update-versus-create behavior for same-date correction or later-date continuation

Current truthful reading:

- `PLAN` is the strongest non-PRE branch in the current workspace evidence
- `PLAN` is still only partially confirmed and remains blocked

### `DR`

Partially confirmed:

- an extracted reference section exists for `Doctor Reasoning`
- the section shows these visible field names:
  - `Record name`
  - `Visit ID`
  - `Tooth number`
  - `Decision factor`
  - `Remaining cusp thickness decision`
  - `Functional cusp involvement`
  - `Crack progression risk`
  - `Occlusal risk`
  - `Reasoning notes`
- the section shows visible option labels for:
  - `Decision factor`
  - `Remaining cusp thickness decision`
  - `Functional cusp involvement`
  - `Crack progression risk`
  - `Occlusal risk`

Not confirmed:

- that `DR` maps to a concrete live Airtable table identity without further live-base confirmation
- that every listed field is writable in the final adapter path
- complete option coverage beyond the visible extracted list
- record lookup / upsert truth for `DR`
- update-versus-create behavior for same-date correction or later-date continuation

Current truthful reading:

- `DR` has extracted reference evidence
- `DR` is still only partially confirmed and remains blocked

## Unverified Or Blocked

### `RAD`

Currently unverified:

- no branch-specific Airtable table identity is explicitly shown in the reviewed workspace references
- no branch-specific writable field names are explicitly shown
- no branch-specific option labels or values are explicitly shown
- no branch-specific identity/upsert implementation is explicitly shown beyond the shared branch-aware record-name rule
- no update-versus-create behavior is explicitly shown

Activation is blocked because:

- table mapping is missing
- field mapping is missing
- option mapping is missing
- identity/upsert truth is missing

### `OP`

Currently unverified:

- no branch-specific Airtable table identity is explicitly shown in the reviewed workspace references
- no branch-specific writable field names are explicitly shown
- no branch-specific option labels or values are explicitly shown
- no branch-specific identity/upsert implementation is explicitly shown beyond the shared branch-aware record-name rule
- no update-versus-create behavior is explicitly shown

Activation is blocked because:

- table mapping is missing
- field mapping is missing
- option mapping is missing
- identity/upsert truth is missing

### `DX`

Currently unverified:

- no branch-specific Airtable table identity is explicitly shown in the reviewed workspace references
- no branch-specific writable field names are explicitly shown
- no branch-specific option labels or values are explicitly shown
- no branch-specific identity/upsert implementation is explicitly shown beyond the shared branch-aware record-name rule
- no update-versus-create behavior is explicitly shown

Activation is blocked because:

- table mapping is missing
- field mapping is missing
- option mapping is missing
- identity/upsert truth is missing

### `PLAN`

Currently blocked despite partial evidence:

- extracted table/field/option evidence exists
- live-base table mapping is not explicitly confirmed enough to activate from this workspace alone
- exact writable field set is not explicitly confirmed enough to activate from this workspace alone
- exact option coverage is not explicitly confirmed enough to activate from this workspace alone
- identity/upsert truth is not explicitly confirmed
- update-versus-create behavior is not explicitly confirmed

Activation is blocked because:

- table mapping still needs canon confirmation
- field mapping still needs canon confirmation
- option mapping still needs canon confirmation
- identity/upsert truth still needs canon confirmation

### `DR`

Currently blocked despite partial evidence:

- extracted table/field/option evidence exists
- live-base table mapping is not explicitly confirmed enough to activate from this workspace alone
- exact writable field set is not explicitly confirmed enough to activate from this workspace alone
- exact option coverage is not explicitly confirmed enough to activate from this workspace alone
- identity/upsert truth is not explicitly confirmed
- update-versus-create behavior is not explicitly confirmed

Activation is blocked because:

- table mapping still needs canon confirmation
- field mapping still needs canon confirmation
- option mapping still needs canon confirmation
- identity/upsert truth still needs canon confirmation

## Branch-by-Branch Activation Prerequisites

### `RAD`

Required before safe activation:

- exact live Airtable table identity
- exact writable field names
- exact option values, if any option fields exist
- exact record lookup / duplicate-prevention rule
- exact update-versus-create rule for same-date and later-date paths
- targeted validation proving blocked-before-write remains truthful when any mapping is missing

### `OP`

Required before safe activation:

- exact live Airtable table identity
- exact writable field names
- exact option values, if any option fields exist
- exact record lookup / duplicate-prevention rule
- exact update-versus-create rule for same-date and later-date paths
- targeted validation proving blocked-before-write remains truthful when any mapping is missing

### `DX`

Required before safe activation:

- exact live Airtable table identity
- exact writable field names
- exact option values, if any option fields exist
- exact record lookup / duplicate-prevention rule
- exact update-versus-create rule for same-date and later-date paths
- targeted validation proving blocked-before-write remains truthful when any mapping is missing

### `PLAN`

Required before safe activation:

- live-base confirmation that the extracted `Treatment Plan` reference is the exact target table identity for `PLAN`
- exact writable field set confirmation
- exact option coverage confirmation for every writable select field
- exact record lookup / duplicate-prevention rule
- exact update-versus-create rule for same-date and later-date paths
- targeted validation for a successful `PLAN` branch path
- targeted validation proving missing `PLAN` mappings still block before write

### `DR`

Required before safe activation:

- live-base confirmation that the extracted `Doctor Reasoning` reference is the exact target table identity for `DR`
- exact writable field set confirmation
- exact option coverage confirmation for every writable select field
- exact record lookup / duplicate-prevention rule
- exact update-versus-create rule for same-date and later-date paths
- targeted validation for a successful `DR` branch path
- targeted validation proving missing `DR` mappings still block before write

## Conservative Conclusion

Current conclusion:

- no non-PRE snapshot branch is fully canon-confirmed from the current workspace references
- `PLAN` and `DR` are only partially confirmed through extracted reference sections
- `RAD`, `OP`, and `DX` remain fully unverified at the branch-mapping level
- shared branch-aware identity concepts are visible, but exact identity/upsert execution truth is still not confirmed
- the correct current posture is to keep all non-PRE snapshot writes blocked and document the precise missing canon branch by branch
