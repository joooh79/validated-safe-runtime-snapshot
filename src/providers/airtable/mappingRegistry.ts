/**
 * Airtable Mapping Registry
 *
 * Central repository of schema-confirmed field and option mappings.
 *
 * Stage 4 posture:
 * - field and option identities come from the migrated `airtable_schema.json`
 * - the registry can now describe the target Airtable shape exactly
 * - executable runtime support remains narrower than the schema where
 *   record-name, identity, upsert, or sequencing semantics are unresolved
 *
 * STRICT FAIL-CLOSED DESIGN:
 * - only includes schema-confirmed mappings
 * - schema confirmation is not the same thing as activation readiness
 * - adapter code must continue to block unsupported semantics explicitly
 */

import type { AirtableFieldRef } from './types.js';

// Patient fields used by the active safe slice.
export const patientFields = {
  patientId: {
    table: 'Patients' as const,
    fieldId: 'fld9w40dX5KvtdqEk',
    fieldName: 'Patients ID',
    readonly: true,
  },
  birthYear: {
    table: 'Patients' as const,
    fieldId: 'fldVk1oqI8gex9haI',
    fieldName: 'Birth year',
    readonly: false,
  },
  gender: {
    table: 'Patients' as const,
    fieldId: 'fldf2KIXJXu679gH1',
    fieldName: 'Gender',
    readonly: false,
  },
  firstVisitDate: {
    table: 'Patients' as const,
    fieldId: 'fldzS5DNzx4g5JMki',
    fieldName: 'First visit date',
    readonly: false,
  },
  medicalAlert: {
    table: 'Patients' as const,
    fieldId: 'fldwHqB8xWJBjEqLI',
    fieldName: 'Medical alert',
    readonly: false,
  },
} as const satisfies Record<string, AirtableFieldRef>;

// Structural patient links now confirmed in the migrated schema.
// These are intentionally descriptive; explicit link-write activation remains
// a later step.
export const patientLinkFields = {
  visits: {
    table: 'Patients' as const,
    fieldId: 'fldBhTwpA9jcT603a',
    fieldName: 'Visits',
    readonly: false,
  },
  cases: {
    table: 'Patients' as const,
    fieldId: 'fld4DIYq1PTDrLXjO',
    fieldName: 'Cases',
    readonly: false,
  },
  postDeliveryFollowUps: {
    table: 'Patients' as const,
    fieldId: 'fldjYB3pkqK34BGEw',
    fieldName: 'Post-delivery Follow-ups',
    readonly: false,
  },
} as const satisfies Record<string, AirtableFieldRef>;

// Visit fields used by the active safe slice.
export const visitFields = {
  visitId: {
    table: 'Visits' as const,
    fieldId: 'fldVtZWsnI6u1kpfo',
    fieldName: 'Visit ID',
    readonly: true,
  },
  patientId: {
    table: 'Visits' as const,
    fieldId: 'fldsutzcZw7QPS46q',
    fieldName: 'Patient ID',
    readonly: false,
  },
  date: {
    table: 'Visits' as const,
    fieldId: 'fld2Qsxq5fPpGm1pS',
    fieldName: 'Date',
    readonly: false,
  },
  episodeStartVisit: {
    table: 'Visits' as const,
    fieldId: 'fldJJKTUzmXiqLEJC',
    fieldName: 'Episode start visit',
    readonly: false,
  },
  visitType: {
    table: 'Visits' as const,
    fieldId: 'fldCFmuquXr2Rg5D5',
    fieldName: 'Visit type',
    readonly: false,
  },
  chiefComplaint: {
    table: 'Visits' as const,
    fieldId: 'fldy7rU8YTkezUVaL',
    fieldName: 'Chief Complaint',
    readonly: false,
  },
  painLevel: {
    table: 'Visits' as const,
    fieldId: 'fldcg03FEgTblaqvm',
    fieldName: 'Pain level',
    readonly: false,
  },
} as const satisfies Record<string, AirtableFieldRef>;

// Structural visit links now confirmed in the migrated schema.
export const visitLinkFields = {
  preOpClinicalFindings: {
    table: 'Visits' as const,
    fieldId: 'fldlNoX4XRXvBjnSd',
    fieldName: 'Pre-op Clinical Findings',
    readonly: false,
  },
  radiographicFindings: {
    table: 'Visits' as const,
    fieldId: 'fldTxNoGgZUJYNQob',
    fieldName: 'Radiographic Findings',
    readonly: false,
  },
  operativeFindings: {
    table: 'Visits' as const,
    fieldId: 'fldrKk5Yq3e7RzrSa',
    fieldName: 'Operative Findings',
    readonly: false,
  },
  diagnosis: {
    table: 'Visits' as const,
    fieldId: 'fldAWpdvywehWnQJS',
    fieldName: 'Diagnosis',
    readonly: false,
  },
  treatmentPlan: {
    table: 'Visits' as const,
    fieldId: 'fldjFNZtI3hi83E1I',
    fieldName: 'Treatment Plan',
    readonly: false,
  },
  doctorReasoning: {
    table: 'Visits' as const,
    fieldId: 'fldwPtqvCbOpMOsH8',
    fieldName: 'Doctor Reasoning',
    readonly: false,
  },
  episodeStartVisitReverse: {
    table: 'Visits' as const,
    fieldId: 'fldCkOk6XgqR7d1QI',
    fieldName: 'From field: Episode start visit',
    readonly: false,
  },
  cases: {
    table: 'Visits' as const,
    fieldId: 'fldvdsJzQ99OJMDkR',
    fieldName: 'Cases',
    readonly: false,
  },
  postDeliveryFollowUps: {
    table: 'Visits' as const,
    fieldId: 'fldE5QS4G6oVX7yrn',
    fieldName: 'Post-delivery Follow-ups',
    readonly: false,
  },
} as const satisfies Record<string, AirtableFieldRef>;

