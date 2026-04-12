# Option Mapping Reference (Assistant-Authored Extraction)

## Status

This is a helper reference extracted from the embedded option mapping area.
It is not permission to invent missing mappings.

## General hard stops

- If no exact option exists, use "".
- If certainty does not match an available option, use "".
- If a phrase is meaningful but not canon-aligned, keep nuance elsewhere rather than forcing an approximate option.
- Do not output approximate variants in option fields.

## Patient / Visit intent mapping examples

- "초진", "처음 방문", "new patient" -> new patient
- "새 방문", "new visit" -> visit status only
- "기존 방문 업데이트", "지난 방문 이어서" -> existing visit update

## Pre-op examples

Symptom:
- chewing discomfort -> chewing pain
- bite pain -> bite pain
- release pain -> pain on release
- cold sensitive -> cold sensitivity
- spontaneous pain -> spontaneous pain
- no symptoms -> none

Symptom reproducible:
- reproducible -> yes
- not reproducible -> no
- not tested -> not tested

Visible crack:
- clearly visible -> visible
- suspected -> suspected
- none -> none

Crack detection method:
- visual -> visual
- transillumination -> transillumination
- bite test / tooth slooth -> bite test
- photo magnification -> photo magnification
- not applicable -> N/A

Cold test:
- normal response -> normal
- sensitive -> sensitive
- lingering -> lingering
- none -> none
- not tested -> not tested
- ambiguous -> ""

## Guardrail

Use these only when they are explicitly applicable and canon-confirmed enough.
Do not extrapolate beyond the visible mapping reference.
