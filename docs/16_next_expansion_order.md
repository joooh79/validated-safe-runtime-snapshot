# Next Expansion Order

## Purpose

This document records the recommended conservative expansion order from the current validated baseline.

It does not claim the listed areas are already implemented.

The target canon is now defined in:

- `docs/20_target_schema_canon.md`
- `docs/21_record_identity_and_upsert_rules.md`
- `docs/22_target_schema_vs_current_airtable_gap.md`

This expansion order assumes those documents are the future design source of truth, while the current validated runtime baseline remains the active release boundary.

## Expansion Principles

- expand only from validated truth
- do not activate blocked mappings by approximation
- confirm canon before enabling schema-dependent writes
- preserve preview-first and blocked-before-write behavior
- prefer operational safety before wider scope

## Recommended Order

### 1. Logging / inspection tightening

Why first:

- improves observability without widening business scope
- makes later expansion easier to debug and validate

### 2. Replay / retry refinement

Why second:

- partial failure already exists as a truthful execution state
- replay behavior should become safer before more write families are activated

### 3. Case write activation only after canon confirmation

Why third:

- case support matters, but current blocked status is correct
- schema-dependent activation must follow verified field truth

### 4. Explicit link write activation only after canon confirmation

Why fourth:

- explicit relationship writes are easy to get wrong if guessed
- these should follow case/write truth, not precede it

### 5. Non-PRE snapshot branch activation one branch at a time

Suggested order:

- activate one branch
- validate it explicitly
- keep other branches blocked
- repeat only after canon confirmation

Why this order:

- branch-by-branch activation limits blast radius
- avoids broad speculative payload enablement

### 6. Broader API/runtime integration

Why last:

- wider runtime exposure should come after the write surface is trustworthy
- transport and deployment work should not outrun validated write behavior

## What Should Not Jump The Queue

Do not jump directly to:

- full case activation without canon confirmation
- broad multi-branch snapshot activation
- implicit enabling of explicit link writes
- production-style runtime rollout that assumes full sender coverage

## Decision Rule For Future Work

A change should move forward only if it can answer:

- is the schema truth verified?
- does the safe slice still pass?
- does unsupported scope remain blocked if still unverified?
- does preview-first remain intact?

If the answer is not clearly yes, the change is not ready yet.
