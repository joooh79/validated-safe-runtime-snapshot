import type {
  ApiConversationInteraction,
  ApiDisplay,
  ApiDisplayFinding,
  ApiDisplaySection,
  ApiReadablePreviewSummary,
  ApiRepresentativeFieldView,
  PreparedApiRequest,
} from '../../types/api.js';
import type { PreviewModel } from '../../types/preview.js';
import type { SnapshotBranch } from '../../types/core.js';
import type { WriteAction, WritePlan } from '../../types/write-plan.js';

const SNAPSHOT_INPUT_FIELD_LABELS: Record<SnapshotBranch, Record<string, string>> = {
  PRE: {
    symptom: 'Symptom',
    symptomReproducible: 'Symptom reproducible',
    visibleCrack: 'Visible crack',
    crackDetectionMethod: 'Crack detection method',
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
  DX: {
    structuralDiagnosis: 'Structural diagnosis',
    pulpDiagnosis: 'Pulp diagnosis',
    crackSeverity: 'Crack severity',
    occlusionRisk: 'Occlusion risk',
    restorability: 'Restorability',
  },
  PLAN: {
    pulpTherapy: 'Pulp therapy',
    restorationDesign: 'Restoration design',
    restorationMaterial: 'Restoration material',
    implantPlacement: 'Implant placement',
    scanFileLink: 'Scan file link',
  },
  DR: {
    decisionFactors: 'Decision factor',
    remainingCuspThicknessDecision: 'Remaining cusp thickness decision',
    functionalCuspInvolvement: 'Functional cusp involvement',
    crackProgressionRisk: 'Crack progression risk',
    occlusalRisk: 'Occlusal risk',
    reasoningNotes: 'Reasoning notes',
  },
};

export function buildDisplay(input: {
  request: PreparedApiRequest;
  preview: PreviewModel;
  plan: WritePlan;
  readablePreview: ApiReadablePreviewSummary;
  interaction: ApiConversationInteraction;
  message: string;
  requiresConfirmation: boolean;
}): ApiDisplay {
  const { request, preview, plan, readablePreview, interaction, message, requiresConfirmation } =
    input;

  return {
    title: preview.title,
    message,
    patient: buildPatientDisplaySection(request, readablePreview, plan),
    visit: buildVisitDisplaySection(request, readablePreview, plan),
    case: buildCaseDisplaySection(request, readablePreview, plan),
    findings: buildFindingsDisplay(readablePreview, plan),
    warnings: [...readablePreview.warnings],
    interaction: {
      userMessage: interaction.userMessage,
      assistantQuestion: interaction.assistantQuestion,
      requiredUserInput: interaction.requiredUserInput,
      numeric_choices: interaction.choiceMap.map((choice) => ({
        number: choice.number,
        label: choice.label,
        meaning: choice.meaning,
        nextTool: choice.nextTool,
      })),
    },
    executionState: {
      executeAllowed: interaction.executeAllowed,
      executeLockedReason: interaction.executeLockedReason,
      nextTool: interaction.choiceMap.find((choice) => choice.nextTool !== 'none')?.nextTool ?? null,
      nextStepType: interaction.nextStepType,
      nextStep: preview.allowedNextSteps[0] ?? plan.preview.nextStep ?? null,
      requiresConfirmation,
    },
  };
}

function buildPatientDisplaySection(
  request: PreparedApiRequest,
  readablePreview: ApiReadablePreviewSummary,
  plan: WritePlan,
): ApiDisplaySection {
  const action = plan.actions.find(
    (candidate) => candidate.entityType === 'patient' && candidate.previewVisible,
  );

  const input_fields = mergeFieldViews(
    [
      buildFieldView('Patient ID', action?.target.patientId ?? request.contract.patientClues.patientId ?? ''),
      buildFieldView(
        'Birth year',
        action?.payloadIntent?.intendedChanges.birthYear ?? request.contract.patientClues.birthYear ?? '',
      ),
      buildFieldView(
        'Gender',
        action?.payloadIntent?.intendedChanges.gender ?? request.contract.patientClues.genderHint ?? '',
      ),
      buildFieldView(
        'First visit date',
        action?.payloadIntent?.intendedChanges.firstVisitDate ?? request.contract.visitContext.visitDate ?? '',
      ),
    ],
    readablePreview.patient_summary.representative_fields,
  );

  return {
    label: readablePreview.patient_summary.label,
    value: readablePreview.patient_summary.value,
    details: [...readablePreview.patient_summary.details],
    input_fields,
    representative_fields: [...readablePreview.patient_summary.representative_fields],
  };
}

function buildVisitDisplaySection(
  request: PreparedApiRequest,
  readablePreview: ApiReadablePreviewSummary,
  plan: WritePlan,
): ApiDisplaySection {
  const action = plan.actions.find(
    (candidate) => candidate.entityType === 'visit' && candidate.previewVisible,
  );
  const intended = action?.payloadIntent?.intendedChanges ?? {};

  const input_fields = mergeFieldViews(
    [
      buildFieldView(
        'Patient ID link',
        intended.patientId ?? request.contract.patientClues.patientId ?? '',
      ),
      buildFieldView('Visit date', intended.date ?? request.contract.visitContext.visitDate ?? ''),
      buildFieldView('Visit type', intended.visitType ?? request.contract.visitContext.visitType ?? ''),
      buildFieldView(
        'Chief complaint',
        intended.chiefComplaint ?? request.contract.visitContext.chiefComplaint ?? '',
      ),
      buildFieldView('Pain level', intended.painLevel ?? request.contract.visitContext.painLevel ?? ''),
      buildFieldView(
        'Doctor confirmed correction',
        request.contract.visitContext.doctorConfirmedCorrection ?? '',
      ),
    ],
    readablePreview.visit_summary.representative_fields,
  );

  return {
    label: readablePreview.visit_summary.label,
    value: readablePreview.visit_summary.value,
    details: [...readablePreview.visit_summary.details],
    input_fields,
    representative_fields: [...readablePreview.visit_summary.representative_fields],
  };
}

function buildCaseDisplaySection(
  request: PreparedApiRequest,
  readablePreview: ApiReadablePreviewSummary,
  plan: WritePlan,
): ApiDisplaySection {
  const caseActions = plan.actions.filter(
    (candidate) =>
      candidate.entityType === 'case' &&
      candidate.previewVisible &&
      candidate.actionType !== 'update_case_latest_synthesis',
  );

  const input_fields = mergeFieldViews(
    [
      buildFieldView(
        'Patient ID',
        joinUniqueValues(caseActions.map((action) => action.target.patientId).filter(isMeaningfulValue)) ||
          request.contract.patientClues.patientId ||
          '',
      ),
      buildFieldView(
        'Tooth number',
        joinUniqueValues(caseActions.map((action) => action.target.toothNumber).filter(isMeaningfulValue)),
      ),
      buildFieldView(
        'Episode start date',
        joinUniqueValues(
          caseActions.map((action) => action.target.episodeStartDate ?? action.target.visitDate).filter(isMeaningfulValue),
        ),
      ),
    ],
    readablePreview.case_summary.representative_fields,
  );

  return {
    label: readablePreview.case_summary.label,
    value: readablePreview.case_summary.value,
    details: [...readablePreview.case_summary.details],
    input_fields,
    representative_fields: [...readablePreview.case_summary.representative_fields],
  };
}

function buildFindingsDisplay(
  readablePreview: ApiReadablePreviewSummary,
  plan: WritePlan,
): ApiDisplayFinding[] {
  return readablePreview.findings.map((finding) => {
    const action = plan.actions.find(
      (candidate) =>
        candidate.entityType === 'snapshot' &&
        candidate.target.branch === finding.branch_code &&
        candidate.target.toothNumber === finding.tooth_number,
    );

    return {
      ...finding,
      input_fields: mergeFieldViews(
        buildSnapshotInputFields(action),
        finding.representative_fields,
      ),
      representative_fields: [...finding.representative_fields],
      field_changes: [...finding.field_changes],
    };
  });
}

function buildSnapshotInputFields(
  action: WriteAction | undefined,
): ApiRepresentativeFieldView[] {
  if (!action || action.entityType !== 'snapshot') {
    return [];
  }

  const branch = action.target.branch;
  if (!branch) {
    return [];
  }

  const fieldLabels = SNAPSHOT_INPUT_FIELD_LABELS[branch];
  const intended = action.payloadIntent?.intendedChanges ?? {};

  return Object.entries(fieldLabels).map(([key, label]) =>
    buildFieldView(label, intended[key] ?? ''),
  );
}

function mergeFieldViews(
  ...groups: ApiRepresentativeFieldView[][]
): ApiRepresentativeFieldView[] {
  const merged = new Map<string, ApiRepresentativeFieldView>();

  for (const group of groups) {
    for (const field of group) {
      if (!field) {
        continue;
      }

      const existing = merged.get(field.field);
      if (!existing) {
        merged.set(field.field, field);
        continue;
      }

      merged.set(field.field, {
        field: existing.field,
        value: field.value,
      });
    }
  }

  return [...merged.values()];
}

function buildFieldView(
  field: string,
  value: unknown,
): ApiRepresentativeFieldView {
  return {
    field,
    value: stringifyValue(value),
  };
}

function stringifyValue(value: unknown): string {
  if (value === undefined || value === null) {
    return '';
  }

  if (Array.isArray(value)) {
    return value.map((item) => stringifyValue(item)).join(', ');
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return JSON.stringify(value);
}

function isMeaningfulValue(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value !== 'NEW';
}

function joinUniqueValues(values: string[]): string {
  return [...new Set(values)].join(', ');
}