// Case table fields are now schema-confirmed.
// Exact runtime semantics remain deferred for:
// - Case ID generation and record-name operational behavior
// - continuation vs split resolution
// - create vs update/upsert rules
// - write ordering and replay-safe link sequencing
export const caseFields = {
  caseId: {
    table: 'Cases' as const,
    fieldId: 'fldrUm9lMeFP4yd7k',
    fieldName: 'Case ID',
    readonly: true,
  },
  caseNotes: {
    table: 'Cases' as const,
    fieldId: 'fldTdckyl9poaZS7p',
    fieldName: 'Case notes',
    readonly: false,
  },
  patientId: {
    table: 'Cases' as const,
    fieldId: 'fldXZqCup7LKZg1UZ',
    fieldName: 'Patient ID',
    readonly: false,
  },
  toothNumber: {
    table: 'Cases' as const,
    fieldId: 'fldrSieYK9UK1qyI4',
    fieldName: 'Tooth number',
    readonly: false,
  },
  episodeStartDate: {
    table: 'Cases' as const,
    fieldId: 'fld7Vy9ggIqZmKiQT',
    fieldName: 'Episode start date',
    readonly: false,
  },
  episodeStatus: {
    table: 'Cases' as const,
    fieldId: 'fldavNC1fERMdS33u',
    fieldName: 'Episode status',
    readonly: false,
  },
  visits: {
    table: 'Cases' as const,
    fieldId: 'fldkMiHp32CkSgTGr',
    fieldName: 'Visits',
    readonly: false,
  },
  parentCaseId: {
    table: 'Cases' as const,
    fieldId: 'fldEpWPXUglS8EE6R',
    fieldName: 'Parent Case ID',
    readonly: false,
  },
  latestVisitId: {
    table: 'Cases' as const,
    fieldId: 'flde3L8nIa9iy5cXw',
    fieldName: 'Latest Visit ID',
    readonly: false,
  },
  followUpPending: {
    table: 'Cases' as const,
    fieldId: 'flderQUmRKPAU3qcT',
    fieldName: 'Follow-up pending',
    readonly: false,
  },
  latestSummary: {
    table: 'Cases' as const,
    fieldId: 'fldMmJvRnSCnuSN4l',
    fieldName: 'Latest summary',
    readonly: false,
  },
  latestWorkingDiagnosis: {
    table: 'Cases' as const,
    fieldId: 'fldoF9x50Tr9qrVUX',
    fieldName: 'Latest working diagnosis',
    readonly: false,
  },
  latestWorkingPlan: {
    table: 'Cases' as const,
    fieldId: 'fldp32SkgizcKcfCy',
    fieldName: 'Latest working plan',
    readonly: false,
  },
  finalProsthesisPlanDate: {
    table: 'Cases' as const,
    fieldId: 'fldotjgXcLmZFhy63',
    fieldName: 'Final prosthesis plan date',
    readonly: false,
  },
  finalPrepAndScanDate: {
    table: 'Cases' as const,
    fieldId: 'fldpyyRgKdjz7ozbc',
    fieldName: 'Final prep & scan date',
    readonly: false,
  },
  finalProsthesisDeliveryDate: {
    table: 'Cases' as const,
    fieldId: 'fldvJgCn2Rzn1iPYI',
    fieldName: 'Final prosthesis delivery date',
    readonly: false,
  },
  latestPostDeliveryFollowUpDate: {
    table: 'Cases' as const,
    fieldId: 'fld8mm0qA05VphkKi',
    fieldName: 'Latest post-delivery follow-up date',
    readonly: false,
  },
  latestPostDeliveryFollowUpResult: {
    table: 'Cases' as const,
    fieldId: 'fldltOHxCBQEChwH7',
    fieldName: 'Latest post-delivery follow-up result',
    readonly: false,
  },
  postDeliveryFollowUps: {
    table: 'Cases' as const,
    fieldId: 'fldpAzFxMPiRT1ed1',
    fieldName: 'Post-delivery Follow-ups',
    readonly: false,
  },
} as const satisfies Record<string, AirtableFieldRef>;

