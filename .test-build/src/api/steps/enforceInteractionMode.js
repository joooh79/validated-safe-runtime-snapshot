export function enforceInteractionMode(resolution, plan) {
    if (plan.readiness === 'preview_only') {
        return 'inform_no_op';
    }
    return resolution.interactionMode;
}
