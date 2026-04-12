# Project Frame

## Purpose

This workspace exists to support a clean rebuild of the AI Dental Clinic sender as the primary direct-write execution engine.

## Current baseline vs target baseline

### Current baseline
- Canonical JSON is generated upstream
- Sender validates/transforms/previews
- Sender hands off to Make
- Make performs core routing/gating/write behavior
- Airtable stores the final records

### Target baseline
- Canonical JSON is generated upstream
- Sender resolves state directly
- Sender generates a write plan directly
- Sender previews directly
- Sender writes directly
- Make is removed from the long-term target execution path

## What must be preserved

- same-date correction
- patient duplication correction / recheck handling
- preview-first discipline
- current-state-based decision discipline
- historical visit snapshot truth
- continuity-ready case handling
- deterministic write behavior
- no-op distinction
- hard-stop / correction-required / recheck-required distinction

## Core design model

- Visit = date event
- Case = continuity identity for same tooth + same episode
- Snapshot = visit-time truth
- Case = latest synthesis / continuity layer

## Hard design boundaries

- Snapshot truth stays visit-based
- Same-date correction may update same-date state
- Later-date continuation creates a new visit and new snapshots
- Case continuity must not overwrite historical visit snapshots

## Legacy boundary

Legacy sender / Make artifacts are reference-only behavior inventory.
They are not active implementation constraints for the new design.
