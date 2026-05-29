# E2E Results — Prune Guard Detection + Error Surfacing (2026-05-29)

Story: fix-prune-guard-detection-and-error-surfacing. Records evidence for the
Defect A (launch-shape-independent patch detection) and Defect B (deterministic
failures surfaced via MCP `isError`) fixes, plus the NET-NEW bug-shape live e2e
capability (E2E-08).

No credentials, auth files, session transcripts, or `~/.claude` config are
recorded here. The live model-driven run is deferred pending out-of-band provider
credentials; the launch-shape assertion and offline effect analysis are exercised.

## Target

- Runtime: native Claude Code, binary `~/.local/share/claude/versions/2.1.143-cbfix`
  (`claude --version` reports `2.1.143`).
- Side-repo HEAD at time of evidence: the Defect A + Defect B + harness commits on
  this story branch (see story report `git log`).
- Sentinel embedded in the running binary:
  - `grep -a -c '/\*cb:archived-filter:v1\*/' ~/.local/share/claude/versions/2.1.143-cbfix` → `1` (present).

## Non-Interactive Gates

| Command (cwd: tweakcc_context_bonsai) | Exit | Result |
|---|---|---|
| `bun install` | 0 | up to date |
| `bun test` | 0 | 158 pass / 0 fail (9 source files + 1 e2e test file). Includes 6 discovery-layer tests, 3 Defect B result-shape tests, 4 `analyzePruneEffect` tests. `patches/discovery.test.ts` SKIP is the documented missing-artifact skip, not a failure. |
| `bun run typecheck` | 2 | Only the pre-existing baseline `mcp-server/index.test.ts` TS2769 (Buffer overload on the base64 metadata test, unrelated to this story) remains. No new type errors. |

## Defect A — launch-shape-independent detection

- Unit (synthetic `/proc` trees): direct native version-named binary (no
  `--resume`), npm `cli.js`, `--resume`, and no-identifiable-ancestor shapes all
  covered. The native-direct test reconstructs the shipped pre-fix gate logic and
  asserts it yields **zero** candidates (false-refuse) while the fixed exe-walk
  resolves to the actual running binary — fail pre-fix / pass post-fix in one test.
- False-positive guard: a stale patched `cli.js` on disk does NOT satisfy the
  guard when the running binary's exe is unpatched (guard scans exe-of-ancestor
  only).
- Live confirmation (this session, read-only): the new exe-walk surfaced the real
  running binary `~/.local/share/claude/versions/2.1.143-cbfix` among ancestor exe
  links, and `assertRunningClaudeHasArchivedFilterPatch()` returned `true` against
  the live session — the exact launch shape (versioned path, no `--resume`) that
  the pre-fix code false-refused.

## Defect B — failures surfaced via `isError`

- Unit: patch-missing refusal and two other failure paths return `isError === true`
  and are not success-shaped; a success carries no `isError`. Fail pre-fix (against
  commit prior to the Defect B commit, all 3 returned `isError: undefined`), pass
  post-fix. Demonstrated by checking out the pre-Defect-B `index.ts` and re-running
  the suite (3 fail), then restoring (3 pass).

## E2E-08 — Bug-shape live prune guard

### Launch-shape assertion (NET-NEW) — exercised offline

The harness spawns the binary directly (`argv0 = <versioned path>`) and reads
`/proc/<pid>/cmdline`. Verified against a real direct launch using `--version`
(no model drive):

```json
{
  "argv0": "/home/<user>/.local/share/claude/versions/2.1.143-cbfix",
  "argv0IsVersionedBinary": true,
  "hasResumeFlag": false,
  "bugShapeConfirmed": true,
  "cmdline": ["/home/<user>/.local/share/claude/versions/2.1.143-cbfix", "--version"]
}
```

### Effect analysis (`prune-effect`) — exercised offline

`bun run e2e/native-e2e.ts prune-effect --pre-session pre.jsonl --session post.jsonl --from-uuid <a> --to-uuid <b>`:

