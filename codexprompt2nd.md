
You are continuing the AI Dental Clinic repo patch work.

Use these 3 files as the locked context for this task:

1. 01_airtable_schema.json
2. 02_codex_schema_sync_report.md
3. 03_real_mode_write_result.json

Do not redo the already-finished schema sync work.
Do not spend time re-patching visit-type validation or basic schema registry updates unless directly required by the remaining tasks.
Assume the 1st schema-sync patch is already applied.

Goal
Finish the remaining 2nd-stage work only:

A. Add real end-to-end write support for the newly added Airtable schema pieces that are still not writable through the current contract/write-plan/runtime:

- Post-delivery Follow-ups table row creation
- Visits.Episode start visit write support

B. Fix the execute dependency/order bug still visible in the real execution result:

- update_case_latest_synthesis was skipped
- link_visit_to_case was then skipped because its upstream dependency was skipped

Critical background
From the prior report:

- schema sync is already done
- visit types continue case and follow up are already accepted
- Cases milestone fields are already mapped
- preview/display surfacing is already done
- continue_case caseId propagation bug is already fixed

From the real execution result:

- real Airtable write already works for visit + PRE/OP/DX/PLAN/DR snapshots
- but:
  - update_case_latest_synthesis is skipped with dependency not yet completed
  - link_visit_to_case is skipped because its upstream dependency was skipped

Your task is NOT to re-solve already-solved issues.
Your task is to finish the still-missing runtime behavior.

Part 1 — Post-delivery Follow-ups real write path
The Airtable schema already contains table:

- Post-delivery Follow-ups

Exact fields:

- Follow-up ID
- Case ID
- Visit ID
- Patient ID
- Tooth number
- Follow-up date
- Follow-up result
- Issue summary
- Follow-up notes

Exact Follow-up result options:

- no issue
- issue detected
- not checked

Implement the minimal provider-neutral + write-plan + Airtable-provider path needed so the runtime can actually create a Post-delivery Follow-ups row when the contract supplies the data.

Important constraints

- Do not invent random contract keys.
- First inspect the existing contract and planner model.
- Reuse the repo’s existing naming patterns and action model.
- If the current model has a natural “create row / create child record / auxiliary event row” pattern, extend that.
- Keep the implementation minimal and aligned with existing abstractions.

Required outcome

- A safe dryrun/preview path must show a Post-delivery Follow-ups create action when such data is present.
- Execute must be able to write that row in real mode.

Part 2 — Visits.Episode start visit write path
The Airtable schema already contains:

- Visits.Episode start visit
- type: link to Visits

Implement safe write support for this field only when the runtime already has enough information to set it safely.

Rules

- Treat Episode start visit as a helper link.
- It does NOT replace visit-to-case linkage.
- Only write it when the source visit identity is resolved with sufficient certainty.
- Do not guess parent visit IDs.

Required outcome

- If the contract / resolution path already safely knows the episode-start visit, preview should surface that intended write.
- Execute should write it without creating unsafe behavior.

Part 3 — Fix the dependency/order bug
Use 03_real_mode_write_result.json as the concrete evidence of the remaining bug.

Observed remaining issue:

- update_case_latest_synthesis skipped due to dependency not yet completed
- link_visit_to_case then skipped because its upstream case-update dependency was skipped

You must inspect the action dependency graph and execution ordering.
Patch the minimal logic so that:

- update_case_latest_synthesis does not get scheduled before required dependencies are actually satisfiable
- link_visit_to_case no longer depends on a case-update action that was only skipped because of bad ordering, unless that dependency is truly semantically required
- real execute no longer leaves those 2 actions skipped for this continue_case flow

Important
Do not “fix” this by silently removing necessary safety constraints.
Do not break the already-working continue_case propagation path.
Do not break existing new visit / existing visit update / correction flows.

Validation requirements

1. Run build/tests.
2. Re-run the known continue_case real-mode payload path after patching.
3. Confirm all of the following:
   - preview still reaches executable state
   - resolved case still propagates correctly
   - Post-delivery Follow-ups create action appears in preview when corresponding input is present
   - Episode start visit intended write appears only when safely resolvable
   - update_case_latest_synthesis is no longer skipped due to bad ordering
   - link_visit_to_case is no longer skipped for that same reason
4. If possible, run a real execute for the known continue_case payload and show that the previously skipped actions now execute or are intentionally omitted for a valid semantic reason.

If a fully real execute for Post-delivery Follow-ups is not safe from the available test payload, then:

- validate it with the safest possible dryrun/preview test
- and clearly state the exact minimal additional payload needed for real execution

What to return
Return one concise engineering report with these sections:

1. Remaining root cause
2. Exact patched files
3. Minimal diff summary
4. Validation performed
5. Exact before/after for the dependency/order bug
6. Exact status of Post-delivery Follow-ups write support
7. Exact status of Episode start visit write support
8. Whether the 2nd-stage work is fully complete
9. Any final blocker still remaining

Important final instruction
Do not stop at code changes.
You must validate behavior through the runtime paths, not just static mapping changes.
