/**
 * Snapshot Action Payload Builder
 *
 * Translates provider-neutral snapshot WriteAction to Airtable request.
 *
 * Supported actions:
 * - create_snapshot: Create new snapshot (finding) record
 * - update_snapshot: Update existing snapshot (finding) record
 * - no_op_snapshot: No operation
 *
 * Key rules:
 * - Snapshot rows are visit-time truth
 * - Same-date correction may update an existing snapshot
 * - Later-date continuation should create new snapshot rows
 * - Snapshot identity remains visit-based, not case-based
 * - Record name format: {Visit ID}-{Tooth number}-{BRANCH CODE}
 * - Branch codes: PRE, RAD, OP, DX, PLAN, DR
 *
 * Canon-aware boundary:
 * - the migrated schema now exposes Case-aware structure explicitly
 * - this mapper activates PRE update plus the narrow same-date explicit-target
 *   update paths for PLAN / DR / DX / RAD / OP
 * - missing-target same-date correction still remains blocked deliberately
 */
import { unsupportedActionError, canonConfirmRequiredError, } from '../errors.js';
import { normalizeMultiSelectOptions, normalizeNumber, normalizeSelectOption, normalizeString, } from './normalizeAirtableValue.js';
/**
 * Map snapshot action to Airtable request
 */
