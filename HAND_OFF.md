# Hand-Off

This file is the single entry point: a fresh session pointed here needs nothing else to start. Reading order:

1. This file, in full.
2. `/home/basil/projects/context-bonsai-agents/docs/meta-loop-direction.md` — the authoritative direction statement. Its Next Step (fix launch defects, re-run the pilot) is now half done: the fixes landed and the re-run is live; this session's job is observing it.
3. The source documents listed under "Immediate next action," as the work requires them — not preemptively; context budget matters in this project of all projects.

Keep this file updated as work progresses (read `/home/basil/projects/context-bonsai-agents/.llm-conductor/writing_guidance/DOCUMENT_WRITING_GUIDANCE.md` before rewriting it). This file lives in the Claude Code port's side repo, but most current work targets the **parent repo** `/home/basil/projects/context-bonsai-agents/`.

## What we are doing

Developing the Context Bonsai **meta-loop**: the machinery that keeps every harness port current as harnesses release new versions, and that can derive a port for a harness it has never seen. Basil calls the current activity the outer-outer loop — developing the loops themselves. The authoritative direction statement is **`docs/meta-loop-direction.md`** (parent repo). Its Next Step: the four launch-defect fixes (now committed at parent `85dd3b8`), then the GPT-5.5 pilot re-run against upstream OpenCode v1.17.13 under unchanged terms (now running).

## State as of 2026-07-02 ~17:35 UTC

