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
// Patient fields used by the active safe slice.
export const patientFields = {
    patientId: {
        table: 'Patients',
        fieldId: 'fld9w40dX5KvtdqEk',
        fieldName: 'Patients ID',
        readonly: true,
    },
    birthYear: {
        table: 'Patients',
        fieldId: 'fldVk1oqI8gex9haI',
        fieldName: 'Birth year',
        readonly: false,
    },
    gender: {
        table: 'Patients',
        fieldId: 'fldf2KIXJXu679gH1',
        fieldName: 'Gender',
        readonly: false,
    },
    firstVisitDate: {
        table: 'Patients',
        fieldId: 'fldzS5DNzx4g5JMki',
        fieldName: 'First visit date',
        readonly: false,
    },
    medicalAlert: {
        table: 'Patients',
        fieldId: 'fldwHqB8xWJBjEqLI',
        fieldName: 'Medical alert',
        readonly: false,
    },
};
// Structural patient links now confirmed in the migrated schema.
// These are intentionally descriptive; explicit link-write activation remains
// a later step.
export const patientLinkFields = {
    visits: {
        table: 'Patients',
        fieldId: 'fldBhTwpA9jcT603a',
        fieldName: 'Visits',
        readonly: false,
    },
    cases: {
        table: 'Patients',
        fieldId: 'fld4DIYq1PTDrLXjO',
        fieldName: 'Cases',
        readonly: false,
    },
    postDeliveryFollowUps: {
        table: 'Patients',
        fieldId: 'fldjYB3pkqK34BGEw',
        fieldName: 'Post-delivery Follow-ups',
        readonly: false,
    },
};
// Visit fields used by the active safe slice.
export const visitFields = {
    visitId: {
        table: 'Visits',
        fieldId: 'fldVtZWsnI6u1kpfo',
        fieldName: 'Visit ID',
        readonly: true,
    },
    patientId: {
        table: 'Visits',
        fieldId: 'fldsutzcZw7QPS46q',
        fieldName: 'Patient ID',
        readonly: false,
    },
    date: {
        table: 'Visits',
        fieldId: 'fld2Qsxq5fPpGm1pS',
        fieldName: 'Date',
        readonly: false,
    },
    episodeStartVisit: {
        table: 'Visits',
        fieldId: 'fldJJKTUzmXiqLEJC',
        fieldName: 'Episode start visit',
        readonly: false,
    },
    visitType: {
        table: 'Visits',
        fieldId: 'fldCFmuquXr2Rg5D5',
        fieldName: 'Visit type',
        readonly: false,
    },
    chiefComplaint: {
        table: 'Visits',
        fieldId: 'fldy7rU8YTkezUVaL',
        fieldName: 'Chief Complaint',
        readonly: false,
    },
    painLevel: {
        table: 'Visits',
        fieldId: 'fldcg03FEgTblaqvm',
        fieldName: 'Pain level',
        readonly: false,
    },
};
// Structural visit links now confirmed in the migrated schema.
export const visitLinkFields = {
    preOpClinicalFindings: {
        table: 'Visits',
        fieldId: 'fldlNoX4XRXvBjnSd',
        fieldName: 'Pre-op Clinical Findings',
        readonly: false,
    },
    radiographicFindings: {
        table: 'Visits',
        fieldId: 'fldTxNoGgZUJYNQob',
        fieldName: 'Radiographic Findings',
        readonly: false,
    },
    operativeFindings: {
        table: 'Visits',
        fieldId: 'fldrKk5Yq3e7RzrSa',
        fieldName: 'Operative Findings',
        readonly: false,
    },
    diagnosis: {
        table: 'Visits',
        fieldId: 'fldAWpdvywehWnQJS',
        fieldName: 'Diagnosis',
        readonly: false,
    },
    treatmentPlan: {
        table: 'Visits',
        fieldId: 'fldjFNZtI3hi83E1I',
        fieldName: 'Treatment Plan',
        readonly: false,
    },
    doctorReasoning: {
        table: 'Visits',
        fieldId: 'fldwPtqvCbOpMOsH8',
        fieldName: 'Doctor Reasoning',
        readonly: false,
    },
    episodeStartVisitReverse: {
        table: 'Visits',
        fieldId: 'fldCkOk6XgqR7d1QI',
        fieldName: 'From field: Episode start visit',
        readonly: false,
    },
    cases: {
        table: 'Visits',
        fieldId: 'fldvdsJzQ99OJMDkR',
        fieldName: 'Cases',
        readonly: false,
    },
    postDeliveryFollowUps: {
        table: 'Visits',
        fieldId: 'fldE5QS4G6oVX7yrn',
        fieldName: 'Post-delivery Follow-ups',
        readonly: false,
    },
};
// Case table fields are now schema-confirmed.
// Exact runtime semantics remain deferred for:
// - Case ID generation and record-name operational behavior
// - continuation vs split resolution
// - create vs update/upsert rules
// - write ordering and replay-safe link sequencing
export const caseFields = {
    caseId: {
        table: 'Cases',
        fieldId: 'fldrUm9lMeFP4yd7k',
        fieldName: 'Case ID',
        readonly: true,
    },
    caseNotes: {
        table: 'Cases',
        fieldId: 'fldTdckyl9poaZS7p',
        fieldName: 'Case notes',
        readonly: false,
    },
    patientId: {
        table: 'Cases',
        fieldId: 'fldXZqCup7LKZg1UZ',
        fieldName: 'Patient ID',
        readonly: false,
    },
    toothNumber: {
        table: 'Cases',
        fieldId: 'fldrSieYK9UK1qyI4',
        fieldName: 'Tooth number',
        readonly: false,
    },
    episodeStartDate: {
        table: 'Cases',
        fieldId: 'fld7Vy9ggIqZmKiQT',
        fieldName: 'Episode start date',
        readonly: false,
    },
    episodeStatus: {
        table: 'Cases',
        fieldId: 'fldavNC1fERMdS33u',
        fieldName: 'Episode status',
        readonly: false,
    },
    visits: {
        table: 'Cases',
        fieldId: 'fldkMiHp32CkSgTGr',
        fieldName: 'Visits',
        readonly: false,
    },
    parentCaseId: {
        table: 'Cases',
        fieldId: 'fldEpWPXUglS8EE6R',
        fieldName: 'Parent Case ID',
        readonly: false,
    },
    latestVisitId: {
        table: 'Cases',
        fieldId: 'flde3L8nIa9iy5cXw',
        fieldName: 'Latest Visit ID',
        readonly: false,
    },
    followUpPending: {
        table: 'Cases',
        fieldId: 'flderQUmRKPAU3qcT',
        fieldName: 'Follow-up pending',
        readonly: false,
    },
    latestSummary: {
        table: 'Cases',
        fieldId: 'fldMmJvRnSCnuSN4l',
        fieldName: 'Latest summary',
        readonly: false,
    },
    latestWorkingDiagnosis: {
        table: 'Cases',
        fieldId: 'fldoF9x50Tr9qrVUX',
        fieldName: 'Latest working diagnosis',
        readonly: false,
    },
    latestWorkingPlan: {
        table: 'Cases',
        fieldId: 'fldp32SkgizcKcfCy',
        fieldName: 'Latest working plan',
        readonly: false,
    },
    finalProsthesisPlanDate: {
        table: 'Cases',
        fieldId: 'fldotjgXcLmZFhy63',
        fieldName: 'Final prosthesis plan date',
        readonly: false,
    },
    finalPrepAndScanDate: {
        table: 'Cases',
        fieldId: 'fldpyyRgKdjz7ozbc',
        fieldName: 'Final prep & scan date',
        readonly: false,
    },
    finalProsthesisDeliveryDate: {
        table: 'Cases',
        fieldId: 'fldvJgCn2Rzn1iPYI',
        fieldName: 'Final prosthesis delivery date',
        readonly: false,
    },
    latestPostDeliveryFollowUpDate: {
        table: 'Cases',
        fieldId: 'fld8mm0qA05VphkKi',
        fieldName: 'Latest post-delivery follow-up date',
        readonly: false,
    },
    latestPostDeliveryFollowUpResult: {
        table: 'Cases',
        fieldId: 'fldltOHxCBQEChwH7',
        fieldName: 'Latest post-delivery follow-up result',
        readonly: false,
    },
    postDeliveryFollowUps: {
        table: 'Cases',
        fieldId: 'fldpAzFxMPiRT1ed1',
        fieldName: 'Post-delivery Follow-ups',
        readonly: false,
    },
};
export const postDeliveryFollowUpFields = {
    followUpId: {
        table: 'Post-delivery Follow-ups',
        fieldId: 'fld6hsy1itW2bsHPz',
        fieldName: 'Follow-up ID',
        readonly: true,
    },
    caseId: {
        table: 'Post-delivery Follow-ups',
        fieldId: 'fldIlaOWNaLWFRkpW',
        fieldName: 'Case ID',
        readonly: false,
    },
    visitId: {
        table: 'Post-delivery Follow-ups',
        fieldId: 'fldCnBg7lOBP0IKQj',
        fieldName: 'Visit ID',
        readonly: false,
    },
    patientId: {
        table: 'Post-delivery Follow-ups',
        fieldId: 'fldbrFZirVZ133Xip',
        fieldName: 'Patient ID',
        readonly: false,
    },
    toothNumber: {
        table: 'Post-delivery Follow-ups',
        fieldId: 'fldwDGx5voXe5KixD',
        fieldName: 'Tooth number',
        readonly: false,
    },
    followUpDate: {
        table: 'Post-delivery Follow-ups',
        fieldId: 'fldjeimNbeuSwhGUa',
        fieldName: 'Follow-up date',
        readonly: false,
    },
    followUpResult: {
        table: 'Post-delivery Follow-ups',
        fieldId: 'fldk41pcbGQGYlwcz',
        fieldName: 'Follow-up result',
        readonly: false,
    },
    issueSummary: {
        table: 'Post-delivery Follow-ups',
        fieldId: 'fldJYCTdNBpEpJ2zL',
        fieldName: 'Issue summary',
        readonly: false,
    },
    followUpNotes: {
        table: 'Post-delivery Follow-ups',
        fieldId: 'fldnaaFp71I4fBLIe',
        fieldName: 'Follow-up notes',
        readonly: false,
    },
};
export const caseSnapshotLinkFields = {
    preOpClinicalFindings: {
        table: 'Cases',
        fieldId: 'fld7aWtNB3Dp7dmKL',
        fieldName: 'Pre-op Clinical Findings',
        readonly: false,
    },
    radiographicFindings: {
        table: 'Cases',
        fieldId: 'fldtJaYYQ6lC9z337',
        fieldName: 'Radiographic Findings',
        readonly: false,
    },
    operativeFindings: {
        table: 'Cases',
        fieldId: 'fldDFQaLtl8VC02cA',
        fieldName: 'Operative Findings',
        readonly: false,
    },
    diagnosis: {
        table: 'Cases',
        fieldId: 'fldTfkNvhIyhc82jy',
        fieldName: 'Diagnosis',
        readonly: false,
    },
    treatmentPlan: {
        table: 'Cases',
        fieldId: 'fldJMsvz2SgAtXIHG',
        fieldName: 'Treatment Plan',
        readonly: false,
    },
    doctorReasoning: {
        table: 'Cases',
        fieldId: 'fldqjZSvmBCj1yfGt',
        fieldName: 'Doctor Reasoning',
        readonly: false,
    },
};
// PRE remains active and points at the exact migrated table name.
export const preOpFields = {
    recordName: {
        table: 'Pre-op Clinical Findings',
        fieldId: 'fld8A0HgltIdUDKgx',
        fieldName: 'Record name',
        readonly: false,
    },
    visitId: {
        table: 'Pre-op Clinical Findings',
        fieldId: 'fldveyCkgzHd2XVj6',
        fieldName: 'Visit ID',
        readonly: false,
    },
    toothNumber: {
        table: 'Pre-op Clinical Findings',
        fieldId: 'fldeyFudB6DHNZz8t',
        fieldName: 'Tooth number',
        readonly: false,
    },
    symptom: {
        table: 'Pre-op Clinical Findings',
        fieldId: 'fldbzc984m3ws1UMe',
        fieldName: 'Symptom',
        readonly: false,
    },
    symptomReproducible: {
        table: 'Pre-op Clinical Findings',
        fieldId: 'fldtpqn16pVGbW3Vj',
        fieldName: 'Symptom reproducible',
        readonly: false,
    },
    visibleCrack: {
        table: 'Pre-op Clinical Findings',
        fieldId: 'fldzIuewamSiKAbm0',
        fieldName: 'Visible crack',
        readonly: false,
    },
    crackDetectionMethod: {
        table: 'Pre-op Clinical Findings',
        fieldId: 'fldRauyFKARl3Kb7x',
        fieldName: 'Crack detection method',
        readonly: false,
    },
    caseId: {
        table: 'Pre-op Clinical Findings',
        fieldId: 'fldTM5Gj6FazHJPDS',
        fieldName: 'Case ID',
        readonly: false,
    },
};
// Stage 7A activates the minimal safe PLAN path only.
export const planFields = {
    recordName: {
        table: 'Treatment Plan',
        fieldId: 'fldYl2AO97dsVulsp',
        fieldName: 'Record name',
        readonly: false,
    },
    visitId: {
        table: 'Treatment Plan',
        fieldId: 'fld1DoDV3FBdguSZy',
        fieldName: 'Visit ID',
        readonly: false,
    },
    toothNumber: {
        table: 'Treatment Plan',
        fieldId: 'fldO6ZWz06TKktqzy',
        fieldName: 'Tooth number',
        readonly: false,
    },
    pulpTherapy: {
        table: 'Treatment Plan',
        fieldId: 'fldEyYnZfdes9jOuV',
        fieldName: 'Pulp therapy',
        readonly: false,
    },
    restorationDesign: {
        table: 'Treatment Plan',
        fieldId: 'fldsHn6bdsIx3l9St',
        fieldName: 'Restoration design',
        readonly: false,
    },
    restorationMaterial: {
        table: 'Treatment Plan',
        fieldId: 'fldSC0d0hIPFFhWpA',
        fieldName: 'Restoration material',
        readonly: false,
    },
    implantPlacement: {
        table: 'Treatment Plan',
        fieldId: 'fld5oWZsIR1BcWySr',
        fieldName: 'Implant placement',
        readonly: false,
    },
    scanFileLink: {
        table: 'Treatment Plan',
        fieldId: 'fldvxDHkBKRXbd7ZO',
        fieldName: 'Scan file link',
        readonly: false,
    },
    caseId: {
        table: 'Treatment Plan',
        fieldId: 'fld9Oi0GKYkVqnCi9',
        fieldName: 'Case ID',
        readonly: false,
    },
};
// Stage 7B activates the minimal safe DR path only.
export const doctorReasoningFields = {
    recordName: {
        table: 'Doctor Reasoning',
        fieldId: 'fldCVRknc41d1oUqF',
        fieldName: 'Record name',
        readonly: false,
    },
    visitId: {
        table: 'Doctor Reasoning',
        fieldId: 'fldY1LbjaZNY9erq6',
        fieldName: 'Visit ID',
        readonly: false,
    },
    toothNumber: {
        table: 'Doctor Reasoning',
        fieldId: 'fldz6G3Doq4t42p9q',
        fieldName: 'Tooth number',
        readonly: false,
    },
    decisionFactor: {
        table: 'Doctor Reasoning',
        fieldId: 'fldibzEOmnVvMvmC0',
        fieldName: 'Decision factor',
        readonly: false,
    },
    remainingCuspThicknessDecision: {
        table: 'Doctor Reasoning',
        fieldId: 'fldfeqOIZ8fvl0YJr',
        fieldName: 'Remaining cusp thickness decision',
        readonly: false,
    },
    functionalCuspInvolvement: {
        table: 'Doctor Reasoning',
        fieldId: 'fldr1h1VlbV7XfPaB',
        fieldName: 'Functional cusp involvement',
        readonly: false,
    },
    crackProgressionRisk: {
        table: 'Doctor Reasoning',
        fieldId: 'fldD3lZyR8iazwlfc',
        fieldName: 'Crack progression risk',
        readonly: false,
    },
    occlusalRisk: {
        table: 'Doctor Reasoning',
        fieldId: 'fldxgijBeTWuojhjL',
        fieldName: 'Occlusal risk',
        readonly: false,
    },
    reasoningNotes: {
        table: 'Doctor Reasoning',
        fieldId: 'fldwmyPcy66kHwHK9',
        fieldName: 'Reasoning notes',
        readonly: false,
    },
    caseId: {
        table: 'Doctor Reasoning',
        fieldId: 'fldU0ubNT3Tgvlk3K',
        fieldName: 'Case ID',
        readonly: false,
    },
};
// Stage 7C activates the minimal safe DX path only.
export const diagnosisFields = {
    recordName: {
        table: 'Diagnosis',
        fieldId: 'fldbq9LEo19hdJFiD',
        fieldName: 'Record name',
        readonly: false,
    },
    visitId: {
        table: 'Diagnosis',
        fieldId: 'fldNenqPC0qgT56DU',
        fieldName: 'Visit ID',
        readonly: false,
    },
    toothNumber: {
        table: 'Diagnosis',
        fieldId: 'fldYOLqvnqvQ6DMoE',
        fieldName: 'Tooth number',
        readonly: false,
    },
    structuralDiagnosis: {
        table: 'Diagnosis',
        fieldId: 'fldkpp7giyWCxZ5mI',
        fieldName: 'Structural diagnosis',
        readonly: false,
    },
    pulpDiagnosis: {
        table: 'Diagnosis',
        fieldId: 'fldhgWb3Q84LjAEcX',
        fieldName: 'Pulp diagnosis',
        readonly: false,
    },
    crackSeverity: {
        table: 'Diagnosis',
        fieldId: 'fldrtY7bMb7sKr7qP',
        fieldName: 'Crack severity',
        readonly: false,
    },
    occlusionRisk: {
        table: 'Diagnosis',
        fieldId: 'fldEmkh26MzyIV004',
        fieldName: 'Occlusion risk',
        readonly: false,
    },
    restorability: {
        table: 'Diagnosis',
        fieldId: 'fldoO7nc5BSfCIhN3',
        fieldName: 'Restorability',
        readonly: false,
    },
    caseId: {
        table: 'Diagnosis',
        fieldId: 'fldcokoGMvxS3D4BZ',
        fieldName: 'Case ID',
        readonly: false,
    },
};
// Stage 7D activates the minimal safe RAD path only.
export const radiographicFindingsFields = {
    recordName: {
        table: 'Radiographic Findings',
        fieldId: 'fldAfnBtHBBlCkoaa',
        fieldName: 'Record name',
        readonly: false,
    },
    visitId: {
        table: 'Radiographic Findings',
        fieldId: 'fldTZTLW4ZO0c1FCe',
        fieldName: 'Visit ID',
        readonly: false,
    },
    toothNumber: {
        table: 'Radiographic Findings',
        fieldId: 'fldr2q9eXa1UnCejQ',
        fieldName: 'Tooth number',
        readonly: false,
    },
    radiographType: {
        table: 'Radiographic Findings',
        fieldId: 'fldtGXAttUMcyrXSr',
        fieldName: 'Radiograph type',
        readonly: false,
    },
    radiographicCariesDepth: {
        table: 'Radiographic Findings',
        fieldId: 'fldamnsCqtSDBq32W',
        fieldName: 'Radiographic caries depth',
        readonly: false,
    },
    secondaryCaries: {
        table: 'Radiographic Findings',
        fieldId: 'fld7CEKYkXHM2DZZ8',
        fieldName: 'Secondary caries',
        readonly: false,
    },
    cariesLocation: {
        table: 'Radiographic Findings',
        fieldId: 'fldLCb8uYEVkt4FwR',
        fieldName: 'Caries location',
        readonly: false,
    },
    pulpChamberSize: {
        table: 'Radiographic Findings',
        fieldId: 'fldYkpmJPKTI5NnSA',
        fieldName: 'Pulp chamber size',
        readonly: false,
    },
    periapicalLesion: {
        table: 'Radiographic Findings',
        fieldId: 'fldUxxYhURSxCDQts',
        fieldName: 'Periapical lesion',
        readonly: false,
    },
    radiographicFractureSign: {
        table: 'Radiographic Findings',
        fieldId: 'fldJRJwl1h3vWiwA7',
        fieldName: 'Radiographic fracture sign',
        readonly: false,
    },
    radiographLink: {
        table: 'Radiographic Findings',
        fieldId: 'fldBXplUNNg9ers4A',
        fieldName: 'Radiograph link',
        readonly: false,
    },
    caseId: {
        table: 'Radiographic Findings',
        fieldId: 'fldIGyTSwx4A7SBAW',
        fieldName: 'Case ID',
        readonly: false,
    },
};
// Stage 7E activates the minimal safe OP path only.
export const operativeFindingsFields = {
    recordName: {
        table: 'Operative Findings',
        fieldId: 'fldBOQ7xEZBPWfvaM',
        fieldName: 'Record name',
        readonly: false,
    },
    visitId: {
        table: 'Operative Findings',
        fieldId: 'fldi16nwwh0GA2JZj',
        fieldName: 'Visit ID',
        readonly: false,
    },
    toothNumber: {
        table: 'Operative Findings',
        fieldId: 'fld6DWkCJhVaOoJXF',
        fieldName: 'Tooth number',
        readonly: false,
    },
    rubberDamIsolation: {
        table: 'Operative Findings',
        fieldId: 'flda4t9PS4bmW7h5X',
        fieldName: 'Rubber dam isolation',
        readonly: false,
    },
    cariesDepthActual: {
        table: 'Operative Findings',
        fieldId: 'fldwPzDx00x0yJFfr',
        fieldName: 'Caries depth (actual)',
        readonly: false,
    },
    softDentinRemaining: {
        table: 'Operative Findings',
        fieldId: 'fldPdrOU8k82s2QSS',
        fieldName: 'Soft dentin remaining',
        readonly: false,
    },
    crackConfirmed: {
        table: 'Operative Findings',
        fieldId: 'fldiXj0iBqs17NyCO',
        fieldName: 'Crack confirmed',
        readonly: false,
    },
    crackLocation: {
        table: 'Operative Findings',
        fieldId: 'fldhdGm4CwvMDKksY',
        fieldName: 'Crack location',
        readonly: false,
    },
    remainingCuspThicknessMm: {
        table: 'Operative Findings',
        fieldId: 'fldIFs388WQUaXveY',
        fieldName: 'Remaining cusp thickness (mm)',
        readonly: false,
    },
    subgingivalMargin: {
        table: 'Operative Findings',
        fieldId: 'fldlIaAdw0v692l6B',
        fieldName: 'Subgingival margin',
        readonly: false,
    },
    deepMarginalElevation: {
        table: 'Operative Findings',
        fieldId: 'fld8IM7ImR7Z7Cmgc',
        fieldName: 'Deep marginal elevation',
        readonly: false,
    },
    idsResinCoating: {
        table: 'Operative Findings',
        fieldId: 'fld4SsOD0qcJiYkdr',
        fieldName: 'IDS/resin coating',
        readonly: false,
    },
    resinCoreBuildUpType: {
        table: 'Operative Findings',
        fieldId: 'fld2tDuUTAT13M1cl',
        fieldName: 'Resin core build up type',
        readonly: false,
    },
    occlusalLoadingTest: {
        table: 'Operative Findings',
        fieldId: 'fldZNjdoL2XvLBpEW',
        fieldName: 'Occlusal loading test',
        readonly: false,
    },
    loadingTestResult: {
        table: 'Operative Findings',
        fieldId: 'fldYrBoVgxEpkJTWV',
        fieldName: 'Loading test result',
        readonly: false,
    },
    intraoralPhotoLink: {
        table: 'Operative Findings',
        fieldId: 'flde0J4VWNw2vthJs',
        fieldName: 'Intraoral photo link',
        readonly: false,
    },
    caseId: {
        table: 'Operative Findings',
        fieldId: 'fldB3RXkYLCpZWkGw',
        fieldName: 'Case ID',
        readonly: false,
    },
};
// Case-link fields on each snapshot table are now schema-confirmed, but
// non-PRE branch content mapping still remains blocked.
export const snapshotCaseLinkFields = {
    PRE: {
        table: 'Pre-op Clinical Findings',
        fieldId: 'fldTM5Gj6FazHJPDS',
        fieldName: 'Case ID',
        readonly: false,
    },
    RAD: {
        table: 'Radiographic Findings',
        fieldId: 'fldIGyTSwx4A7SBAW',
        fieldName: 'Case ID',
        readonly: false,
    },
    OP: {
        table: 'Operative Findings',
        fieldId: 'fldB3RXkYLCpZWkGw',
        fieldName: 'Case ID',
        readonly: false,
    },
    DX: {
        table: 'Diagnosis',
        fieldId: 'fldcokoGMvxS3D4BZ',
        fieldName: 'Case ID',
        readonly: false,
    },
    PLAN: {
        table: 'Treatment Plan',
        fieldId: 'fld9Oi0GKYkVqnCi9',
        fieldName: 'Case ID',
        readonly: false,
    },
    DR: {
        table: 'Doctor Reasoning',
        fieldId: 'fldU0ubNT3Tgvlk3K',
        fieldName: 'Case ID',
        readonly: false,
    },
};
/**
 * Canon-confirmed option mappings used by the active safe slice.
 */
