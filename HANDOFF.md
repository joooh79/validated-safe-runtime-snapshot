# Handoff

## What This Repository Contains

This repository contains the currently validated sender core baseline:

- State Resolution Engine
- Write Plan Engine
- Execution Engine
- Airtable Provider Adapter
- API Orchestration Layer
- Golden validation suite

The validated safe slice is intentionally narrow:

- patient
- visit
- PRE snapshot

## Current Architecture Layers

1. Contract / intent layer
   `src/contract/`
2. State resolution layer
   `src/resolution/`
3. Write plan layer
   `src/write-plan/`
4. Execution layer
   `src/execution/`
5. Airtable provider adapter
   `src/providers/airtable/`
6. API orchestration layer
   `src/api/`
7. Validation layer
   `src/validation/`

## Current Supported Flows

- safe new visit preview
- safe new visit confirm and execute
- same-date update preview
- same-date update confirm and execute
- same-date correction-required response
- patient recheck-required response
- duplicate suspicion correction-required response
- hard-stop response
- no-op response
- blocked-before-write response for unsupported mappings

## Current Blocked Flows

- case writes
- explicit link writes
- non-PRE snapshot writes
- canon-confirm-required mappings that are still unverified
- advanced replay-safe resume beyond the currently validated rules

## Commands To Run First

Install dependencies:

```bash
npm install
```

Typecheck:

```bash
npm run typecheck
```

Golden validation:

```bash
npm run validate:golden
```

API orchestration example fixtures:

```bash
npm run api:examples
```

## Files To Read First

1. `AGENTS.md`
2. `README.md`
3. `VALIDATION_REPORT.md`
4. `RELEASE_READINESS.md`
5. `docs/15_validated_safe_slice_baseline.md`
6. `docs/16_next_expansion_order.md`
7. `docs/20_target_schema_canon.md`
8. `docs/21_record_identity_and_upsert_rules.md`
9. `docs/22_target_schema_vs_current_airtable_gap.md`
10. `docs/23_target_canon_alignment_review.md`
11. `src/api/orchestrateRequest.ts`
12. `src/validation/runGoldenSuite.ts`

## What Not To Change Casually

Do not casually break:

- preview-first discipline
- same-date correction behavior
- patient duplicate suspicion and patient recheck behavior
- no-op distinction
- blocked-before-write truthfulness
- visit-based snapshot truth
- golden suite pass status

Do not casually widen:

- Airtable field mappings
- Airtable option mappings
- non-PRE branch support
- case or explicit link write support

## Recommended Next Implementation Order

1. Logging / inspection tightening
   Why: improves traceability without widening provider behavior.
2. Replay / retry refinement
   Why: builds operational safety before expanding write scope.
3. Case write activation only after canon confirmation
   Why: case support is meaningful but currently blocked on schema truth.
4. Explicit link write activation only after canon confirmation
   Why: relationship writes should not be guessed.
5. Non-PRE snapshot activation one branch at a time after canon confirmation
   Why: branch-by-branch expansion is safer than broad activation.
6. Broader API/runtime integration after the above
   Why: transport/runtime scaling should follow validated write behavior, not precede it.

## Baseline Handoff Summary

If you are picking this repository up fresh, treat it as:

- a truthful validated baseline
- a target-canon-aware planning surface
- a safe expansion point
- not a permission slip to unblock unsupported scope by inference
