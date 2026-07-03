# Hand-Off

This file is the single entry point: a fresh session pointed here needs nothing else to start. Reading order:

1. This file, in full.
2. `/home/basil/projects/context-bonsai-agents/docs/meta-loop-direction.md` — the authoritative direction statement (iterated `b15eb16`, decision recorded `565af44`). Its Next Step — pilot run 3 under unchanged terms — is DONE: the run STOPped fail-closed and its records are committed (`bddcf96`). Iterating the direction doc onto the run-3 outcome is this session's work.
3. The source documents listed under "Immediate next action," as the work requires them — not preemptively; context budget matters in this project of all projects.

Keep this file updated as work progresses (read `/home/basil/projects/context-bonsai-agents/.llm-conductor/writing_guidance/DOCUMENT_WRITING_GUIDANCE.md` before rewriting it). This file lives in the Claude Code port's side repo, but most current work targets the **parent repo** `/home/basil/projects/context-bonsai-agents/`.

## What we are doing

Developing the Context Bonsai **meta-loop**: the machinery that keeps every harness port current as harnesses release new versions, and that can derive a port for a harness it has never seen. Basil calls the current activity the outer-outer loop — developing the loops themselves. The authoritative direction statement is **`docs/meta-loop-direction.md`** (parent repo). Its Next Step — pilot run 3 under unchanged terms, the watchdog's branch-1 decision — has EXECUTED to completion (see State below); folding the outcome back into the direction doc is the current unit.

## State as of 2026-07-03 ~03:00 UTC

**PILOT RUN 3 ENDED**: fail-closed STOP at the §1.15 three-iteration cap, exit code 0, at 02:38 UTC 2026-07-03. Full record with verdicts and the completed acceptance-test assessment: `.agents/pilot/gpt55-v1.17.13-observer-log.md`, committed with the executor's friction log, final report, and maintenance report at parent `bddcf96` (mirrors runs 1–2; untrack again after owner review per the fix-4 design). The run-3 outcome in one paragraph:

- **Acceptance test PASSED all four clauses**; capability question (b) is a second consecutive yes (§1.16 maintenance ran correctly on the STOP, and the executor's friction self-attribution matched the observer's independent classification exactly); question (a) remains partial but strengthened.
- **The confounding migrated tiers.** Iterations 1–2 blocked on executor plan omissions (verdict V1, EXECUTOR-FAIL) — but the executor fixed all of them within budget, which runs 1 and 2 never managed. Iteration 3 blocked ONLY on two NEW spec gaps (V2, V3, observer-verified): §4.2's OpenCode runtime-E2E and pre-publish install gates cite generic templates but bind no concrete OpenCode commands, and reviewers rightly refused invented ones. No recurrence of the six previously fixed gaps. Trend across three runs: §1.15 exhaustion cause has migrated from executor behavior toward unbound owner slots.
- **Mid-run quota stall (23:13–02:35 UTC), self-recovered, zero contamination**: the provider 429'd with a 3h22m retry-after; the process slept it out in-harness and resumed itself; the watchdog-sanctioned resume injection was staged but never used. External interruption, no verdict. Lesson now baked into the observer log: a quota-stalled process is indistinguishable from a working one via the run log alone — check the newest `~/.local/share/opencode/log/*.log` for `session.processor` errors on any silent wake.

Worktree residue, deliberate: `docs/agent-specs/forward-port-spec.md` carries the §1.16 maintenance edit (one sentence, §4.2 E2E slot, "Known slot gap from GPT-5.5"), uncommitted pending owner review; the draft plan + three validation JSONs under `.agents/plans/*0dfbeeda*` are untracked run residue (archive per the run-2 precedent when the workspace next resets); the `tweakcc_context_bonsai` pin stays untouchable. Windows `bonsai:@7` (run 3, exited shell), `@1`, `@5` are inert and Basil's to close.

**Decision provenance**: Basil reserved the run-2 tiering call, then delegated interim decisions to his top-layer watchdog session. The watchdog chose branch 1 — run 3 under unchanged terms (`565af44`) — and mid-run sanctioned a resume after the quota stall (ultimately unneeded). Basil holds override throughout and has been slacked at each step (all sends verified `ok`).

Prior-unit parent commits still relevant: `20d5d40`/`f9d9063` (run-1/run-2 records), `3aaea2f` (owner review of run-2 spec edits; the untrack-records precedent), `b15eb16` (direction iterated onto run 2), `565af44` (run-3 launch prep), and now `bddcf96` (run-3 records). Run-2 outcome in one line: fail-closed STOP at §1.15, maintenance ran, acceptance PASSED, verdicts EXECUTOR-FAIL + SPEC-GAP ×3.

- Standing fact: Basil chose direct document authoring + the writing-guidance review loop over the formal plan system for this work.

## Intent you must not lose (from direct conversation with Basil)

