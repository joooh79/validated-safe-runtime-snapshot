# Optional TypeScript Scaffold

## Purpose

This workspace includes a minimal TypeScript scaffold so Codex can move from spec to code without inventing schema details too early.

## Boundary

Legacy source is not included as active implementation source here.
Any legacy runtime understanding is reference-only.

## Recommended src structure

- src/types/
- src/contract/
- src/resolution/
- src/write-plan/
- src/execution/
- src/replay/
- src/logging/
- src/api/

## Scaffold rule

Keep early code:
- strongly typed
- provider-neutral
- schema-guarded
- small

Do not:
- hardcode fake Airtable schema details
- hardcode final canonical key names
- collapse engines into one giant file
