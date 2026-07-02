# Hand-Off

This file is the single entry point: a fresh session pointed here needs nothing else to start. Reading order:

1. This file, in full.
2. `/home/basil/projects/context-bonsai-agents/docs/meta-loop-direction.md` — the authoritative direction statement. Its Next Step section now *is* the spec for this session's work; this file adds only operational detail the direction doc deliberately omits.
3. The source documents listed under "Immediate next action," as the work requires them — not preemptively; context budget matters in this project of all projects.

Keep this file updated as work progresses (read `/home/basil/projects/context-bonsai-agents/.llm-conductor/writing_guidance/DOCUMENT_WRITING_GUIDANCE.md` before rewriting it). This file lives in the Claude Code port's side repo, but most current work targets the **parent repo** `/home/basil/projects/context-bonsai-agents/`.

## What we are doing

Developing the Context Bonsai **meta-loop**: the machinery that keeps every harness port current as harnesses release new versions, and that can derive a port for a harness it has never seen. Basil calls the current activity the outer-outer loop — developing the loops themselves. The authoritative direction statement is **`docs/meta-loop-direction.md`** (parent repo). Its Next Step, freshly iterated at parent commit `f66812c`: fix the GPT-5.5 pilot's first-run launch defects (four fixes, specified precisely there), then re-run the pilot against upstream OpenCode v1.17.13 under unchanged terms.

## State as of 2026-07-02 ~17:15 UTC