export const postDeliveryFollowUpFields = {
  followUpId: {
    table: 'Post-delivery Follow-ups' as const,
    fieldId: 'fld6hsy1itW2bsHPz',
    fieldName: 'Follow-up ID',
    readonly: true,
  },
  caseId: {
    table: 'Post-delivery Follow-ups' as const,
    fieldId: 'fldIlaOWNaLWFRkpW',
    fieldName: 'Case ID',
    readonly: false,
  },
  visitId: {
    table: 'Post-delivery Follow-ups' as const,
    fieldId: 'fldCnBg7lOBP0IKQj',
    fieldName: 'Visit ID',
    readonly: false,
  },
  patientId: {
    table: 'Post-delivery Follow-ups' as const,
    fieldId: 'fldbrFZirVZ133Xip',
    fieldName: 'Patient ID',
    readonly: false,
  },
  toothNumber: {
    table: 'Post-delivery Follow-ups' as const,
    fieldId: 'fldwDGx5voXe5KixD',
    fieldName: 'Tooth number',
    readonly: false,
  },
  followUpDate: {
    table: 'Post-delivery Follow-ups' as const,
    fieldId: 'fldjeimNbeuSwhGUa',
    fieldName: 'Follow-up date',
    readonly: false,
  },
  followUpResult: {
    table: 'Post-delivery Follow-ups' as const,
    fieldId: 'fldk41pcbGQGYlwcz',
    fieldName: 'Follow-up result',
    readonly: false,
  },
  issueSummary: {
    table: 'Post-delivery Follow-ups' as const,
    fieldId: 'fldJYCTdNBpEpJ2zL',
    fieldName: 'Issue summary',
    readonly: false,
  },
  followUpNotes: {
    table: 'Post-delivery Follow-ups' as const,
    fieldId: 'fldnaaFp71I4fBLIe',
    fieldName: 'Follow-up notes',
    readonly: false,
  },
} as const satisfies Record<string, AirtableFieldRef>;

export const caseSnapshotLinkFields = {
  preOpClinicalFindings: {
    table: 'Cases' as const,
    fieldId: 'fld7aWtNB3Dp7dmKL',
    fieldName: 'Pre-op Clinical Findings',
    readonly: false,
  },
  radiographicFindings: {
    table: 'Cases' as const,
    fieldId: 'fldtJaYYQ6lC9z337',
    fieldName: 'Radiographic Findings',
    readonly: false,
  },
  operativeFindings: {
    table: 'Cases' as const,
    fieldId: 'fldDFQaLtl8VC02cA',
    fieldName: 'Operative Findings',
    readonly: false,
  },
  diagnosis: {
    table: 'Cases' as const,
    fieldId: 'fldTfkNvhIyhc82jy',
    fieldName: 'Diagnosis',
    readonly: false,
  },
  treatmentPlan: {
    table: 'Cases' as const,
    fieldId: 'fldJMsvz2SgAtXIHG',
    fieldName: 'Treatment Plan',
    readonly: false,
  },
  doctorReasoning: {
    table: 'Cases' as const,
    fieldId: 'fldqjZSvmBCj1yfGt',
    fieldName: 'Doctor Reasoning',
    readonly: false,
  },
} as const satisfies Record<string, AirtableFieldRef>;

// PRE remains active and points at the exact migrated table name.
export const preOpFields = {
  recordName: {
    table: 'Pre-op Clinical Findings' as const,
    fieldId: 'fld8A0HgltIdUDKgx',
    fieldName: 'Record name',
    readonly: false,
  },
  visitId: {
    table: 'Pre-op Clinical Findings' as const,
    fieldId: 'fldveyCkgzHd2XVj6',
    fieldName: 'Visit ID',
    readonly: false,
  },
  toothNumber: {
    table: 'Pre-op Clinical Findings' as const,
    fieldId: 'fldeyFudB6DHNZz8t',
    fieldName: 'Tooth number',
    readonly: false,
  },
  symptom: {
    table: 'Pre-op Clinical Findings' as const,
    fieldId: 'fldbzc984m3ws1UMe',
    fieldName: 'Symptom',
    readonly: false,
  },
  symptomReproducible: {
    table: 'Pre-op Clinical Findings' as const,
    fieldId: 'fldtpqn16pVGbW3Vj',
    fieldName: 'Symptom reproducible',
    readonly: false,
  },
  visibleCrack: {
    table: 'Pre-op Clinical Findings' as const,
    fieldId: 'fldzIuewamSiKAbm0',
    fieldName: 'Visible crack',
    readonly: false,
  },
  crackDetectionMethod: {
    table: 'Pre-op Clinical Findings' as const,
    fieldId: 'fldRauyFKARl3Kb7x',
    fieldName: 'Crack detection method',
    readonly: false,
  },
  caseId: {
    table: 'Pre-op Clinical Findings' as const,
    fieldId: 'fldTM5Gj6FazHJPDS',
    fieldName: 'Case ID',
    readonly: false,
  },
} as const satisfies Record<string, AirtableFieldRef>;

// Stage 7A activates the minimal safe PLAN path only.
export const planFields = {
  recordName: {
    table: 'Treatment Plan' as const,
    fieldId: 'fldYl2AO97dsVulsp',
    fieldName: 'Record name',
    readonly: false,
  },
  visitId: {
    table: 'Treatment Plan' as const,
    fieldId: 'fld1DoDV3FBdguSZy',
    fieldName: 'Visit ID',
    readonly: false,
  },
  toothNumber: {
    table: 'Treatment Plan' as const,
    fieldId: 'fldO6ZWz06TKktqzy',
    fieldName: 'Tooth number',
    readonly: false,
  },
  pulpTherapy: {
    table: 'Treatment Plan' as const,
    fieldId: 'fldEyYnZfdes9jOuV',
    fieldName: 'Pulp therapy',
    readonly: false,
  },
  restorationDesign: {
    table: 'Treatment Plan' as const,
    fieldId: 'fldsHn6bdsIx3l9St',
    fieldName: 'Restoration design',
    readonly: false,
  },
  restorationMaterial: {
    table: 'Treatment Plan' as const,
    fieldId: 'fldSC0d0hIPFFhWpA',
    fieldName: 'Restoration material',
    readonly: false,
  },
  implantPlacement: {
    table: 'Treatment Plan' as const,
    fieldId: 'fld5oWZsIR1BcWySr',
    fieldName: 'Implant placement',
    readonly: false,
  },
  scanFileLink: {
    table: 'Treatment Plan' as const,
    fieldId: 'fldvxDHkBKRXbd7ZO',
    fieldName: 'Scan file link',
    readonly: false,
  },
  caseId: {
    table: 'Treatment Plan' as const,
    fieldId: 'fld9Oi0GKYkVqnCi9',
    fieldName: 'Case ID',
    readonly: false,
  },
} as const satisfies Record<string, AirtableFieldRef>;

