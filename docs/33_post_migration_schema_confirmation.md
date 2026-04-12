# Post-Migration Schema Confirmation

This document confirms what is now explicitly visible in the migrated `airtable_schema.json`.

It does not claim runtime activation.
It does not claim semantic readiness.
It only records what the migrated Airtable schema now proves structurally.

## 1. Current Separation Of Truth

Current runtime baseline:
- validated safe slice remains active
- preview-first remains mandatory
- truthful blocking remains active
- case writes, explicit link writes, and non-PRE snapshot writes are still blocked unless and until later stages activate them deliberately

Post-migration schema truth:
- the Airtable base now exposes the target-canon structural shape for Cases and Case-linked branches
- schema presence is not the same thing as sender activation readiness

## 2. Schema-Confirmed Core Objects

Confirmed from `airtable_schema.json`:
- `Cases` table exists
  - table id: `tblihv4cLnDdkfqqE`
  - primary field: `Case ID` (`fldrUm9lMeFP4yd7k`)
- `Patients.Cases` exists
  - field id: `fld4DIYq1PTDrLXjO`
  - type: `multipleRecordLinks`
  - linked table: `Cases`
- `Visits.Cases` exists
  - field id: `fldvdsJzQ99OJMDkR`
  - type: `multipleRecordLinks`
  - linked table: `Cases`

## 3. Case Table Fields Now Explicit

Confirmed fields on `Cases`:
- `Case ID` (`fldrUm9lMeFP4yd7k`) `singleLineText`
- `Case notes` (`fldTdckyl9poaZS7p`) `multilineText`
- `Patient ID` (`fldXZqCup7LKZg1UZ`) `multipleRecordLinks` to `Patients`
- `Tooth number` (`fldrSieYK9UK1qyI4`) `singleLineText`
- `Episode start date` (`fld7Vy9ggIqZmKiQT`) `date`
- `Episode status` (`fldavNC1fERMdS33u`) `singleSelect`
- `Visits` (`fldkMiHp32CkSgTGr`) `multipleRecordLinks` to `Visits`
- `Parent Case ID` (`fldEpWPXUglS8EE6R`) `singleLineText`
- `Latest Visit ID` (`flde3L8nIa9iy5cXw`) `singleLineText`
- `Follow-up pending` (`flderQUmRKPAU3qcT`) `singleSelect`
- `Latest summary` (`fldMmJvRnSCnuSN4l`) `multilineText`
- `Latest working diagnosis` (`fldoF9x50Tr9qrVUX`) `multilineText`
- `Latest working plan` (`fldp32SkgizcKcfCy`) `multilineText`

## 4. Snapshot Case Links Now Explicit

Confirmed `Case ID` fields on every snapshot table:
- `Pre-op Clinical Findings.Case ID` (`fldTM5Gj6FazHJPDS`) links to `Cases`
- `Radiographic Findings.Case ID` (`fldIGyTSwx4A7SBAW`) links to `Cases`
- `Operative Findings.Case ID` (`fldB3RXkYLCpZWkGw`) links to `Cases`
- `Diagnosis.Case ID` (`fldcokoGMvxS3D4BZ`) links to `Cases`
- `Treatment Plan.Case ID` (`fld9Oi0GKYkVqnCi9`) links to `Cases`
- `Doctor Reasoning.Case ID` (`fldU0ubNT3Tgvlk3K`) links to `Cases`

## 5. Case-Side Reverse Links Now Explicit

Confirmed branch-link fields on `Cases`:
- `Pre-op Clinical Findings` (`fld7aWtNB3Dp7dmKL`) links to `Pre-op Clinical Findings`
- `Radiographic Findings` (`fldtJaYYQ6lC9z337`) links to `Radiographic Findings`
- `Operative Findings` (`fldDFQaLtl8VC02cA`) links to `Operative Findings`
- `Diagnosis` (`fldTfkNvhIyhc82jy`) links to `Diagnosis`
- `Treatment Plan` (`fldJMsvz2SgAtXIHG`) links to `Treatment Plan`
- `Doctor Reasoning` (`fldqjZSvmBCj1yfGt`) links to `Doctor Reasoning`

## 6. Option Sets Now Explicit

Confirmed exact option set for `Cases.Episode status`:
- `open`
- `monitoring`
- `closed`
- `split`

Confirmed exact option set for `Cases.Follow-up pending`:
- `yes`
- `no`

## 7. Important Structural Facts That Changed Earlier Assumptions

The schema now confirms:
- `Pre-op Clinical Findings` is the real table label for PRE
- `Visit ID` on snapshot tables is a linked-record field, not plain text
- `Case ID` on snapshot tables is a linked-record field, not plain text

The schema also shows a mismatch against earlier migration assumptions:
- `Cases.Parent Case ID` is currently `singleLineText`, not a linked-record field
- `Cases.Latest Visit ID` is currently `singleLineText`, not a linked-record field

That means:
- those fields are schema-confirmed as text storage fields
- they should not be treated as linked-record fields by sender activation work unless the Airtable schema changes again
- any roadmap text that assumed they were link fields should be treated as superseded by the migrated schema evidence

## 8. Not Confirmed From Schema Alone

The migrated schema does not prove:
- exact record-name operational behavior
- whether record names are sender-written, formula-driven, or manually maintained in practice
- Case identity continuation vs split resolution behavior
- create vs update vs upsert runtime decisions
- linked-record payload shape expected by the active sender path
- authoritative write side for bidirectional links
- replay/idempotence guarantees
- activation ordering safety across Case, snapshot, and explicit link writes

## 9. Stage 4 Implication

Stage 4 may safely do all of the following:
- use exact migrated table labels
- use exact migrated field ids
- add exact mapping sections for Cases and Case links
- distinguish schema-confirmed fields from activation-ready behavior

Stage 4 must still keep these blocked:
- Case writes
- explicit link writes
- non-PRE snapshot writes
- any behavior that assumes `Parent Case ID` or `Latest Visit ID` are link fields
