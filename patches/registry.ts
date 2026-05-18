import type { BonsaiPatch } from './types';
import { archivedFilterPatch } from './archived-filter.patch';
import { messageContentIdsPatch } from './message-content-ids.patch';

// Requires: Story 6 - remaining real Claude Code patch transform.
// Integrate in: Story 6 - append the gauge patch here in Contract A order.
export const bonsaiPatches: readonly BonsaiPatch[] = [archivedFilterPatch, messageContentIdsPatch];
