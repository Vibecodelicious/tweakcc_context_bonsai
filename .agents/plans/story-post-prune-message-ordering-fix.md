# Story: Post-Prune Message Ordering Fix

## Goal

Fix the Claude Code Context Bonsai post-prune provider-request ordering bug by changing archived range omission from marker-file UUID filtering to saved-state positional omission, with boundary repair, while preserving retrieve semantics and proving the behavior on the pinned Claude Code `2.1.156` target.

Work type: bug fix.

User story:

```text
As a Claude Code Context Bonsai user,
I want pruned ranges to be hidden as coherent provider-visible intervals,
So that a successful prune never causes the next model request to be rejected by provider message-ordering rules.
```

## User Model

### User Gamut

- Examples only: Basil or another maintainer validating the Claude Code port against a pinned native artifact and live provider requests.
- Examples only: Daily Claude Code users relying on pruning during long coding sessions where a `400` after prune interrupts active work.
- Examples only: Future port maintainers who need a minimal, evidence-backed fix that does not widen host-runtime patch surface area.
- Examples only: Reviewers auditing non-destructive archive/retrieve behavior and ensuring archived text is not sent to the provider after prune.

### User-Needs Gamut

- Examples only: Successful prune must leave the next provider-bound request valid under Anthropic ordering rules.
- Examples only: Archived content must remain recoverable after retrieve and after session resume.
- Examples only: The fix must work against host-injected reminders whose UUIDs are regenerated per request.
- Examples only: Verification must use the real provider-bound request path, not just session JSONL reasoning.
- Examples only: The implementation must stay small enough to maintain inside a minified-runtime patch with fail-closed anchors.

### Ambiguities From User Model

- Placeholder provider visibility remains an evidence question and is a blocking validation question for this plan. If provider-request capture confirms the placeholder is absent from model-visible context, implementation must stop after recording the evidence and ask Basil whether to expand this story or split a follow-up, because the behavioral contract requires placeholder visibility.
- Users who value compatibility with old marker files may prefer migration behavior, but current normative docs say marker-free behavior and per-message marks are the source of truth. The plan intentionally does not preserve marker-file filtering compatibility.

## Context References

- `docs/prune-ordering-fix-orientation.md:1` - Task orientation and explicit deliverable: produce and validate the plan, do not implement.
- `.llm-conductor/planning_guidance.md:80` - Single-story vs epic triage rule.
- `.llm-conductor/planning_guidance.md:260` - Mandatory validation loop after plan construction.
- `docs/prune-ordering-case-study.md:49` - Root cause: by-ID filtering cannot remove regenerated reminder IDs.
- `docs/prune-ordering-case-study.md:64` - Fix direction: hide by position, repair stranded reminders, retrieve clears marks.
- `docs/runtime-architecture.md:48` - Normative provider message structure and range omission contract.
- `docs/runtime-architecture.md:55` - MUST hide by position, not by ID.
- `docs/runtime-architecture.md:56` - MUST remove stranded reminders and validate the whole resulting list.
- `docs/runtime-architecture.md:57` - MUST recover range edges from saved state on every request.
- `docs/runtime-architecture.md:58` - MUST clear saved archived state on restore.
- `docs/runtime-architecture.md:59` - Verification requirements for interior reminder, boundary reminder, and offline ordering rule.
- `docs/behavioral-contract.md:20` - Successful prune must produce provider-valid message ordering.
- `../docs/context-bonsai-agent-spec.md:144` - Cross-agent prune execution rules and provider-visible coherent interval requirement.
- `../docs/context-bonsai-agent-spec.md:170` - Retrieve execution rules.
- `docs/e2e-protocol.md:90` - Provider-request capture is authoritative for message-ordering claims.
- `docs/e2e-results-2026-05-29-2.1.156.md:5` - Frozen target identity for Claude Code native `2.1.156`.
- `docs/semantic-anchor-analysis-2.1.156.md:24` - Existing archived-filter anchor is the provider-bound message map seam.
- `patches/archived-filter.patch.ts:30` - Current injected filter body reads marker file and filters by UUID membership.
- `src/lib/compact.ts:66` - Current marker-file helper and marker writing path.
- `src/lib/compact.ts:226` - `markMessagesArchived` already writes `archived`, `archivedAt`, and `archivedBy` saved-state marks.
- `src/lib/compact.ts:467` - `unarchiveMessages` clears `archived`, `archivedAt`, and `archivedBy` during retrieve.
- `mcp-server/index.ts:700` - Prune path writes anchor metadata and placeholder summary.
- `mcp-server/index.ts:855` - Retrieve path depends on anchor metadata and summary UUID.
- `patches/archived-filter.patch.test.ts:75` - Existing injected-filter tests assert old marker UUID behavior and must be replaced.
- `src/lib/compact.test.ts:330` - Existing marker-file tests assert old marker state and must be removed or reframed.
- `mcp-server/index.test.ts:296` - Existing prune success test asserts marker file creation and must move to saved-state assertions.