- Real-prune fixture → `verdict: PASS`, `archivedRangeVisiblePost: false`,
  `placeholderPresentPost: true`, `footprintDropped: true` (footprint chars
  dropped, e.g. 195 → 87). Exit 0.
- Bug-shape fixture (post == pre, no archived flags, no placeholder) →
  `verdict: FAIL`, `archivedRangeVisiblePost: true`, `footprintDropped: false`.
  Exit 1. This is the "success-shaped refusal, content remains" reproduction.

### Live model-driven run — DEFERRED (BLOCKED on credentials)

The full live drive (`prune-guard-live` against the patched binary driving a real
model session, then `prune-effect` over the live pre/post JSONL, then retrieve and
Protocol A) was NOT executed in this iteration: provider credentials are
provisioned out of band and were not available. This is a genuine environmental
precondition (BLOCKED ≠ FAIL). The harness classifies a credential-less drive as
`BLOCKED` (reason code `credentials-missing-in-harness`).

## Exact commands to run once credentials are provisioned

From `tweakcc_context_bonsai` (binary path adjusted to the pinned version):

```bash
# 0. Pre-flight
claude --version | grep '2.1.143'
bun install && bun test && bun run typecheck
grep -a -c '/\*cb:archived-filter:v1\*/' "$HOME/.local/share/claude/versions/2.1.143-cbfix"
bun run apply           # ensure the patch is applied to the runtime under test
claude mcp list         # context-bonsai-prune / context-bonsai-retrieve registered

# 1. Drive ~10 turns establishing ALPHA-PHRASE-001 .. OMEGA-PHRASE-001, then
#    snapshot the pre-prune session JSONL:
cp "$SESSION_FILE" /tmp/cc-bonsai-e2e/<run>/pre.jsonl

# 2. Bug-shape launch + shape assert + live prune drive:
bun run e2e/native-e2e.ts prune-guard-live \
  --binary "$HOME/.local/share/claude/versions/2.1.143-cbfix" \
  --prompt 'Use context-bonsai-prune to archive ALPHA-PHRASE-001..OMEGA-PHRASE-001 with a meaningful summary and index terms; report the anchor id. Do not retrieve in the same step.' \
  --out /tmp/cc-bonsai-e2e/<run>/E2E-08-launch.json

# 3. Snapshot the post-prune JSONL and verify the EFFECT (content removal + drop):
cp "$SESSION_FILE" /tmp/cc-bonsai-e2e/<run>/post.jsonl
bun run e2e/native-e2e.ts prune-effect \
  --pre-session /tmp/cc-bonsai-e2e/<run>/pre.jsonl \
  --session /tmp/cc-bonsai-e2e/<run>/post.jsonl \
  --from-uuid <anchor-uuid> --to-uuid <range-end-uuid> \
  --out /tmp/cc-bonsai-e2e/<run>/E2E-08-effect.json

# 4. Retrieve restores the range (E2E-03), then Secret Prune Oracle (Protocol A):
bun run e2e/native-e2e.ts protocol-a-oracle \
  --session /tmp/cc-bonsai-e2e/<run>/post.jsonl \
  --secret 'SECRET-PHRASE-XYZ-2026-RANDOM' \
  --out /tmp/cc-bonsai-e2e/<run>/E2E-08-oracle.json
```

Pass conditions: `E2E-08-launch.json.launchShape.bugShapeConfirmed == true`,
`E2E-08-effect.json.verdict == "PASS"`, retrieve restores the range, and the
Protocol A oracle reports `valid: true` with the secret only inside archived
original blocks. A `claude`-shim launch does NOT satisfy E2E-08.

## Artifacts (local only — not committed)

- Synthetic fixture outputs under `tweakcc_context_bonsai/.agent_tmp/` (gitignored).
- Live-run artifacts would be written under `/tmp/cc-bonsai-e2e/<run>/`.
