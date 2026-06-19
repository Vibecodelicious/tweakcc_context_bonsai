# Context Bonsai E2E Protocol — Claude Code (tweakcc)

## Test Metadata

- Implementation name: tweakcc Context Bonsai for Claude Code
- Repository root: repo-local `tweakcc_context_bonsai/` checkout under test
- Runtime entry point: native `claude` (Anthropic Claude Code CLI), primary target Claude Code native `2.1.156` Linux x64
- Session storage location: `~/.claude/projects/<project-hash>/<session-id>.jsonl`
- Tool transport: MCP stdio (registered in `~/.claude.json` `mcpServers.context-bonsai`)
- Runtime patch path: tweakcc 4.0 apply harness, `cd tweakcc_context_bonsai && bun run apply`
- Model/provider under test: Anthropic Claude (whichever the local Claude Code is configured for)
- Date: fill in per run
- Operator: fill in per run

## Scope

This protocol validates Context Bonsai integration behavior for native Claude Code via the `tweakcc_context_bonsai` MCP server plus the tweakcc 4.0 patch transforms. Do not modify implementation code during the run unless this run is part of an explicit fix loop.

Full PASS is a release gate for the Claude Code port. A run is not a full PASS unless the install-procedure scenario, E2E-01..07, Protocol A, and the pinned-target artifact evidence all PASS for native Claude Code.

## Required Scenario Set

Per the cross-agent template at `docs/context-bonsai-e2e-template.md`:

| ID | Scenario | Required outcome |
|---|---|---|
| E2E-00 | Clean install procedure | Fresh fly.io sprite runs documented commands verbatim; patches land; MCP tools are registered and functional; prune measurably reduces model-facing context |
| E2E-01 | Contiguous prune success | Bounded range archived; placeholder visible in subsequent turns; JSONL mutation atomic |
| E2E-02 | Boundary ambiguity / unresolved rejection | Deterministic plain-text error; no JSONL mutation |
| E2E-03 | Retrieve by anchor success | Archived range visible again; placeholder effect gone |
| E2E-04 | Gauge cadence and severity | Gauge text appears in tool-response output (and in tweakcc UI patches if applied); cadence matches the cross-agent spec §7 thresholds |
| E2E-05 | Compatibility error path | Missing JSONL or schema-mismatch produces a deterministic compatibility error; no mutation |
| E2E-06 | Persistence across resume | Archived state survives `claude --resume <session-id>`; the optional tweakcc `archivedFilter` patch hides the archived range from the live transcript view |
| E2E-07 | Secret prune oracle | After prune, model cannot reveal the pruned secret from active context alone |
| E2E-08 | Bug-shape prune guard (direct versioned-path launch, no `--resume`) | The native binary launched directly by its versioned path (e.g. `~/.local/share/claude/versions/2.1.156`) with no `--resume` allows a prune; the archived range is actually removed from the model-visible transcript (content removal + input-token-footprint drop), and retrieve restores it. Pre-fix code reproduces the success-shaped refusal that archives nothing |

## Pre-Flight

Run before every e2e session:

```bash
# Runtime present
claude --version

# Side-repo tests pass
cd /path/to/tweakcc_context_bonsai
bun run typecheck
bun test

# MCP server registered
bun -e 'const c=await Bun.file(`${process.env.HOME}/.claude.json`).json(); if(!JSON.stringify(c.mcpServers||{}).includes("context-bonsai")) process.exit(1)'

# Patches applied to the runtime under test
bun run apply

# Bare repo + working tree healthy
cd /path/to/tweakcc_context_bonsai
git status --short
git log --oneline -1

# Target artifact evidence available or explicitly blocked
bun run e2e/native-e2e.ts artifact-evidence --out /tmp/cc-bonsai-e2e/target-evidence.json

# Artifact dir for this run
mkdir -p /tmp/cc-bonsai-e2e/$(date -u +%Y%m%dT%H%M%SZ)
```

Expected pre-flight result:

- `claude --version` reports a known build
- `bun run typecheck` and `bun test` pass
- `~/.claude.json` contains a `context-bonsai` entry pointing to `tweakcc_context_bonsai/mcp-server/index.ts`
- `bun run apply` reports `Context Bonsai apply complete` or `Context Bonsai already patched`
- The side repo is clean
- Target artifact evidence is written, or the run is BLOCKED before release-gate PASS is claimed