## Acceptance Criteria

- [ ] The archived-filter patch no longer reads `~/.claude/archived-<session>.json` or filters by UUID marker membership.
- [ ] For each `archivedBy` group in the provider-bound message array, the filter removes the inclusive positional stretch from that group's first marked message to its last marked message.
- [ ] Interior unmarked messages between a range's marked edges, including generated `api_system` / provider `system` reminders, are removed with the stretch.
- [ ] After positional omission, boundary repair removes any `system`/`api_system` reminder that is not immediately followed by an assistant-mapped message and is not the last provider-bound message.
- [ ] Boundary repair handles cascading orphan reminders by rechecking until the whole resulting list satisfies the provider ordering rule.
- [ ] Multiple ranges are handled deterministically by collecting all marked ranges, merging overlapping or touching removal spans, and applying removal from the original pre-filter positions.
- [ ] Single marked groups remove only the marked message. At request time, a single marked message is treated as a valid single-message archived range because the saved mark is the only durable edge evidence available to the filter.
- [ ] Malformed marks are ignored: messages with `archived !== true` or missing/non-string `archivedBy` do not participate in span construction.
- [ ] Retrieve by summary UUID clears `archived`, `archivedAt`, `archivedBy`, anchor `context_bonsai_v2`, and placeholder state in `src/lib/compact.ts` so all callers get coherent saved-state restoration.
- [ ] MCP retrieve-by-anchor remains the exposed contract; library-level individual-message retrieval may remain for existing callers but must not be used to claim full range retrieval semantics.
- [ ] Prune no longer writes marker files for provider omission; retrieve no longer depends on marker cleanup for correctness.
- [ ] `getArchivedMarkerPath`, `addArchivedMarkerEntries`, `writeArchivedMarker`, and `removeFromArchivedMarker` are removed unless a non-provider-omission caller is found during implementation; tests must not assert marker-file state after this story.
- [ ] `archived-filter` no longer depends on `findRuntimeHelpers` because the new injected body does not read fs/config/session helpers; anchor selection and sentinel verification remain fail-closed.
- [ ] Unit tests cover interior reminder removal, boundary reminder repair, cascading orphan repair, multiple disjoint ranges, overlapping/touching ranges, single-message range, no archived marks, and retrieve clearing marks.
- [ ] The injected filter is verified against the pinned `2.1.156` artifact with patch application and provider-request capture or equivalent real-runtime harness evidence.
- [ ] A captured provider request after prune contains no archived-only sentinel content and passes the offline ordering rule: every provider `system` message is followed by `assistant` or is last.
- [ ] A captured provider request after prune contains the archive placeholder range, summary, and index terms. If it does not, implementation stops for scope decision rather than claiming this story complete.
- [ ] The plan is approved and committed before implementation begins, per planning guidance.

## Implementation Tasks

