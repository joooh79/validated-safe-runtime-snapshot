You are working in the `smr_sender_rebuild_clean_package` workspace.

Your job is to strengthen and implement this repo as a clean, spec-first rebuild package for a new sender-first direct-write architecture.

Read and obey `AGENTS.md` first.

Important context:
- This workspace intentionally does NOT include legacy runtime sender source files as active implementation targets.
- Legacy sender / Make behavior is reference-only behavior inventory.
- Preserve behavior, not old structure.
- Do not redesign around old Make module boundaries.

Non-negotiable rules:
1. Do NOT invent exact Airtable field names.
2. Do NOT invent exact Airtable option values.
3. Do NOT invent final canonical JSON key names.
4. If a schema detail is not canon-confirmed, leave it abstract or mark it `canon-confirm-required`.
5. Keep the spec/type layer provider-neutral.
6. Preserve:
   - same-date correction
   - patient duplication correction / patient recheck handling
   - preview-first discipline
   - current-state-based decision discipline
   - historical visit snapshot truth
   - continuity/case-aware support
   - deterministic write behavior
   - no-op distinction
   - hard-stop / correction-required / recheck-required distinction
7. Snapshot truth must remain visit-based.
8. Case must represent continuity/latest synthesis and must not overwrite historical visit snapshots.

Architecture target:
- Patient / Visit / Case / Snapshot model
- Contract / Intent Engine
- State Resolution Engine
- Write Plan Engine
- Direct Write Engine
- Retry / Replay Engine
- Logging / Inspection Layer
- API orchestration layer

Do this in order:

PHASE 1 — Read
Read:
- README.md
- AGENTS.md
- docs/00_project_frame.md
- docs/01_current_make_behavior_inventory.md
- docs/03_target_domain_model.md
- docs/04_target_sender_architecture.md
- docs/05_state_resolution_rules.md
- docs/06_write_plan_schema.md
- docs/07_preview_and_interaction_rules.md
- docs/08_execution_and_retry_replay.md
- docs/12_airtable_canon_reference.md
- notes/canon_locked_items.md
- notes/canon_unverified_items.md
- notes/open_questions.md

PHASE 2 — Strengthen docs if needed
Improve implementation precision in:
- docs/01_current_make_behavior_inventory.md
- docs/05_state_resolution_rules.md
- docs/06_write_plan_schema.md
- docs/07_preview_and_interaction_rules.md
- docs/08_execution_and_retry_replay.md

PHASE 3 — Strengthen TypeScript scaffold
Refine provider-neutral types and minimal engine skeletons under `src/`.

PHASE 4 — Validate
Run:
- npm install
- npm run typecheck

If validation fails, fix what is appropriate without inventing schema details.
If validation cannot run, explain exactly why.

At the end, summarize:
- files changed
- what was strengthened
- what remains intentionally unverified
- validation result
