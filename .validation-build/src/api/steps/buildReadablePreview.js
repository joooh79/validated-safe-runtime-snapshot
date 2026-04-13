const SNAPSHOT_FIELD_LABELS = {
    PRE: {
        symptom: 'Symptom',
        symptomReproducible: 'Symptom reproducible',
        visibleCrack: 'Visible crack',
        crackDetectionMethod: 'Crack detection method',
    },
    PLAN: {
        pulpTherapy: 'Pulp therapy',
        restorationDesign: 'Restoration design',
        restorationMaterial: 'Restoration material',
        implantPlacement: 'Implant placement',
        scanFileLink: 'Scan file link',
    },
    DR: {
        decisionFactor: 'Decision factor',
        remainingCuspThicknessDecision: 'Remaining cusp thickness decision',
        functionalCuspInvolvement: 'Functional cusp involvement',
        crackProgressionRisk: 'Crack progression risk',
        occlusalRisk: 'Occlusal risk',
        reasoningNotes: 'Reasoning notes',
    },
    DX: {
        structuralDiagnosis: 'Structural diagnosis',
        pulpDiagnosis: 'Pulp diagnosis',
        crackSeverity: 'Crack severity',
        occlusionRisk: 'Occlusion risk',
        restorability: 'Restorability',
    },
    RAD: {
        radiographType: 'Radiograph type',
        radiographicCariesDepth: 'Radiographic caries depth',
        secondaryCaries: 'Secondary caries',
        cariesLocation: 'Caries location',
        pulpChamberSize: 'Pulp chamber size',
        periapicalLesion: 'Periapical lesion',
        radiographicFractureSign: 'Radiographic fracture sign',
        radiographLink: 'Radiograph link',
    },
    OP: {
        rubberDamIsolation: 'Rubber dam isolation',
        cariesDepthActual: 'Caries depth (actual)',
        softDentinRemaining: 'Soft dentin remaining',
        crackConfirmed: 'Crack confirmed',
        crackLocation: 'Crack location',
        remainingCuspThicknessMm: 'Remaining cusp thickness (mm)',
        subgingivalMargin: 'Subgingival margin',
        deepMarginalElevation: 'Deep marginal elevation',
        idsResinCoating: 'IDS/resin coating',
        resinCoreBuildUpType: 'Resin core build up type',
        occlusalLoadingTest: 'Occlusal loading test',
        loadingTestResult: 'Loading test result',
        intraoralPhotoLink: 'Intraoral photo link',
    },
};
export function buildReadablePreview(request, preview, plan) {
    const findings = buildFindingSummaries(request, preview, plan);
    return {
        claim_label: [
            preview.patientBlock.value,
            preview.visitBlock.value,
            preview.caseBlock.value,
        ]
            .filter(Boolean)
            .join(' / '),
        patient_summary: buildPatientSummary(request, preview),
        visit_summary: buildVisitSummary(request, preview),
        case_summary: buildCaseSummary(request, preview, plan),
        findings,
        warnings: [...preview.warnings],
    };
}
function buildPatientSummary(request, preview) {
    const representative_fields = [];
    const { patientClues } = request.contract;
    if (patientClues.patientId) {
        representative_fields.push({
            field: 'Patient ID',
            value: String(patientClues.patientId),
        });
    }
    if (patientClues.birthYear !== undefined) {
        representative_fields.push({
            field: 'Birth year',
            value: String(patientClues.birthYear),
        });
    }
    if (patientClues.genderHint) {
        representative_fields.push({
            field: 'Gender hint',
            value: patientClues.genderHint,
        });
    }
    return {
        label: preview.patientBlock.label,
        value: preview.patientBlock.value,
        details: [...(preview.patientBlock.details ?? [])],
        representative_fields,
    };
}
function buildVisitSummary(request, preview) {
    const representative_fields = [];
    const { visitContext } = request.contract;
    if (visitContext.visitDate) {
        representative_fields.push({
            field: 'Visit date',
            value: visitContext.visitDate,
        });
    }
    if (visitContext.targetVisitDate) {
        representative_fields.push({
            field: 'Target visit date',
            value: visitContext.targetVisitDate,
        });
    }
    if (visitContext.visitType) {
        representative_fields.push({
            field: 'Visit type',
            value: visitContext.visitType,
        });
    }
    if (visitContext.chiefComplaint) {
        representative_fields.push({
            field: 'Chief complaint',
            value: visitContext.chiefComplaint,
        });
    }
    if (visitContext.painLevel !== undefined &&
        visitContext.painLevel !== null &&
        String(visitContext.painLevel) !== '') {
        representative_fields.push({
            field: 'Pain level',
            value: String(visitContext.painLevel),
        });
    }
    if (visitContext.doctorConfirmedCorrection !== undefined) {
        representative_fields.push({
            field: 'Doctor confirmed correction',
            value: String(visitContext.doctorConfirmedCorrection),
        });
    }
    return {
        label: preview.visitBlock.label,
        value: preview.visitBlock.value,
        details: [...(preview.visitBlock.details ?? [])],
        representative_fields,
    };
}
function buildCaseSummary(request, preview, plan) {
    const representative_fields = [];
    const caseResolution = plan.resolution.caseResolution;
    if (request.contract.continuityIntent && request.contract.continuityIntent !== 'none') {
        representative_fields.push({
            field: 'Continuity intent',
            value: request.contract.continuityIntent,
        });
    }
    if (caseResolution.resolvedCaseId) {
        representative_fields.push({
            field: 'Resolved case ID',
            value: caseResolution.resolvedCaseId,
        });
    }
    if (caseResolution.toothNumber) {
        representative_fields.push({
            field: 'Tooth number',
            value: caseResolution.toothNumber,
        });
    }
    return {
        label: preview.caseBlock.label,
        value: preview.caseBlock.value,
        details: [...(preview.caseBlock.details ?? [])],
        representative_fields,
    };
}
function buildFindingSummaries(request, preview, plan) {
    const actionIndex = new Map();
    for (const action of plan.actions) {
        if (action.entityType !== 'snapshot') {
            continue;
        }
        const branch = action.target.branch;
        const toothNumber = action.target.toothNumber;
        if (!branch || !toothNumber) {
            continue;
        }
        actionIndex.set(`${branch}:${toothNumber}`, action);
    }
    const findings = request.contract.findingsContext.toothItems.flatMap((item) => item.branches.map((branchPayload, index) => {
        const lookupKey = `${branchPayload.branch}:${item.toothNumber}`;
        const action = actionIndex.get(lookupKey);
        const matchingPreviewBlock = preview.snapshotBlocks.find((block) => block.label === `Snapshot ${branchPayload.branch}` &&
            block.value.includes(item.toothNumber));
        const representative_fields = pickRepresentativeFields(branchPayload.branch, branchPayload.payload);
        return {
            no: index + 1,
            branch_code: branchPayload.branch,
            tooth_number: item.toothNumber,
            action: toFindingAction(action?.actionType),
            label: matchingPreviewBlock?.label ?? `Snapshot ${branchPayload.branch}`,
            value: matchingPreviewBlock?.value ??
                `${toFindingAction(action?.actionType)} snapshot for tooth ${item.toothNumber}`,
            representative_fields,
            entered_field_count: representative_fields.length,
        };
    }));
    return findings.map((finding, index) => ({
        ...finding,
        no: index + 1,
    }));
}
function pickRepresentativeFields(branch, payload) {
    const allowedFields = SNAPSHOT_FIELD_LABELS[branch];
    return Object.entries(allowedFields).flatMap(([fieldKey, fieldLabel]) => {
        const value = payload[fieldKey];
        if (value === undefined ||
            value === null ||
            value === '' ||
            (Array.isArray(value) && value.length === 0)) {
            return [];
        }
        return [
            {
                field: fieldLabel,
                value: formatRepresentativeValue(value),
            },
        ];
    });
}
function toFindingAction(actionType) {
    switch (actionType) {
        case 'update_snapshot':
            return 'update';
        case 'create_snapshot':
            return 'create';
        default:
            return 'no_op';
    }
}
function formatRepresentativeValue(value) {
    if (Array.isArray(value)) {
        return value.map((item) => String(item)).join(', ');
    }
    if (typeof value === 'object') {
        return JSON.stringify(value);
    }
    return String(value);
}