1. Update `patches/archived-filter.patch.ts` injected body to use saved per-message marks instead of marker files.
2. Remove archived-filter runtime-helper discovery (`findRuntimeHelpers` and `helpers` parameter) unless implementation discovers another live dependency; the flag-based injected body should need only the selected message-array variable.
3. In the injected body, scan the provider-bound source message list before mapping and collect ranges by `archivedBy` where messages have `archived === true` and non-empty string `archivedBy`.
4. Convert each group to an inclusive `[start,end]` span using first and last original index; sort and merge overlapping or adjacent spans before filtering.
5. Filter the source message list by original index to remove merged spans, preserving original order for all remaining messages.
6. Add boundary repair after span filtering and before provider mapping: repeatedly remove any `api_system` message when the next remaining message is neither assistant-like (`type === "assistant"`) nor absent. Do not add provider-shaped `role` handling unless the real seam proves messages are already provider-shaped.
7. Keep the existing `archived-filter` anchor selection and fail-closed discovery unchanged; only change the injected body at the selected seam.
8. Update `patches/archived-filter.patch.test.ts` to remove marker-file fixtures and execute the patched provider map against messages carrying `archived` and `archivedBy` marks.
9. Update filter tests for the mandatory edge cases: interior reminder, boundary reminder, cascading reminders, multiple disjoint archived ranges, overlapping/touching ranges, single-message range, and no marks.
10. Update `src/lib/compact.ts` to stop writing marker entries during prune/compact paths and remove marker helper exports if no non-provider-omission caller remains.
11. Update `unarchiveMessages` / `retrieveSession` in `src/lib/compact.ts` so summary-UUID retrieve clears saved JSONL flags, removes the summary placeholder, and deletes any `context_bonsai_v2` anchor metadata whose `summary_uuid` matches the retrieved summary.
12. Update `mcp-server/index.ts` prune path to remove `addArchivedMarkerEntries` usage and keep anchor metadata plus summary placeholder behavior intact.
13. Update `src/lib/compact.test.ts` marker-file assertions to saved-state assertions or delete them if they only describe obsolete provider-omission state.
14. Update `mcp-server/index.test.ts` prune success assertions to check saved `archived` / `archivedBy` marks, anchor `context_bonsai_v2`, and placeholder summary rather than marker JSON.
15. Confirm whether the `[ARCHIVED RANGE ...]` placeholder reaches the provider request using provider-request capture. If absent, stop for Basil's scope decision before claiming this story complete.
16. Run local validation commands exactly as listed below.
17. Apply the patch to the pinned `2.1.156` artifact and capture a real provider request for an archived range with an injected reminder inside or at a range edge.
18. Record validation evidence in the implementation notes or a follow-up results doc, without committing credentials, auth config, full session transcripts, or provider secrets.

## Design Decisions

- Plan type: single-story. The work is one coherent bug fix with one runtime behavior goal, even though it touches patch code, mutation cleanup, tests, and e2e evidence.
- Source of truth for omission: per-message `archived` and `archivedBy` marks in saved JSONL. This satisfies recoverability across resume because the request-time filter can infer range edges from marks after session reload.
- Range semantics: group by `archivedBy`, remove from first marked message to last marked message in the provider-bound pre-map list. This intentionally removes unmarked generated reminders inside the interval.
- Multiple/overlap semantics: build all spans against original indexes, sort by start/end, merge spans where `next.start <= current.end + 1`, then filter once. This avoids order-dependent deletion bugs.
- Boundary repair semantics: after span removal, repeatedly remove invalid `api_system` reminders until stable. Apply this to the whole post-filter list because the normative contract requires the whole resulting list to satisfy the provider ordering rule; this is not a saved-transcript mutation.
- Cache-breakpoint semantics: keep the existing provider-map injection seam. The current marker filter already filters the message variable at this seam after cache-breakpoint index set construction, so this story does not introduce a new cache-index class of behavior. Do not move the anchor earlier or weaken anchor selection to recompute cache indexes unless real-provider validation shows cache behavior breaks the request.
- Placeholder scope: provider-request capture must answer whether the placeholder reaches the model. If it does not, implementation pauses for a scope decision because placeholder visibility is part of the behavioral contract.
- Marker files: do not keep provider-omission compatibility for old marker files. They are the root-cause mechanism and are not the normative state model.

## Injected Filter Algorithm Sketch

```js
const ranges = new Map();
for (let i = 0; i < messages.length; i += 1) {
  const msg = messages[i];
  if (msg && msg.archived === true && typeof msg.archivedBy === "string" && msg.archivedBy.length > 0) {
    const prev = ranges.get(msg.archivedBy);
    ranges.set(msg.archivedBy, prev ? [prev[0], i] : [i, i]);
  }
}
const spans = [...ranges.values()].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
const merged = [];
for (const span of spans) {
  const last = merged[merged.length - 1];
  if (last && span[0] <= last[1] + 1) last[1] = Math.max(last[1], span[1]);
  else merged.push([...span]);
}
messages = messages.filter((_, index) => !merged.some(([start, end]) => index >= start && index <= end));
let changed = true;
while (changed) {
  changed = false;
  messages = messages.filter((msg, index, list) => {
    const stranded = msg?.type === "api_system" && list[index + 1] && list[index + 1]?.type !== "assistant";
    if (stranded) changed = true;
    return !stranded;
  });
}
```

The implementation can minify this shape manually in the injected string, but tests should cover this behavior rather than the exact formatting.

## Testing Strategy

