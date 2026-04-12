# AGENTS.md

## Mission

This repository is a **spec-first rebuild workspace** for a new sender-first direct-write architecture.

Your job is to strengthen and implement the new sender from this workspace.

## Non-negotiable rules

1. Do **not** patch legacy sender code in place.
2. Treat legacy sender / Make behavior as **reference-only behavior inventory**.
3. Preserve behavior, not old shape.
4. Do **not** invent exact Airtable field names.
5. Do **not** invent exact Airtable option values.
6. Do **not** invent final canonical JSON key names.
7. If a schema detail is not canon-confirmed, leave it abstract or mark it `canon-confirm-required`.
8. Keep the spec/type layer provider-neutral.
9. Preserve preview-first discipline.
10. Preserve same-date correction behavior.
11. Preserve patient duplication correction / patient recheck behavior.
12. Preserve historical visit snapshot truth.
13. Keep snapshot truth visit-based.
14. Keep case as continuity/latest synthesis; do not overwrite historical visit snapshots with case logic.
15. Same-date correction may update same-date visit/snapshot state.
16. Later-date continuation should create a new visit and new snapshot rows, linking continuity through case.

## Architectural target

Use this 4-entity model:
- Patient
- Visit
- Case
- Snapshot

Use this engine split:
- Contract / Intent Engine
- State Resolution Engine
- Write Plan Engine
- Direct Write Engine
- Retry / Replay Engine
- Logging / Inspection Layer
- API orchestration layer

## Preferred workflow

1. Strengthen docs first
2. Strengthen types/interfaces second
3. Add minimal implementation skeletons third
4. Add provider adapter abstractions after planning/state rules are stable
5. Validate with typecheck

## Forbidden shortcuts

- Blind provider payload invention
- Hardcoding fake Airtable schema details
- Collapsing create/update/no-op into vague save operations
- Mixing snapshot truth and case latest synthesis
- Sending before preview in normal flow