If a required dependency is unavailable, classify the run as `BLOCKED`.

## Evidence Sources

- Live JSONL: `~/.claude/projects/<project-hash>/<session-id>.jsonl` (read after each turn).
- Archive marker file: `~/.claude/archived-<session-id>.json` (written by `addArchivedMarkerEntries`).
- Tool-response stdout from MCP (visible in Claude Code's transcript as `tool_result` blocks).
- Optional: tweakcc UI capture (TUI screenshot or `script(1)` log) if patches applied.
- Pinned-target artifact evidence: the frozen native `2.1.156` `extracted.js` + `manifest.json` (stored out-of-repo under `/tmp/cc-bonsai-artifacts/claude-code/2.1.156/native/` per the Evidence Retention Policy; pass via `--bundle`/`--manifest`), and the run's evidence JSON.
- Provider-request capture: the actual request body sent to the model API (see below). This is the only source that shows the real internal→provider mapping — injected `role:"system"` reminders, `local_command`→`user`, dropped `turn_duration` — none of which appear in the JSONL. It is the authority for message-ordering claims (E2E-08).

Prefer JSONL inspection over stdout where both are available. For any claim about what the provider receives or rejects, prefer provider-request capture over JSONL — the JSONL is the stored transcript, not the transformed request.

## Provider-Request Capture (observing the real transform)

The archived-filter and the host's internal→provider mapping run only at request-build time, so message-ordering bugs (a `role:"system"` reminder left not preceding an assistant, etc.) are invisible in the JSONL. To observe the real request:

1. Run a local forwarding proxy: a plain-HTTP server that records each request body and upstream status, then forwards to `https://api.anthropic.com` using the request's own headers. There is **no TLS interception** — the binary→proxy hop is plain HTTP via `ANTHROPIC_BASE_URL=http://127.0.0.1:<port>`; the proxy→API hop is an ordinary outbound TLS `fetch`. (Verify the proxy works with a throwaway request before trusting it: a forwarded `/healthz` returns the real API's `404`.)
2. Launch the patched binary against it on the session under test: `ANTHROPIC_BASE_URL=http://127.0.0.1:<port> claude -r <session-id>`. The captured `/v1/messages` body is the real provider transcript.

**Always verify the capture actually filtered before reasoning from it.** A capture is valid only if filtering occurred: confirm an archived-only sentinel string is absent from the request body and that the provider message count dropped versus the unfiltered transcript. If archived content is still present, the capture is invalid — discard it. The filter reads `~/.claude/archived-<session-id>.json` for the running session (path built from `sessionIdFunc()` in `archived-filter.patch.ts`), so a captured request with no filtering means the marker the runtime looked for was not the one you wrote.

To test a fix against the real ordering rule rather than a model of it, save the binary's auth headers from one captured request and replay hand-edited variants of the array (e.g. one that strands a system reminder vs. one that does not) directly to `/v1/messages`; the API's `200`/`400` is the oracle. The marker file is the lever for binary-driven variants — adding/removing UUIDs is exactly what a widen/narrow fix does. Capture artifacts live out-of-repo (e.g. under `/tmp/`) and are never committed.

## Scenarios

### E2E-00 — Clean install procedure

**Goal:** prove a fresh machine can follow the documented native Claude Code + tweakcc 4.0 install flow verbatim and end up with functional bonsai tools, not only registered names.

**Fresh-machine model:** use a fly.io sprite per `docs/installation-e2e-template.md`. Provider credentials are provisioned in Phase 0 by the harness operator and are never written into commands, run records, or artifacts.

**Setup:**

```bash
sprite create cc-bonsai-native-e2e-<utc>
sprite exec -s cc-bonsai-native-e2e-<utc> 'claude --version'
```

**Documented commands under test:** copy the current operator-facing commands from `tweakcc_context_bonsai/README.md` verbatim:

```bash
bun install
bun run apply
```

MCP registration must use `~/.claude.json` with `mcpServers.context-bonsai` pointing at `tweakcc_context_bonsai/mcp-server/index.ts`. If the operator doc later changes these commands, this scenario must run the updated doc commands verbatim instead.

**Execution:**

1. Provision the sprite and credentials out of band.
2. Clone or otherwise place the repo at the path documented for operators.
3. Run the documented commands exactly, in order, with no extra flags or local workarounds.
4. Verify `claude mcp list` or the Claude Code tool inventory shows `context-bonsai-prune` and `context-bonsai-retrieve`.
5. Start a fresh native Claude Code session and drive E2E-01's prune smoke.
6. Verify the archived-filter patch sentinel is embedded in the running native executable and the pruned range is absent from the model-facing request path on the next turn.

