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

`bun run e2e/native-e2e.ts prune-effect --pre-session pre.jsonl --session post.jsonl --from-uuid <a> --to-uuid <b>`.
Archival is detected from the **top-level `message.archived` flag** and the
**marker file** (`~/.claude/archived-<sessionId>.json`), matching the real runtime
shape; the footprint metric is scoped to the archived range's rows. Unit fixtures
in `e2e/native-e2e.test.ts` use that real shape and cover:

- Real-prune via top-level flag → `verdict: PASS`, `archivedRangeVisiblePost: false`,
  `placeholderPresentPost: true`, `rangeVisibleCharsPost: 0` (< pre), `footprintDropped: true`.
- Real-prune via marker file only (rows lack the top-level flag) → `verdict: PASS`,
  proving the marker path works independently.
- Bug-shape (post == pre, no archived flag, no marker, no placeholder) →
  `verdict: FAIL`, `archivedRangeVisiblePost: true`, `footprintDropped: false`. This
  is the "success-shaped refusal, content remains" reproduction.
- Archived-but-no-placeholder → `FAIL`; range-absent-pre → `BLOCKED`.

## Live Model-Driven Run — EXECUTED 2026-05-29 (ambient OAuth login)

Phase 0 resolved: driven on this machine using the ambient Claude OAuth login
already present on the host; no API key used. Headless `claude -p` confirmed
working against the login (probe returned `is_error: false`). Launched binary:
`~/.local/share/claude/versions/2.1.143-cbfix`, `--version` → `2.1.143 (Claude Code)`.
MCP server registered top-level in `~/.claude.json` pointing at the on-disk
`mcp-server/index.ts`, so each fresh session loads the now-fixed guard code.
All `claude` runs were bounded `timeout`-wrapped foreground commands.

Boundary phrases used (not secrets): `ALPHA-PHRASE-7Q2` / `OMEGA-PHRASE-9Z8` /
`KEEP-TOPIC-444`. The faithful bug shape (existing session continued without a
`--resume` token) is launched with `-c` (continue) by the versioned path:
`exec -a <binary> <binary> -c -p <prompt>`. `-c` attaches to the existing cwd
session while keeping `argv` free of any `--resume` token, exactly Basil's shape.

### Scenario 1 — `prune-guard-live` / direct launch: PASS

- Command (effect run): `exec -a $BIN $BIN -c -p '<prune prompt>' --output-format json`
  with `$BIN=~/.local/share/claude/versions/2.1.143-cbfix`, cwd = seeded scratch project.
- Launch shape captured live from `/proc/<pid>/cmdline`: `argv0` =
  `/home/<user>/.local/share/claude/versions/2.1.143-cbfix`, no `--resume` token →
  **bugShapeConfirmed = true** (`HAS_RESUME=false`). Drive exit 0, `is_error: false`,
  session continued (same id as the seed).
- The prune was **ALLOWED** (not the old success-shaped refusal): tool_result
  `Prune complete. anchor_id=baa7ad00…` (= `ALPHA-PHRASE-7Q2` row); decoded metadata
  `range_end_id=8359d589…` (= `OMEGA-PHRASE-9Z8` row) — a real contiguous range. The
  fixed guard detected the patch via the ancestor-exe walk for the no-`--resume`
  versioned-path launch and permitted the prune. (Verdict from session JSONL +
  tool_result, not a bare success string.)

### Scenario 2 — content removal + input-token footprint drop: PASS (behavioral/host-state)

Authoritative evidence is host state: behavioral recall under the patched runtime
plus the model-visible transcript prefix size. Verified against the actual session.

- Archive marker file `~/.claude/archived-<sid>.json` listed the 5 user/assistant
  UUIDs spanning `ALPHA…OMEGA` and **excluded** `KEEP-TOPIC-444`. A placeholder
  `summary` row (`[ARCHIVED RANGE baa7ad00..8359d589]`) replaced the range. This is
  the list the archived-filter patch uses to hide rows from the model-visible view.
- Behavioral recall of the pruned content (disposable calculation), tools forbidden:
  - PRE-prune (sibling session, full content, no marker), patched binary →
    model recalled the calculation; **model-visible transcript prefix = 26704 cache_read tokens**.
  - POST-prune (same content, marker present → filter hides the range), patched binary →
    model replied exactly `NOT_IN_CONTEXT`; **prefix = 17686 cache_read tokens**.
  - **Footprint drop ≈ 9018 tokens** (26704 → 17686): the archived range is no longer
    in the model-visible context, and the model cannot recall it. range-hidden = true.
- Cross-check under the STOCK unpatched binary (`2.1.149`, sentinel count 0) resuming
  the post-prune session: higher new-content footprint (`cache_creation` 12706 vs the
  patched 8404), confirming the unpatched runtime still carries the archived rows.

**Oracle correction (iteration 2):** the first iteration's `prune-effect`
JSONL-diff oracle read a field the runtime never writes — a per-row
`context_bonsai_v2.archived` flag — so it false-FAILed on every correct prune.
The runtime actually records archival as a **top-level `message.archived` flag**
on each archived user/assistant row (plus `archivedAt`/`archivedBy`), and persists
the archived-UUID set to the **marker file `~/.claude/archived-<sessionId>.json`**
(`addArchivedMarkerEntries`); only the anchor row carries `context_bonsai_v2`, and
the placeholder summary carries `context_bonsai_v2.anchor_id`. Confirmed at
`src/lib/compact.ts:278-280,307-309` (top-level flag) and `:86-113` (marker file).
`prune-effect` now reads the top-level flag and the marker file, and scopes the
footprint metric to the archived range's rows specifically (so the drive turn's
appended verbatim tool_result echo can no longer inflate a whole-transcript count).

