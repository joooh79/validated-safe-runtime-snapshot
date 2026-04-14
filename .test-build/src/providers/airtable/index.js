/**
 * Airtable Provider Adapter
 *
 * A provider adapter that implements DirectWriteProvider by translating
 * provider-neutral WriteActions to Airtable API requests.
 *
 * Design philosophy:
 * - Fail-closed: errors on unmapped/unverified mappings
 * - Canon-driven: only uses mappings verified in docs
 * - Dependency-injected: testable without real HTTP
 * - Boundary-preserving: keeps Airtable logic contained
 */
// Factory and configuration
export { createAirtableProvider, createMockAirtableProvider, createDryRunAirtableProvider } from './createAirtableProvider.js';
// Mapping registry
export { createDefaultMappingRegistry } from './mappingRegistry.js';
export { patientFields, patientLinkFields, visitFields, visitLinkFields, caseFields, postDeliveryFollowUpFields, caseSnapshotLinkFields, preOpFields, planFields, doctorReasoningFields, diagnosisFields, radiographicFindingsFields, operativeFindingsFields, snapshotCaseLinkFields, genderOptions, visitTypeOptions, symptomOptions, symptomReproducibleOptions, visibleCrackOptions, crackDetectionMethodOptions, coldTestOptions, planPulpTherapyOptions, planRestorationDesignOptions, planRestorationMaterialOptions, planImplantPlacementOptions, doctorReasoningDecisionFactorOptions, doctorReasoningRemainingCuspThicknessDecisionOptions, doctorReasoningFunctionalCuspInvolvementOptions, doctorReasoningCrackProgressionRiskOptions, doctorReasoningOcclusalRiskOptions, diagnosisStructuralDiagnosisOptions, diagnosisPulpDiagnosisOptions, diagnosisCrackSeverityOptions, diagnosisOcclusionRiskOptions, diagnosisRestorabilityOptions, radiographTypeOptions, radiographicCariesDepthOptions, secondaryCariesOptions, cariesLocationOptions, pulpChamberSizeOptions, periapicalLesionOptions, radiographicFractureSignOptions, rubberDamIsolationOptions, cariesDepthActualOptions, softDentinRemainingOptions, crackConfirmedOptions, crackLocationOptions, operativeSubgingivalMarginOptions, deepMarginalElevationOptions, idsResinCoatingOptions, resinCoreBuildUpTypeOptions, occlusalLoadingTestOptions, loadingTestResultOptions, episodeStatusOptions, followUpPendingOptions, postDeliveryFollowUpResultOptions, } from './mappingRegistry.js';
// Error constructors
export { canonConfirmRequiredError, unsupportedActionError, missingTableMappingError, missingFieldMappingError, missingOptionMappingError, invalidMappedValueError, invalidProviderResponseError, unsafeWriteBlockedError, getErrorMessage, } from './errors.js';
// Payload builders (advanced usage)
export { mapPatientAction } from './buildPayload/mapPatientAction.js';
export { mapVisitAction } from './buildPayload/mapVisitAction.js';
export { mapCaseAction } from './buildPayload/mapCaseAction.js';
export { mapLinkAction } from './buildPayload/mapLinkAction.js';
export { mapSnapshotAction } from './buildPayload/mapSnapshotAction.js';
export { getUnsupportedActionError } from './buildPayload/handleUnsupportedAction.js';
// Value normalization helpers (advanced usage)
export { normalizeString, normalizeDate, normalizeNumber, normalizeBoolean, normalizeSelectOption, normalizeMultiSelectOptions, normalizeLinkedRef, isError, } from './buildPayload/normalizeAirtableValue.js';
// Fixtures (testing)
export { validPatientCreateAction, validVisitCreateAction, validSnapshotCreateAction, unsupportedCaseCreateAction, unsupportedSnapshotPlanAction, noOpPatientAction, } from './__fixtures__/exampleActions.js';
