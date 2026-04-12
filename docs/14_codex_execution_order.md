# Codex Execution Order

## First run
1. Read `AGENTS.md`
2. Read `README.md`
3. Read `docs/00_project_frame.md`
4. Read `docs/01_current_make_behavior_inventory.md`
5. Read `docs/03_target_domain_model.md`
6. Read `docs/04_target_sender_architecture.md`
7. Read `docs/05_state_resolution_rules.md`
8. Read `docs/06_write_plan_schema.md`
9. Read `docs/07_preview_and_interaction_rules.md`
10. Read `docs/08_execution_and_retry_replay.md`
11. Read `docs/12_airtable_canon_reference.md`

## First implementation targets
- strengthen `src/types/`
- strengthen `src/resolution/`
- strengthen `src/write-plan/`
- keep provider-specific details abstract until needed

## Do not do first
- do not hardcode full Airtable adapter payload shapes first
- do not collapse engines into one file
- do not bypass preview-first