Re-run against the retained live snapshots (no new model run) through the oracle's
**own** verdict rule:

```
verdict: PASS
archivedRangeVisiblePost: false
placeholderPresentPost: true
rangeVisibleCharsPre: 266  ->  rangeVisibleCharsPost: 0
footprintDropped: true        (exit 0)
```

i.e. the archived range contributed 266 model-visible characters pre-prune and 0
post-prune (hidden by the top-level flag + marker), automatically PASS. This agrees
with the behavioral/token evidence above (≈9018-token model-visible prefix drop and
the `NOT_IN_CONTEXT` recall).

### Scenario 3 — Protocol A secret oracle: PASS

Separate fresh session. Disposable secret `SECRET-PHRASE-XYZ-2026-<random>` seeded
inside a block bounded by `BOUNDARY-OPEN-START` / `BOUNDARY-CLOSE-END` (secret value
kept only in a local /tmp file, never printed to logs/artifacts/commits).

- Prune driven by the bug shape (`-c`, no `--resume`, versioned-path argv0),
  referring to the boundary markers only — the secret value was never placed in
  `from_pattern`, `to_pattern`, `summary`, or `index_terms`. Verified from the post
  JSONL: secret occurrences in prune tool_use input = 0; in placeholder summary = 0.
  Prune allowed, `anchor_id=dd3d2fa6…`, marker listed 7 UUIDs covering the range
  (the secret-bearing user row `2e0b5975…` is one of the 7 in-range rows).
  The model also exercised the ambiguity-retry path (first attempt matched multiple,
  retried with more specific patterns) and succeeded.
- POST-prune recall, tools forbidden (`--disallowedTools` prune+retrieve): model
  replied exactly `NOT_IN_CONTEXT`; secret_in_output = false. secret-present-before-
  retrieve (model-visible) = false.
- RETRIEVE by `anchor_id`: `is_error: false`, range restored, marker file cleared
  (archived count → 0, anchor no longer listed).
- POST-retrieve recall, tools forbidden: model reproduced the secret verbatim;
  secret_in_output = true. secret-present-after-retrieve (model-visible) = true.
- Non-destructive round-trip confirmed: prune hides the secret, retrieve restores it.

**Oracle correction (iteration 2):** the first iteration's `protocol-a-oracle`
read the same wrong field (`context_bonsai_v2.archived`) and so false-FAILed
(`valid: false`) even though the secret row is archived. The corrected oracle reads
the **top-level `message.archived` flag** and the **marker file**. The retained
post-prune snapshot was captured right after the prune (before retrieve), and the
secret-bearing user row `2e0b5975…` carries top-level `archived: true` there (one of
the 7 archived range rows), so the oracle resolves it automatically — no marker
needed (the live marker for this session was later cleared by the retrieve step).

Re-run against the retained post-prune snapshot through the oracle's **own** rule:

```
valid: true
verdict: PASS: secret appears only in archived original blocks
occurrenceCount: 1   invalidOccurrenceCount: 0
occurrence: { type: "user", archived: true, summary: false }   (exit 0)
```

This agrees with the behavioral result (`NOT_IN_CONTEXT` post-prune; secret restored
only after retrieve).

## Verdict Summary

| Scenario | Verdict | Grounding evidence |
|---|---|---|
| 1 prune-guard-live (direct launch, no `--resume`) | PASS | `/proc/<pid>/cmdline` argv0 = versioned path, no `--resume`; prune ALLOWED with real range `baa7ad00..8359d589` |
| 2 content removal + footprint drop | PASS | `prune-effect` → `verdict: PASS` (rangeVisibleChars 266 → 0, footprintDropped); corroborated by model-visible prefix 26704 → 17686 (≈9018-token drop) and recall PRE = calculation, POST = `NOT_IN_CONTEXT` |
| 3 Protocol A secret oracle | PASS | `protocol-a-oracle` → `valid: true`; secret absent from prune patterns/summary/index (0/0); POST-prune recall = `NOT_IN_CONTEXT`; after retrieve recall = secret restored |

The two offline oracles (`prune-effect`, `protocol-a-oracle`) now read archival
from the **top-level `message.archived` flag** and the **marker file**
(`~/.claude/archived-<sessionId>.json`) — NOT the per-row `context_bonsai_v2.archived`
field the runtime never writes — so they PASS E2E-08 automatically through their own
verdict rules against the retained live snapshots. The behavioral/host-state evidence
remains the load-bearing authority and agrees with the oracle verdicts; verdicts are
never taken from the tool's success string. The earlier iteration's notes describing
these oracles as false-FAILing have been superseded by this fix.

## Artifacts (local only — not committed)

- Live-run JSON and pre/post session snapshots under
  `/tmp/cc-bonsai-e2e/<utc>-*/` (launch result, recall outputs, oracle output,
  pre/post JSONL). Disposable secret value stored only in a local /tmp file.
- No secrets, credentials, auth paths, or full transcripts are committed.
