import type { BonsaiPatch } from './types';
import { archivedFilterPatch } from './archived-filter.patch';
import { messageContentIdsPatch } from './message-content-ids.patch';
import { contextBonsaiGaugePatch } from './context-bonsai-gauge.patch';

export const bonsaiPatches: readonly BonsaiPatch[] = [
  archivedFilterPatch,
  messageContentIdsPatch,
  contextBonsaiGaugePatch,
];
