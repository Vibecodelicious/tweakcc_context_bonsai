# Test Run: 2026-05-19T00:22:57Z

- Result: BLOCKED
- Story: Story 8 native Claude Code e2e release gate revision rerun
- Sprite: `cc-bonsai-rerun-20260518`
- Operator: Story 8 developer subagent
- Runtime/version: Claude Code native `2.1.143` Linux x64
- Side-repo commit under test: `d4808f180c958c78e51923429f1bba3d5a6c672b`
- Parent commit under test: `b8a528f6e2b62d37e36f1e6ae4a083310d891d4c`
- Credential handling: provider credentials, auth files, and `~/.claude` config contents were not printed or committed.

## Harness Setup

- `sprite create cc-bonsai-rerun-20260518` succeeded from a fresh sprite.
- The side repo was cloned into `/home/sprite/tweakcc_context_bonsai`; the local Story 2-8 patch range through `d4808f180c958c78e51923429f1bba3d5a6c672b` was applied with `git am` so the sprite matched this revision.
- `bun install` completed with exit code 0.
- `claude install 2.1.143` completed with exit code 0; `claude --version` reported `2.1.143 (Claude Code)`.

## Scenario Verdicts

| Scenario | Verdict | Reason code | Evidence |
|---|---|---|---|
| E2E-00 Clean install procedure | BLOCKED | `credentials-missing-in-harness` | Functional prune/model-context-reduction proof could not run because the fresh sprite was not logged in to Claude Code. Sub-evidence: documented command `bun run apply` exited 0 against native `2.1.143`: `Context Bonsai apply complete for /home/sprite/.local/share/claude/versions/2.1.143`; `Patches applied: archived-filter, message-content-ids, context-bonsai-gauge`. |
| E2E-01 Contiguous prune success | BLOCKED | `credentials-missing-in-harness` | Live Claude Code model smoke returned `Not logged in · Please run /login`; no transcript or tool-use scenario was run. |
| E2E-02 Boundary ambiguity / unresolved rejection | BLOCKED | `credentials-missing-in-harness` | Blocked by missing live Claude Code login in the fresh sprite. |
| E2E-03 Retrieve by anchor success | BLOCKED | `credentials-missing-in-harness` | Blocked by missing live Claude Code login in the fresh sprite. |
| E2E-04 Gauge cadence and severity | BLOCKED | `credentials-missing-in-harness` | Blocked by missing live Claude Code login in the fresh sprite. |
| E2E-05 Compatibility error path | BLOCKED | `credentials-missing-in-harness` | Blocked by missing live Claude Code login in the fresh sprite. |
| E2E-06 Persistence across resume | BLOCKED | `credentials-missing-in-harness` | Blocked by missing live Claude Code login in the fresh sprite. |
| E2E-07 Secret prune oracle / Protocol A | BLOCKED | `credentials-missing-in-harness` | Blocked by missing live Claude Code login in the fresh sprite; no secret was seeded and no transcript was produced. |
| Pinned-target artifact evidence | PASS | `artifact-selection-pass` | Extracted native `2.1.143` bundle via tweakcc `readContent` (`14548665` bytes, sha256 `7ee77e22cde2618030c26182d43d8be82f68cbb2ed063f72778c1a5986d0943a`), then `bun run e2e/native-e2e.ts artifact-evidence --out .artifacts/claude-code/2.1.143/linux-x64/evidence-story8-rerun.json` exited 0. Candidate counts/selections: archived-filter `132` candidates selected index `11170978` score `103`; message-content-ids `24` selected index `12350099` score `75`; gauge token usage `9` selected index `5232907` score `45`; gauge attachment `10` selected index `9748034` score `50`; gauge reminder render `1` selected index `9972435` score `35`. Sentinels verified: `/*cb:archived-filter:v1*/`, `/*cb:message-content-ids:v1*/`, `/*cb:context-bonsai-gauge:v1*/`. |

## Artifact Notes

- Sprite-local target bundle path: `/home/sprite/tweakcc_context_bonsai/.artifacts/claude-code/2.1.143/linux-x64/extracted.js`.
- Sprite-local evidence path: `/home/sprite/tweakcc_context_bonsai/.artifacts/claude-code/2.1.143/linux-x64/evidence-story8-rerun.json`.
- No credentials, session transcripts, or `~/.claude` auth/config data were committed or printed.

