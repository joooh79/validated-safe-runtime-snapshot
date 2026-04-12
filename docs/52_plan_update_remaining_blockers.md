# 52. PLAN Update Remaining Blockers

Status: post-Stage 8B blocker inventory  
Date: 2026-04-13

## 1. Purpose

This document records what Stage 8B did not activate for `PLAN` update.

The goal is to keep the remaining boundary truthful so later stages can expand safely.

## 2. Activated In Stage 8B

Activated now:

- same-date `PLAN` update with explicit existing row target
- single-tooth only
- exact current PLAN update field subset

Not activated:

- broader same-date `PLAN` update semantics
- automatic create-on-missing for same-date `PLAN` correction
- multi-tooth PLAN update

## 3. Remaining PLAN Blockers

### 3.1 Missing-row-on-correction behavior

The target canon allows:

- update if the same-date `PLAN` row is found
- create if the same-date `PLAN` row is not found

Stage 8B activates only the update-when-found half.

Still blocked:

- same-date `PLAN` correction with no explicit existing row target

### 3.2 Broader PLAN update-field contract

Stage 8B activates only the current narrow writable subset.

Still blocked:

- any broader PLAN field update set not yet explicitly locked and validated

### 3.3 Multi-tooth PLAN update

Still blocked:

- any PLAN update requiring multiple target rows or broader tooth-dispatch semantics

### 3.4 Case-coupled transitions

Still blocked:

- split-case-coupled PLAN behavior
- close-case-coupled PLAN behavior
- ambiguous reassignment behavior

## 4. Evidence Required Before Broader PLAN Expansion

Before any broader PLAN update expansion, the next branch must define:

- exact same-date create-on-missing rule in runtime terms
- exact validation coverage for that missing-row path
- whether additional PLAN fields become correction-writable
- whether any Case-side synthesis effects need to change

## 5. Relationship To Other Branches

Stage 8B does not change the blocked status of:

- `DR` update
- `DX` update
- `RAD` update
- `OP` update

Those branches still require their own row-targeting and branch-specific update contracts.
