# SMR Sender Rebuild Clean Package

This repository is a spec-first rebuild workspace for the sender-first direct-write architecture.

It is a validated baseline, not a full feature-complete sender release.

The target schema canon now exists as the future design source of truth, but the active runtime baseline remains the currently validated safe slice.

## What This Package Is

- A clean rebuild workspace for the sender core
- A provider-neutral decision and planning stack
- A validated direct-write safe slice for:
  - patient
  - visit
  - PRE snapshot
  - minimal Stage 5 Case activation
  - minimal Stage 6 explicit Case-link activation
  - minimal Stage 7A `Treatment Plan` activation
  - minimal Stage 7B `Doctor Reasoning` activation
  - minimal Stage 7C `Diagnosis` activation
  - minimal Stage 7D `Radiographic Findings` activation
  - minimal Stage 7E `Operative Findings` activation
  - minimal Stage 8B `Treatment Plan` update activation
  - remaining safe branch-update batch activation for `DR / DX / RAD / OP`
- A preview-first orchestration layer that coordinates:
  - normalize
  - resolve
  - plan
  - preview
  - confirm
  - execute

## Current Validated Scope

The current validated safe slice includes:

- patient resolution and safe patient attach/create handling within the validated slice
- visit resolution for safe new visit and same-date update flows
- PRE snapshot planning and execution
- minimal Case activation for:
  - safe `create_case`
  - safe existing-case continuation update
- minimal explicit link activation for:
  - `Visits.Cases`
  - `Pre-op Clinical Findings.Case ID`
  - `Treatment Plan.Case ID`
  - `Doctor Reasoning.Case ID`
  - `Diagnosis.Case ID`
  - `Radiographic Findings.Case ID`
  - `Operative Findings.Case ID`
- minimal `Treatment Plan` activation for:
  - safe PLAN create
  - safe PLAN same-date update with explicit existing row target
  - exact PLAN option mappings
  - explicit `Treatment Plan.Case ID`
- minimal `Doctor Reasoning` activation for:
  - safe DR create
  - safe DR same-date update with explicit existing row target
  - exact DR option mappings
  - explicit `Doctor Reasoning.Case ID`
- minimal `Diagnosis` activation for:
  - safe DX create
  - safe DX same-date update with explicit existing row target
  - exact DX option mappings
  - explicit `Diagnosis.Case ID`
- minimal `Radiographic Findings` activation for:
  - safe RAD create
  - safe RAD same-date update with explicit existing row target
  - exact RAD option mappings
  - explicit `Radiographic Findings.Case ID`
- minimal `Operative Findings` activation for:
  - safe OP create
  - safe OP same-date update with explicit existing row target
  - exact OP option mappings
  - explicit `Operative Findings.Case ID`
- preview-first orchestration
- `preview_confirmation`
- `correction_required`
- `recheck_required`
- `hard_stop`
- `inform_no_op`
- truthful `blocked_before_write`
- truthful `no_op`
- safe confirm-to-execute flow

The current golden suite passes for this validated baseline.

## Target Canon Direction

Future schema-alignment work should follow:

1. `docs/20_target_schema_canon.md`
2. `docs/21_record_identity_and_upsert_rules.md`
3. `docs/22_target_schema_vs_current_airtable_gap.md`
4. `docs/23_target_canon_alignment_review.md`

These documents define the future target canon.
They do not widen the currently validated runtime by themselves.

## Intentionally Blocked Scope

The following areas are still intentionally blocked or unverified:

- broad case writes beyond the minimal Stage 5 subset
- broad explicit link writes beyond the minimal Stage 6 subset
- same-date create-on-missing behavior for non-PRE branches
- multi-tooth non-PRE update behavior
- any canon-confirm-required mapping not yet verified
- advanced replay-safe resume beyond the currently validated rules

These are blocked on purpose. They are not release-ready in this package.

## What The Safe Slice Means Operationally

Operationally, the safe slice means:

- the system can resolve current state and generate a write plan truthfully
- the user must see preview before normal execution
- supported safe flows can execute only after explicit confirmation
- unsupported or unverified plan content must block before write
- no-op remains distinct from success
- correction, recheck, and hard-stop remain distinct from execution

## Install

```bash
npm install
```

## Core Commands

Typecheck:

```bash
npm run typecheck
```

Golden validation:

```bash
npm run validate:golden
```

API orchestration examples:

```bash
npm run api:examples
```

The orchestration example command runs lightweight deterministic fixtures through the API orchestration layer and prints normalized results.

Build the deployable web service:

```bash
npm run build
```

Start the HTTP server:

```bash
npm start
```

The server binds to `0.0.0.0` and listens on `process.env.PORT` with a default local fallback of `10000`.

## HTTP Service

This repository now includes a minimal Node web service entrypoint at `src/server.ts`.

Available endpoints:

- `GET /`
- `GET /health`
- `POST /preview`
- `POST /execute`

Transport boundary notes:

