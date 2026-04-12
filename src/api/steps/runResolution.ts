import type { PreparedApiRequest } from '../../types/api.js';
import { resolveState } from '../../resolution/index.js';

export async function runResolution(input: PreparedApiRequest) {
  return resolveState(input.contract, input.lookupBundle);
}