- **Direction-loop iteration is done** (this relay unit's work). `docs/meta-loop-direction.md` was rewritten per its own Iteration Rule — first-run evidence into Current State, the four-fixes-then-re-run Next Step, a launch-environment invalidation-scope class added to Provisional step 1 — and committed at parent `f66812c`. It went through the writing-guidance review loop: Source-Truth reviewer clean (every claim checked against the logs, the spec's section text, git history, and gitignore state), Reader-State reviewer produced five path/gloss line edits, all applied.
- **Basil was slacked 2026-07-02 ~17:10 UTC** with the verdict tally, what the run did and didn't test, the four fixes, and notice that the re-run is next. He was invited to object before launch. **Check Slack for a reply before relaunching**; an objection changes this plan.
- First-run facts in one line (full record: `.agents/pilot/gpt55-v1.17.13-observer-log.md`, committed `20d5d40`): STOPped fail-closed at spec §1.10 clean-state preflight before execution, no commits anywhere, tally 3 SPEC-GAP / 1 minor self-recovered EXECUTOR-FAIL, zero ambiguity-grinding; the STOP is launch-environment class, so the tiering questions (full cycle, §1.15 convergence, self-maintenance) are still untested.
- **Fix targets, operationally** (the *what and why* is the direction doc's Next Step; this is the *where*):
  - `docs/agent-specs/forward-port-spec.md` §2.1 (explicit tag fetch), §1.10 (enumeration of pre-existing untouchable dirty status paths), §1.16 (maintenance attempted and recorded on STOP as well as seal). These are owner-tier edits to the acceptance-tested spec — same practice as the regeneration test's ~12 fixes, each grounded in an observer-log verdict. No cycle is running, so seal gate 12 (no spec edits mid-run) does not bind.
  - `.agents/pilot/gpt55-v1.17.13-brief.md`: its untouchable-submodule rule must become a §1.10 enumeration entry (the `tweakcc_context_bonsai` pin), and its "§1.16 maintenance edits happen only after the seal" line must match the fixed §1.16.
  - `.agents/pilot/.gitignore` currently excludes only `*.log`; add the three tracked markdown logs (observer, friction, final report) — or relocate them — so observing can't dirty §1.10's check. They are tracked files today, so gitignoring alone won't untrack them: `git rm --cached` (keeping working copies) or relocation is needed, in a commit.
  - First-run residue to clear (unapproved drafts that died before §1.15 iteration 2 — delete, do not commit as if approved): untracked `.agents/plans/story-rebase-cycle-0dfbeed….md` and `.agents/plans/validation/*-0dfbeed….json` in the parent repo.
- **Executor setup is unchanged and reusable**, committed at parent `05a7356`: OpenCode CLI agents `bonsai-orchestrator`/`bonsai-developer`/`bonsai-reviewer`/`bonsai-judge`, all on `opencode/gpt-5.5` (OpenCode Zen), medium reasoning, in parent-root `opencode.json`. The first run's exact launch command, recovered from the pilot pane, ran in a fresh window of tmux session `bonsai`:
  `cd /home/basil/projects/context-bonsai-agents && opencode run --agent bonsai-orchestrator --variant medium --title gpt55-pilot-v1.17.13 'Read .agents/pilot/gpt55-v1.17.13-brief.md and execute it fully. Work until the run ends per the brief, then write the final report the brief requires.' 2>&1 | tee .agents/pilot/gpt55-v1.17.13-run.log; echo; echo PILOT-PROCESS-EXITED code=$?; exec bash`
- The old `bonsai:gpt55-pilot` window still shows the exited first run; close it when relaunching (plain window close is fine — it is not part of the relay chain and holds nothing unrecovered).
- Standing facts: the parent repo's dirty `tweakcc_context_bonsai` submodule pin is pre-existing and unrelated — never sweep it into commits. Basil chose direct document authoring + the writing-guidance review loop over the formal plan system for this work.

## Intent you must not lose (from direct conversation with Basil)

1. **The deterministic-gate machinery is calibrated scaffolding.** It compensates for weak model judgment (GPT-5.5 / Opus 4.8 era). It is load-bearing where a weak model executes, and only there is it non-negotiable. Relaxation experiments are allowed only in strong-model (Fable-class) tiers.
2. **The pilot is a capability experiment, not a build-out**: GPT-5.5 must (a) execute the routine per-release cycle and (b) maintain the routine's own instructions from cycle friction (§1.16). Fallback ladder if (b) fails: GPT-5.5 executes, Fable maintains. Skipping the maintenance step invalidates the pilot — this is now unambiguous in spec and brief once fix 3 lands.
3. **Failure attribution before tiering decisions.** Every pilot stumble gets classified `SPEC-GAP` (our artifact under-specified — fix the artifact) vs `EXECUTOR-FAIL` (deterministic spec, executor still failed — evidence for fallback). Never re-tier on impressions.
4. **The observer must not contaminate the experiment.** Fable observes and records verdicts; it does not hint, fix, or pre-empt. A fail-closed STOP is pilot data, not pilot failure.
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

**Apply the four launch-defect fixes, then relaunch the pilot and observe.** The fix content is specified in the direction doc's Next Step (authoritative); the file targets and mechanics are in State above. Order of work:

1. Check Slack for a reply from Basil (he was invited to object). An objection supersedes the rest of this list.
2. Make the fixes: spec §2.1 / §1.10 / §1.16, brief reconciliation, log gitignore+untrack, residue deletion. Spec and brief edits are document authoring — run a writing-guidance-style review pass with cheap (sonnet) reviewers before committing, as the direction-doc iteration just did. Commit with bodies; keep the untouchable submodule pin out.
3. Relaunch using the recovered command in State (fresh tmux window in session `bonsai`; close the old `gpt55-pilot` window). §1.10's fixed preflight must actually pass at launch — verify parent `git status --short` shows only enumerated paths before starting.
4. Observe per intent rule 4: a single background exit-watcher on the run (the pattern worked well — watch for `PILOT-PROCESS-EXITED`), verdicts appended to the observer log as stumbles appear, no hints or fixes while the run lives. The observer log is untracked after fix 4, so logging no longer dirties the preflight.
5. This is two relay units if context runs long: (a) fixes + relaunch, (b) observation + verdicts. Split at the relaunch if needed.
