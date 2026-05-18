import type { BonsaiPatch } from './types';
import { archivedFilterPatch } from './archived-filter.patch';

// Requires: Stories 5-6 - remaining real Claude Code patch transforms.
// Integrate in: Stories 5-6 - append patches here in Contract A order.
export const bonsaiPatches: readonly BonsaiPatch[] = [archivedFilterPatch];
