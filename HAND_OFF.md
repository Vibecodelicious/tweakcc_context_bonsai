# Hand-Off

This file is the single entry point: a fresh session pointed here needs nothing else to start. Reading order:

1. This file, in full.
2. `/home/basil/projects/context-bonsai-agents/docs/meta-loop-direction.md` — the authoritative direction statement, iterated onto the run-4 outcome at `8558733`. Its Next Step is the **plan-generation tiering decision**, framed and left OPEN: it amends the End Goal's tiering paragraph, so it belongs to Basil alone (outside the watchdog delegation), and this relay is stopped awaiting it.
3. Source documents on demand only — context budget matters in this project of all projects.

Keep this file updated as work progresses (read `/home/basil/projects/context-bonsai-agents/.llm-conductor/writing_guidance/DOCUMENT_WRITING_GUIDANCE.md` before rewriting it). This file lives in the Claude Code port's side repo, but most current work targets the **parent repo** `/home/basil/projects/context-bonsai-agents/`.

## What we are doing

Developing the Context Bonsai **meta-loop**: the machinery that keeps every harness port current as harnesses release new versions, and that can derive a port for a harness it has never seen. Basil calls the current activity the outer-outer loop — developing the loops themselves. The authoritative direction statement is **`docs/meta-loop-direction.md`** (parent repo).

## State as of 2026-07-03 ~08:15 UTC (run 4 complete, post-run sequence done)

**PILOT RUN 4 IS OVER: a fail-closed STOP at forward-port-spec §1.15, and the first clean EXECUTOR-FAIL of the pilot.** The 03:52 quota stall self-resumed exactly at the retry-after horizon (07:35:33; second consecutive validated 429 recovery, zero observer contamination across five read-only sweeps). On resume the executor consumed its final reviewer results — still carrying blocking findings on the third pass — STOPped per spec, ran §1.16 maintenance (no Part 4 edit), wrote its final report, and exited `PILOT-PROCESS-EXITED code=0` at 07:36. Zero commits by the pilot in any repo.

**The full post-run sequence is complete.** Two parent commits this work unit:

- `cb0a5fb` — the four run-4 records (observer log with verdict V1 + acceptance assessment, final report, maintenance report, friction log), mirroring `bddcf96`. Verdict V1: all three iteration-3 residual findings were checked against owner artifacts and every one was bound before launch — the plan even rewrote the runbook's "verbatim" `insteadOf` block against SSH URLs that appear in no owner artifact while `.gitmodules` is all-HTTPS. Failure mode: transcription infidelity, not missing bindings. Acceptance test PASSed all four clauses; none of the eight fixed SPEC-GAPs recurred; executor/observer attribution matched (third consecutive run). Owner review was a recorded no-op: no §1.16 Part 4 edit existed to review, and the observer verified that was the right call.
- `8558733` — **direction doc iterated onto run 4** (records untracked in the same commit per the `15c0463` precedent; a missing `.gitignore` entry for the run-4 maintenance filename was fixed there too). Four-run trend: capability question (a) — plan generation within the §1.15 budget — got its first clean test and failed, reversing run 3's tentative positive; question (b) — routine self-maintenance — is a thrice-confirmed yes. Authored under the writing-guidance loop: source-truth review clean, reader-state review's six findings fixed.

**BLOCKED ON: the plan-generation tiering decision (Basil alone — End Goal scope, outside the `565af44` watchdog delegation).** The direction doc's Next Step frames three branches with the drafter's labeled read: (1) split plan generation up-tier, GPT-5.5 keeps execution + maintenance — *supported*, amends the End Goal's tiering paragraph, and re-entering the v1.17.13 cycle with a stronger-model plan would finally give the spec its first live replay; (2) run 5 unchanged for replication — *defensible, not required*, watchdog-delegable; (3) artifact-side hardening without re-tiering — *weakened*: the failing content was already bound verbatim. When the decision lands, record it in the Next Step's Decision-status line with provenance before acting on it. If any branch re-enters the cycle, archive-then-clear the run-4 residue first (`.agents/plans/*0dfbeeda*`, four untracked files; §1.14 halts any run until cleared; precedent: copy under `.agents/pilot/archive/`, then delete from the tree).

Worktree state, deliberate: parent tree is clean except that untracked run-4 residue and the `tweakcc_context_bonsai` submodule pointer (untouchable pin — never commit it). Window `bonsai:@4` (the finished pilot run) is inert; `@7`, `@1`, `@5` remain inert and Basil's to close.

Prior-unit commits still relevant: `20d5d40`/`f9d9063`/`bddcf96`/`cb0a5fb` (run 1/2/3/4 records), `85dd3b8` + `3aaea2f` + `15c0463` (owner fixes/reviews), `2f8495a` (e2e runbook closing V2/V3), `565af44` + `da89bd8` (run-3/run-4 launch prep + watchdog decision records).

- Standing fact: Basil chose direct document authoring + the writing-guidance review loop over the formal plan system for this work.

## Intent you must not lose (from direct conversation with Basil)