// Stage 7B activates the minimal safe DR path only.
export const doctorReasoningFields = {
  recordName: {
    table: 'Doctor Reasoning' as const,
    fieldId: 'fldCVRknc41d1oUqF',
    fieldName: 'Record name',
    readonly: false,
  },
  visitId: {
    table: 'Doctor Reasoning' as const,
    fieldId: 'fldY1LbjaZNY9erq6',
    fieldName: 'Visit ID',
    readonly: false,
  },
  toothNumber: {
    table: 'Doctor Reasoning' as const,
    fieldId: 'fldz6G3Doq4t42p9q',
    fieldName: 'Tooth number',
    readonly: false,
  },
  decisionFactor: {
    table: 'Doctor Reasoning' as const,
    fieldId: 'fldibzEOmnVvMvmC0',
    fieldName: 'Decision factor',
    readonly: false,
  },
  remainingCuspThicknessDecision: {
    table: 'Doctor Reasoning' as const,
    fieldId: 'fldfeqOIZ8fvl0YJr',
    fieldName: 'Remaining cusp thickness decision',
    readonly: false,
  },
  functionalCuspInvolvement: {
    table: 'Doctor Reasoning' as const,
    fieldId: 'fldr1h1VlbV7XfPaB',
    fieldName: 'Functional cusp involvement',
    readonly: false,
  },
  crackProgressionRisk: {
    table: 'Doctor Reasoning' as const,
    fieldId: 'fldD3lZyR8iazwlfc',
    fieldName: 'Crack progression risk',
    readonly: false,
  },
  occlusalRisk: {
    table: 'Doctor Reasoning' as const,
    fieldId: 'fldxgijBeTWuojhjL',
    fieldName: 'Occlusal risk',
    readonly: false,
  },
  reasoningNotes: {
    table: 'Doctor Reasoning' as const,
    fieldId: 'fldwmyPcy66kHwHK9',
    fieldName: 'Reasoning notes',
    readonly: false,
  },
  caseId: {
    table: 'Doctor Reasoning' as const,
    fieldId: 'fldU0ubNT3Tgvlk3K',
    fieldName: 'Case ID',
    readonly: false,
  },
} as const satisfies Record<string, AirtableFieldRef>;

// Stage 7C activates the minimal safe DX path only.
export const diagnosisFields = {
  recordName: {
    table: 'Diagnosis' as const,
    fieldId: 'fldbq9LEo19hdJFiD',
    fieldName: 'Record name',
    readonly: false,
  },
  visitId: {
    table: 'Diagnosis' as const,
    fieldId: 'fldNenqPC0qgT56DU',
    fieldName: 'Visit ID',
    readonly: false,
  },
  toothNumber: {
    table: 'Diagnosis' as const,
    fieldId: 'fldYOLqvnqvQ6DMoE',
    fieldName: 'Tooth number',
    readonly: false,
  },
  structuralDiagnosis: {
    table: 'Diagnosis' as const,
    fieldId: 'fldkpp7giyWCxZ5mI',
    fieldName: 'Structural diagnosis',
    readonly: false,
  },
  pulpDiagnosis: {
    table: 'Diagnosis' as const,
    fieldId: 'fldhgWb3Q84LjAEcX',
    fieldName: 'Pulp diagnosis',
    readonly: false,
  },
  crackSeverity: {
    table: 'Diagnosis' as const,
    fieldId: 'fldrtY7bMb7sKr7qP',
    fieldName: 'Crack severity',
    readonly: false,
  },
  occlusionRisk: {
    table: 'Diagnosis' as const,
    fieldId: 'fldEmkh26MzyIV004',
    fieldName: 'Occlusion risk',
    readonly: false,
  },
  restorability: {
    table: 'Diagnosis' as const,
    fieldId: 'fldoO7nc5BSfCIhN3',
    fieldName: 'Restorability',
    readonly: false,
  },
  caseId: {
    table: 'Diagnosis' as const,
    fieldId: 'fldcokoGMvxS3D4BZ',
    fieldName: 'Case ID',
    readonly: false,
  },
} as const satisfies Record<string, AirtableFieldRef>;

