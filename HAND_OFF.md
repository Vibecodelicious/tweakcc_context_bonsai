# Hand-Off

This file is the single entry point: a fresh session pointed here needs nothing else to start. Reading order:

1. This file, in full.
2. `/home/basil/projects/context-bonsai-agents/docs/meta-loop-direction.md` — the authoritative direction statement, iterated onto the run-3 outcome at `d87969f`. Its Next Step is the **run-4 decision**, framed and left open: that decision belongs to Basil or his delegated watchdog, and this relay is stopped awaiting it.
3. Source documents on demand only — context budget matters in this project of all projects.

Keep this file updated as work progresses (read `/home/basil/projects/context-bonsai-agents/.llm-conductor/writing_guidance/DOCUMENT_WRITING_GUIDANCE.md` before rewriting it). This file lives in the Claude Code port's side repo, but most current work targets the **parent repo** `/home/basil/projects/context-bonsai-agents/`.

## What we are doing

Developing the Context Bonsai **meta-loop**: the machinery that keeps every harness port current as harnesses release new versions, and that can derive a port for a harness it has never seen. Basil calls the current activity the outer-outer loop — developing the loops themselves. The authoritative direction statement is **`docs/meta-loop-direction.md`** (parent repo).

## State as of 2026-07-03 ~03:40 UTC (post-launch)

**PILOT RUN 4 IS LIVE**: launched 03:36 UTC in tmux window `bonsai:@4` (`gpt55-pilot-run4`), orchestrator PID 1863670, run log `.agents/pilot/gpt55-v1.17.13-run.log` (tee includes the exit marker — plumbing dry-run-verified). The watchdog chose branch 1 (run 4, unchanged terms) with the owner slacked and the override window explicitly waived ("launch it, window's yours to hold"). Decision + launch prep at `da89bd8`: residue archived to `.agents/pilot/archive/run3-v1.17.13/`, 429-self-resume expectation in `launch-run.sh`, fresh observer log armed with the eight-gap recurrence checklist. First wake-and-verify passed: the executor found `docs/opencode-e2e-runbook.md` via §4.2 immediately.

**Your job is observation** (intent rules 4 and 6): wake-and-verify every ≤30 minutes — process alive (`pgrep -af 'opencode run --agent bonsai-orchestrator'`), run log growing, or the silence explained. A silent stall with the process alive is EXPECTED if the provider 429s: check the newest `~/.local/share/opencode/log/*.log` for `session.processor` errors; the session self-resumes at the retry-after horizon (run-3 precedent) — verify self-resume before considering any injection, and injection needs watchdog sanction. Watch for `PILOT-PROCESS-EXITED` in the run log; on exit, run the post-run sequence runs 2–3 followed (observer log verdicts + acceptance assessment → commit records → owner review of any §1.16 edit → direction iteration → slack). Verdicts go in the observer log as stumbles appear; touch nothing the executor reads.

**The post-run-3 owner sequence is complete.** Three parent commits from the preceding work unit:

- `15c0463` — owner review of the run-3 §1.16 maintenance edit: **adopted as written** (the flag-don't-invent rule extends the spec's existing fail-closed principle to partially-bound slots; complementary to, not conflicting with, the direction doc's §1.15-refinement step). The four run-3 record files were untracked in the same commit per the `3aaea2f` precedent (history keeps them at `bddcf96`; they remain on disk, gitignored).
- `2f8495a` — **verdicts V2/V3 closed**: new `docs/opencode-e2e-runbook.md` binds the concrete OpenCode commands for both the runtime e2e (Protocols A/B) and the pre-publish install gate. Every command carries an EXECUTED / SOURCE-VERIFIED / COMPOSED grounding mark; composed sequences first run at the next cycle's gates, and a composed-command failure is a finding against the runbook, not license to improvise. §4.2 now cites the runbook and carries the durable flag-don't-invent rule. Authored under the writing-guidance loop (2 iterations, 4 reviewer passes, 11 findings fixed) with final mechanical verification of every code block.
- `d87969f` — **direction doc iterated onto run 3**. Three-run trend now recorded: the §1.15 exhaustion cause migrated from executor behavior to unbound owner slots; question (b) twice-confirmed yes; question (a) still open but with first direct evidence it may resolve yes (run 3's executor fixed all self-caused findings within budget). Next Step = the run-4 decision, framed with the drafter's labeled read: run 4 under unchanged terms is supported, the up-tier split is weakened, the fallback rung remains unsupported.

**BLOCKED ON: the run-4 decision** (Basil or his watchdog, per the `565af44` delegation precedent). Basil was slacked the outcome and the framed decision at session end. Do not launch anything until the decision is recorded; when it lands, record it in the direction doc's Decision-status line (mirroring `565af44`'s decision-record pattern) before acting on it.

**If the decision is branch 1 (run 4), the launch prep is enumerated in the direction doc's Next Step**: (1) archive-then-clear the run-3 residue (`.agents/plans/*0dfbeeda*` — still untracked in the parent tree; §1.14 halts any run 4 until cleared; run-2 precedent: copy under `.agents/pilot/archive/`, then delete from the tree); (2) carry the run-3 observation protocol unchanged (exit marker teed into the watched log + ≤30-minute wake-and-verify sweeps + the silent-wake lesson: check the newest `~/.local/share/opencode/log/*.log` for `session.processor` errors before reading run-log silence as progress); (3) the four-clause acceptance test now guards all eight fixed SPEC-GAPs.

Worktree state, deliberate: parent tree is clean except the untracked run-3 residue (above) and the `tweakcc_context_bonsai` submodule pointer (untouchable pin — never commit it). Windows `bonsai:@7`, `@1`, `@5` are inert and Basil's to close.

Prior-unit commits still relevant: `20d5d40`/`f9d9063`/`bddcf96` (run 1/2/3 records), `85dd3b8` + `3aaea2f` (run-1/run-2 owner fixes), `565af44` (run-3 launch prep + watchdog decision record), `b15eb16` (previous direction iteration).

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

**Observe run 4** per the State section's protocol: ≤30-minute wake-and-verify sweeps until `PILOT-PROCESS-EXITED` appears in the run log; record milestones and verdicts in the observer log as they occur; keep sessions short by relaying between sweeps when a session grows long (the credit economy), or hold a background timer within one session. On exit: post-run sequence (verdicts + acceptance assessment against the eight-gap checklist in the observer log → commit the four records mirroring `bddcf96` → owner review of any uncommitted §1.16 Part-4 edit → iterate the direction doc → slack Basil, verify `ok`). The isolated capability question this run answers is stated in the observer log's header; a seal, a clean EXECUTOR-FAIL, and an explicit early missing-binding STOP are all unconfounded outcomes — do not rescue any of them.