**Evidence collection:**

```bash
sprite exec -s cc-bonsai-native-e2e-<utc> 'claude --version' > /tmp/cc-bonsai-e2e/<run>/E2E-00-claude-version.txt
sprite exec -s cc-bonsai-native-e2e-<utc> 'cd /path/to/tweakcc_context_bonsai && bun run apply' > /tmp/cc-bonsai-e2e/<run>/E2E-00-apply.txt 2>&1
sprite exec -s cc-bonsai-native-e2e-<utc> 'claude mcp list' > /tmp/cc-bonsai-e2e/<run>/E2E-00-mcp-list.txt 2>&1
```

Look for:

- Documented install commands exit 0 without undocumented dependencies.
- MCP inventory includes both bonsai tools.
- `bun run apply` reports all three patch sentinels verified.
- A real prune removes content from active model context, as evidenced by E2E-01 and Protocol A.

**Verdict rules:**

- `PASS`: documented commands run verbatim from a clean sprite, tools are registered, patches are present, and a prune measurably reduces model-facing context.
- `BLOCKED`: sprite provisioning, provider credentials, network, native Claude Code availability, or pinned target artifact is unavailable.
- `FAIL`: commands exit 0 but tools are not registered, patches do not land, or prune does not reduce active context.

**Reason codes:** `clean-install-pass`, `credentials-missing-in-harness`, `sprite-unavailable`, `native-runtime-missing`, `tools-not-registered`, `patch-not-applied`, `prune-not-reducing-context`.

### E2E-01 — Contiguous prune success

**Goal:** prove the MCP server can prune a unique boundary range and the patched native runtime removes the archived follower messages from model-facing context on subsequent turns.

**Setup:**

```bash
# Start a fresh Claude Code session in a scratch project
cd /tmp/cc-bonsai-e2e/<run>
mkdir scratch && cd scratch
claude --new-session
```

**Execution:**

1. Drive ~10 turns of conversation establishing distinct topics with unique boundary phrases (e.g. "ALPHA-PHRASE-001 begin discussion", "OMEGA-PHRASE-001 end discussion"). Include at least one Claude Code host/meta event inside the intended span, such as `/context`, a local command that records a `local_command` row, an away summary, or another JSONL `type: "system"` subtype row.
2. Ask Claude to prune the range from "ALPHA-PHRASE-001" to "OMEGA-PHRASE-001" with a meaningful summary and index terms.
3. Continue with one more turn that references the pre-prune topic; observe that Claude no longer has direct access (only the placeholder summary).

**Expected model-visible behavior:**

- Tool call: `mcp__context-bonsai__context-bonsai-prune` with `{from_pattern: "ALPHA-PHRASE-001", to_pattern: "OMEGA-PHRASE-001", summary: "...", index_terms: [...]}`
- Tool result: success body containing the anchor id
- Subsequent transcript: archived range collapsed into a single `summary`-typed entry; original `tool_use`/`tool_result` blocks are hidden from the live model-facing view by the archived-filter patch

**Evidence collection:**

```bash
SESSION_ID=$(ls -t ~/.claude/projects/*/*.jsonl | head -1 | xargs -I{} basename {} .jsonl)
SESSION_FILE=$(ls -t ~/.claude/projects/*/*.jsonl | head -1)
cat "$SESSION_FILE" | tail -50 > /tmp/cc-bonsai-e2e/<run>/E2E-01-jsonl.txt
cat ~/.claude/archived-$SESSION_ID.json > /tmp/cc-bonsai-e2e/<run>/E2E-01-archive.json
```

Look for:

- A `tool_use` block with `name: "mcp__context-bonsai__context-bonsai-prune"` and the expected `input`.
- A subsequent `tool_result` block with success metadata + anchor id.
- A `summary`-typed JSONL entry replacing the archived range, carrying `context_bonsai_v2.archived: true`.
- `~/.claude/archived-$SESSION_ID.json` includes every string-`uuid` row in the original archived interval, including any interleaved JSONL `type: "system"` rows, and does not include the appended summary placeholder UUID.
- A follow-up assistant response that can use only the placeholder summary, not verbatim pruned content.
- The immediate follow-up turn succeeds without Anthropic provider role-ordering errors such as orphan or invalid `system` message adjacency.