// Stage 7D activates the minimal safe RAD path only.
export const radiographicFindingsFields = {
  recordName: {
    table: 'Radiographic Findings' as const,
    fieldId: 'fldAfnBtHBBlCkoaa',
    fieldName: 'Record name',
    readonly: false,
  },
  visitId: {
    table: 'Radiographic Findings' as const,
    fieldId: 'fldTZTLW4ZO0c1FCe',
    fieldName: 'Visit ID',
    readonly: false,
  },
  toothNumber: {
    table: 'Radiographic Findings' as const,
    fieldId: 'fldr2q9eXa1UnCejQ',
    fieldName: 'Tooth number',
    readonly: false,
  },
  radiographType: {
    table: 'Radiographic Findings' as const,
    fieldId: 'fldtGXAttUMcyrXSr',
    fieldName: 'Radiograph type',
    readonly: false,
  },
  radiographicCariesDepth: {
    table: 'Radiographic Findings' as const,
    fieldId: 'fldamnsCqtSDBq32W',
    fieldName: 'Radiographic caries depth',
    readonly: false,
  },
  secondaryCaries: {
    table: 'Radiographic Findings' as const,
    fieldId: 'fld7CEKYkXHM2DZZ8',
    fieldName: 'Secondary caries',
    readonly: false,
  },
  cariesLocation: {
    table: 'Radiographic Findings' as const,
    fieldId: 'fldLCb8uYEVkt4FwR',
    fieldName: 'Caries location',
    readonly: false,
  },
  pulpChamberSize: {
    table: 'Radiographic Findings' as const,
    fieldId: 'fldYkpmJPKTI5NnSA',
    fieldName: 'Pulp chamber size',
    readonly: false,
  },
  periapicalLesion: {
    table: 'Radiographic Findings' as const,
    fieldId: 'fldUxxYhURSxCDQts',
    fieldName: 'Periapical lesion',
    readonly: false,
  },
  radiographicFractureSign: {
    table: 'Radiographic Findings' as const,
    fieldId: 'fldJRJwl1h3vWiwA7',
    fieldName: 'Radiographic fracture sign',
    readonly: false,
  },
  radiographLink: {
    table: 'Radiographic Findings' as const,
    fieldId: 'fldBXplUNNg9ers4A',
    fieldName: 'Radiograph link',
    readonly: false,
  },
  caseId: {
    table: 'Radiographic Findings' as const,
    fieldId: 'fldIGyTSwx4A7SBAW',
    fieldName: 'Case ID',
    readonly: false,
  },
} as const satisfies Record<string, AirtableFieldRef>;

// Stage 7E activates the minimal safe OP path only.
export const operativeFindingsFields = {
  recordName: {
    table: 'Operative Findings' as const,
    fieldId: 'fldBOQ7xEZBPWfvaM',
    fieldName: 'Record name',
    readonly: false,
  },
  visitId: {
    table: 'Operative Findings' as const,
    fieldId: 'fldi16nwwh0GA2JZj',
    fieldName: 'Visit ID',
    readonly: false,
  },
  toothNumber: {
    table: 'Operative Findings' as const,
    fieldId: 'fld6DWkCJhVaOoJXF',
    fieldName: 'Tooth number',
    readonly: false,
  },
  rubberDamIsolation: {
    table: 'Operative Findings' as const,
    fieldId: 'flda4t9PS4bmW7h5X',
    fieldName: 'Rubber dam isolation',
    readonly: false,
  },
  cariesDepthActual: {
    table: 'Operative Findings' as const,
    fieldId: 'fldwPzDx00x0yJFfr',
    fieldName: 'Caries depth (actual)',
    readonly: false,
  },
  softDentinRemaining: {
    table: 'Operative Findings' as const,
    fieldId: 'fldPdrOU8k82s2QSS',
    fieldName: 'Soft dentin remaining',
    readonly: false,
  },
  crackConfirmed: {
    table: 'Operative Findings' as const,
    fieldId: 'fldiXj0iBqs17NyCO',
    fieldName: 'Crack confirmed',
    readonly: false,
  },
  crackLocation: {
    table: 'Operative Findings' as const,
    fieldId: 'fldhdGm4CwvMDKksY',
    fieldName: 'Crack location',
    readonly: false,
  },
  remainingCuspThicknessMm: {
    table: 'Operative Findings' as const,
    fieldId: 'fldIFs388WQUaXveY',
    fieldName: 'Remaining cusp thickness (mm)',
    readonly: false,
  },
  subgingivalMargin: {
    table: 'Operative Findings' as const,
    fieldId: 'fldlIaAdw0v692l6B',
    fieldName: 'Subgingival margin',
    readonly: false,
  },
  deepMarginalElevation: {
    table: 'Operative Findings' as const,
    fieldId: 'fld8IM7ImR7Z7Cmgc',
    fieldName: 'Deep marginal elevation',
    readonly: false,
  },
  idsResinCoating: {
    table: 'Operative Findings' as const,
    fieldId: 'fld4SsOD0qcJiYkdr',
    fieldName: 'IDS/resin coating',
    readonly: false,
  },
  resinCoreBuildUpType: {
    table: 'Operative Findings' as const,
    fieldId: 'fld2tDuUTAT13M1cl',
    fieldName: 'Resin core build up type',
    readonly: false,
  },
  occlusalLoadingTest: {
    table: 'Operative Findings' as const,
    fieldId: 'fldZNjdoL2XvLBpEW',
    fieldName: 'Occlusal loading test',
    readonly: false,
  },
  loadingTestResult: {
    table: 'Operative Findings' as const,
    fieldId: 'fldYrBoVgxEpkJTWV',
    fieldName: 'Loading test result',
    readonly: false,
  },
  intraoralPhotoLink: {
    table: 'Operative Findings' as const,
    fieldId: 'flde0J4VWNw2vthJs',
    fieldName: 'Intraoral photo link',
    readonly: false,
  },
  caseId: {
    table: 'Operative Findings' as const,
    fieldId: 'fldB3RXkYLCpZWkGw',
    fieldName: 'Case ID',
    readonly: false,
  },
} as const satisfies Record<string, AirtableFieldRef>;

