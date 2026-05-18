import type { Installation } from '../apply/tweakcc-api';

export interface PatchContext {
  installation: Installation;
  originalContent: string;
  patchIndex: number;
}

export class BonsaiPatchError extends Error {
  readonly patchName: string;

  constructor(patchName: string, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'BonsaiPatchError';
    this.patchName = patchName;
  }
}

export interface BonsaiPatch {
  name: string;
  sentinel: string;
  apply(content: string, ctx: PatchContext): string;
}