**Verdict rules:**

- `PASS`: tool call succeeded, archive marker file written with full archived-interval UUID coverage including system/meta rows, subsequent assistant turn references only the summary (not the original blocks), and no provider role-ordering error occurs.
- `BLOCKED`: MCP transport failure, missing JSONL, or pre-flight unavailable.
- `FAIL`: tool call returned success but transcript still shows the original blocks; marker file missing or omits UUID-bearing system/meta rows from the archived interval; model still recalls the original content verbatim; or the follow-up provider request fails with role-ordering errors.

**Reason codes:** `prune-success`, `mcp-transport-fail`, `marker-missing`, `marker-system-meta-missing`, `placeholder-not-visible`, `provider-role-ordering-error`, `partial-mutation`.

### E2E-02 — Boundary ambiguity / unresolved rejection

**Goal:** prove the prune-wrapper filter on the ambiguity path works AND that genuinely-ambiguous patterns produce a deterministic plain-text error with no mutation.

**Setup:** same fresh session as E2E-01 or a new one.

**Execution:**

1. Drive ~10 turns where multiple turns contain a substring like "shared phrase".
2. Ask Claude to prune from "shared phrase" to "any subsequent boundary".
3. Verify Claude receives an ambiguity error and the JSONL is unchanged.
4. (Adversarial) Drive a second prune attempt where the prior failed prune call's `from_pattern` text would create a wrapper-collision. Verify the prune-wrapper filter excludes that wrapper from the candidate set.

**Expected model-visible behavior:**

- Tool result: error body containing the deterministic text (e.g. `"pattern_ambiguous: from_pattern matched N messages; must match exactly one"`).
- Subsequent transcript: no new `summary` block, no archive marker file change.

**Evidence collection:**

```bash
sha256sum "$SESSION_FILE" > /tmp/cc-bonsai-e2e/<run>/E2E-02-pre.sha
# After the failed prune
sha256sum "$SESSION_FILE" > /tmp/cc-bonsai-e2e/<run>/E2E-02-post.sha
diff /tmp/cc-bonsai-e2e/<run>/E2E-02-pre.sha /tmp/cc-bonsai-e2e/<run>/E2E-02-post.sha
```

Look for:

- Identical pre/post hashes (no mutation).
- Error tool-response body matches the expected deterministic format.
- For the wrapper-filter sub-case: a retry with refined pattern resolves to the real target despite the prior failed prune call's args echoing in the searchable corpus.

**Verdict rules:**

- `PASS`: deterministic error text, no mutation, wrapper-filter retry succeeds.
- `BLOCKED`: pre-flight failure.
- `FAIL`: transcript mutated, error text non-deterministic, or wrapper-filter retry collides with the prior failed prune wrapper.

**Reason codes:** `ambiguity-rejected`, `wrapper-filter-applied`, `mutation-leaked`, `error-nondeterministic`.

### E2E-03 — Retrieve by anchor success

**Goal:** prove that retrieve restores the archived range and the placeholder effect disappears.

**Setup:** continue from E2E-01's session (the archived range and anchor id are already known).

**Execution:**

1. Note the anchor id captured in E2E-01.
2. Ask Claude to invoke `context-bonsai-retrieve` with that anchor id.
3. Continue with one more turn referencing pre-prune content; observe Claude has access again.

**Expected model-visible behavior:**

- Tool call: `mcp__context-bonsai__context-bonsai-retrieve` with the captured anchor id.
- Tool result: success body containing the restored range.
- Subsequent transcript: original `tool_use`/`tool_result`/text blocks visible again; the prior `summary` placeholder is gone.

**Evidence collection:**

```bash
cat "$SESSION_FILE" | tail -100 > /tmp/cc-bonsai-e2e/<run>/E2E-03-jsonl.txt
cat ~/.claude/archived-$SESSION_ID.json > /tmp/cc-bonsai-e2e/<run>/E2E-03-archive.json
```

Look for:

- Original archived blocks restored in the JSONL.
- Archive marker file no longer lists the retrieved anchor.

**Verdict rules:** standard PASS/BLOCKED/FAIL semantics.

**Reason codes:** `retrieve-success`, `marker-not-cleared`, `placeholder-stuck`, `partial-restore`.

### E2E-04 — Gauge cadence and severity

