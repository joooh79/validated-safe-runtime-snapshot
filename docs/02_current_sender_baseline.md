# Current Sender Baseline

## Purpose

This document captures the current sender baseline as reference-only input for the rebuild.

## Important boundary

Legacy runtime source is **not included as an active implementation target** in this clean package.

The current sender baseline is treated as:
- behavioral reference
- migration reference
- preview/interaction baseline

## Current sender role summary

Current sender baseline is understood to cover:
- canonical payload validation
- canonical-to-sender transformation
- preview summary generation
- preview-confirmation interaction contract generation
- Make webhook send
- normalized result interpretation

## Current sender interaction meanings to preserve

- preview-first normal path
- confirm / revise / cancel interaction
- correction-required handling
- patient recheck handling
- terminal hard-stop meaning
- no-op / send-skip meaning
- response interpretation distinct from runtime identity

## Rebuild implication

The new sender should preserve the visible operational meaning of the current sender,
without preserving the old sender's internal shape or Make dependency.