export const genderOptions = {
    male: 'Male',
    female: 'Female',
};
export const visitTypeOptions = {
    firstVisit: 'first visit',
    recall: 'recall',
    emergency: 'emergency',
    continueCase: 'continue case',
    followUp: 'follow up',
};
export const symptomOptions = {
    coldSensitivity: 'cold sensitivity',
    bitePain: 'bite pain',
    painOnRelease: 'pain on release',
    chewingPain: 'chewing pain',
    spontaneousPain: 'spontaneous pain',
    none: 'none',
};
export const symptomReproducibleOptions = {
    yes: 'yes',
    no: 'no',
    notTested: 'not tested',
};
export const visibleCrackOptions = {
    none: 'none',
    suspected: 'suspected',
    visible: 'visible',
};
export const crackDetectionMethodOptions = {
    visual: 'visual',
    transillumination: 'transillumination',
    biteTest: 'bite test',
    photoMagnification: 'photo magnification',
    notApplicable: 'N/A',
};
export const coldTestOptions = {
    normal: 'normal',
    sensitive: 'sensitive',
    lingering: 'lingering',
    none: 'none',
    notTested: 'not tested',
};
export const planPulpTherapyOptions = {
    none: 'none',
    vpt: 'VPT',
    rct: 'RCT',
};
export const planRestorationDesignOptions = {
    directComposite: 'direct composite',
    inlay: 'inlay',
    onlay: 'onlay',
    overlay: 'overlay',
    crown: 'crown',
    implantCrown: 'implant crown',
    extraction: 'extraction',
};
export const planRestorationMaterialOptions = {
    composite: 'composite',
    ultimate: 'ultimate',
    emax: 'e.max',
    zirconia: 'zirconia',
    gold: 'gold',
    none: 'none',
};
export const planImplantPlacementOptions = {
    notPlanned: 'not planned',
    planned: 'planned',
    placed: 'placed',
};
export const doctorReasoningDecisionFactorOptions = {
    remainingCuspThickness: 'remaining cusp thickness',
    functionalCuspInvolvement: 'functional cusp involvement',
    crackDepth: 'crack depth',
    cariesDepth: 'caries depth',
    pulpStatus: 'pulp status',
    occlusion: 'occlusion',
    subgingivalMargin: 'subgingival margin',
    notApplicable: 'N/A',
};
export const doctorReasoningRemainingCuspThicknessDecisionOptions = {
    cuspPreserved: '>1.5 mm cusp preserved',
    cuspCoverage: '<1.5 mm cusp coverage',
};
export const doctorReasoningFunctionalCuspInvolvementOptions = {
    yes: 'yes',
    no: 'no',
};
export const doctorReasoningCrackProgressionRiskOptions = {
    low: 'low',
    moderate: 'moderate',
    high: 'high',
};
export const doctorReasoningOcclusalRiskOptions = {
    normal: 'normal',
    heavyOcclusion: 'heavy occlusion',
    bruxismSuspected: 'bruxism suspected',
};
export const diagnosisStructuralDiagnosisOptions = {
    intactTooth: 'intact tooth',
    primaryCaries: 'primary caries',
    secondaryCaries: 'secondary caries',
    crackedTooth: 'cracked tooth',
    cuspFracture: 'cusp fracture',
    splitTooth: 'split tooth',
    rootFracture: 'root fracture',
    notApplicable: 'N/A',
};
export const diagnosisPulpDiagnosisOptions = {
    normalPulp: 'normal pulp',
    reversiblePulpitis: 'reversible pulpitis',
    irreversiblePulpitis: 'irreversible pulpitis',
    necroticPulp: 'necrotic pulp',
    previouslyTreated: 'previously treated',
};
export const diagnosisCrackSeverityOptions = {
    none: 'none',
    superficialCrack: 'superficial crack',
    dentinCrack: 'dentin crack',
    deepCrack: 'deep crack',
    splitTooth: 'split tooth',
};
export const diagnosisOcclusionRiskOptions = {
    normal: 'normal',
    heavyOcclusion: 'heavy occlusion',
    bruxismSuspected: 'bruxism suspected',
};
export const diagnosisRestorabilityOptions = {
    restorable: 'restorable',
    questionable: 'questionable',
    nonRestorable: 'non-restorable',
};
export const radiographTypeOptions = {
    bitewing: 'bitewing',
    periapical: 'periapical',
    panoramic: 'panoramic',
    cbct: 'CBCT',
};
export const radiographicCariesDepthOptions = {
    none: 'none',
    enamel: 'enamel',
    outerDentin: 'outer dentin',
    middleDentin: 'middle dentin',
    deepDentin: 'deep dentin',
};
export const secondaryCariesOptions = {
    none: 'none',
    suspected: 'suspected',
    clear: 'clear',
};
export const cariesLocationOptions = {
    mesial: 'mesial',
    distal: 'distal',
    occlusal: 'occlusal',
    cervical: 'cervical',
    root: 'root',
    notApplicable: 'N/A',
};
export const pulpChamberSizeOptions = {
    large: 'large',
    normal: 'normal',
    narrow: 'narrow',
    veryNarrow: 'very narrow',
};
export const periapicalLesionOptions = {
    none: 'none',
    suspected: 'suspected',
    present: 'present',
};
export const radiographicFractureSignOptions = {
    none: 'none',
    possibleFracture: 'possible fracture',
    clearFracture: 'clear fracture',
};
export const rubberDamIsolationOptions = {
    isolated: 'isolated',
    difficultButIsolated: 'difficult but isolated',
    notPossible: 'not possible',
};
export const cariesDepthActualOptions = {
    enamel: 'enamel',
    outerDentin: 'outer dentin',
    middleDentin: 'middle dentin',
    deepDentin: 'deep dentin',
    pulpExposure: 'pulp exposure',
};
export const softDentinRemainingOptions = {
    none: 'none',
    minimal: 'minimal',
    intentional: 'intentional',
};
export const crackConfirmedOptions = {
    none: 'none',
    enamelCrack: 'enamel crack',
    dentinCrack: 'dentin crack',
    deepCrack: 'deep crack',
    splitTooth: 'split tooth',
};
export const crackLocationOptions = {
    mesialMarginalRidge: 'mesial marginal ridge',
    distalMarginalRidge: 'distal marginal ridge',
    centralGroove: 'central groove',
    buccal: 'buccal',
    palatal: 'palatal',
    unknown: 'unknown',
    notApplicable: 'N/A',
};
export const operativeSubgingivalMarginOptions = {
    no: 'no',
    supragingival: 'supragingival',
    slightlySubgingival: 'slightly subgingival',
    deepSubgingival: 'deep subgingival',
};
export const deepMarginalElevationOptions = {
    notNeeded: 'not needed',
    performed: 'performed',
};
export const idsResinCoatingOptions = {
    none: 'none',
    performed: 'performed',
};
export const resinCoreBuildUpTypeOptions = {
    none: 'none',
    standardCore: 'standard core',
    fiberReinforcedCore: 'fiber reinforced core',
    standardResinCore: 'standard resin core',
};
export const occlusalLoadingTestOptions = {
    notPerformed: 'not performed',
    performed: 'performed',
};
export const loadingTestResultOptions = {
    completeRelief: 'complete relief',
    partialRelief: 'partial relief',
    noChange: 'no change',
    worse: 'worse',
    notApplicable: 'N/A',
};
// Case-table options are now exactly schema-confirmed but not yet executable
// on their own because broader Case activation semantics remain gated.
export const episodeStatusOptions = {
    open: 'open',
    monitoring: 'monitoring',
    closed: 'closed',
    split: 'split',
};
export const followUpPendingOptions = {
    yes: 'yes',
    no: 'no',
};
export const postDeliveryFollowUpResultOptions = {
    noIssue: 'no issue',
    issueDetected: 'issue detected',
    notChecked: 'not checked',
};
/**
 * Default mapping registry with schema-confirmed mappings only.
 */
export const createDefaultMappingRegistry = () => ({
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