1. **The deterministic-gate machinery is calibrated scaffolding.** It compensates for weak model judgment (GPT-5.5 / Opus 4.8 era). It is load-bearing where a weak model executes, and only there is it non-negotiable. Relaxation experiments are allowed only in strong-model (Fable-class) tiers.
2. **The pilot is a capability experiment, not a build-out**: GPT-5.5 must (a) execute the routine per-release cycle and (b) maintain the routine's own instructions from cycle friction (§1.16). Fallback ladder if (b) fails: GPT-5.5 executes, Fable maintains. Skipping the maintenance step invalidates the pilot — the spec and brief state this unambiguously for both seal and STOP outcomes.
3. **Failure attribution before tiering decisions.** Every pilot stumble gets classified `SPEC-GAP` (our artifact under-specified — fix the artifact) vs `EXECUTOR-FAIL` (deterministic spec, executor still failed — evidence for fallback). Never re-tier on impressions.
4. **The observer must not contaminate the experiment.** Fable observes and records verdicts; it does not hint, fix, or pre-empt. A fail-closed STOP is pilot data, not pilot failure. Verdicts go in the observer log as stumbles appear; no edits to anything the executor reads while the run lives.
5. Writing plans → re-read `.llm-conductor/planning_guidance.md` first; orchestrating → re-read `.llm-conductor/ORCHESTRATOR_AGENT.md`; any document authoring → the writing guidance. Basil's rules require re-reading these, not trusting memory of them.
6. **30-minute wait ceiling (Basil, 2026-07-02).** No agent below Basil's top-layer session may wait on anything — subagent, watcher, monitor, background process — longer than 30 minutes without waking and verifying actual state. Arm every watcher and timeout at ≤30 minutes, and before trusting one, verify the watched signal actually reaches the watched channel (run 2's exit-watcher grepped a log the exit marker never entered; silence is not evidence of progress). Run 3's quota-stall catch validated the wake-and-verify half live. This binds relay sessions, their subagents and monitors, and the OpenCode orchestrator's subagent wait. Only Basil's top layer may hold longer horizons.

## Fable credit economy (binding)

Fable tokens are scarce. Spend them only on judgment, synthesis, and intent-sensitive decisions. Rules:

- Subagents inherit the session model unless overridden. **Always pass an explicit cheaper model** (`sonnet`, or `haiku` for mechanical work) when spawning readers, extractors, reviewers, or drafters.
- Long sessions reprocess their whole history every turn. Finish a work unit, update this file, end the session; start the next unit fresh from this entry point. While observing a pilot run, prefer long sleeps/monitors over frequent polling — each poll turn re-reads the whole session (but see intent rule 6's 30-minute ceiling).
- Read sources on demand, not preemptively; delegate bulk reading to cheap subagents and consume their conclusions.

## Session hand-off relay (tmux)

Sessions chain through tmux so each stays short (see credit economy above). A relayed session's launch prompt names its predecessor's tmux window; retiring that window is its first act, via `scripts/handoff-retire.sh <window-id>` — never a raw `tmux kill-window`. The retire script kills only windows that `handoff-relay.sh` marked `@handoff_state=retiring` and refuses self-targets, so a wrong id cannot take down this session or another agent's window. When your work unit is done:

1. Update this file.
2. If the next step needs input only Basil can give: do **not** relaunch. Slack him (`/home/basil/llm_prompts/scripts/slack.sh "..."`) and stop — a relaunched session would just idle against the same blocker. **Verify the slack actually sent**: the script prints `ok` on success — if you don't see `ok` (call refused, error, anything else), you have NOT reached Basil. In that case, and in every blocked-on-Basil stop regardless, end your final message with a line beginning `ATTENTION-BASIL:` stating in one sentence what you need. Basil's top-layer watchdog session scans the panes for that marker and will answer on his behalf or relay to him — reports that reach only your own transcript reach nobody.
3. Otherwise run `scripts/handoff-relay.sh` as your **final tool call** (any output you produce after it may be lost when the successor retires your window). It marks your window as retiring and opens a fresh `claude --model claude-fable-5` in a new window of this tmux session, pointed at this file.

Both scripts require running inside a tmux pane and fail loudly otherwise. If your session isn't inside tmux, skip the relay: update this file and tell Basil the chain needs restarting from a tmux-launched session.

**Expect `SHOWRUNNER_HANDOFF.md` in this directory** (Basil, 2026-07-02): it is the top-layer watchdog session's own hand-off document, deliberately gitignored — not your input, not stray dirty state, never committed.

## Immediate next action

**Wait for Basil's tiering decision — nothing is launchable or committable until it lands.** Basil was slacked the run-4 outcome and the framed decision at session end (the relay is intentionally not running; restart it from a tmux-launched session when work resumes). When the decision arrives: record it with provenance in the direction doc's Decision-status line (mirroring the `565af44`/`da89bd8` decision-record pattern), then execute the chosen branch — branch 1 starts with the owner amending the End Goal's tiering paragraph in the same change, then archive-then-clear of the run-4 residue before any cycle re-entry; branch 2 reuses the run-4 launch procedure unchanged (`launch-run.sh`, exit marker teed into the run log, ≤30-minute wake-and-verify sweeps, 429 self-resume expectation); branch 3 needs its own artifact plan iterated through the direction doc first.