export function mapSnapshotAction(input) {
    const { action, registry } = input;
    // Only handle snapshot actions
    if (action.entityType !== 'snapshot') {
        return {
            success: false,
            error: unsupportedActionError(action.actionType, 'not a snapshot action'),
        };
    }
    switch (action.actionType) {
        case 'create_snapshot': {
            // Create new finding record (Pre-op, Treatment Plan, etc.)
            // Branch determines which table to write to (canon-confirm-required for many tables)
            const branch = action.target.branch;
            if (!branch) {
                return {
                    success: false,
                    error: unsupportedActionError('create_snapshot', 'no snapshot branch specified'),
                };
            }
            // Determine target table based on branch.
            // Stage 7E activates PRE plus the minimal safe PLAN / DR / DX / RAD / OP create paths.
            let tableName;
            if (branch === 'PRE') {
                tableName = 'Pre-op Clinical Findings';
            }
            else if (branch === 'PLAN') {
                if (!isSafePlanCreate(action)) {
                    return {
                        success: false,
                        error: canonConfirmRequiredError('snapshot_table_PLAN', 'PLAN', 'PLAN create is active only for single-tooth, Case-aware, later-date create flows'),
                    };
                }
                tableName = 'Treatment Plan';
            }
            else if (branch === 'DR') {
                if (!isSafeDoctorReasoningCreate(action)) {
                    return {
                        success: false,
                        error: canonConfirmRequiredError('snapshot_table_DR', 'DR', 'DR create is active only for single-tooth, Case-aware, later-date create flows'),
                    };
                }
                tableName = 'Doctor Reasoning';
            }
            else if (branch === 'DX') {
                if (!isSafeDiagnosisCreate(action)) {
                    return {
                        success: false,
                        error: canonConfirmRequiredError('snapshot_table_DX', 'DX', 'DX create is active only for single-tooth, Case-aware, later-date create flows'),
                    };
                }
                tableName = 'Diagnosis';
            }
            else if (branch === 'RAD') {
                if (!isSafeRadiographicFindingsCreate(action)) {
                    return {
                        success: false,
                        error: canonConfirmRequiredError('snapshot_table_RAD', 'RAD', 'RAD create is active only for single-tooth, Case-aware, later-date create flows'),
                    };
                }
                tableName = 'Radiographic Findings';
            }
            else if (branch === 'OP') {
                if (!isSafeOperativeFindingsCreate(action)) {
                    return {
                        success: false,
                        error: canonConfirmRequiredError('snapshot_table_OP', 'OP', 'OP create is active only for single-tooth, Case-aware, later-date create flows'),
                    };
                }
                tableName = 'Operative Findings';
            }
            else {
                return {
                    success: false,
                    error: canonConfirmRequiredError(`snapshot_table_${branch}`, branch, `Non-PRE snapshot branch ${branch} is still blocked: schema exists, but branch-specific payload mapping, option coverage, record-name behavior, and create-vs-update/idempotence rules are not yet activated`),
                };
            }
            const fields = {};
            const payload = action.payloadIntent;
            if (!payload) {
                return {
                    success: false,
                    error: unsupportedActionError('create_snapshot', 'no payload intent'),
                };
            }
            const intended = payload.intendedChanges;
            // Build record name: {Visit ID}-{Tooth number}-{BRANCH CODE}
            const visitId = action.target.visitId;
            const toothNumber = action.target.toothNumber;
            if (visitId && toothNumber) {
                const recordName = `${visitId}-${toothNumber}-${branch}`;
                fields[branch === 'PLAN'
                    ? registry.planFields.recordName.fieldName
                    : branch === 'DR'
                        ? registry.doctorReasoningFields.recordName.fieldName
                        : branch === 'DX'
                            ? registry.diagnosisFields.recordName.fieldName
                            : branch === 'RAD'
                                ? registry.radiographicFindingsFields.recordName.fieldName
                                : branch === 'OP'
                                    ? registry.operativeFindingsFields.recordName.fieldName
                                    : registry.preOpFields.recordName.fieldName] = recordName;
            }
            // Link to visit.
            // The migrated PRE table also now has a `Case ID` field, but this mapper
            // keeps Case association fail-closed until Case activation semantics are
            // implemented explicitly.
            if (visitId) {
                fields[branch === 'PLAN'
                    ? registry.planFields.visitId.fieldName
                    : branch === 'DR'
                        ? registry.doctorReasoningFields.visitId.fieldName
                        : branch === 'DX'
                            ? registry.diagnosisFields.visitId.fieldName
                            : branch === 'RAD'
                                ? registry.radiographicFindingsFields.visitId.fieldName
                                : branch === 'OP'
                                    ? registry.operativeFindingsFields.visitId.fieldName
                                    : registry.preOpFields.visitId.fieldName] = visitId;
            }
            // Tooth number
            if (toothNumber) {
                fields[branch === 'PLAN'
                    ? registry.planFields.toothNumber.fieldName
                    : branch === 'DR'
                        ? registry.doctorReasoningFields.toothNumber.fieldName
                        : branch === 'DX'
                            ? registry.diagnosisFields.toothNumber.fieldName
                            : branch === 'RAD'
                                ? registry.radiographicFindingsFields.toothNumber.fieldName
                                : branch === 'OP'
                                    ? registry.operativeFindingsFields.toothNumber.fieldName
                                    : registry.preOpFields.toothNumber.fieldName] = toothNumber;
            }
            // Map Pre-op clinical findings if present
            if (branch === 'PRE') {
                // Symptom
                if ('symptom' in intended) {
                    const symptom = intended.symptom;
                    if (typeof symptom === 'string') {
                        const allowed = Object.values(registry.symptomOptions);
                        const normalized = normalizeSelectOption(symptom, allowed, 'Symptom');
                        if (typeof normalized === 'string') {
                            fields[registry.preOpFields.symptom.fieldName] = normalized;
                        }
                    }
                }
                // Symptom reproducible
                if ('symptomReproducible' in intended) {
                    const reproducible = intended.symptomReproducible;
                    if (typeof reproducible === 'string') {
                        const allowed = Object.values(registry.symptomReproducibleOptions);
                        const normalized = normalizeSelectOption(reproducible, allowed, 'Symptom reproducible');
                        if (typeof normalized === 'string') {
                            fields[registry.preOpFields.symptomReproducible.fieldName] = normalized;
                        }
                    }
                }
                // Visible crack
                if ('visibleCrack' in intended) {
                    const crack = intended.visibleCrack;
                    if (typeof crack === 'string') {
                        const allowed = Object.values(registry.visibleCrackOptions);
                        const normalized = normalizeSelectOption(crack, allowed, 'Visible crack');
                        if (typeof normalized === 'string') {
                            fields[registry.preOpFields.visibleCrack.fieldName] = normalized;
                        }
                    }
                }
                // Crack detection method
                if ('crackDetectionMethod' in intended) {
                    const method = intended.crackDetectionMethod;
                    if (typeof method === 'string') {
                        const allowed = Object.values(registry.crackDetectionMethodOptions);
                        const normalized = normalizeSelectOption(method, allowed, 'Crack detection method');
                        if (typeof normalized === 'string') {
                            fields[registry.preOpFields.crackDetectionMethod.fieldName] = normalized;
                        }
                    }
                }
                // Other pre-op fields are canon-confirm-required
            }
            else if (branch === 'PLAN') {
                if ('pulpTherapy' in intended) {
                    const value = intended.pulpTherapy;
                    if (typeof value === 'string') {
                        const allowed = Object.values(registry.planPulpTherapyOptions);
                        const normalized = normalizeSelectOption(value, allowed, 'Pulp therapy');
                        if (typeof normalized === 'string') {
                            fields[registry.planFields.pulpTherapy.fieldName] = normalized;
                        }
                    }
                }
                if ('restorationDesign' in intended) {
                    const value = intended.restorationDesign;
                    if (typeof value === 'string') {
                        const allowed = Object.values(registry.planRestorationDesignOptions);
                        const normalized = normalizeSelectOption(value, allowed, 'Restoration design');
                        if (typeof normalized === 'string') {
                            fields[registry.planFields.restorationDesign.fieldName] = normalized;
                        }
                    }
                }
                if ('restorationMaterial' in intended) {
                    const value = intended.restorationMaterial;
                    if (typeof value === 'string') {
                        const allowed = Object.values(registry.planRestorationMaterialOptions);
                        const normalized = normalizeSelectOption(value, allowed, 'Restoration material');
                        if (typeof normalized === 'string') {
                            fields[registry.planFields.restorationMaterial.fieldName] = normalized;
                        }
                    }
                }
                if ('implantPlacement' in intended) {
                    const value = intended.implantPlacement;
                    if (typeof value === 'string') {
                        const allowed = Object.values(registry.planImplantPlacementOptions);
                        const normalized = normalizeSelectOption(value, allowed, 'Implant placement');
                        if (typeof normalized === 'string') {
                            fields[registry.planFields.implantPlacement.fieldName] = normalized;
                        }
                    }
                }
                if ('scanFileLink' in intended) {
                    const value = normalizeString(intended.scanFileLink);
                    if (typeof value === 'string') {
                        fields[registry.planFields.scanFileLink.fieldName] = value;
                    }
                }
            }
            else if (branch === 'DR') {
                if ('decisionFactors' in intended) {
                    const value = intended.decisionFactors;
                    const allowed = Object.values(registry.doctorReasoningDecisionFactorOptions);
                    const normalized = normalizeMultiSelectOptions(value, allowed, 'Decision factor');
                    if (Array.isArray(normalized)) {
                        fields[registry.doctorReasoningFields.decisionFactor.fieldName] = normalized;
                    }
                }
                if ('remainingCuspThicknessDecision' in intended) {
                    const value = intended.remainingCuspThicknessDecision;
                    if (typeof value === 'string') {
                        const allowed = Object.values(registry.doctorReasoningRemainingCuspThicknessDecisionOptions);
                        const normalized = normalizeSelectOption(value, allowed, 'Remaining cusp thickness decision');
                        if (typeof normalized === 'string') {
                            fields[registry.doctorReasoningFields.remainingCuspThicknessDecision.fieldName] = normalized;
                        }
                    }
                }
                if ('functionalCuspInvolvement' in intended) {
                    const value = intended.functionalCuspInvolvement;
                    if (typeof value === 'string') {
                        const allowed = Object.values(registry.doctorReasoningFunctionalCuspInvolvementOptions);
                        const normalized = normalizeSelectOption(value, allowed, 'Functional cusp involvement');
                        if (typeof normalized === 'string') {
                            fields[registry.doctorReasoningFields.functionalCuspInvolvement.fieldName] =
                                normalized;
                        }
                    }
                }
                if ('crackProgressionRisk' in intended) {
                    const value = intended.crackProgressionRisk;
                    if (typeof value === 'string') {
                        const allowed = Object.values(registry.doctorReasoningCrackProgressionRiskOptions);
                        const normalized = normalizeSelectOption(value, allowed, 'Crack progression risk');
                        if (typeof normalized === 'string') {
                            fields[registry.doctorReasoningFields.crackProgressionRisk.fieldName] =
                                normalized;
                        }
                    }
                }
                if ('occlusalRisk' in intended) {
                    const value = intended.occlusalRisk;
                    if (typeof value === 'string') {
                        const allowed = Object.values(registry.doctorReasoningOcclusalRiskOptions);
                        const normalized = normalizeSelectOption(value, allowed, 'Occlusal risk');
                        if (typeof normalized === 'string') {
                            fields[registry.doctorReasoningFields.occlusalRisk.fieldName] = normalized;
                        }
                    }
                }
                if ('reasoningNotes' in intended) {
                    const value = normalizeString(intended.reasoningNotes);
                    if (typeof value === 'string') {
                        fields[registry.doctorReasoningFields.reasoningNotes.fieldName] = value;
                    }
                }
            }
            else if (branch === 'DX') {
                if ('structuralDiagnosis' in intended) {
                    const value = intended.structuralDiagnosis;
                    const allowed = Object.values(registry.diagnosisStructuralDiagnosisOptions);
                    const normalized = normalizeMultiSelectOptions(value, allowed, 'Structural diagnosis');
                    if (Array.isArray(normalized)) {
                        fields[registry.diagnosisFields.structuralDiagnosis.fieldName] = normalized;
                    }
                }
                if ('pulpDiagnosis' in intended) {
                    const value = intended.pulpDiagnosis;
                    if (typeof value === 'string') {
                        const allowed = Object.values(registry.diagnosisPulpDiagnosisOptions);
                        const normalized = normalizeSelectOption(value, allowed, 'Pulp diagnosis');
                        if (typeof normalized === 'string') {
                            fields[registry.diagnosisFields.pulpDiagnosis.fieldName] = normalized;
                        }
                    }
                }
                if ('crackSeverity' in intended) {
                    const value = intended.crackSeverity;
                    if (typeof value === 'string') {
                        const allowed = Object.values(registry.diagnosisCrackSeverityOptions);
                        const normalized = normalizeSelectOption(value, allowed, 'Crack severity');
                        if (typeof normalized === 'string') {
                            fields[registry.diagnosisFields.crackSeverity.fieldName] = normalized;
                        }
                    }
                }
                if ('occlusionRisk' in intended) {
                    const value = intended.occlusionRisk;
                    if (typeof value === 'string') {
                        const allowed = Object.values(registry.diagnosisOcclusionRiskOptions);
                        const normalized = normalizeSelectOption(value, allowed, 'Occlusion risk');
                        if (typeof normalized === 'string') {
                            fields[registry.diagnosisFields.occlusionRisk.fieldName] = normalized;
                        }
                    }
                }
                if ('restorability' in intended) {
                    const value = intended.restorability;
                    if (typeof value === 'string') {
                        const allowed = Object.values(registry.diagnosisRestorabilityOptions);
                        const normalized = normalizeSelectOption(value, allowed, 'Restorability');
                        if (typeof normalized === 'string') {
                            fields[registry.diagnosisFields.restorability.fieldName] = normalized;
                        }
                    }
                }
            }
            else if (branch === 'RAD') {
                if ('radiographType' in intended) {
                    const value = intended.radiographType;
                    if (typeof value === 'string') {
                        const allowed = Object.values(registry.radiographTypeOptions);
                        const normalized = normalizeSelectOption(value, allowed, 'Radiograph type');
                        if (typeof normalized === 'string') {
                            fields[registry.radiographicFindingsFields.radiographType.fieldName] =
                                normalized;
                        }
                    }
                }
                if ('radiographicCariesDepth' in intended) {
                    const value = intended.radiographicCariesDepth;
                    if (typeof value === 'string') {
                        const allowed = Object.values(registry.radiographicCariesDepthOptions);
                        const normalized = normalizeSelectOption(value, allowed, 'Radiographic caries depth');
                        if (typeof normalized === 'string') {
                            fields[registry.radiographicFindingsFields.radiographicCariesDepth.fieldName] = normalized;
                        }
                    }
                }
                if ('secondaryCaries' in intended) {
                    const value = intended.secondaryCaries;
                    if (typeof value === 'string') {
                        const allowed = Object.values(registry.secondaryCariesOptions);
                        const normalized = normalizeSelectOption(value, allowed, 'Secondary caries');
                        if (typeof normalized === 'string') {
                            fields[registry.radiographicFindingsFields.secondaryCaries.fieldName] =
                                normalized;
                        }
                    }
                }
                if ('cariesLocation' in intended) {
                    const value = intended.cariesLocation;
                    const allowed = Object.values(registry.cariesLocationOptions);
                    const normalized = normalizeMultiSelectOptions(value, allowed, 'Caries location');
                    if (Array.isArray(normalized)) {
                        fields[registry.radiographicFindingsFields.cariesLocation.fieldName] =
                            normalized;
                    }
                }
                if ('pulpChamberSize' in intended) {
                    const value = intended.pulpChamberSize;
                    if (typeof value === 'string') {
                        const allowed = Object.values(registry.pulpChamberSizeOptions);
                        const normalized = normalizeSelectOption(value, allowed, 'Pulp chamber size');
                        if (typeof normalized === 'string') {
                            fields[registry.radiographicFindingsFields.pulpChamberSize.fieldName] =
                                normalized;
                        }
                    }
                }
                if ('periapicalLesion' in intended) {
                    const value = intended.periapicalLesion;
                    if (typeof value === 'string') {
                        const allowed = Object.values(registry.periapicalLesionOptions);
                        const normalized = normalizeSelectOption(value, allowed, 'Periapical lesion');
                        if (typeof normalized === 'string') {
                            fields[registry.radiographicFindingsFields.periapicalLesion.fieldName] =
                                normalized;
                        }
                    }
                }
                if ('radiographicFractureSign' in intended) {
                    const value = intended.radiographicFractureSign;
                    if (typeof value === 'string') {
                        const allowed = Object.values(registry.radiographicFractureSignOptions);
                        const normalized = normalizeSelectOption(value, allowed, 'Radiographic fracture sign');
                        if (typeof normalized === 'string') {
                            fields[registry.radiographicFindingsFields.radiographicFractureSign.fieldName] = normalized;
                        }
                    }
                }
                if ('radiographLink' in intended) {
                    const value = normalizeString(intended.radiographLink);
                    if (typeof value === 'string') {
                        fields[registry.radiographicFindingsFields.radiographLink.fieldName] =
                            value;
                    }
                }
            }
            else if (branch === 'OP') {
                if ('rubberDamIsolation' in intended) {
                    const value = intended.rubberDamIsolation;
                    if (typeof value === 'string') {
                        const allowed = Object.values(registry.rubberDamIsolationOptions);
                        const normalized = normalizeSelectOption(value, allowed, 'Rubber dam isolation');
                        if (typeof normalized === 'string') {
                            fields[registry.operativeFindingsFields.rubberDamIsolation.fieldName] =
                                normalized;
                        }
                    }
                }
                if ('cariesDepthActual' in intended) {
                    const value = intended.cariesDepthActual;
                    if (typeof value === 'string') {
                        const allowed = Object.values(registry.cariesDepthActualOptions);
                        const normalized = normalizeSelectOption(value, allowed, 'Caries depth (actual)');
                        if (typeof normalized === 'string') {
                            fields[registry.operativeFindingsFields.cariesDepthActual.fieldName] =
                                normalized;
                        }
                    }
                }
                if ('softDentinRemaining' in intended) {
                    const value = intended.softDentinRemaining;
                    if (typeof value === 'string') {
                        const allowed = Object.values(registry.softDentinRemainingOptions);
                        const normalized = normalizeSelectOption(value, allowed, 'Soft dentin remaining');
                        if (typeof normalized === 'string') {
                            fields[registry.operativeFindingsFields.softDentinRemaining.fieldName] =
                                normalized;
                        }
                    }
                }
                if ('crackConfirmed' in intended) {
                    const value = intended.crackConfirmed;
                    if (typeof value === 'string') {
                        const allowed = Object.values(registry.crackConfirmedOptions);
                        const normalized = normalizeSelectOption(value, allowed, 'Crack confirmed');
                        if (typeof normalized === 'string') {
                            fields[registry.operativeFindingsFields.crackConfirmed.fieldName] =
                                normalized;
                        }
                    }
                }
                if ('crackLocation' in intended) {
                    const value = intended.crackLocation;
                    const allowed = Object.values(registry.crackLocationOptions);
                    const normalized = normalizeMultiSelectOptions(value, allowed, 'Crack location');
                    if (Array.isArray(normalized)) {
                        fields[registry.operativeFindingsFields.crackLocation.fieldName] =
                            normalized;
                    }
                }
                if ('remainingCuspThicknessMm' in intended) {
                    const value = normalizeNumber(intended.remainingCuspThicknessMm);
                    if (typeof value === 'number') {
                        fields[registry.operativeFindingsFields.remainingCuspThicknessMm.fieldName] = value;
                    }
                }
                if ('subgingivalMargin' in intended) {
                    const value = intended.subgingivalMargin;
                    if (typeof value === 'string') {
                        const allowed = Object.values(registry.operativeSubgingivalMarginOptions);
                        const normalized = normalizeSelectOption(value, allowed, 'Subgingival margin');
                        if (typeof normalized === 'string') {
                            fields[registry.operativeFindingsFields.subgingivalMargin.fieldName] =
                                normalized;
                        }
                    }
                }
                if ('deepMarginalElevation' in intended) {
                    const value = intended.deepMarginalElevation;
                    if (typeof value === 'string') {
                        const allowed = Object.values(registry.deepMarginalElevationOptions);
                        const normalized = normalizeSelectOption(value, allowed, 'Deep marginal elevation');
                        if (typeof normalized === 'string') {
                            fields[registry.operativeFindingsFields.deepMarginalElevation.fieldName] = normalized;
                        }
                    }
                }
                if ('idsResinCoating' in intended) {
                    const value = intended.idsResinCoating;
                    if (typeof value === 'string') {
                        const allowed = Object.values(registry.idsResinCoatingOptions);
                        const normalized = normalizeSelectOption(value, allowed, 'IDS/resin coating');
                        if (typeof normalized === 'string') {
                            fields[registry.operativeFindingsFields.idsResinCoating.fieldName] =
                                normalized;
                        }
                    }
                }
                if ('resinCoreBuildUpType' in intended) {
                    const value = intended.resinCoreBuildUpType;
                    if (typeof value === 'string') {
                        const allowed = Object.values(registry.resinCoreBuildUpTypeOptions);
                        const normalized = normalizeSelectOption(value, allowed, 'Resin core build up type');
                        if (typeof normalized === 'string') {
                            fields[registry.operativeFindingsFields.resinCoreBuildUpType.fieldName] = normalized;
                        }
                    }
                }
                if ('occlusalLoadingTest' in intended) {
                    const value = intended.occlusalLoadingTest;
                    if (typeof value === 'string') {
                        const allowed = Object.values(registry.occlusalLoadingTestOptions);
                        const normalized = normalizeSelectOption(value, allowed, 'Occlusal loading test');
                        if (typeof normalized === 'string') {
                            fields[registry.operativeFindingsFields.occlusalLoadingTest.fieldName] =
                                normalized;
                        }
                    }
                }
                if ('loadingTestResult' in intended) {
                    const value = intended.loadingTestResult;
                    if (typeof value === 'string') {
                        const allowed = Object.values(registry.loadingTestResultOptions);
                        const normalized = normalizeSelectOption(value, allowed, 'Loading test result');
                        if (typeof normalized === 'string') {
                            fields[registry.operativeFindingsFields.loadingTestResult.fieldName] =
                                normalized;
                        }
                    }
                }
                if ('intraoralPhotoLink' in intended) {
                    const value = normalizeString(intended.intraoralPhotoLink);
                    if (typeof value === 'string') {
                        fields[registry.operativeFindingsFields.intraoralPhotoLink.fieldName] =
                            value;
                    }
                }
            }
            return {
                success: true,
                request: {
                    table: tableName,
                    fields,
                },
            };
        }
        case 'update_snapshot': {
            // Update existing snapshot (same-date correction)
            const branch = action.target.branch;
            const recordId = action.target.entityRef;
            if (!branch) {
                return {
                    success: false,
                    error: unsupportedActionError('update_snapshot', 'no snapshot branch specified'),
                };
            }
            if (branch === 'PLAN') {
                if (!hasExplicitExistingSnapshotTarget(action)) {
                    return {
                        success: false,
                        error: canonConfirmRequiredError('snapshot_table_PLAN', 'PLAN', 'PLAN update remains blocked because no explicit existing PLAN row target was resolved for same-date correction'),
                    };
                }
                if (!isSafePlanUpdate(action)) {
                    return {
                        success: false,
                        error: canonConfirmRequiredError('snapshot_table_PLAN', 'PLAN', 'PLAN update is active only for single-tooth, same-date correction flows with an explicit existing PLAN row target'),
                    };
                }
                const fields = {};
                const payload = action.payloadIntent;
                if (!payload) {
                    return {
                        success: false,
                        error: unsupportedActionError('update_snapshot', 'no payload intent'),
                    };
                }
                const intended = payload.intendedChanges;
                if ('pulpTherapy' in intended) {
                    const value = intended.pulpTherapy;
                    if (typeof value === 'string') {
                        const allowed = Object.values(registry.planPulpTherapyOptions);
                        const normalized = normalizeSelectOption(value, allowed, 'Pulp therapy');
                        if (typeof normalized === 'string') {
                            fields[registry.planFields.pulpTherapy.fieldName] = normalized;
                        }
                    }
                }
                if ('restorationDesign' in intended) {
                    const value = intended.restorationDesign;
                    if (typeof value === 'string') {
                        const allowed = Object.values(registry.planRestorationDesignOptions);
                        const normalized = normalizeSelectOption(value, allowed, 'Restoration design');
                        if (typeof normalized === 'string') {
                            fields[registry.planFields.restorationDesign.fieldName] = normalized;
                        }
                    }
                }
                if ('restorationMaterial' in intended) {
                    const value = intended.restorationMaterial;
                    if (typeof value === 'string') {
                        const allowed = Object.values(registry.planRestorationMaterialOptions);
                        const normalized = normalizeSelectOption(value, allowed, 'Restoration material');
                        if (typeof normalized === 'string') {
                            fields[registry.planFields.restorationMaterial.fieldName] = normalized;
                        }
                    }
                }
                if ('implantPlacement' in intended) {
                    const value = intended.implantPlacement;
                    if (typeof value === 'string') {
                        const allowed = Object.values(registry.planImplantPlacementOptions);
                        const normalized = normalizeSelectOption(value, allowed, 'Implant placement');
                        if (typeof normalized === 'string') {
                            fields[registry.planFields.implantPlacement.fieldName] = normalized;
                        }
                    }
                }
                if ('scanFileLink' in intended) {
                    const value = normalizeString(intended.scanFileLink);
                    if (typeof value === 'string') {
                        fields[registry.planFields.scanFileLink.fieldName] = value;
                    }
                }
                return {
                    success: true,
                    request: {
                        table: 'Treatment Plan',
                        recordId,
                        fields,
                    },
                };
            }
            if (branch === 'DR') {
                if (!hasExplicitExistingSnapshotTarget(action)) {
                    return {
                        success: false,
                        error: canonConfirmRequiredError('snapshot_table_DR', 'DR', 'DR update remains blocked because no explicit existing DR row target was resolved for same-date correction'),
                    };
                }
                if (!isSafeDoctorReasoningUpdate(action)) {
                    return {
                        success: false,
                        error: canonConfirmRequiredError('snapshot_table_DR', 'DR', 'DR update is active only for single-tooth, same-date correction flows with an explicit existing DR row target'),
                    };
                }
                const fields = {};
                const payload = action.payloadIntent;
                if (!payload) {
                    return {
                        success: false,
                        error: unsupportedActionError('update_snapshot', 'no payload intent'),
                    };
                }
                const intended = payload.intendedChanges;
                if ('decisionFactors' in intended) {
                    const value = intended.decisionFactors;
                    const allowed = Object.values(registry.doctorReasoningDecisionFactorOptions);
                    const normalized = normalizeMultiSelectOptions(value, allowed, 'Decision factor');
                    if (Array.isArray(normalized)) {
                        fields[registry.doctorReasoningFields.decisionFactor.fieldName] = normalized;
                    }
                }
                if ('remainingCuspThicknessDecision' in intended) {
                    const value = intended.remainingCuspThicknessDecision;
                    if (typeof value === 'string') {
                        const allowed = Object.values(registry.doctorReasoningRemainingCuspThicknessDecisionOptions);
                        const normalized = normalizeSelectOption(value, allowed, 'Remaining cusp thickness decision');
                        if (typeof normalized === 'string') {
                            fields[registry.doctorReasoningFields.remainingCuspThicknessDecision.fieldName] = normalized;
                        }
                    }
                }
                if ('functionalCuspInvolvement' in intended) {
                    const value = intended.functionalCuspInvolvement;
                    if (typeof value === 'string') {
                        const allowed = Object.values(registry.doctorReasoningFunctionalCuspInvolvementOptions);
                        const normalized = normalizeSelectOption(value, allowed, 'Functional cusp involvement');
                        if (typeof normalized === 'string') {
                            fields[registry.doctorReasoningFields.functionalCuspInvolvement.fieldName] =
                                normalized;
                        }
                    }
                }
                if ('crackProgressionRisk' in intended) {
                    const value = intended.crackProgressionRisk;
                    if (typeof value === 'string') {
                        const allowed = Object.values(registry.doctorReasoningCrackProgressionRiskOptions);
                        const normalized = normalizeSelectOption(value, allowed, 'Crack progression risk');
                        if (typeof normalized === 'string') {
                            fields[registry.doctorReasoningFields.crackProgressionRisk.fieldName] =
                                normalized;
                        }
                    }
                }
                if ('occlusalRisk' in intended) {
                    const value = intended.occlusalRisk;
                    if (typeof value === 'string') {
                        const allowed = Object.values(registry.doctorReasoningOcclusalRiskOptions);
                        const normalized = normalizeSelectOption(value, allowed, 'Occlusal risk');
                        if (typeof normalized === 'string') {
                            fields[registry.doctorReasoningFields.occlusalRisk.fieldName] = normalized;
                        }
                    }
                }
                if ('reasoningNotes' in intended) {
                    const value = normalizeString(intended.reasoningNotes);
                    if (typeof value === 'string') {
                        fields[registry.doctorReasoningFields.reasoningNotes.fieldName] = value;
                    }
                }
                return {
                    success: true,
                    request: {
                        table: 'Doctor Reasoning',
                        recordId,
                        fields,
                    },
                };
            }
            if (branch === 'DX') {
                if (!hasExplicitExistingSnapshotTarget(action)) {
                    return {
                        success: false,
                        error: canonConfirmRequiredError('snapshot_table_DX', 'DX', 'DX update remains blocked because no explicit existing DX row target was resolved for same-date correction'),
                    };
                }
                if (!isSafeDiagnosisUpdate(action)) {
                    return {
                        success: false,
                        error: canonConfirmRequiredError('snapshot_table_DX', 'DX', 'DX update is active only for single-tooth, same-date correction flows with an explicit existing DX row target'),
                    };
                }
                const fields = {};
                const payload = action.payloadIntent;
                if (!payload) {
                    return {
                        success: false,
                        error: unsupportedActionError('update_snapshot', 'no payload intent'),
                    };
                }
                const intended = payload.intendedChanges;
                if ('structuralDiagnosis' in intended) {
                    const value = intended.structuralDiagnosis;
                    const allowed = Object.values(registry.diagnosisStructuralDiagnosisOptions);
                    const normalized = normalizeMultiSelectOptions(value, allowed, 'Structural diagnosis');
                    if (Array.isArray(normalized)) {
                        fields[registry.diagnosisFields.structuralDiagnosis.fieldName] = normalized;
                    }
                }
                if ('pulpDiagnosis' in intended) {
                    const value = intended.pulpDiagnosis;
                    if (typeof value === 'string') {
                        const allowed = Object.values(registry.diagnosisPulpDiagnosisOptions);
                        const normalized = normalizeSelectOption(value, allowed, 'Pulp diagnosis');
                        if (typeof normalized === 'string') {
                            fields[registry.diagnosisFields.pulpDiagnosis.fieldName] = normalized;
                        }
                    }
                }
                if ('crackSeverity' in intended) {
                    const value = intended.crackSeverity;
                    if (typeof value === 'string') {
                        const allowed = Object.values(registry.diagnosisCrackSeverityOptions);
                        const normalized = normalizeSelectOption(value, allowed, 'Crack severity');
                        if (typeof normalized === 'string') {
                            fields[registry.diagnosisFields.crackSeverity.fieldName] = normalized;
                        }
                    }
                }
                if ('occlusionRisk' in intended) {
                    const value = intended.occlusionRisk;
                    if (typeof value === 'string') {
                        const allowed = Object.values(registry.diagnosisOcclusionRiskOptions);
                        const normalized = normalizeSelectOption(value, allowed, 'Occlusion risk');
                        if (typeof normalized === 'string') {
                            fields[registry.diagnosisFields.occlusionRisk.fieldName] = normalized;
                        }
                    }
                }
                if ('restorability' in intended) {
                    const value = intended.restorability;
                    if (typeof value === 'string') {
                        const allowed = Object.values(registry.diagnosisRestorabilityOptions);
                        const normalized = normalizeSelectOption(value, allowed, 'Restorability');
                        if (typeof normalized === 'string') {
                            fields[registry.diagnosisFields.restorability.fieldName] = normalized;
                        }
                    }
                }
                return {
                    success: true,
                    request: {
                        table: 'Diagnosis',
                        recordId,
                        fields,
                    },
                };
            }
            if (branch === 'RAD') {
                if (!hasExplicitExistingSnapshotTarget(action)) {
                    return {
                        success: false,
                        error: canonConfirmRequiredError('snapshot_table_RAD', 'RAD', 'RAD update remains blocked because no explicit existing RAD row target was resolved for same-date correction'),
                    };
                }
                if (!isSafeRadiographicFindingsUpdate(action)) {
                    return {
                        success: false,
                        error: canonConfirmRequiredError('snapshot_table_RAD', 'RAD', 'RAD update is active only for single-tooth, same-date correction flows with an explicit existing RAD row target'),
                    };
                }
                const fields = {};
                const payload = action.payloadIntent;
                if (!payload) {
                    return {
                        success: false,
                        error: unsupportedActionError('update_snapshot', 'no payload intent'),
                    };
                }
                const intended = payload.intendedChanges;
                if ('radiographType' in intended) {
                    const value = intended.radiographType;
                    if (typeof value === 'string') {
                        const allowed = Object.values(registry.radiographTypeOptions);
                        const normalized = normalizeSelectOption(value, allowed, 'Radiograph type');
                        if (typeof normalized === 'string') {
                            fields[registry.radiographicFindingsFields.radiographType.fieldName] =
                                normalized;
                        }
                    }
                }
                if ('radiographicCariesDepth' in intended) {
                    const value = intended.radiographicCariesDepth;
                    if (typeof value === 'string') {
                        const allowed = Object.values(registry.radiographicCariesDepthOptions);
                        const normalized = normalizeSelectOption(value, allowed, 'Radiographic caries depth');
                        if (typeof normalized === 'string') {
                            fields[registry.radiographicFindingsFields.radiographicCariesDepth.fieldName] = normalized;
                        }
                    }
                }
                if ('secondaryCaries' in intended) {
                    const value = intended.secondaryCaries;
                    if (typeof value === 'string') {
                        const allowed = Object.values(registry.secondaryCariesOptions);
                        const normalized = normalizeSelectOption(value, allowed, 'Secondary caries');
                        if (typeof normalized === 'string') {
                            fields[registry.radiographicFindingsFields.secondaryCaries.fieldName] =
                                normalized;
                        }
                    }
                }
                if ('cariesLocation' in intended) {
                    const value = intended.cariesLocation;
                    const allowed = Object.values(registry.cariesLocationOptions);
                    const normalized = normalizeMultiSelectOptions(value, allowed, 'Caries location');
                    if (Array.isArray(normalized)) {
                        fields[registry.radiographicFindingsFields.cariesLocation.fieldName] =
                            normalized;
                    }
                }
                if ('pulpChamberSize' in intended) {
                    const value = intended.pulpChamberSize;
                    if (typeof value === 'string') {
                        const allowed = Object.values(registry.pulpChamberSizeOptions);
                        const normalized = normalizeSelectOption(value, allowed, 'Pulp chamber size');
                        if (typeof normalized === 'string') {
                            fields[registry.radiographicFindingsFields.pulpChamberSize.fieldName] =
                                normalized;
                        }
                    }
                }
                if ('periapicalLesion' in intended) {
                    const value = intended.periapicalLesion;
                    if (typeof value === 'string') {
                        const allowed = Object.values(registry.periapicalLesionOptions);
                        const normalized = normalizeSelectOption(value, allowed, 'Periapical lesion');
                        if (typeof normalized === 'string') {
                            fields[registry.radiographicFindingsFields.periapicalLesion.fieldName] =
                                normalized;
                        }
                    }
                }
                if ('radiographicFractureSign' in intended) {
                    const value = intended.radiographicFractureSign;
                    if (typeof value === 'string') {
                        const allowed = Object.values(registry.radiographicFractureSignOptions);
                        const normalized = normalizeSelectOption(value, allowed, 'Radiographic fracture sign');
                        if (typeof normalized === 'string') {
                            fields[registry.radiographicFindingsFields.radiographicFractureSign.fieldName] = normalized;
                        }
                    }
                }
                if ('radiographLink' in intended) {
                    const value = normalizeString(intended.radiographLink);
                    if (typeof value === 'string') {
                        fields[registry.radiographicFindingsFields.radiographLink.fieldName] =
                            value;
                    }
                }
                return {
                    success: true,
                    request: {
                        table: 'Radiographic Findings',
                        recordId,
                        fields,
                    },
                };
            }
            if (branch === 'OP') {
                if (!hasExplicitExistingSnapshotTarget(action)) {
                    return {
                        success: false,
                        error: canonConfirmRequiredError('snapshot_table_OP', 'OP', 'OP update remains blocked because no explicit existing OP row target was resolved for same-date correction'),
                    };
                }
                if (!isSafeOperativeFindingsUpdate(action)) {
                    return {
                        success: false,
                        error: canonConfirmRequiredError('snapshot_table_OP', 'OP', 'OP update is active only for single-tooth, same-date correction flows with an explicit existing OP row target'),
                    };
                }
                const fields = {};
                const payload = action.payloadIntent;
                if (!payload) {
                    return {
                        success: false,
                        error: unsupportedActionError('update_snapshot', 'no payload intent'),
                    };
                }
                const intended = payload.intendedChanges;
                if ('rubberDamIsolation' in intended) {
                    const value = intended.rubberDamIsolation;
                    if (typeof value === 'string') {
                        const allowed = Object.values(registry.rubberDamIsolationOptions);
                        const normalized = normalizeSelectOption(value, allowed, 'Rubber dam isolation');
                        if (typeof normalized === 'string') {
                            fields[registry.operativeFindingsFields.rubberDamIsolation.fieldName] =
                                normalized;
                        }
                    }
                }
                if ('cariesDepthActual' in intended) {
                    const value = intended.cariesDepthActual;
                    if (typeof value === 'string') {
                        const allowed = Object.values(registry.cariesDepthActualOptions);
                        const normalized = normalizeSelectOption(value, allowed, 'Caries depth (actual)');
                        if (typeof normalized === 'string') {
                            fields[registry.operativeFindingsFields.cariesDepthActual.fieldName] =
                                normalized;
                        }
                    }
                }
                if ('softDentinRemaining' in intended) {
                    const value = intended.softDentinRemaining;
                    if (typeof value === 'string') {
                        const allowed = Object.values(registry.softDentinRemainingOptions);
                        const normalized = normalizeSelectOption(value, allowed, 'Soft dentin remaining');
                        if (typeof normalized === 'string') {
                            fields[registry.operativeFindingsFields.softDentinRemaining.fieldName] =
                                normalized;
                        }
                    }
                }
                if ('crackConfirmed' in intended) {
                    const value = intended.crackConfirmed;
                    if (typeof value === 'string') {
                        const allowed = Object.values(registry.crackConfirmedOptions);
                        const normalized = normalizeSelectOption(value, allowed, 'Crack confirmed');
                        if (typeof normalized === 'string') {
                            fields[registry.operativeFindingsFields.crackConfirmed.fieldName] =
                                normalized;
                        }
                    }
                }
                if ('crackLocation' in intended) {
                    const value = intended.crackLocation;
                    const allowed = Object.values(registry.crackLocationOptions);
                    const normalized = normalizeMultiSelectOptions(value, allowed, 'Crack location');
                    if (Array.isArray(normalized)) {
                        fields[registry.operativeFindingsFields.crackLocation.fieldName] =
                            normalized;
                    }
                }
                if ('remainingCuspThicknessMm' in intended) {
                    const value = normalizeNumber(intended.remainingCuspThicknessMm);
                    if (typeof value === 'number') {
                        fields[registry.operativeFindingsFields.remainingCuspThicknessMm.fieldName] = value;
                    }
                }
                if ('subgingivalMargin' in intended) {
                    const value = intended.subgingivalMargin;
                    if (typeof value === 'string') {
                        const allowed = Object.values(registry.operativeSubgingivalMarginOptions);
                        const normalized = normalizeSelectOption(value, allowed, 'Subgingival margin');
                        if (typeof normalized === 'string') {
                            fields[registry.operativeFindingsFields.subgingivalMargin.fieldName] =
                                normalized;
                        }
                    }
                }
                if ('deepMarginalElevation' in intended) {
                    const value = intended.deepMarginalElevation;
                    if (typeof value === 'string') {
                        const allowed = Object.values(registry.deepMarginalElevationOptions);
                        const normalized = normalizeSelectOption(value, allowed, 'Deep marginal elevation');
                        if (typeof normalized === 'string') {
                            fields[registry.operativeFindingsFields.deepMarginalElevation.fieldName] = normalized;
                        }
                    }
                }
                if ('idsResinCoating' in intended) {
                    const value = intended.idsResinCoating;
                    if (typeof value === 'string') {
                        const allowed = Object.values(registry.idsResinCoatingOptions);
                        const normalized = normalizeSelectOption(value, allowed, 'IDS/resin coating');
                        if (typeof normalized === 'string') {
                            fields[registry.operativeFindingsFields.idsResinCoating.fieldName] =
                                normalized;
                        }
                    }
                }
                if ('resinCoreBuildUpType' in intended) {
                    const value = intended.resinCoreBuildUpType;
                    if (typeof value === 'string') {
                        const allowed = Object.values(registry.resinCoreBuildUpTypeOptions);
                        const normalized = normalizeSelectOption(value, allowed, 'Resin core build up type');
                        if (typeof normalized === 'string') {
                            fields[registry.operativeFindingsFields.resinCoreBuildUpType.fieldName] = normalized;
                        }
                    }
                }
                if ('occlusalLoadingTest' in intended) {
                    const value = intended.occlusalLoadingTest;
                    if (typeof value === 'string') {
                        const allowed = Object.values(registry.occlusalLoadingTestOptions);
                        const normalized = normalizeSelectOption(value, allowed, 'Occlusal loading test');
                        if (typeof normalized === 'string') {
                            fields[registry.operativeFindingsFields.occlusalLoadingTest.fieldName] =
                                normalized;
                        }
                    }
                }
                if ('loadingTestResult' in intended) {
                    const value = intended.loadingTestResult;
                    if (typeof value === 'string') {
                        const allowed = Object.values(registry.loadingTestResultOptions);
                        const normalized = normalizeSelectOption(value, allowed, 'Loading test result');
                        if (typeof normalized === 'string') {
                            fields[registry.operativeFindingsFields.loadingTestResult.fieldName] =
                                normalized;
                        }
                    }
                }
                if ('intraoralPhotoLink' in intended) {
                    const value = normalizeString(intended.intraoralPhotoLink);
                    if (typeof value === 'string') {
                        fields[registry.operativeFindingsFields.intraoralPhotoLink.fieldName] =
                            value;
                    }
                }
                return {
                    success: true,
                    request: {
                        table: 'Operative Findings',
                        recordId,
                        fields,
                    },
                };
            }
            if (!recordId || recordId === 'NEW') {
                return {
                    success: false,
                    error: unsupportedActionError('update_snapshot', 'no existing snapshot ID'),
                };
            }
            // PRE update remains active. The non-PRE same-date update surface is now
            // activated only for branches with an explicit existing row target.
            let tableName;
            if (branch === 'PRE') {
                tableName = 'Pre-op Clinical Findings';
            }
            else {
                return {
                    success: false,
                    error: canonConfirmRequiredError(`snapshot_table_${branch}`, branch, `Non-PRE snapshot branch ${branch} is still blocked: schema exists, but branch-specific payload mapping, option coverage, record-name behavior, and create-vs-update/idempotence rules are not yet activated`),
                };
            }
            const fields = {};
            const payload = action.payloadIntent;
            if (!payload) {
                return {
                    success: false,
                    error: unsupportedActionError('update_snapshot', 'no payload intent'),
                };
            }
            const intended = payload.intendedChanges;
            // Update Pre-op fields if present
            if (branch === 'PRE') {
                if ('symptom' in intended) {
                    const symptom = intended.symptom;
                    if (typeof symptom === 'string') {
                        const allowed = Object.values(registry.symptomOptions);
                        const normalized = normalizeSelectOption(symptom, allowed, 'Symptom');
                        if (typeof normalized === 'string') {
                            fields[registry.preOpFields.symptom.fieldName] = normalized;
                        }
                    }
                }
                if ('visibleCrack' in intended) {
                    const crack = intended.visibleCrack;
                    if (typeof crack === 'string') {
                        const allowed = Object.values(registry.visibleCrackOptions);
                        const normalized = normalizeSelectOption(crack, allowed, 'Visible crack');
                        if (typeof normalized === 'string') {
                            fields[registry.preOpFields.visibleCrack.fieldName] = normalized;
                        }
                    }
                }
                // Other fields canon-confirm-required
            }
            return {
                success: true,
                request: {
                    table: tableName,
                    recordId,
                    fields,
                },
            };
        }
        case 'no_op_snapshot': {
            // No-op - return minimal request
            const branch = action.target.branch;
            return {
                success: true,
                request: {
                    table: branch === 'PRE'
                        ? 'Pre-op Clinical Findings'
                        : branch === 'PLAN'
                            ? 'Treatment Plan'
                            : branch === 'DR'
                                ? 'Doctor Reasoning'
                                : branch === 'DX'
                                    ? 'Diagnosis'
                                    : branch === 'RAD'
                                        ? 'Radiographic Findings'
                                        : branch === 'OP'
                                            ? 'Operative Findings'
                                            : 'canon-confirm-required',
                    fields: {},
                },
            };
        }
        default:
            return {
                success: false,
                error: unsupportedActionError(action.actionType, `unknown snapshot action`),
            };
    }
}
function isSafePlanCreate(action) {
    return (action.target.branch === 'PLAN' &&
        action.target.toothNumber !== undefined &&
        action.target.toothNumber !== 'all' &&
        action.target.caseId !== undefined &&
        action.target.caseId !== '' &&
        action.actionType === 'create_snapshot');
}
function isSafePlanUpdate(action) {
    return (action.target.branch === 'PLAN' &&
        action.target.toothNumber !== undefined &&
        action.target.toothNumber !== 'all' &&
        action.target.visitId !== undefined &&
        action.target.visitId !== '' &&
        hasExplicitExistingSnapshotTarget(action) &&
        action.actionType === 'update_snapshot');
}
function isSafeDoctorReasoningCreate(action) {
    return (action.target.branch === 'DR' &&
        action.target.toothNumber !== undefined &&
        action.target.toothNumber !== 'all' &&
        action.target.caseId !== undefined &&
        action.target.caseId !== '' &&
        action.actionType === 'create_snapshot');
}
function isSafeDoctorReasoningUpdate(action) {
    return (action.target.branch === 'DR' &&
        action.target.toothNumber !== undefined &&
        action.target.toothNumber !== 'all' &&
        action.target.visitId !== undefined &&
        action.target.visitId !== '' &&
        hasExplicitExistingSnapshotTarget(action) &&
        action.actionType === 'update_snapshot');
}
function isSafeDiagnosisCreate(action) {
    return (action.target.branch === 'DX' &&
        action.target.toothNumber !== undefined &&
        action.target.toothNumber !== 'all' &&
        action.target.caseId !== undefined &&
        action.target.caseId !== '' &&
        action.actionType === 'create_snapshot');
}
function isSafeDiagnosisUpdate(action) {
    return (action.target.branch === 'DX' &&
        action.target.toothNumber !== undefined &&
        action.target.toothNumber !== 'all' &&
        action.target.visitId !== undefined &&
        action.target.visitId !== '' &&
        hasExplicitExistingSnapshotTarget(action) &&
        action.actionType === 'update_snapshot');
}
function isSafeRadiographicFindingsCreate(action) {
    return (action.target.branch === 'RAD' &&
        action.target.toothNumber !== undefined &&
        action.target.toothNumber !== 'all' &&
        action.target.caseId !== undefined &&
        action.target.caseId !== '' &&
        action.actionType === 'create_snapshot');
}
function isSafeRadiographicFindingsUpdate(action) {
    return (action.target.branch === 'RAD' &&
        action.target.toothNumber !== undefined &&
        action.target.toothNumber !== 'all' &&
        action.target.visitId !== undefined &&
        action.target.visitId !== '' &&
        hasExplicitExistingSnapshotTarget(action) &&
        action.actionType === 'update_snapshot');
}
function isSafeOperativeFindingsCreate(action) {
    return (action.target.branch === 'OP' &&
        action.target.toothNumber !== undefined &&
        action.target.toothNumber !== 'all' &&
        action.target.caseId !== undefined &&
        action.target.caseId !== '' &&
        action.actionType === 'create_snapshot');
}
function isSafeOperativeFindingsUpdate(action) {
    return (action.target.branch === 'OP' &&
        action.target.toothNumber !== undefined &&
        action.target.toothNumber !== 'all' &&
        action.target.visitId !== undefined &&
        action.target.visitId !== '' &&
        hasExplicitExistingSnapshotTarget(action) &&
        action.actionType === 'update_snapshot');
}
function hasExplicitExistingSnapshotTarget(action) {
    return action.target.entityRef !== undefined && action.target.entityRef !== '' && action.target.entityRef !== 'NEW';
}
