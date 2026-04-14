const WRITABLE_SNAPSHOT_FIELDS = {
    PRE: ['symptom', 'symptomReproducible', 'visibleCrack', 'crackDetectionMethod'],
    PLAN: [
        'pulpTherapy',
        'restorationDesign',
        'restorationMaterial',
        'implantPlacement',
        'scanFileLink',
    ],
    DR: [
        'decisionFactors',
        'remainingCuspThicknessDecision',
        'functionalCuspInvolvement',
        'crackProgressionRisk',
        'occlusalRisk',
        'reasoningNotes',
    ],
    DX: [
        'structuralDiagnosis',
        'pulpDiagnosis',
        'crackSeverity',
        'occlusionRisk',
        'restorability',
    ],
    RAD: [
        'radiographType',
        'radiographicCariesDepth',
        'secondaryCaries',
        'cariesLocation',
        'pulpChamberSize',
        'periapicalLesion',
        'radiographicFractureSign',
        'radiographLink',
    ],
    OP: [
        'rubberDamIsolation',
        'cariesDepthActual',
        'softDentinRemaining',
        'crackConfirmed',
        'crackLocation',
        'remainingCuspThicknessMm',
        'subgingivalMargin',
        'deepMarginalElevation',
        'idsResinCoating',
        'resinCoreBuildUpType',
        'occlusalLoadingTest',
        'loadingTestResult',
        'intraoralPhotoLink',
    ],
};
export function extractWritableSnapshotIntendedChanges(branch, payload) {
    const allowedFields = WRITABLE_SNAPSHOT_FIELDS[branch] ?? [];
    return Object.fromEntries(allowedFields.flatMap((field) => {
        if (!(field in payload)) {
            return [];
        }
        const value = payload[field];
        if (value === undefined ||
            value === null ||
            value === '' ||
            (Array.isArray(value) && value.length === 0)) {
            return [];
        }
        return [[field, value]];
    }));
}
export function snapshotBranchIntentProducesWrite(intent, snapshotLookups) {
    if (!intent.hasContent) {
        return false;
    }
    if (!intent.isSameDateCorrection) {
        return true;
    }
    return !shouldCollapseSnapshotUpdateToNoOp(snapshotLookups, intent.branch, intent.toothNumber, extractWritableSnapshotIntendedChanges(intent.branch, intent.payload ?? {}));
}
export function shouldCollapseSnapshotUpdateToNoOp(snapshotLookups, branch, toothNumber, intendedChanges) {
    if (!toothNumber || toothNumber === 'all') {
        return false;
    }
    if (Object.keys(intendedChanges).length === 0) {
        return false;
    }
    const snapshotLookup = snapshotLookups?.[branch]?.[toothNumber];
    if (!snapshotLookup?.found || !snapshotLookup.currentValues) {
        return false;
    }
    return Object.entries(intendedChanges).every(([field, incomingValue]) => areSnapshotValuesEqual(branch, field, incomingValue, snapshotLookup.currentValues?.[field]));
}
function areSnapshotValuesEqual(branch, field, incomingValue, currentValue) {
    return JSON.stringify(normalizeSnapshotComparableValue(branch, field, incomingValue)) ===
        JSON.stringify(normalizeSnapshotComparableValue(branch, field, currentValue));
}
function normalizeSnapshotComparableValue(branch, field, value) {
    if (branch === 'PRE' && field === 'symptom') {
        return normalizeStringList(value);
    }
    if (Array.isArray(value)) {
        return normalizeStringList(value);
    }
    if (typeof value === 'number') {
        return value;
    }
    if (value === undefined || value === null) {
        return '';
    }
    return String(value).trim();
}
function normalizeStringList(value) {
    const values = Array.isArray(value)
        ? value
        : value === undefined || value === null || value === ''
            ? []
            : [value];
    return [...new Set(values.map((item) => String(item).trim()).filter(Boolean))].sort();
}
