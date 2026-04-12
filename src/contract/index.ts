import type { ContractInput, NormalizedContract } from '../types/contract.js';

export interface ContractParser {
  parse(input: ContractInput): Promise<NormalizedContract>;
}
