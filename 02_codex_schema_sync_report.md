**1. Root cause / what was missing**  
The repo was still carrying pre-update Airtable assumptions in three places: the schema registry, visit-type option validation, and case-update field mapping. `Visit type` only accepted the old three values, the new `Cases` milestone / latest follow-up fields were unknown to the provider mapper, and the runtime had no schema registry entry for the new `Post-delivery Follow-ups` table. The readable preview/display layer also did not surface those new case fields when present.

**2. Exact patched files**  
[types.ts](/Users/mbp-joohyung/Documents/GitHub/validated-safe-runtime-snapshot/src/providers/airtable/types.ts)  
[mappingRegistry.ts](/Users/mbp-joohyung/Documents/GitHub/validated-safe-runtime-snapshot/src/providers/airtable/mappingRegistry.ts)  
[index.ts](/Users/mbp-joohyung/Documents/GitHub/validated-safe-runtime-snapshot/src/providers/airtable/index.ts)  
[mapCaseAction.ts](/Users/mbp-joohyung/Documents/GitHub/validated-safe-runtime-snapshot/src/providers/airtable/buildPayload/mapCaseAction.ts)  
[errors.ts](/Users/mbp-joohyung/Documents/GitHub/validated-safe-runtime-snapshot/src/providers/airtable/errors.ts)  
[buildReadablePreview.ts](/Users/mbp-joohyung/Documents/GitHub/validated-safe-runtime-snapshot/src/api/steps/buildReadablePreview.ts)  
[buildDisplay.ts](/Users/mbp-joohyung/Documents/GitHub/validated-safe-runtime-snapshot/src/api/steps/buildDisplay.ts)  
[airtableExecution.test.ts](/Users/mbp-joohyung/Documents/GitHub/validated-safe-runtime-snapshot/test/providers/airtableExecution.test.ts)  
[buildReadablePreview.test.ts](/Users/mbp-joohyung/Documents/GitHub/validated-safe-runtime-snapshot/test/api/buildReadablePreview.test.ts)

**3. Minimal diff summary**  
- Added exact schema mappings for:
  - `Visits.Episode start visit`
  - `Visits.Post-delivery Follow-ups`
  - `Patients.Post-delivery Follow-ups`
  - `Cases.Final prosthesis plan date`
  - `Cases.Final prep & scan date`
  - `Cases.Final prosthesis delivery date`
  - `Cases.Latest post-delivery follow-up date`
  - `Cases.Latest post-delivery follow-up result`
  - `Cases.Post-delivery Follow-ups`
  - full `Post-delivery Follow-ups` table field registry
- Extended `visitTypeOptions` to accept exact Airtable values `continue case` and `follow up`.
- Extended `update_case_latest_synthesis` mapping so it can write the new case milestone dates and validate `Latest post-delivery follow-up result` against the exact options:
  - `no issue`
  - `issue detected`
  - `not checked`
- Updated readable preview/display to surface those new case fields when present.
- Added targeted tests for new visit-type acceptance, exact follow-up-result validation, new case milestone mapping, and readable preview surfacing.
- Kept the earlier continue-case propagation fix intact; no new edits were needed in that path for this schema task.

**4. Validation performed**  
- Ran `npm run build`
- Ran `npm test`
  - Result: `38` tests passed, `0` failed
- Added/validated tests for:
  - `continue case` accepted as exact `Visit type`
  - `follow up` accepted as exact `Visit type`
  - invalid post-delivery follow-up result rejected
  - new case milestone fields mapped to exact Airtable field names
  - readable preview surfaces new case milestone/latest follow-up fields
- MCP regression check with the exact continue-case payload:
  - Preview result:
    - `apiState = "preview_ready"`
    - `terminalStatus = "preview_pending_confirmation"`
    - `readiness = "execution_ready"`
    - `resolution.caseResolution.resolvedCaseId = "VISIT-916872-20221013"`
  - Plan targets confirmed:
    - tooth-14 `create_snapshot` actions use `caseId = "VISIT-916872-20221013"`
    - `link_visit_to_case.target.caseId = "VISIT-916872-20221013"`
    - all tooth-14 `link_snapshot_to_case` actions use `caseId = "VISIT-916872-20221013"`
    - no tooth-14 case-related target fell back to `NEW`
  - Execute result:
    - `success = true`
    - `apiState = "execution_complete"`
    - `terminalStatus = "executed"`
    - `didWrite = true`
    - `message = "✓ Execution complete: 12 action(s) succeeded"`

**5. Remaining blocker, if contract extension is still required**  
Two gaps remain, and both are separate from the original continue-case bug:

- `Post-delivery Follow-ups` row writes are not yet end-to-end activatable because the current provider-neutral contract/write-plan model has no existing action family for that new table. The minimal required extension is:
  - a provider-neutral action/entity for `Post-delivery Follow-ups`
  - target/payload support for `caseId`, `visitId`, `patientId`, `toothNumber`, `followUpDate`, `followUpResult`, `issueSummary`, `followUpNotes`
- `Visits.Episode start visit` is now schema-registered, but the current planner does not yet propagate a safe write target for it. The contract already has target-visit hints, but there is no existing visit intended-change/link path to write that field surgically without introducing new behavior.

Separate existing issue, still present and reported distinctly:
- the dependency/order problem around `update_case_latest_synthesis -> link_visit_to_case` still shows up during execute:
  - `update_case_latest_synthesis` skipped with `dependency not yet completed`
  - downstream `link_visit_to_case` skipped because its upstream case-update action was skipped  
This is not the original `resolvedCaseId` propagation bug.

**6. Whether the repo is now aligned with the current Airtable schema**  
Partially, and correctly so. The repo is now aligned for the existing active runtime paths: exact visit-type validation, schema registries, case milestone field mapping, latest follow-up result validation, preview/display surfacing, and the continue-case regression path. It is not yet fully end-to-end aligned for actually creating `Post-delivery Follow-ups` rows or writing `Episode start visit`, because the current contract/write-plan model does not expose those writes through an existing safe path.