## Release-Gate Finding

The approved pinned-native apply and target-artifact blockers are fixed in this rerun, but E2E-00 remains `BLOCKED` because its functional prune/model-context-reduction proof could not run without fresh-sprite Claude Code login. The full Story 8 release gate remains `BLOCKED` until the fresh-sprite harness has a live Claude Code login and the model-visible scenarios E2E-01..07, including Protocol A, are rerun.

# Test Run: 2026-05-18T16:12:58Z

- Result: FAIL
- Story: Story 8 native Claude Code e2e release gate
- Sprite: `cc-bonsai-native-e2e-20260518t161258z`
- Operator: Story 8 developer subagent
- Runtime/version: Claude Code native `2.1.143` Linux x64
- Side-repo commit under test: `a0717030952777eec0e9dc5a94b7c05b82c5b8b9`
- Parent commit under test: `81786f587d48aafa9ed5750e56c9f35a4ed42231`
- Credential handling: provider credentials, auth files, and `~/.claude` config contents were not printed or committed.

## Harness Setup

- `sprite create cc-bonsai-native-e2e-20260518t161258z` succeeded.
- Fresh sprite baseline had Claude Code `2.1.92`; pinned target setup ran `claude install 2.1.143` and then `claude --version` reported `2.1.143 (Claude Code)`.
- The side repo was cloned into `/home/sprite/tweakcc_context_bonsai`, then the local Story 4-8 patch range was applied through `git am` so the sprite matched side commit `a0717030952777eec0e9dc5a94b7c05b82c5b8b9`.
- `bun install` completed with exit code 0.
- Teardown: `sprite destroy --force cc-bonsai-native-e2e-20260518t161258z` completed with exit code 0 after evidence capture.

## Scenario Verdicts

| Scenario | Verdict | Reason code | Evidence |
|---|---|---|---|
| E2E-00 Clean install procedure | FAIL | `install-command-failed` | Documented command `bun run apply` exited 1 against native `2.1.143`: `archived-filter: could not resolve session-id getter`. The same command also exited 1 against the sprite baseline `2.1.92`: `archived-filter: ambiguous anchor candidates: top score 43, second score 43, minMargin 10`. |
| E2E-01 Contiguous prune success | BLOCKED | `pre-flight-unavailable` | The native runtime could not be patched, so the MCP prune path cannot prove model-facing context reduction. |
| E2E-02 Boundary ambiguity / unresolved rejection | BLOCKED | `pre-flight-unavailable` | Blocked by failed patch apply in E2E-00. |
| E2E-03 Retrieve by anchor success | BLOCKED | `pre-flight-unavailable` | Blocked by failed patch apply in E2E-00. |
| E2E-04 Gauge cadence and severity | BLOCKED | `pre-flight-unavailable` | Blocked by failed patch apply in E2E-00; gauge patch was not installed into native Claude Code. |
| E2E-05 Compatibility error path | BLOCKED | `pre-flight-unavailable` | Blocked by failed patch apply in E2E-00. |
| E2E-06 Persistence across resume | BLOCKED | `pre-flight-unavailable` | Blocked by failed patch apply in E2E-00. |
| E2E-07 Secret prune oracle / Protocol A | BLOCKED | `pre-flight-unavailable` | Blocked by failed patch apply in E2E-00; no live prune could be executed. |
| Pinned-target artifact evidence | FAIL | `anchor-ambiguous` | Extracted native `2.1.143` bundle via tweakcc `readContent` (`14548665` bytes), then `bun run e2e/native-e2e.ts artifact-evidence` exited 1 with `AnchorAmbiguousError: ambiguous anchor candidates: top score 43, second score 43, minMargin 10`. |

## Artifact Notes

- Local command logs were captured under parent worktree `.agent_tmp/` during the run; they are intentionally not committed as release evidence because they are raw harness logs.
- The sprite-local target bundle was written to `/home/sprite/tweakcc_context_bonsai/.artifacts/claude-code/2.1.143/linux-x64/extracted.js` for the artifact-evidence attempt and was not committed.
- No session transcripts were produced because the run did not get past patch application.

## Release-Gate Finding

The Story 8 release gate is not passable on the pinned native target. The current archived-filter discovery cannot uniquely resolve the intended target in native Claude Code `2.1.143`, and the apply harness fails closed before any live model-facing prune proof can run.