- the HTTP layer stays thin and forwards JSON into `orchestrateRequest`
- preview-first remains mandatory
- `POST /preview` always returns preview-oriented orchestration output and never performs final execution
- `POST /execute` uses the same orchestration path and only executes when the request body includes explicit confirmation through `interactionInput.confirmation.confirmed: true`
- HTTP requests should send `normalizedContract` JSON; `contractInput` is not supported over HTTP unless an in-process parser is wired separately

## Render Deployment

Deploy this repo as a Render Web Service with runtime language `Node`.

Recommended commands:

- Build Command: `npm install && npm run build`
- Start Command: `npm start`

Render runtime behavior:

- Render provides `PORT`; the server listens on that value and binds to `0.0.0.0`
- Node version is pinned through `package.json` `engines.node` to `20.x`

Optional environment variables:

- `AIRTABLE_MODE`
  - allowed values: `dryrun`, `mock`, `real`
  - default behavior: if omitted and Airtable secrets are absent, the service defaults to dry-run
- `AIRTABLE_BASE_ID`
- `AIRTABLE_API_TOKEN`

Provider defaulting:

- if both Airtable secrets are present, the server defaults to the real Airtable provider
- if not, the server stays in dry-run mode unless `AIRTABLE_MODE=mock` is set
- `PORT` is managed by Render for the web service and should not be hardcoded

## What To Read First

Start here:

1. `AGENTS.md`
2. `VALIDATION_REPORT.md`
3. `RELEASE_READINESS.md`
4. `HANDOFF.md`
5. `docs/15_validated_safe_slice_baseline.md`
6. `docs/16_next_expansion_order.md`
7. `docs/20_target_schema_canon.md`
8. `docs/21_record_identity_and_upsert_rules.md`
9. `docs/22_target_schema_vs_current_airtable_gap.md`
10. `docs/23_target_canon_alignment_review.md`

Then read the core behavior and architecture docs:

1. `docs/04_target_sender_architecture.md`
2. `docs/05_state_resolution_rules.md`
3. `docs/06_write_plan_schema.md`
4. `docs/07_preview_and_interaction_rules.md`
5. `docs/08_execution_and_retry_replay.md`

## Key Code Entry Points

- `src/api/orchestrateRequest.ts`
- `src/resolution/resolveState.ts`
- `src/write-plan/buildWritePlan.ts`
- `src/execution/executeWritePlan.ts`
- `src/providers/airtable/createAirtableProvider.ts`
- `src/validation/runGoldenSuite.ts`

## Truthfulness Boundary

This package does not claim:

- full production-complete sender scope
- fully activated case support beyond the minimal Stage 5 subset
- fully activated explicit-link support beyond the minimal Stage 6 subset
- fully activated non-PRE support beyond the minimal Stage 7A / 7B / 7C / 7D / 7E create subsets plus the narrow Stage 8B PLAN update subset
- fully activated non-PRE branch support
- fully verified Airtable schema coverage
- final canonical key naming

It does claim:

- the current safe slice is validated
- blocked scope remains blocked on purpose
- future schema alignment should follow the target canon docs rather than drifting toward the current Airtable base shape
- the current baseline is safe to build from conservatively

## Regression Guard

Future work must not casually break:

- preview-first discipline
- same-date correction behavior
- patient duplicate suspicion and patient recheck behavior
- truthful blocking for unsupported mappings
- no-op distinction
- visit-based historical snapshot truth
- golden suite pass status for the validated safe slice

# AI Dental Clinic Sender Rebuild

## Release posture
This repo snapshot is a **validated safe runtime snapshot**, not a full production-complete release.

Tag target: `v0.9-safe-runtime-snapshot`

## Current active runtime scope
The currently validated active runtime scope is:
- patient
- visit
- PRE snapshot
- safe `create_case`
- safe existing-case latest update
- child-side explicit Case links for `Visit` plus `PRE / PLAN / DR / DX / RAD / OP`
- narrow safe single-tooth create for `PLAN / DR / DX / RAD / OP`
- narrow safe same-date update for `PLAN / DR / DX / RAD / OP` when an explicit existing row target is already known
- preview-first orchestration
- confirm-to-execute
- truthful `correction_required / recheck_required / hard_stop / no_op / blocked_before_write`

## Intentionally blocked scope
The following behaviors remain intentionally fail-closed:
- same-date create-on-missing
- multi-tooth update behavior
- `split_case`
- `close_case`
- ambiguous reassignment behavior
- inverse Case-side explicit branch-link writes
- broader case/link expansion beyond the current safe subset
- PRE update beyond its current limited mapped shape

## Validation status
The snapshot is expected to ship only when these remain green:
- `npm run typecheck`
- `npm run validate:golden`
- `npm run api:examples`

Final reported validation status for this snapshot:
- `npm run typecheck` passed
- `npm run validate:golden` passed with `26/26`
- `npm run api:examples` passed

## Release note guidance
When publishing this snapshot, describe it as a **validated safe runtime snapshot**.
Do not describe blocked scope as ready.

## Next work policy
All further work should happen in a **new branch only**.
Do not continue expanding runtime scope directly on the release snapshot branch.
