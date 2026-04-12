import { resolveState } from '../../resolution/index.js';
export async function runResolution(input) {
    return resolveState(input.contract, input.lookupBundle);
}
