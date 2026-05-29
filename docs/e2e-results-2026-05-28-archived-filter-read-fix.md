# Test Run: 2026-05-29T05:00Z

- Result: PASS (live behavioral)
- Story: fix-archived-filter-read-encoding — restore prune behavior by reading the per-session marker through the host fs wrapper with an explicit `"utf8"` encoding argument.
- Runtime/version: Claude Code native `2.1.143` Linux x64.
- Side-repo base under test: the `fix-archived-filter-read-encoding` change to `patches/archived-filter.patch.ts` (`__cbFs.readFileSync(__cbMarkerPath, "utf8")`), applied to a native `2.1.143` build via `bun run apply`.
- Credential handling: provider credentials, auth files, and full session transcripts are not committed. The Protocol A disposable secret literal is not recorded in this document. Local-only run artifacts live under `/tmp/cc-bonsai-e2e/...`.

## Target Preparation

- The active launcher `~/.local/bin/claude` resolved to `2.1.156`. The pinned target is native `2.1.143`. The already-installed `2.1.143` binary on disk was patched with the pre-fix (encoding-less) read form and could not be overwritten in place (`Text file busy`, held by the running orchestrator process).
- A clean `2.1.143` build (the maintained tweakcc backup) was patched with the rebuilt registry via `bun run apply --path <copy> --backup <tmp>`; the harness reported `Install state: unpatched` then `Context Bonsai apply complete`, `Patches applied: archived-filter, message-content-ids, context-bonsai-gauge`. Discovery selected unique anchors for all three patch classes.
- Post-apply sentinel verification on the patched build: `/*cb:archived-filter:v1*/`, `/*cb:context-bonsai-gauge:v1*/`, and `/*cb:message-content-ids:v1*/` each present exactly once; the injected read used the fixed form `__cbFs.readFileSync(__cbMarkerPath, "utf8")` (1 occurrence) and the pre-fix encoding-less form was absent (0 occurrences). The patched build reported `2.1.143 (Claude Code)`.
- The patched build was placed at `/home/basil/.local/share/claude/versions/2.1.143-cbfix` and the launcher symlink was repointed to it for the run; `claude --version` reported `2.1.143 (Claude Code)`. After the run the launcher symlink was restored to its original `2.1.156` target.

## Pre-Flight

| Command | Exit | Result |
|---|---|---|
| `claude --version` (active launcher repointed to patched 2.1.143) | 0 | `2.1.143 (Claude Code)` |
| `claude mcp list` | 0 | `context-bonsai: bun run .../mcp-server/index.ts - ✓ Connected` |
| live model auth probe (`claude -p "Reply ... pong"`, no MCP) | 0 | model returned `pong`; ambient OAuth login active |

## Scenario Verdicts

| Scenario | Verdict | Reason code | Evidence |
|---|---|---|---|
| Live contiguous prune removes archived range from model-visible context | PASS | `prune-success` | Run dir `/tmp/cc-bonsai-e2e/remove-cache-20260529T045950Z`; session `19ccf112-1556-4122-ba00-7318c42a731a`; prune driven by referring to a non-secret boundary token; the placeholder summary `Protocol A seed turn archived` is present in the resumed transcript. The post-prune no-tools recall could not reproduce the secret (`08-recall-no-tools.json:no-secret`), proving the archived range is absent from model-visible context — the behavior the pre-fix encoding-less read silently failed to deliver. |
| Retrieve restores the archived range | PASS | `retrieve-success` | Same session; after the retrieve tool ran, the secret was recoverable again (`09-retrieve-and-answer.json:contains-secret`, `10-post-retrieve-answer.json:contains-secret`); the marker file ended at `[]` (the archived uuid removed by retrieve). |
| E2E-07 Secret prune oracle (Protocol A) | PASS | `secret-archived-only` | `bun run e2e/native-e2e.ts protocol-a-oracle --session <session-jsonl> --secret <disposable-secret> --out <run>/oracle-before-retrieve.json` (captured before retrieve) reported `valid: true`, `occurrenceCount: 1`, `invalidOccurrenceCount: 0`, `PASS: secret appears only in archived original blocks`; the single secret occurrence (`uuid f37bd205-...`) was in an archived original block (`archived: true`, `summary: false`). The secret literal appeared in 0 of 3 `context-bonsai-prune` tool_use rows — it never entered `from_pattern`/`to_pattern`/`summary`/`index_terms`/`reason`. |

## Finding

The encoding fix restores model-visible prune behavior on native `2.1.143`: a pruned, secret-bearing range is genuinely absent from the model's active context (no-tools recall returns no secret), the secret persists only inside the archived original block, and retrieve restores it. The prune driver never quoted the secret, and the secret did not enter any prune tool argument, summary, or index term. The driver script's three secret-presence assertions all passed and the script exited 0.

## Local-Only Artifacts (not committed)

- `/tmp/cc-bonsai-e2e/remove-cache-20260529T045950Z/oracle-before-retrieve.json`
- `/tmp/cc-bonsai-e2e/remove-cache-20260529T045950Z/secret-presence.txt`
- `/tmp/cc-bonsai-e2e/remove-cache-20260529T045950Z/redacted-run-metadata.txt`
- Live session JSONL under `~/.claude/projects/...` (transcript; not committed)
