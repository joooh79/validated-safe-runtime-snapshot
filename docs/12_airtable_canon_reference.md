# Airtable Canon Reference (Assistant-Authored Extraction)

## Important status

This file is a **reference aid** extracted from the embedded Airtable canon location in the Automation Master System.

It is useful for rebuild work, but:
- it is not a replacement for live Airtable truth
- exact field names and option values should still be confirmed against live Airtable when implementation depends on them

## Embedded canon location

The embedded Airtable canon lives inside the Automation Master System.

## Source-of-truth boundary

- Live Airtable base is the only source of truth for actual Airtable structure and option values.
- Use exact field names and exact option values from the live base.
- Dates use YYYY-MM-DD.
- Patient ID uses Dentweb patient ID.
- Tooth numbering uses FDI numbering.
- Optional unstable fields may be omitted when blank.
- Multi-select fields should only include real values.

## Patients

Fields:
1. Patients ID
2. Birth year
3. Gender
4. First visit date
5. Medical alert

Gender options:
- Male
- Female

## Visits

Fields:
1. Visit ID
2. Patient ID
3. Date
4. Visit type
5. Chief Complaint
6. Pain level

Visit type options:
- first visit
- recall
- emergency

Visit-level rule:
- one visit record per patient per visit date
- visit is visit-level, not tooth-level
- pain level remains visit-level

## Findings identity rule

Record name:
- {Visit ID}-{Tooth number}-{BRANCH CODE}

Branch codes:
- PRE
- RAD
- OP
- DX
- PLAN
- DR

Uniqueness rule:
- same visit + same tooth + same findings branch must not create duplicate records

## Pre-op Clinical Findings

Fields:
1. Record name
2. Visit ID
3. Tooth number
4. Symptom
5. Symptom reproducible
6. Visible crack
7. Crack detection method
8. Pulp - cold test
9. Pulp - EPT
10. Functional Cusp - involvement
11. existing restorations
12. Existing restoration size
13. Occlusal wear
14. Structure estimation - suspected cusp thin?
15. Margin estimation - suspected subgingival margin
16. Rubber Dam Feasibility

Known options visible from extracted canon include:
- Symptom: cold sensitivity / bite pain / pain on release / chewing pain / spontaneous pain / none
- Symptom reproducible: yes / no / not tested
- Visible crack: none / suspected / visible
- Crack detection method: visual / transillumination / bite test / photo magnification / N/A

## Treatment Plan

Fields:
1. Record name
2. Visit ID
3. Tooth number
4. Pulp therapy
5. Restoration design
6. Restoration material
7. Implant placement
8. Scan file link

Visible options:
- Pulp therapy: none / VPT / RCT
- Restoration design: direct composite / inlay / onlay / overlay / crown / implant crown / extraction
- Restoration material: composite / ultimate / e.max / zirconia / gold / none
- Implant placement: not planned / planned / placed

## Doctor Reasoning

Fields:
1. Record name
2. Visit ID
3. Tooth number
4. Decision factor
5. Remaining cusp thickness decision
6. Functional cusp involvement
7. Crack progression risk
8. Occlusal risk
9. Reasoning notes

Visible options:
- Decision factor: remaining cusp thickness / functional cusp involvement / crack depth / caries depth / pulp status / occlusion / subgingival margin / N/A
- Remaining cusp thickness decision: >1.5 mm cusp preserved / <1.5 mm cusp coverage
- Functional cusp involvement: yes / no
- Crack progression risk: low / moderate / high
- Occlusal risk: normal / heavy occlusion / bruxism suspected

## Guardrail for Codex

Do not treat this extraction as permission to invent missing fields or options.
If implementation needs a field or option that is not explicitly verified here, mark it canon-confirm-required.
