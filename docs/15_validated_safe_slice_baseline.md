# Validated Safe Slice Baseline

## Purpose

This document freezes the currently validated sender baseline.

Use it as the clearest regression guard for future work.

## Supported Entities

- patient
- visit
- PRE snapshot

## Supported Action Families

- `attach_existing_patient`
- `create_patient`
  Only where already supported by the validated slice and current guards
- `create_visit`
- `update_visit`
- `create_snapshot`
  PRE only
- `update_snapshot`
  PRE only
- `no_op_patient`
- `no_op_visit`
- `no_op_snapshot`

## Supported Orchestration Flows

- preview-first request lifecycle
- preview without write when confirmation is absent
- confirm-to-execute for execution-ready safe plans
- correction-required response path
- recheck-required response path
- hard-stop response path
- no-op response path
- blocked-before-write response path for unsupported mappings

## Blocked Action Families

- `create_case`
- `update_case_latest_synthesis`
- `close_case`
- `split_case`
- `link_visit_to_patient`
- `link_snapshot_to_visit`
- `link_snapshot_to_case`
- non-PRE snapshot writes

Blocked here means:

- not part of the currently validated safe slice
- not to be activated without canon confirmation and targeted validation

## Validated Commands

Install:

```bash
npm install
```

Typecheck:

```bash
npm run typecheck
```

Golden suite:

```bash
npm run validate:golden
```

API orchestration examples:

```bash
npm run api:examples
```

## What Counts As Regression

Any of the following is a regression:

- preview-first discipline is bypassed
- a supported safe path stops passing golden validation
- unsupported mapping paths write before blocking
- no-op becomes an execution-ready write path
- same-date correction stops requiring truthful correction handling
- patient recheck or duplicate suspicion stops blocking truthfully
- visit-based historical snapshot truth is weakened
- blocked and validated scope become blurred in code or docs

## Current Truth

The safe slice is validated.

The broader sender is not yet fully activated.

Future work must preserve that distinction.