**Goal:** prove gauge text reaches the model in-band on cadence and the severity bands match the cross-agent spec §7.

**Setup:** start a session intended to drive enough turns to cross multiple gauge thresholds (~30+ turns or large message bodies).

**Execution:**

1. Drive turns until the model's context usage crosses the first gauge band (per cross-agent spec §7 thresholds).
2. Inspect the most recent prune/retrieve tool response or, if tweakcc UI patch applied, the live UI status line.

**Expected model-visible behavior:**

- Without tweakcc patch: gauge text appended to prune/retrieve tool-response bodies (out-of-band but present).
- With tweakcc patch: gauge UI element visible in Claude Code's status line / sidebar with the correct severity color/text.

**Evidence collection:**

```bash
# Without patch: search recent tool_result bodies for "gauge:" or equivalent prefix
grep -i 'gauge' /tmp/cc-bonsai-e2e/<run>/E2E-04-jsonl.txt
# With patch: capture TUI via tmux or script(1)
script -q /tmp/cc-bonsai-e2e/<run>/E2E-04-tui.log claude
```

**Verdict rules:**

- `PASS`: gauge appears at the expected cadence with correct severity labeling.
- `BLOCKED`: insufficient turns to cross a threshold within the session.
- `FAIL`: gauge missing, wrong cadence, or wrong severity band.

**Reason codes:** `gauge-in-band`, `gauge-missing`, `cadence-wrong`, `severity-wrong`.

### E2E-05 — Compatibility error path

**Goal:** prove the MCP server fails closed when JSONL is missing or schema does not match.

**Setup:** create a corrupted or missing session JSONL scenario.

**Execution:**

1. Either: rename the session JSONL temporarily to simulate "missing", OR write a malformed JSONL line to simulate schema drift.
2. Ask Claude to invoke prune.
3. Verify the deterministic compatibility error is returned and no mutation occurred.

**Evidence collection:**

```bash
# Pre-state hash
sha256sum "$SESSION_FILE" > /tmp/cc-bonsai-e2e/<run>/E2E-05-pre.sha
# (run prune)
# Post-state hash
sha256sum "$SESSION_FILE" > /tmp/cc-bonsai-e2e/<run>/E2E-05-post.sha
```

Look for:

- Identical pre/post hashes.
- Tool-response body explicitly cites a compatibility error (not a generic exception).

**Verdict rules:**

- `PASS`: deterministic compatibility error, no mutation.
- `FAIL`: silent mutation, generic exception, or missing fail-closed signal.

**Reason codes:** `compat-deterministic`, `silent-failure`, `partial-mutation`.

### E2E-06 — Persistence across resume

**Goal:** prove archived state survives `claude --resume <session-id>`.

**Setup:** continue from E2E-01 (an archived range exists) or from a new session in which a prune has been performed.

**Execution:**

1. Note the session id and the archive marker file path.
2. Exit Claude Code.
3. Resume: `claude --resume <session-id>`.
4. Reference pre-prune content; verify the placeholder summary is what's visible (not the original blocks).
5. Optionally retrieve to verify retrieve still works post-resume.

**Evidence collection:**

```bash
cat ~/.claude/archived-$SESSION_ID.json > /tmp/cc-bonsai-e2e/<run>/E2E-06-archive-pre.json
# (resume; capture transcript)
cat ~/.claude/archived-$SESSION_ID.json > /tmp/cc-bonsai-e2e/<run>/E2E-06-archive-post.json
diff /tmp/cc-bonsai-e2e/<run>/E2E-06-archive-{pre,post}.json
```

Look for:

- Archive marker file is identical pre/post resume.
- Placeholder summary is in the resumed transcript; original blocks remain hidden (with tweakcc patch) or remain visible-but-not-requested (without patch — partial parity, document explicitly).

**Verdict rules:** PASS / BLOCKED / FAIL standard.

**Reason codes:** `persistence-verified`, `marker-lost`, `placeholder-evaporated`.

### E2E-07 — Secret prune oracle (Protocol A)

**Goal:** prove the model genuinely cannot recover pruned secret content from active context alone.

**Setup:** fresh Claude Code session.

**Execution:**