// Case-link fields on each snapshot table are now schema-confirmed, but
// non-PRE branch content mapping still remains blocked.
export const snapshotCaseLinkFields = {
  PRE: {
    table: 'Pre-op Clinical Findings' as const,
    fieldId: 'fldTM5Gj6FazHJPDS',
    fieldName: 'Case ID',
    readonly: false,
  },
  RAD: {
    table: 'Radiographic Findings' as const,
    fieldId: 'fldIGyTSwx4A7SBAW',
    fieldName: 'Case ID',
    readonly: false,
  },
  OP: {
    table: 'Operative Findings' as const,
    fieldId: 'fldB3RXkYLCpZWkGw',
    fieldName: 'Case ID',
    readonly: false,
  },
  DX: {
    table: 'Diagnosis' as const,
    fieldId: 'fldcokoGMvxS3D4BZ',
    fieldName: 'Case ID',
    readonly: false,
  },
  PLAN: {
    table: 'Treatment Plan' as const,
    fieldId: 'fld9Oi0GKYkVqnCi9',
    fieldName: 'Case ID',
    readonly: false,
  },
  DR: {
    table: 'Doctor Reasoning' as const,
    fieldId: 'fldU0ubNT3Tgvlk3K',
    fieldName: 'Case ID',
    readonly: false,
  },
} as const satisfies Record<string, AirtableFieldRef>;

/**
 * Canon-confirmed option mappings used by the active safe slice.
 */
export const genderOptions = {
  male: 'Male',
  female: 'Female',
} as const;

export const visitTypeOptions = {
  firstVisit: 'first visit',
  recall: 'recall',
  emergency: 'emergency',
  continueCase: 'continue case',
  followUp: 'follow up',
} as const;

export const symptomOptions = {
  coldSensitivity: 'cold sensitivity',
  bitePain: 'bite pain',
  painOnRelease: 'pain on release',
  chewingPain: 'chewing pain',
  spontaneousPain: 'spontaneous pain',
  none: 'none',
} as const;

export const symptomReproducibleOptions = {
  yes: 'yes',
  no: 'no',
  notTested: 'not tested',
} as const;

export const visibleCrackOptions = {
  none: 'none',
  suspected: 'suspected',
  visible: 'visible',
} as const;

export const crackDetectionMethodOptions = {
  visual: 'visual',
  transillumination: 'transillumination',
  biteTest: 'bite test',
  photoMagnification: 'photo magnification',
  notApplicable: 'N/A',
} as const;

export const coldTestOptions = {
  normal: 'normal',
  sensitive: 'sensitive',
  lingering: 'lingering',
  none: 'none',
  notTested: 'not tested',
} as const;

export const planPulpTherapyOptions = {
  none: 'none',
  vpt: 'VPT',
  rct: 'RCT',
} as const;

export const planRestorationDesignOptions = {
  directComposite: 'direct composite',
  inlay: 'inlay',
  onlay: 'onlay',
  overlay: 'overlay',
  crown: 'crown',
  implantCrown: 'implant crown',
  extraction: 'extraction',
} as const;

export const planRestorationMaterialOptions = {
  composite: 'composite',
  ultimate: 'ultimate',
  emax: 'e.max',
  zirconia: 'zirconia',
  gold: 'gold',
  none: 'none',
} as const;

export const planImplantPlacementOptions = {
  notPlanned: 'not planned',
  planned: 'planned',
  placed: 'placed',
} as const;

export const doctorReasoningDecisionFactorOptions = {
  remainingCuspThickness: 'remaining cusp thickness',
  functionalCuspInvolvement: 'functional cusp involvement',
  crackDepth: 'crack depth',
  cariesDepth: 'caries depth',
  pulpStatus: 'pulp status',
  occlusion: 'occlusion',
  subgingivalMargin: 'subgingival margin',
  notApplicable: 'N/A',
} as const;

export const doctorReasoningRemainingCuspThicknessDecisionOptions = {
  cuspPreserved: '>1.5 mm cusp preserved',
  cuspCoverage: '<1.5 mm cusp coverage',
} as const;

export const doctorReasoningFunctionalCuspInvolvementOptions = {
  yes: 'yes',
  no: 'no',
} as const;

export const doctorReasoningCrackProgressionRiskOptions = {
  low: 'low',
  moderate: 'moderate',
  high: 'high',
} as const;

export const doctorReasoningOcclusalRiskOptions = {
  normal: 'normal',
  heavyOcclusion: 'heavy occlusion',
  bruxismSuspected: 'bruxism suspected',
} as const;

export const diagnosisStructuralDiagnosisOptions = {
  intactTooth: 'intact tooth',
  primaryCaries: 'primary caries',
  secondaryCaries: 'secondary caries',
  crackedTooth: 'cracked tooth',
  cuspFracture: 'cusp fracture',
  splitTooth: 'split tooth',
  rootFracture: 'root fracture',
  notApplicable: 'N/A',
} as const;

export const diagnosisPulpDiagnosisOptions = {
  normalPulp: 'normal pulp',
  reversiblePulpitis: 'reversible pulpitis',
  irreversiblePulpitis: 'irreversible pulpitis',
  necroticPulp: 'necrotic pulp',
  previouslyTreated: 'previously treated',
} as const;

