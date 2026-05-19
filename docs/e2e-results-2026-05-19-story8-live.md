# Test Run: 2026-05-19T17:40Z

- Result: PARTIAL PASS
- Story: Story 8 native Claude Code e2e release gate live continuation
- Sprite: `cc-bonsai-rerun-20260518`
- Runtime/version: Claude Code native `2.1.143` Linux x64
- Side-repo base under test: Story 8A side commit `5b9437e`, plus uncommitted live-e2e fixes to session path discovery and Protocol A oracle row filtering.
- Credential handling: provider credentials, auth files, full session transcripts, and `~/.claude` auth/config contents were not committed. The Protocol A disposable secret literal is not recorded in this document.

## Harness Setup

- Basil logged into Claude Code in the sprite.
- MCP registration was added to `/home/sprite/.claude.json` with `mcpServers.context-bonsai` pointing at `/home/sprite/tweakcc_context_bonsai/mcp-server/index.ts`.
- `claude mcp list` reported `context-bonsai: bun run /home/sprite/tweakcc_context_bonsai/mcp-server/index.ts - ✓ Connected`.
- The sprite had drifted to Claude Code `2.1.144`; `claude install 2.1.143` restored the pinned target, and `claude --version` reported `2.1.143 (Claude Code)`.
- `bun run apply` reported `Install state: already-patched` and `Context Bonsai already patched at /home/sprite/.local/share/claude/versions/2.1.143`.
- Local Story 8A side commits through `5b9437e` were applied to the sprite checkout. `.artifacts/` was left uncommitted.

## Live Fixes Required

- The first live prune attempt reached the MCP tool but failed with `Context Bonsai archived-filter patch is not present in the running Claude Code executable`; this was caused by using a fresh print-mode invocation without a resumable session in argv, so the runtime patch guard could not identify a Claude parent executable.
- The resumed-session attempt then failed with `Compatibility error: unable to access active session`; root cause was `Bun.file(path).exists()` returning `false` for `~/.claude/projects` directories in this environment. `src/lib/session.ts` now uses `stat()` for path existence checks.
- Protocol A initially failed the oracle despite live model behavior passing because the oracle counted Claude Code bookkeeping rows (`queue-operation`, `last-prompt`) as invalid secret occurrences. `e2e/native-e2e.ts` now limits Protocol A occurrence checks to model transcript rows: `user`, `assistant`, and `summary`.

## Scenario Verdicts

| Scenario | Verdict | Reason code | Evidence |
|---|---|---|---|
| E2E-00 Clean install procedure | PASS | `clean-install-pass` | `claude --version` reported `2.1.143`; `bun run apply` reported `already-patched`; `claude mcp list` reported `context-bonsai` connected; live E2E-01 prune succeeded after the session path fix. |
| E2E-01 Contiguous prune success | PASS | `prune-success` | Run dir `/tmp/cc-bonsai-e2e/story8-live-20260519T174356Z-fixed`; session `ed0c9141-7159-4ad1-adcf-20ca2a302982`; prune succeeded with anchor `d076e8de-81bc-4e0b-928e-e577682a7ae4`; archive marker existed; follow-up response stated only summary/index metadata was visible and exact original bounded sentences were unavailable. |
| E2E-02 Boundary ambiguity / unresolved rejection | PASS | `ambiguity-rejected` | Session `84140186-a66d-4ec0-a7d7-37a66a3454b8`; ambiguous `from_pattern` returned `Error: from_pattern matched multiple messages. Provide a more specific pattern.`; no archive marker was written. |
| E2E-03 Retrieve by anchor success | PASS | `retrieve-success` | Same E2E-01 session; retrieve succeeded for anchor `d076e8de-81bc-4e0b-928e-e577682a7ae4`; archived marker was reduced to an empty list and the original user row no longer carried archive metadata. |
| E2E-04 Gauge cadence and severity | NOT RUN | `not-run` | Gauge threshold/cadence scenario was not driven in this continuation. |
| E2E-05 Compatibility error path | NOT RUN | `not-run` | Live malformed/missing JSONL scenario was not driven in this continuation; deterministic compatibility behavior remains covered by tests. |
| E2E-06 Persistence across resume | PASS | `resume-persistence` | E2E-01 prune and E2E-03 retrieve were both executed via `claude --resume <session-id>` across separate native Claude invocations; archive state persisted between turns. |
| E2E-07 Secret prune oracle / Protocol A | PASS | `secret-archived-only` | Session `5e259ce8-d34a-49d3-8bef-b294f7814123`; prune succeeded with anchor `4c429dc7-8e4e-494b-94a1-d1bfc41015ee`; follow-up replied `UNAVAILABLE`; fixed oracle output reported `valid: true`, `occurrenceCount: 1`, `invalidOccurrenceCount: 0`, `PASS: secret appears only in archived original blocks`. |
| Pinned-target artifact evidence | PASS | `semantic-artifact-evidence` | `bun run e2e/native-e2e.ts artifact-evidence --bundle .artifacts/claude-code/2.1.143/linux-x64/extracted.js --manifest .artifacts/claude-code/2.1.143/linux-x64/manifest.json --out /tmp/cc-bonsai-e2e/story8-live-artifact-evidence.json` exited 0. |

## Release-Gate Finding

The live login unblocked the core provider/model scenarios: install wiring, prune, ambiguity rejection, retrieve, resume persistence, Protocol A, and pinned semantic artifact evidence now pass in the sprite after the two live-e2e fixes. The Story 8 release gate is still `PARTIAL PASS`, not full PASS, because E2E-04 gauge cadence/severity and E2E-05 live compatibility-error scenarios were not driven in this continuation, and the fixes remain uncommitted pending review.