- Unit-test the injected filter by applying `archivedFilterPatch` to both existing fixture bundle shapes, then executing the resulting `providerMap` with synthetic internal messages.
- Boundary repair tests should assert internal pre-map `api_system` removal behavior; provider-order tests should assert the mapped output's `{ role: "system" }` ordering rule.
- Include a local helper in tests to assert provider ordering over mapped output: every `{ role: "system" }` item must be followed by `{ role: "assistant" }` or be last.
- Keep anchor-selection tests intact so the semantic seam remains verified against the existing fixtures.
- Use saved-state tests in `compact.test.ts` and `mcp-server/index.test.ts` to prove prune writes marks and retrieve clears marks without relying on marker files.
- Update or avoid marker-specific steps in `docs/e2e-protocol.md` during live validation. The marker-free validation lever is saved JSONL state: create a real prune so messages carry `archived: true` / `archivedBy`, then capture the next provider request and verify archived-only content is absent.
- Run full TypeScript and Bun test suites.
- Run artifact-evidence validation against `2.1.156` to prove the patch still locates the same provider map seam and applies fail-closed.
- Run provider-request capture from `docs/e2e-protocol.md` for the bug shape: an archived range with an interior generated reminder and a boundary-adjacent reminder. Validate both archived content absence and ordering-rule compliance.

## Validation Commands

Every implementation agent must run these exact commands for the pre-implementation starting-state check and completion rerun; no runtime substitution is permitted.

- `bun test`
- `bun run typecheck`
- `bun run e2e/native-e2e.ts artifact-evidence --bundle /tmp/cc-bonsai-artifacts/claude-code/2.1.156/native/extracted.js --manifest /tmp/cc-bonsai-artifacts/claude-code/2.1.156/native/manifest.json --out /tmp/cc-bonsai-e2e/prune-ordering-fix-target-artifact-evidence.json`
- `bun run apply --path /home/basil/.local/share/claude/versions/2.1.156`

Manual/live validation required after commands:

- Use `docs/e2e-protocol.md` Provider-Request Capture with `ANTHROPIC_BASE_URL=http://127.0.0.1:<port>` against the patched pinned `2.1.156` binary.
- Confirm the capture actually filtered by checking an archived-only sentinel string is absent and the provider message count dropped.
- Confirm the captured provider `messages` array satisfies the ordering rule offline.
- Replay or live-send the captured request only if credentials are available and it is safe; provider `200` is strong evidence, provider-request offline validity is still required.

## Planned Target Files

- `.agents/plans/story-post-prune-message-ordering-fix.md`
- `patches/archived-filter.patch.ts`
- `patches/archived-filter.patch.test.ts`
- `src/lib/compact.ts`
- `src/lib/compact.test.ts`
- `mcp-server/index.ts`
- `mcp-server/index.test.ts`
- `docs/e2e-results-<DATE>-prune-ordering-fix.md` if live validation evidence is recorded in-repo

## Worktree Artifact Check

- Checked At: `2026-06-20T20:47:54Z`
- Planned Target Files: `.agents/plans/story-post-prune-message-ordering-fix.md`, `patches/archived-filter.patch.ts`, `patches/archived-filter.patch.test.ts`, `src/lib/compact.ts`, `src/lib/compact.test.ts`, `mcp-server/index.ts`, `mcp-server/index.test.ts`, `docs/e2e-results-<DATE>-prune-ordering-fix.md`
- Overlaps Found (path + class): `.agents/plans/story-post-prune-message-ordering-fix.md -> existing-untracked`; no `tracked-dirty` overlaps for existing implementation target files; `docs/e2e-results-<DATE>-prune-ordering-fix.md` is conditional and not present at check time.
- Escalation Status: none
- Decision Citation: none

## Plan Approval and Commit Status

- Approval Status: approved
- Approval Citation: User requested: "Commit this plan"
- Plan Commit Hash: dc2b6e5
- Ready-for-Orchestration: yes

## Validation Loop Results

- Missing details check: iteration 1 found blocking gaps and plan was updated; iteration 2 found no blocking gaps
- Ambiguity check: iteration 1 found high-impact ambiguities and plan was updated; iteration 2 found no high-impact unresolved ambiguities
- Worktree artifact risk check: iteration 2 confirmed `.agents/plans/story-post-prune-message-ordering-fix.md -> existing-untracked`, no `tracked-dirty` overlaps, no escalation required
- Plan-commit status check: blocked until user approval and plan commit
- Iterations run: 2