export const diagnosisCrackSeverityOptions = {
  none: 'none',
  superficialCrack: 'superficial crack',
  dentinCrack: 'dentin crack',
  deepCrack: 'deep crack',
  splitTooth: 'split tooth',
} as const;

export const diagnosisOcclusionRiskOptions = {
  normal: 'normal',
  heavyOcclusion: 'heavy occlusion',
  bruxismSuspected: 'bruxism suspected',
} as const;

export const diagnosisRestorabilityOptions = {
  restorable: 'restorable',
  questionable: 'questionable',
  nonRestorable: 'non-restorable',
} as const;

export const radiographTypeOptions = {
  bitewing: 'bitewing',
  periapical: 'periapical',
  panoramic: 'panoramic',
  cbct: 'CBCT',
} as const;

export const radiographicCariesDepthOptions = {
  none: 'none',
  enamel: 'enamel',
  outerDentin: 'outer dentin',
  middleDentin: 'middle dentin',
  deepDentin: 'deep dentin',
} as const;

export const secondaryCariesOptions = {
  none: 'none',
  suspected: 'suspected',
  clear: 'clear',
} as const;

export const cariesLocationOptions = {
  mesial: 'mesial',
  distal: 'distal',
  occlusal: 'occlusal',
  cervical: 'cervical',
  root: 'root',
  notApplicable: 'N/A',
} as const;

export const pulpChamberSizeOptions = {
  large: 'large',
  normal: 'normal',
  narrow: 'narrow',
  veryNarrow: 'very narrow',
} as const;

export const periapicalLesionOptions = {
  none: 'none',
  suspected: 'suspected',
  present: 'present',
} as const;

export const radiographicFractureSignOptions = {
  none: 'none',
  possibleFracture: 'possible fracture',
  clearFracture: 'clear fracture',
} as const;

export const rubberDamIsolationOptions = {
  isolated: 'isolated',
  difficultButIsolated: 'difficult but isolated',
  notPossible: 'not possible',
} as const;

export const cariesDepthActualOptions = {
  enamel: 'enamel',
  outerDentin: 'outer dentin',
  middleDentin: 'middle dentin',
  deepDentin: 'deep dentin',
  pulpExposure: 'pulp exposure',
} as const;

export const softDentinRemainingOptions = {
  none: 'none',
  minimal: 'minimal',
  intentional: 'intentional',
} as const;

export const crackConfirmedOptions = {
  none: 'none',
  enamelCrack: 'enamel crack',
  dentinCrack: 'dentin crack',
  deepCrack: 'deep crack',
  splitTooth: 'split tooth',
} as const;

export const crackLocationOptions = {
  mesialMarginalRidge: 'mesial marginal ridge',
  distalMarginalRidge: 'distal marginal ridge',
  centralGroove: 'central groove',
  buccal: 'buccal',
  palatal: 'palatal',
  unknown: 'unknown',
  notApplicable: 'N/A',
} as const;

export const operativeSubgingivalMarginOptions = {
  no: 'no',
  supragingival: 'supragingival',
  slightlySubgingival: 'slightly subgingival',
  deepSubgingival: 'deep subgingival',
} as const;

export const deepMarginalElevationOptions = {
  notNeeded: 'not needed',
  performed: 'performed',
} as const;

export const idsResinCoatingOptions = {
  none: 'none',
  performed: 'performed',
} as const;

export const resinCoreBuildUpTypeOptions = {
  none: 'none',
  standardCore: 'standard core',
  fiberReinforcedCore: 'fiber reinforced core',
  standardResinCore: 'standard resin core',
} as const;

export const occlusalLoadingTestOptions = {
  notPerformed: 'not performed',
  performed: 'performed',
} as const;

export const loadingTestResultOptions = {
  completeRelief: 'complete relief',
  partialRelief: 'partial relief',
  noChange: 'no change',
  worse: 'worse',
  notApplicable: 'N/A',
} as const;

// Case-table options are now exactly schema-confirmed but not yet executable
// on their own because broader Case activation semantics remain gated.
export const episodeStatusOptions = {
  open: 'open',
  monitoring: 'monitoring',
  closed: 'closed',
  split: 'split',
} as const;

export const followUpPendingOptions = {
  yes: 'yes',
  no: 'no',
} as const;

export const postDeliveryFollowUpResultOptions = {
  noIssue: 'no issue',
  issueDetected: 'issue detected',
  notChecked: 'not checked',
} as const;

/**
 * Mapping Registry
 */