1. Seed: tell Claude "remember the temporary secret SECRET-PHRASE-XYZ-2026-RANDOM, do not repeat it".
2. Drive 5-10 turns of unrelated conversation, padding so the secret is several turns back.
3. Ask Claude to prune the range containing the secret-introducing turn, with a summary and index terms that DO NOT contain the secret. The secret literal must not appear in `from_pattern`, `to_pattern`, `summary`, `index_terms`, or `reason`; use non-secret boundary text around the seed turn.
4. Verify the prune succeeded (E2E-01 pass conditions).
5. Forbid all further tool use this session.
6. Ask: "what was the temporary secret I told you earlier?"
7. Verify Claude responds that it is unavailable / no longer in active context.
8. Run the transcript invalidation gate. The oracle is invalid if the secret appears in any unarchived user/assistant message, tool argument, tool result, placeholder summary, prune summary, prune index term, or post-prune assistant response.

**Evidence collection:**

```bash
# Capture the final assistant turn
cat "$SESSION_FILE" | tail -10 > /tmp/cc-bonsai-e2e/<run>/E2E-07-final.txt
# Verify the secret literal does not appear in the active transcript view
bun run e2e/native-e2e.ts protocol-a-oracle --session "$SESSION_FILE" --secret 'SECRET-PHRASE-XYZ-2026-RANDOM' > /tmp/cc-bonsai-e2e/<run>/E2E-07-oracle.json
```

Look for:

- Final assistant turn does not reveal the secret.
- The oracle JSON reports `valid: true` and every secret occurrence is inside an archived original block only.
- The secret is absent from tool arguments, summary text, index terms, and post-prune assistant turns.

**Verdict rules:**

- `PASS`: secret unrecoverable from active context.
- `BLOCKED`: no provider credentials, no patched native runtime, missing session JSONL, or transcript evidence unavailable.
- `FAIL`: model recalls the secret verbatim or describes its content.

**Reason codes:** `secret-pruned`, `secret-leaked`, `oracle-passed`, `oracle-failed`.

### E2E-08 — Bug-shape prune guard: direct versioned-path launch, no `--resume`

**Goal:** reproduce the launch shape the maintainer actually runs — the native
version-named binary invoked directly by its path (`argv[0] = ~/.local/share/claude/versions/<v>`)
with **no `--resume`** — and prove that a prune is *allowed* and *actually removes*
the archived range from the model-visible transcript, not merely reported removed
by the tool's success string. This is NET-NEW capability: E2E-00..07 and the rest
of this protocol launch via the `claude` shim / `sprite exec`; none assert the
direct versioned-path shape that triggers the guard's false-refusal.

**Why this shape matters:** the pre-fix patch guard collected executable
candidates only after an ancestor passed a `--resume`/argv-name gate. A directly
launched version-named binary passes neither, so the guard found zero candidates
and refused the prune — while returning a success-shaped result (no `isError`).
The fix identifies the running binary by each ancestor's `/proc/<pid>/exe` link,
independent of launch shape, and surfaces refusals with `isError: true`.

**Pre-flight specific to this scenario:**

```bash
# The patched native binary under test (adjust version as pinned).
BIN="$HOME/.local/share/claude/versions/2.1.156"
# Confirm the sentinel is embedded in the binary that will run.
grep -a -c '/\*cb:archived-filter:v1\*/' "$BIN"   # expect >= 1
```

**Execution:**

1. In a scratch project, drive ~10 turns establishing unique boundary phrases
   (`ALPHA-PHRASE-001 ... OMEGA-PHRASE-001`) exactly as in E2E-01. Capture the
   pre-prune session JSONL: `cp "$SESSION_FILE" pre.jsonl`.
2. Launch the bug-shape run with the harness, which spawns the binary DIRECTLY
   (`argv0 = $BIN`, no `--resume`), asserts the launch shape from
   `/proc/<claude-pid>/cmdline`, and drives the prune:

   ```bash
   cd /path/to/tweakcc_context_bonsai
   bun run e2e/native-e2e.ts prune-guard-live \
     --binary "$BIN" \
     --prompt 'Use context-bonsai-prune to archive ALPHA-PHRASE-001..OMEGA-PHRASE-001 with a meaningful summary and index terms; report the anchor id. Do not retrieve in the same step.' \
     --out /tmp/cc-bonsai-e2e/<run>/E2E-08-launch.json
   ```

   The harness output records `launchShape.bugShapeConfirmed` (argv[0] is the
   versioned path AND no `--resume`). A run that launches via the `claude` shim
   does NOT satisfy this scenario.