- **The four launch-defect fixes are committed** at parent `85dd3b8` (this relay unit's work): §2.1 explicit tag fetch; §1.10 pre-existing dirty-path enumeration with the `tweakcc_context_bonsai` pin recorded in §4.2 and supplied by the brief's Cycle inputs; §1.16 maintenance mandatory on STOP as well as seal (gate 12 parenthetical, five-step overview, and the brief's STOP rule all reconciled); pilot logs untracked+gitignored and the first run's draft-plan residue deleted. Writing-guidance review ran: Source-Truth and Reader-State reviewers (sonnet) each independently flagged the stale unqualified "clean `git status --short`" line in §2.1's preflight plus (Source-Truth) the five-step overview's seal-only step 5; both fixed before commit. The commit body carries the full rationale.
- **Pilot run 2 is live**, launched ~17:30 UTC in tmux window `bonsai:@5` (`gpt55-pilot-run2`), same command and terms as run 1, output teed to `.agents/pilot/gpt55-v1.17.13-run.log`. Early checks passed on observation: the §1.14 collision glob found no prior plan (residue deletion worked), parent status showed only the enumerated pin, source and tag refs resolved. The shell prints `PILOT-PROCESS-EXITED code=<n>` when the run ends.
- **Run-2 observer log is started** at `.agents/pilot/gpt55-v1.17.13-observer-log.md` (untracked/ignored by design after fix 4; run 1's record is preserved in history at `20d5d40`). It carries the re-run acceptance test, including the new clause: a recurrence of any of the three fixed SPEC-GAPs is a defect in the owner-tier fix, not new pilot data.
- **Basil was slacked ~17:10 UTC** (previous unit) with the verdicts and the relaunch plan, invited to object. No reply channel exists (the slack script is a send-only webhook) and no objection arrived by any visible channel (no new commits or notes) before launch, so the relaunch proceeded per plan. He has NOT yet been told run 2 is live.
- The old run-1 window `bonsai:@1` (`gpt55-pilot`) still shows the exited first run: the permission classifier blocked closing it (it treats any direct `tmux kill-window` as forbidden, though the relay-chain rule was only ever about relay windows). It is inert; leave it for Basil to close, or ignore it.
- Standing facts: the parent repo's dirty `tweakcc_context_bonsai` submodule pin is enumerated, untouchable, and must never be swept into commits. Basil chose direct document authoring + the writing-guidance review loop over the formal plan system for this work.

## Intent you must not lose (from direct conversation with Basil)

1. **The deterministic-gate machinery is calibrated scaffolding.** It compensates for weak model judgment (GPT-5.5 / Opus 4.8 era). It is load-bearing where a weak model executes, and only there is it non-negotiable. Relaxation experiments are allowed only in strong-model (Fable-class) tiers.
2. **The pilot is a capability experiment, not a build-out**: GPT-5.5 must (a) execute the routine per-release cycle and (b) maintain the routine's own instructions from cycle friction (§1.16). Fallback ladder if (b) fails: GPT-5.5 executes, Fable maintains. Skipping the maintenance step invalidates the pilot — the spec and brief now state this unambiguously for both seal and STOP outcomes.
3. **Failure attribution before tiering decisions.** Every pilot stumble gets classified `SPEC-GAP` (our artifact under-specified — fix the artifact) vs `EXECUTOR-FAIL` (deterministic spec, executor still failed — evidence for fallback). Never re-tier on impressions.
4. **The observer must not contaminate the experiment.** Fable observes and records verdicts; it does not hint, fix, or pre-empt. A fail-closed STOP is pilot data, not pilot failure. Verdicts go in the observer log as stumbles appear; no edits to anything the executor reads while the run lives.
5. Writing plans → re-read `.llm-conductor/planning_guidance.md` first; orchestrating → re-read `.llm-conductor/ORCHESTRATOR_AGENT.md`; any document authoring → the writing guidance. Basil's rules require re-reading these, not trusting memory of them.

## Fable credit economy (binding)

Fable tokens are scarce (~25% consumed in the 2026-07-01 session alone). Spend them only on judgment, synthesis, and intent-sensitive decisions. Rules:

- Subagents inherit the session model unless overridden. **Always pass an explicit cheaper model** (`sonnet`, or `haiku` for mechanical work) when spawning readers, extractors, reviewers, or drafters.
- Long sessions reprocess their whole history every turn. Finish a work unit, update this file, end the session; start the next unit fresh from this entry point. While observing the pilot, prefer long sleeps/monitors over frequent polling — each poll turn re-reads the whole session.
- Read sources on demand, not preemptively; delegate bulk reading to cheap subagents and consume their conclusions.

## Session hand-off relay (tmux)

Sessions chain through tmux so each stays short (see credit economy above). A relayed session's launch prompt names its predecessor's tmux window; retiring that window is its first act, via `scripts/handoff-retire.sh <window-id>` — never a raw `tmux kill-window`. The retire script kills only windows that `handoff-relay.sh` marked `@handoff_state=retiring` and refuses self-targets, so a wrong id cannot take down this session or another agent's window. When your work unit is done:

1. Update this file.
2. If the next step needs input only Basil can give: do **not** relaunch. Slack him (`/home/basil/llm_prompts/scripts/slack.sh "..."`) and stop — a relaunched session would just idle against the same blocker.
3. Otherwise run `scripts/handoff-relay.sh` as your **final tool call** (any output you produce after it may be lost when the successor retires your window). It marks your window as retiring and opens a fresh `claude --model claude-fable-5` in a new window of this tmux session, pointed at this file.

Both scripts require running inside a tmux pane and fail loudly otherwise. If your session isn't inside tmux, skip the relay: update this file and tell Basil the chain needs restarting from a tmux-launched session.

## Immediate next action

**Observe pilot run 2 to its end; record verdicts; do not interfere.** Order of work:

1. Slack Basil that run 2 launched at ~17:30 UTC after the fixes landed at `85dd3b8` (he was promised the relaunch; he does not know it happened).
2. Arm one background exit-watcher on `.agents/pilot/gpt55-v1.17.13-run.log` for `PILOT-PROCESS-EXITED` (the pattern that worked in run 1) — one notification at run end, no polling. Between events, check the run at long intervals only (tmux `capture-pane` on `bonsai:@5`, or the run log tail), per the credit economy.
3. As stumbles appear, append verdict entries (`SPEC-GAP` vs `EXECUTOR-FAIL`, with evidence) to the observer log. Watch specifically for recurrence of the three fixed SPEC-GAPs — recurrence means the fix didn't land and is owner-tier rework, not pilot data. Intent rule 4 binds: no hints, no fixes, no touching anything the executor reads.
4. When the run ends: verify the executor's final report and §1.16 maintenance outcome exist per the brief; complete the observer log's run assessment against the acceptance test (in the log's header); then the direction loop iterates again (direction doc's Iteration Rule) — that iteration plus slacking Basil the outcome is likely the next relay unit's work. Expect a long run: a full cycle through the e2e gate takes hours, so this may span several relay units; split at natural seams and keep this file current.