1. **The deterministic-gate machinery is calibrated scaffolding.** It compensates for weak model judgment (GPT-5.5 / Opus 4.8 era). It is load-bearing where a weak model executes, and only there is it non-negotiable. Relaxation experiments are allowed only in strong-model (Fable-class) tiers.
2. **The pilot is a capability experiment, not a build-out**: GPT-5.5 must (a) execute the routine per-release cycle and (b) maintain the routine's own instructions from cycle friction (§1.16). Fallback ladder if (b) fails: GPT-5.5 executes, Fable maintains. Skipping the maintenance step invalidates the pilot — the spec and brief now state this unambiguously for both seal and STOP outcomes.
3. **Failure attribution before tiering decisions.** Every pilot stumble gets classified `SPEC-GAP` (our artifact under-specified — fix the artifact) vs `EXECUTOR-FAIL` (deterministic spec, executor still failed — evidence for fallback). Never re-tier on impressions.
4. **The observer must not contaminate the experiment.** Fable observes and records verdicts; it does not hint, fix, or pre-empt. A fail-closed STOP is pilot data, not pilot failure. Verdicts go in the observer log as stumbles appear; no edits to anything the executor reads while the run lives.
5. Writing plans → re-read `.llm-conductor/planning_guidance.md` first; orchestrating → re-read `.llm-conductor/ORCHESTRATOR_AGENT.md`; any document authoring → the writing guidance. Basil's rules require re-reading these, not trusting memory of them.
6. **30-minute wait ceiling (Basil, 2026-07-02).** No agent below Basil's top-layer session may wait on anything — subagent, watcher, monitor, background process — longer than 30 minutes without waking and verifying actual state. Arm every watcher and timeout at ≤30 minutes, and before trusting one, verify the watched signal actually reaches the watched channel (run 2's exit-watcher grepped a log the exit marker never entered, so it could never fire; silence is not evidence of progress). This binds relay sessions, their subagents and monitors, and the OpenCode orchestrator's subagent wait (~6h at run 2 — cap it before any run 3). Only Basil's top layer may hold longer horizons.

## Fable credit economy (binding)

Fable tokens are scarce (~25% consumed in the 2026-07-01 session alone). Spend them only on judgment, synthesis, and intent-sensitive decisions. Rules:

- Subagents inherit the session model unless overridden. **Always pass an explicit cheaper model** (`sonnet`, or `haiku` for mechanical work) when spawning readers, extractors, reviewers, or drafters.
- Long sessions reprocess their whole history every turn. Finish a work unit, update this file, end the session; start the next unit fresh from this entry point. While observing the pilot, prefer long sleeps/monitors over frequent polling — each poll turn re-reads the whole session.
- Read sources on demand, not preemptively; delegate bulk reading to cheap subagents and consume their conclusions.

## Session hand-off relay (tmux)

Sessions chain through tmux so each stays short (see credit economy above). A relayed session's launch prompt names its predecessor's tmux window; retiring that window is its first act, via `scripts/handoff-retire.sh <window-id>` — never a raw `tmux kill-window`. The retire script kills only windows that `handoff-relay.sh` marked `@handoff_state=retiring` and refuses self-targets, so a wrong id cannot take down this session or another agent's window. When your work unit is done:

1. Update this file.
2. If the next step needs input only Basil can give: do **not** relaunch. Slack him (`/home/basil/llm_prompts/scripts/slack.sh "..."`) and stop — a relaunched session would just idle against the same blocker. **Verify the slack actually sent**: the script prints `ok` on success — if you don't see `ok` (call refused, error, anything else), you have NOT reached Basil. In that case, and in every blocked-on-Basil stop regardless, end your final message with a line beginning `ATTENTION-BASIL:` stating in one sentence what you need. Basil's top-layer watchdog session scans the panes for that marker and will answer on his behalf or relay to him — reports that reach only your own transcript reach nobody.
3. Otherwise run `scripts/handoff-relay.sh` as your **final tool call** (any output you produce after it may be lost when the successor retires your window). It marks your window as retiring and opens a fresh `claude --model claude-fable-5` in a new window of this tmux session, pointed at this file.

Both scripts require running inside a tmux pane and fail loudly otherwise. If your session isn't inside tmux, skip the relay: update this file and tell Basil the chain needs restarting from a tmux-launched session.

**Expect `SHOWRUNNER_HANDOFF.md` in this directory** (Basil, 2026-07-02): it is the top-layer watchdog session's own hand-off document, deliberately gitignored — not your input, not stray dirty state, never committed. The `.gitignore` line covering it is a **one-time exception**: include that `.gitignore` change in your next commit and continue.

## Immediate next action

**Owner review of the run-3 maintenance edit, then iterate the direction doc onto the run-3 outcome** — the same post-run sequence run 2 followed (`3aaea2f` then `b15eb16`):

1. **Owner-review the §1.16 edit** sitting uncommitted in `docs/agent-specs/forward-port-spec.md` (one sentence in the §4.2 OpenCode E2E slot). The observer already verified its factual claims (templates genuinely unbound for OpenCode); the owner question is whether "flag the missing binding instead of inventing commands" is the right §1.15 interaction — it converts a 3-iteration exhaustion into an explicit early STOP, which changes exhaustion semantics (`b15eb16` added a §1.15 refinement to Provisional steps; reconcile with it). Adopt/amend/reject, commit the disposition, and untrack the four run-3 records in the same commit (the `3aaea2f` precedent).
2. **Close the gaps the run surfaced**: V2/V3 need an OpenCode-specific e2e + install runbook (or bound slot commands) before any run 4 can pass §1.15. That authoring is owner-tier work; read the observer log's Verdicts section for exactly what the reviewers demanded.
3. **Iterate `docs/meta-loop-direction.md`** (re-read the writing guidance first, per intent rule 5): fold in run 3 — acceptance PASS, (b) twice-confirmed, (a) still confounded but with the exhaustion cause migrated from executor behavior to unbound owner slots across three runs. Frame the next decision for Basil/watchdog: the run-3 evidence pattern (executor converges what the spec makes convergeable) argues for closing V2/V3 and running run 4, not for the fallback ladder — but that call is theirs, not the drafter's.
4. Slack Basil the run-3 outcome + the framed decision (verify `ok`); relay or stop per the relay rules.
