# Release Readiness

## Purpose

This document defines what is currently release-ready in this package and what is not.

It is intentionally conservative.

## Current Meaning Of "Ready"

Currently, "ready" means:

- the validated safe slice has passing golden validation
- the supported orchestration flow is truthful
- unsupported or unverified scope remains blocked before write
- future activation work is guided by the target canon in `docs/20_target_schema_canon.md` and `docs/21_record_identity_and_upsert_rules.md`
- a future engineer can safely expand from this baseline without guessing schema

It does not mean full sender feature completion.

## Validated Safe Slice

The validated safe slice currently covers:

- patient
- visit
- PRE snapshot
- preview-first orchestration
- preview generation from actual write-plan meaning
- correction-required response handling
- recheck-required response handling
- hard-stop response handling
- no-op response handling
- blocked-before-write response handling
- explicit confirm-to-execute flow for supported safe paths

Validated safe-path examples:

- safe new visit preview then confirm execution
- same-date update preview then confirm execution

Validated blocked-path examples:

- same-date correction required
- patient recheck required
- duplicate suspicion correction required
- blocked unsupported mapping before write
- no-op terminal behavior

## Intentionally Blocked Or Unverified Scope

The following are not release-ready in this package:

- case writes
- explicit link writes
- non-PRE snapshot writes
- any canon-confirm-required mapping not yet verified
- advanced replay-safe resume beyond the currently validated duplicate-safety rules

These are not partial-release items. They remain intentionally blocked.

## Conditions Already Met

- `npm run typecheck` passes
- `npm run validate:golden` passes
- API orchestration exists and preserves preview-first behavior
- supported safe flows complete cleanly
- blocked and unverified flows stop before write
- no-op remains distinct from success
- partial success remains distinct from full success

## Conditions Not Yet Met

- target-canon Airtable migration for Case-aware schema shape
- full case continuity write activation
- explicit link write activation
- non-PRE branch activation
- complete live Airtable schema confirmation
- broader runtime/deployment integration
- advanced replay / retry maturity beyond the current baseline

## Non-Goals For The Current Release State

- claiming production-complete coverage
- enabling blocked mappings by approximation
- widening provider support without canon confirmation
- bypassing preview-first discipline
- blurring blocked and validated scope

## Release Boundary

If this package is handed off now, the safe claim is:

- the validated safe slice is ready as a baseline for controlled integration and future expansion
- future expansion should follow the target canon rather than the current Airtable base shape where they differ

The unsafe claim would be:

- the entire sender is ready for unrestricted production scope

That unsafe claim must not be made from the current repository state.
