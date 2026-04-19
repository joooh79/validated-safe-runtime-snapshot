import { buildWritePlan } from '../../write-plan/index.js';
export async function buildPlan(request, resolution) {
    const input = {
        resolution,
        snapshotBranchIntents: deriveSnapshotBranchIntents(request, resolution),
        snapshotLookups: request.lookupBundle.snapshotLookups,
        hasVisitLevelChanges: hasVisitLevelChanges(request),
        patientClues: request.contract.patientClues,
        visitContext: request.contract.visitContext,
        toothItems: request.contract.findingsContext.toothItems,
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
    return uniqueBranchToothPairs.map((item) => {
        const branchPayload = request.contract.findingsContext.toothItems
            .find((candidate) => candidate.toothNumber === item.toothNumber)
            ?.branches.find((branch) => branch.branch === item.branch)?.payload ?? {};
        return {
            branch: item.branch,
            hasContent: true,
            isSameDateCorrection: resolution.visit.status === 'update_existing_visit_same_date',
            isContinuation: resolution.caseResolution.status === 'continue_case',
            toothNumber: item.toothNumber,
            payload: { ...branchPayload },
        };
    });
}
function hasVisitLevelChanges(request) {
    const { visitContext } = request.contract;
    return Boolean(visitContext.visitType ||
        visitContext.chiefComplaint ||
        (visitContext.painLevel !== undefined &&
            visitContext.painLevel !== null &&
            String(visitContext.painLevel) !== ''));
}
