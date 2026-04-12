import { buildWritePlan } from '../../write-plan/index.js';
export async function buildPlan(request, resolution) {
    const input = {
        resolution,
        snapshotBranchIntents: deriveSnapshotBranchIntents(request, resolution),
        snapshotLookups: request.lookupBundle.snapshotLookups,
    };
    if (request.contract.inputHash) {
        input.inputHash = request.contract.inputHash;
    }
    return buildWritePlan(input);
}
function deriveSnapshotBranchIntents(request, resolution) {
    const uniqueBranchToothPairs = request.contract.findingsContext.toothItems.flatMap((item) => item.branches.map((branch) => ({
        branch: branch.branch,
        toothNumber: item.toothNumber,
    }))).filter((item, index, items) => items.findIndex((candidate) => candidate.branch === item.branch && candidate.toothNumber === item.toothNumber) === index);
    return uniqueBranchToothPairs.map((item) => ({
        branch: item.branch,
        hasContent: true,
        isSameDateCorrection: resolution.visit.status === 'update_existing_visit_same_date',
        isContinuation: resolution.caseResolution.status === 'continue_case',
        toothNumber: item.toothNumber,
    }));
}
