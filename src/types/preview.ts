import type { InteractionMode } from './core.js';

export interface PreviewBlock {
  label: string;
  value: string;
  details?: string[];
}

export type PreviewNextStep =
  | 'confirm_send'
  | 'revise_and_preview_again'
  | 'cancel'
  | 'submit_correction'
  | 'submit_recheck';

export interface PreviewModel {
  interactionMode: InteractionMode;
  title: string;
  message: string;
  patientBlock: PreviewBlock;
  visitBlock: PreviewBlock;
  caseBlock: PreviewBlock;
  snapshotBlocks: PreviewBlock[];
  warnings: string[];
  allowedNextSteps: PreviewNextStep[];
}