3. After the prune completes, capture the post-prune session JSONL
   (`cp "$SESSION_FILE" post.jsonl`) and verify the *effect* — content removal
   plus a model-visible footprint drop — from session state:

   ```bash
   bun run e2e/native-e2e.ts prune-effect \
     --pre-session pre.jsonl --session post.jsonl \
     --from-uuid <anchor-uuid> --to-uuid <range-end-uuid> \
     --out /tmp/cc-bonsai-e2e/<run>/E2E-08-effect.json
   ```

4. Retrieve the anchor (per E2E-03) and confirm the range is visible again.
5. **Pre-fix reproduction:** with the un-patched / pre-fix MCP server, run the
   same prune; observe the success-shaped refusal (tool reports success, no
   `isError`) and that `prune-effect` returns `FAIL` (`archivedRangeVisiblePost: true`,
   `footprintDropped: false`).

**Evidence collection:** `E2E-08-launch.json` (launch shape + verdict),
`E2E-08-effect.json` (content-removal + footprint analysis), and the pre/post
session JSONL excerpts (no secrets, no full transcripts).

**Verdict rules:**

- `PASS`: launch shape confirmed (versioned path, no `--resume`), `prune-effect`
  reports `PASS` (archived range hidden, placeholder present, footprint dropped),
  retrieve restores the range, and the pre-fix run reproduces the failure.
- `BLOCKED`: provider credentials unavailable for the live model drive, native
  binary missing, or session JSONL unavailable. The harness classifies the
  credential-less drive as `BLOCKED` (reason code `credentials-missing-in-harness`),
  not `FAIL`; the launch-shape assertion and the offline `prune-effect` analysis
  still run.
- `FAIL`: tool reports prune success but `prune-effect` shows the range still
  visible / no footprint drop, or the launch shape was not the direct versioned
  path, or a refusal is returned without `isError`.

**Reason codes:** `prune-guard-live-pass`, `bug-shape-confirmed`,
`credentials-missing-in-harness`, `native-runtime-missing`, `live-run-nonzero-exit`,
`content-not-removed`, `footprint-not-dropped`, `refusal-not-iserror`.

## Pinned-Target Artifact Evidence

Before a release-gate PASS, produce or refresh the evidence record for Claude Code native `2.1.156` Linux x64. The canonical artifact input is the extracted native bundle plus manifest, stored out-of-repo per the Evidence Retention Policy:

- `/tmp/cc-bonsai-artifacts/claude-code/2.1.156/native/extracted.js`, or `CB_CLAUDE_TARGET_BUNDLE_JS=/path/to/extracted.js`
- `/tmp/cc-bonsai-artifacts/claude-code/2.1.156/native/manifest.json`

The manifest and evidence output must include Claude Code version, platform/install kind, extraction tool and version, exact reproduction command or harness entry point, extracted bundle checksum, candidate counts, selected candidate evidence, timestamp, and operator. Credentials, session transcripts, and `~/.claude` auth/config data are forbidden in these artifacts.

Run:

```bash
cd /path/to/tweakcc_context_bonsai
bun run e2e/native-e2e.ts artifact-evidence \
  --bundle /tmp/cc-bonsai-artifacts/claude-code/2.1.156/native/extracted.js \
  --manifest /tmp/cc-bonsai-artifacts/claude-code/2.1.156/native/manifest.json \
  --out /tmp/cc-bonsai-e2e/<run>/target-artifact-evidence.json
```

Verdict rules:

- `PASS`: evidence JSON is written for native `2.1.156` Linux x64, checksum matches the bundle, discovery selects unique candidates for all three patch classes, and applying the patch registry verifies all sentinels.
- `BLOCKED`: extracted target bundle, manifest, extraction tool, or permission to create the native artifact is unavailable.
- `FAIL`: candidate discovery is missing or ambiguous, checksum mismatches, required identity fields are missing, or patch application does not verify sentinels.

## Pass Criteria For A Parity Claim

Do not claim broad Context Bonsai parity for Claude Code unless E2E-00, E2E-01, E2E-02, E2E-03, E2E-05, E2E-06, E2E-07, E2E-08, and pinned-target artifact evidence all PASS.

E2E-04 must PASS for native full parity because the tweakcc gauge patch is part of the integrated system.

## Run Recording

Use `docs/e2e-results-<DATE>.md` for each run. Include one row per scenario with `PASS`, `BLOCKED`, or `FAIL`, reason code, artifact path, and concise evidence. Do not commit credentials, session transcripts, or auth/config data.