export interface MappingRegistry {
  patientFields: typeof patientFields;
  patientLinkFields: typeof patientLinkFields;
  visitFields: typeof visitFields;
  visitLinkFields: typeof visitLinkFields;
  caseFields: typeof caseFields;
  postDeliveryFollowUpFields: typeof postDeliveryFollowUpFields;
  caseSnapshotLinkFields: typeof caseSnapshotLinkFields;
  preOpFields: typeof preOpFields;
  planFields: typeof planFields;
  doctorReasoningFields: typeof doctorReasoningFields;
  diagnosisFields: typeof diagnosisFields;
  radiographicFindingsFields: typeof radiographicFindingsFields;
  operativeFindingsFields: typeof operativeFindingsFields;
  snapshotCaseLinkFields: typeof snapshotCaseLinkFields;
  genderOptions: typeof genderOptions;
  visitTypeOptions: typeof visitTypeOptions;
  symptomOptions: typeof symptomOptions;
  symptomReproducibleOptions: typeof symptomReproducibleOptions;
  visibleCrackOptions: typeof visibleCrackOptions;
  crackDetectionMethodOptions: typeof crackDetectionMethodOptions;
  coldTestOptions: typeof coldTestOptions;
  planPulpTherapyOptions: typeof planPulpTherapyOptions;
  planRestorationDesignOptions: typeof planRestorationDesignOptions;
  planRestorationMaterialOptions: typeof planRestorationMaterialOptions;
  planImplantPlacementOptions: typeof planImplantPlacementOptions;
  doctorReasoningDecisionFactorOptions: typeof doctorReasoningDecisionFactorOptions;
  doctorReasoningRemainingCuspThicknessDecisionOptions: typeof doctorReasoningRemainingCuspThicknessDecisionOptions;
  doctorReasoningFunctionalCuspInvolvementOptions: typeof doctorReasoningFunctionalCuspInvolvementOptions;
  doctorReasoningCrackProgressionRiskOptions: typeof doctorReasoningCrackProgressionRiskOptions;
  doctorReasoningOcclusalRiskOptions: typeof doctorReasoningOcclusalRiskOptions;
  diagnosisStructuralDiagnosisOptions: typeof diagnosisStructuralDiagnosisOptions;
  diagnosisPulpDiagnosisOptions: typeof diagnosisPulpDiagnosisOptions;
  diagnosisCrackSeverityOptions: typeof diagnosisCrackSeverityOptions;
  diagnosisOcclusionRiskOptions: typeof diagnosisOcclusionRiskOptions;
  diagnosisRestorabilityOptions: typeof diagnosisRestorabilityOptions;
  radiographTypeOptions: typeof radiographTypeOptions;
  radiographicCariesDepthOptions: typeof radiographicCariesDepthOptions;
  secondaryCariesOptions: typeof secondaryCariesOptions;
  cariesLocationOptions: typeof cariesLocationOptions;
  pulpChamberSizeOptions: typeof pulpChamberSizeOptions;
  periapicalLesionOptions: typeof periapicalLesionOptions;
  radiographicFractureSignOptions: typeof radiographicFractureSignOptions;
  rubberDamIsolationOptions: typeof rubberDamIsolationOptions;
  cariesDepthActualOptions: typeof cariesDepthActualOptions;
  softDentinRemainingOptions: typeof softDentinRemainingOptions;
  crackConfirmedOptions: typeof crackConfirmedOptions;
  crackLocationOptions: typeof crackLocationOptions;
  operativeSubgingivalMarginOptions: typeof operativeSubgingivalMarginOptions;
  deepMarginalElevationOptions: typeof deepMarginalElevationOptions;
  idsResinCoatingOptions: typeof idsResinCoatingOptions;
  resinCoreBuildUpTypeOptions: typeof resinCoreBuildUpTypeOptions;
  occlusalLoadingTestOptions: typeof occlusalLoadingTestOptions;
  loadingTestResultOptions: typeof loadingTestResultOptions;
  episodeStatusOptions: typeof episodeStatusOptions;
  followUpPendingOptions: typeof followUpPendingOptions;
  postDeliveryFollowUpResultOptions: typeof postDeliveryFollowUpResultOptions;
}

/**
 * Default mapping registry with schema-confirmed mappings only.
 */
export const createDefaultMappingRegistry = (): MappingRegistry => ({
  patientFields,
  patientLinkFields,
  visitFields,
  visitLinkFields,
  caseFields,
  postDeliveryFollowUpFields,
  caseSnapshotLinkFields,
  preOpFields,
  planFields,
  doctorReasoningFields,
  diagnosisFields,
  radiographicFindingsFields,
  operativeFindingsFields,
  snapshotCaseLinkFields,
  genderOptions,
  visitTypeOptions,
  symptomOptions,
  symptomReproducibleOptions,
  visibleCrackOptions,
  crackDetectionMethodOptions,
  coldTestOptions,
  planPulpTherapyOptions,
  planRestorationDesignOptions,
  planRestorationMaterialOptions,
  planImplantPlacementOptions,
  doctorReasoningDecisionFactorOptions,
  doctorReasoningRemainingCuspThicknessDecisionOptions,
  doctorReasoningFunctionalCuspInvolvementOptions,
  doctorReasoningCrackProgressionRiskOptions,
  doctorReasoningOcclusalRiskOptions,
  diagnosisStructuralDiagnosisOptions,
  diagnosisPulpDiagnosisOptions,
  diagnosisCrackSeverityOptions,
  diagnosisOcclusionRiskOptions,
  diagnosisRestorabilityOptions,
  radiographTypeOptions,
  radiographicCariesDepthOptions,
  secondaryCariesOptions,
  cariesLocationOptions,
  pulpChamberSizeOptions,
  periapicalLesionOptions,
  radiographicFractureSignOptions,
  rubberDamIsolationOptions,
  cariesDepthActualOptions,
  softDentinRemainingOptions,
  crackConfirmedOptions,
  crackLocationOptions,
  operativeSubgingivalMarginOptions,
  deepMarginalElevationOptions,
  idsResinCoatingOptions,
  resinCoreBuildUpTypeOptions,
  occlusalLoadingTestOptions,
  loadingTestResultOptions,
  episodeStatusOptions,
  followUpPendingOptions,
  postDeliveryFollowUpResultOptions,
});
