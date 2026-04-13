import type { PreparedApiRequest } from '../../types/api.js';
import type { StateResolutionResult } from '../../types/resolution.js';
import type {
  BuildWritePlanInput,
  SnapshotBranchIntent,
} from '../../write-plan/index.js';
import type { SnapshotBranch } from '../../types/core.js';
import { buildWritePlan } from '../../write-plan/index.js';

export async function buildPlan(
  request: PreparedApiRequest,
  resolution: StateResolutionResult,
) {
  const input: BuildWritePlanInput = {
    resolution,
    snapshotBranchIntents: deriveSnapshotBranchIntents(request, resolution),
    snapshotLookups: request.lookupBundle.snapshotLookups,
    hasVisitLevelChanges: hasVisitLevelChanges(request),
  };

  if (request.contract.inputHash) {
    input.inputHash = request.contract.inputHash;
  }

  return buildWritePlan(input);
}

function deriveSnapshotBranchIntents(
  request: PreparedApiRequest,
  resolution: StateResolutionResult,
): SnapshotBranchIntent[] {
  const uniqueBranchToothPairs = request.contract.findingsContext.toothItems.flatMap((item) =>
    item.branches.map((branch) => ({
      branch: branch.branch as SnapshotBranch,
      toothNumber: item.toothNumber,
    })),
  ).filter(
    (item, index, items) =>
      items.findIndex(
        (candidate) =>
          candidate.branch === item.branch && candidate.toothNumber === item.toothNumber,
      ) === index,
  );

  return uniqueBranchToothPairs.map((item) => {
    const branchPayload =
      request.contract.findingsContext.toothItems
        .find((candidate) => candidate.toothNumber === item.toothNumber)
        ?.branches.find((branch) => branch.branch === item.branch)?.payload ?? {};

    return {
      branch: item.branch,
      hasContent: true,
      isSameDateCorrection:
        resolution.visit.status === 'update_existing_visit_same_date',
      isContinuation: resolution.caseResolution.status === 'continue_case',
      toothNumber: item.toothNumber,
      payload: { ...branchPayload },
    };
  });
}

function hasVisitLevelChanges(
  request: PreparedApiRequest,
): boolean {
  const { visitContext } = request.contract;

  return Boolean(
    visitContext.visitType ||
      visitContext.chiefComplaint ||
      (visitContext.painLevel !== undefined &&
        visitContext.painLevel !== null &&
        String(visitContext.painLevel) !== ''),
  );
}
