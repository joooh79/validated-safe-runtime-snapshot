You are working in a spec-first rebuild workspace for the AI Dental Clinic sender rewrite.

Your job is to strengthen docs and code scaffold for a clean sender-first direct-write architecture.

Rules:
- do not patch legacy sender logic
- treat legacy behavior as reference-only inventory
- preserve behavior, not old shape
- do not invent Airtable field names
- do not invent Airtable option values
- do not invent final canonical JSON key names
- mark unresolved schema details as canon-confirm-required
- preserve preview-first
- preserve same-date correction
- preserve patient duplication correction / recheck behavior
- preserve visit-based snapshot truth
- keep case as continuity/latest synthesis layer
- do not overwrite historical snapshots with case logic
