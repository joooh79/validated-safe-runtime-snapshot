# 53. Remaining Branch Update Activation Batch

Status: implemented batch activation  
Date: 2026-04-13

## 1. Purpose

This document records the one-pass completion of the remaining safely activatable branch update work for:

- `DR`
- `DX`
- `RAD`
- `OP`

The activation posture stays conservative:

- same-date correction only
- single-tooth only
- explicit existing row target required
- no create-on-missing activation
- no split/close coupling
- no ambiguous reassignment activation

## 2. Activated Update Contract

For each of `DR / DX / RAD / OP`, update is now active only when all of the following are true:

- visit is resolved as same-date correction
- branch is explicit
- tooth scope is single-tooth
- an explicit existing Airtable row target is already resolved and carried as `target.entityRef`
- provider mapping uses exact fields from the migrated schema

This matches the current active `PLAN` update contract.

## 3. Branches Activated In This Batch

### 3.1 Doctor Reasoning

Activated:

- same-date `DR` update with explicit existing row target

Writable update subset:

- `Decision factor`
- `Remaining cusp thickness decision`
- `Functional cusp involvement`
- `Crack progression risk`
- `Occlusal risk`
- `Reasoning notes`

### 3.2 Diagnosis

Activated:

- same-date `DX` update with explicit existing row target

Writable update subset:

- `Structural diagnosis`
- `Pulp diagnosis`
- `Crack severity`
- `Occlusion risk`
- `Restorability`

### 3.3 Radiographic Findings

Activated:

- same-date `RAD` update with explicit existing row target

Writable update subset:

- `Radiograph type`
- `Radiographic caries depth`
- `Secondary caries`
- `Caries location`
- `Pulp chamber size`
- `Periapical lesion`
- `Radiographic fracture sign`
- `Radiograph link`

### 3.4 Operative Findings

Activated:

- same-date `OP` update with explicit existing row target

Writable update subset:

- `Rubber dam isolation`
- `Caries depth (actual)`
- `Soft dentin remaining`
- `Crack confirmed`
- `Crack location`
- `Remaining cusp thickness (mm)`
- `Subgingival margin`
- `Deep marginal elevation`
- `IDS/resin coating`
- `Resin core build up type`
- `Occlusal loading test`
- `Loading test result`
- `Intraoral photo link`

## 4. What This Batch Did Not Activate

This batch does not activate:

- same-date create-on-missing for `PLAN / DR / DX / RAD / OP`
- multi-tooth update behavior
- split-case or close-case coupled snapshot behavior
- ambiguous reassignment behavior
- inverse Case-side explicit branch-link writes

## 5. Result

After this batch:

- `PLAN / DR / DX / RAD / OP` each support narrow safe create
- `PLAN / DR / DX / RAD / OP` each support narrow safe same-date update with explicit row target
- unresolved behavior remains fail-closed
