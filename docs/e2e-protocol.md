# Context Bonsai E2E Protocol — Claude Code (tweakcc)

## Test Metadata

- Implementation name: tweakcc Context Bonsai for Claude Code
- Repository root: `/home/basil/projects/tweakcc_context_bonsai`
- Runtime entry point: `claude` (Anthropic Claude Code CLI)
- Session storage location: `~/.claude/projects/<project-hash>/<session-id>.jsonl`
- Tool transport: MCP stdio (registered in `~/.claude/settings.json` `mcpServers.context-bonsai`)
- Companion (optional): [tweakcc Piebald-AI fork](https://github.com/Piebald-AI/tweakcc) applied via `npx tweakcc --apply`
- Model/provider under test: Anthropic Claude (whichever the local Claude Code is configured for)
- Date: fill in per run
- Operator: fill in per run

## Scope

This protocol validates Context Bonsai integration behavior for Claude Code via the `tweakcc_context_bonsai` MCP server. Do not modify implementation code during the run unless this run is part of an explicit fix loop.

## Required Scenario Set

Per the cross-agent template at `docs/context-bonsai-e2e-template.md`:

| ID | Scenario | Required outcome |
|---|---|---|
| E2E-01 | Contiguous prune success | Bounded range archived; placeholder visible in subsequent turns; JSONL mutation atomic |
| E2E-02 | Boundary ambiguity / unresolved rejection | Deterministic plain-text error; no JSONL mutation |
| E2E-03 | Retrieve by anchor success | Archived range visible again; placeholder effect gone |
| E2E-04 | Gauge cadence and severity | Gauge text appears in tool-response output (and in tweakcc UI patches if applied); cadence matches the cross-agent spec §7 thresholds |
| E2E-05 | Compatibility error path | Missing JSONL or schema-mismatch produces a deterministic compatibility error; no mutation |
| E2E-06 | Persistence across resume | Archived state survives `claude --resume <session-id>`; the optional tweakcc `archivedFilter` patch hides the archived range from the live transcript view |
| E2E-07 | Secret prune oracle | After prune, model cannot reveal the pruned secret from active context alone |

## Pre-Flight

Run before every e2e session:

```bash
# Runtime present
claude --version

# Side-repo tests pass
cd /home/basil/projects/tweakcc_context_bonsai
bun test

# MCP server registered
grep -A 4 '"context-bonsai"' ~/.claude/settings.json

# Bare repo + working tree healthy
cd /home/basil/projects/tweakcc_context_bonsai
git status --short
git log --oneline -1

# Optional: tweakcc patches applied (record state for the run)
which tweakcc || echo "tweakcc not installed (E2E-04 gauge UI + E2E-06 archivedFilter will be partial)"

# Artifact dir for this run
mkdir -p /tmp/cc-bonsai-e2e/$(date -u +%Y%m%dT%H%M%SZ)
```

Expected pre-flight result:

- `claude --version` reports a known build
- `bun test` passes (modulo the two pre-existing environment-dependent failures in `src/lib/{session,snapshot}.test.ts` documented in the v0.1.0 release notes)
- `~/.claude/settings.json` contains a `context-bonsai` entry pointing to `tweakcc_context_bonsai/mcp-server/index.ts`
- The side repo is clean

If a required dependency is unavailable, classify the run as `BLOCKED`.

## Evidence Sources

- Live JSONL: `~/.claude/projects/<project-hash>/<session-id>.jsonl` (read after each turn).
- Archive marker file: `~/.claude/archived-<session-id>.json` (written by `addArchivedMarkerEntries`).
- Tool-response stdout from MCP (visible in Claude Code's transcript as `tool_result` blocks).
- Optional: tweakcc UI capture (TUI screenshot or `script(1)` log) if patches applied.

Prefer JSONL inspection over stdout where both are available.

## Scenarios

### E2E-01 — Contiguous prune success

**Goal:** prove the MCP server can prune a unique boundary range and the placeholder is model-visible in subsequent turns.

**Setup:**

```bash
# Start a fresh Claude Code session in a scratch project
cd /tmp/cc-bonsai-e2e/<run>
mkdir scratch && cd scratch
claude --new-session
```

**Execution:**

1. Drive ~10 turns of conversation establishing distinct topics with unique boundary phrases (e.g. "ALPHA-PHRASE-001 begin discussion", "OMEGA-PHRASE-001 end discussion").
2. Ask Claude to prune the range from "ALPHA-PHRASE-001" to "OMEGA-PHRASE-001" with a meaningful summary and index terms.
3. Continue with one more turn that references the pre-prune topic; observe that Claude no longer has direct access (only the placeholder summary).

**Expected model-visible behavior:**

- Tool call: `mcp__context-bonsai__context-bonsai-prune` with `{from_pattern: "ALPHA-PHRASE-001", to_pattern: "OMEGA-PHRASE-001", summary: "...", index_terms: [...]}`
- Tool result: success body containing the anchor id
- Subsequent transcript: archived range collapsed into a single `summary`-typed entry; original `tool_use`/`tool_result` blocks no longer appear in turn-by-turn inspection (or, with tweakcc patch applied, hidden from the live view)

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

**Verdict rules:**

- `PASS`: tool call succeeded, archive marker file written, subsequent assistant turn references only the summary (not the original blocks).
- `BLOCKED`: MCP transport failure, missing JSONL, or pre-flight unavailable.
- `FAIL`: tool call returned success but transcript still shows the original blocks; or marker file missing; or model still recalls the original content verbatim.

**Reason codes:** `prune-success`, `mcp-transport-fail`, `marker-missing`, `placeholder-not-visible`, `partial-mutation`.

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
3. Ask Claude to prune the range containing the secret-introducing turn, with a summary and index terms that DO NOT contain the secret.
4. Verify the prune succeeded (E2E-01 pass conditions).
5. Forbid all further tool use this session.
6. Ask: "what was the temporary secret I told you earlier?"
7. Verify Claude responds that it is unavailable / no longer in active context.

**Evidence collection:**

```bash
# Capture the final assistant turn
cat "$SESSION_FILE" | tail -10 > /tmp/cc-bonsai-e2e/<run>/E2E-07-final.txt
# Verify the secret literal does not appear in the active transcript view
grep -c 'SECRET-PHRASE-XYZ-2026-RANDOM' "$SESSION_FILE"
# (should be exactly 1: the original message that's now archived)
```

Look for:

- Final assistant turn does not reveal the secret.
- Secret string appears in the JSONL only inside the archived original block (not in the placeholder summary, not in subsequent assistant turns).

**Verdict rules:**

- `PASS`: secret unrecoverable from active context.
- `FAIL`: model recalls the secret verbatim or describes its content.

**Reason codes:** `secret-pruned`, `secret-leaked`, `oracle-passed`, `oracle-failed`.

## Pass Criteria For A Parity Claim

Do not claim broad Context Bonsai parity for Claude Code unless E2E-01, E2E-02, E2E-03, E2E-05, E2E-06, and E2E-07 all PASS.

E2E-04 (gauge in-band) is partial without the tweakcc patch — document the limitation rather than claim full parity. With the patch, E2E-04 must also PASS.

## Run Recording

Use `docs/e2e-results-<DATE>.md` for each run. See `docs/e2e-results-2026-04-29.md` for the v0.1.0 smoke-test record.
