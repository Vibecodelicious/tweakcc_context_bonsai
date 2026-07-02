# Hand-Off

This file is the single entry point: a fresh session pointed here needs nothing else to start. Reading order:

1. This file, in full.
2. `/home/basil/projects/context-bonsai-agents/docs/meta-loop-direction.md` — the authoritative direction statement.
3. The source documents listed under "Immediate next action," as the work requires them — not preemptively; context budget matters in this project of all projects.

Keep this file updated as work progresses (read `/home/basil/projects/context-bonsai-agents/.llm-conductor/writing_guidance/DOCUMENT_WRITING_GUIDANCE.md` before rewriting it). This file lives in the Claude Code port's side repo, but most current work targets the **parent repo** `/home/basil/projects/context-bonsai-agents/`.

## What we are doing

Developing the Context Bonsai **meta-loop**: the machinery that keeps every harness port current as harnesses release new versions, and that can derive a port for a harness it has never seen. Basil calls the current activity the outer-outer loop — developing the loops themselves. The authoritative direction statement is **`docs/meta-loop-direction.md`** (parent repo); its committed Next Step — the GPT-5.5 executor-tiering pilot against upstream OpenCode v1.17.13 — has now had its **first run, which aborted at a launch defect** (see State).

## State as of 2026-07-02 ~16:55 UTC

- **The GPT-5.5 pilot's first run is over.** It ran 16:43–16:49 UTC and **STOPped fail-closed at the spec's §1.10 clean-state preflight, before execution began**. Parent-repo `git status --short` was not empty — the pre-existing dirty `tweakcc_context_bonsai` submodule pin (which the brief itself declared untouchable) plus an uncommitted observer-log modification — so §1.10 was unsatisfiable from the moment of launch. The executor refused to revert or absorb unrelated state and stopped. No commits were made in any repo. The tmux window `bonsai:gpt55-pilot` shows `PILOT-PROCESS-EXITED code=0` and can be closed at leisure (it is not part of the relay chain).
- **All stumbles carry attribution verdicts** in parent `.agents/pilot/gpt55-v1.17.13-observer-log.md`. Tally: **3 SPEC-GAP, 1 minor EXECUTOR-FAIL** (a pre-fetch sequencing slip, self-recovered in seconds). The three SPEC-GAPs, each with its implied fix recorded in the observer log:
  1. §2.1's freeze fetch (`git fetch --all --prune`) cannot guarantee tag acquisition — the fork's `upstream` refspec is heads-only; the spec must mandate an explicit tag fetch.
  2. §1.10 requires clean status in every touched repo but has no mechanism to enumerate pre-existing untouchable dirty paths (it has one for worktrees only); the brief's untouchable-submodule rule contradicted it, guaranteeing the STOP.
  3. §1.16 maintenance triggers only "after a cycle seals", while the direction doc's acceptance test requires a maintenance attempt in *either* outcome; the brief states both rules without resolving the STOP case. The executor followed the specific rule and skipped maintenance — defensibly.
- **The acceptance test is not met and the tiering questions are untested**: the run halted at a valid fail-closed STOP and everything the executor reached was handled cleanly (zero ambiguity-grinding; its own ambiguity reviewer surfaced the clean-state conflict), but the STOP was a *launch-environment* defect, not a structural-break signal — it impugns our brief/observation setup, not any level-2 upstream assumption. Full-cycle execution and self-maintenance remain untested. **The pilot needs a re-run after the fixes land.**
- **Observation-protocol defect (ours)**: pilot logs (`observer-log`, `friction-log`, brief-side artifacts) live as *tracked* files in the parent repo, so observing/logging dirties the very status §1.10 checks. The run log is already gitignored; the fix is to gitignore (or relocate) the other pilot logs before relaunch. The observer log's dirty state at STOP time predated this observer session's edits.
- **Pilot residue, left deliberately uncommitted**: the executor's draft plan and validation artifacts (`.agents/plans/story-rebase-cycle-0dfbeed….md`, `.agents/plans/validation/*-0dfbeed….json`) are unapproved drafts that died before §1.15 iteration 2 — keep as capability data or delete during cleanup, but do not commit them as if approved. Its final report is `.agents/pilot/gpt55-v1.17.13-final-report.md`.
- **Executor setup (unchanged, reusable for the re-run)**: parent commit `05a7356` — orchestrator per `.llm-conductor/ORCHESTRATOR_AGENT.md` as OpenCode CLI agent `bonsai-orchestrator` on `opencode/gpt-5.5` (OpenCode Zen; OpenAI OAuth tops out at gpt-5.4), medium reasoning, with `bonsai-developer`/`bonsai-reviewer`/`bonsai-judge` on the same model, all in parent-root `opencode.json`. Inputs in `.agents/pilot/gpt55-v1.17.13-brief.md` (committed). The permission-blocks setup note was flagged to Basil in Slack 2026-07-02.
- Prior milestones, still relevant as context: the spec acceptance test passed 2026-07-02 (clean-room regeneration by Sonnet agents, three rounds, ~12 spec fixes; the §1.15 validation loop — not checklists — is what closed weak-executor transfer drops); the meta-plan is superseded by `docs/agent-specs/forward-port-spec.md` (parent `1fedcd9`).
- Standing facts: Basil chose direct document authoring + the writing-guidance review loop over the formal plan system for this work. The parent repo's dirty `tweakcc_context_bonsai` submodule pin is pre-existing and unrelated — do not sweep it into commits.

## Intent you must not lose (from direct conversation with Basil)

1. **The deterministic-gate machinery is calibrated scaffolding.** It compensates for weak model judgment (GPT-5.5 / Opus 4.8 era). It is load-bearing where a weak model executes, and only there is it non-negotiable. Relaxation experiments are allowed only in strong-model (Fable-class) tiers.
2. **The pilot is a capability experiment, not a build-out**: GPT-5.5 must (a) execute the routine per-release cycle and (b) maintain the routine's own instructions from cycle friction (§1.16). Fallback ladder if (b) fails: GPT-5.5 executes, Fable maintains. Skipping the maintenance step invalidates the pilot.
3. **Failure attribution before tiering decisions.** Every pilot stumble gets classified `SPEC-GAP` (our artifact under-specified — fix the artifact) vs `EXECUTOR-FAIL` (deterministic spec, executor still failed — evidence for fallback). Never re-tier on impressions.
4. **The observer must not contaminate the experiment.** Fable observes and records verdicts; it does not hint, fix, or pre-empt. A fail-closed STOP is pilot data, not pilot failure.
5. Writing plans → re-read `.llm-conductor/planning_guidance.md` first; orchestrating → re-read `.llm-conductor/ORCHESTRATOR_AGENT.md`; any document authoring → the writing guidance. Basil's rules require re-reading these, not trusting memory of them.

## Fable credit economy (binding)

Fable tokens are scarce (~25% consumed in the 2026-07-01 session alone). Spend them only on judgment, synthesis, and intent-sensitive decisions. Rules:

- Subagents inherit the session model unless overridden. **Always pass an explicit cheaper model** (`sonnet`, or `haiku` for mechanical work) when spawning readers, extractors, reviewers, or drafters.
- Long sessions reprocess their whole history every turn. Finish a work unit, update this file, end the session; start the next unit fresh from this entry point. While observing the pilot, prefer long sleeps/monitors over frequent polling — each poll turn re-reads the whole session.
- Read sources on demand, not preemptively; delegate bulk reading to cheap subagents and consume their conclusions.

## Session hand-off relay (tmux)

Sessions chain through tmux so each stays short (see credit economy above). A relayed session's launch prompt names its predecessor's tmux window; retiring that window is its first act, via `scripts/handoff-retire.sh <window-id>` — never a raw `tmux kill-window`. The retire script kills only windows that `handoff-relay.sh` marked `@handoff_state=retiring` and refuses self-targets, so a wrong id cannot take down this session or another agent's window. **The `gpt55-pilot` window is not part of the relay chain — never retire it.** When your work unit is done:

1. Update this file.
2. If the next step needs input only Basil can give: do **not** relaunch. Slack him (`/home/basil/llm_prompts/scripts/slack.sh "..."`) and stop — a relaunched session would just idle against the same blocker.
3. Otherwise run `scripts/handoff-relay.sh` as your **final tool call** (any output you produce after it may be lost when the successor retires your window). It marks your window as retiring and opens a fresh `claude --model claude-fable-5` in a new window of this tmux session, pointed at this file.

Both scripts require running inside a tmux pane and fail loudly otherwise. If your session isn't inside tmux, skip the relay: update this file and tell Basil the chain needs restarting from a tmux-launched session.

## Immediate next action

**Direction-loop iteration on `docs/meta-loop-direction.md`, folding in the first run's verdicts.** Sources: the observer log (verdicts + run assessment), the executor's friction log and final report. Re-read the direction doc's own Iteration Rule and the writing guidance first (Basil's rules require re-reading, not memory). Specifics:

- Rewrite Next Step to reflect reality: the pilot's first run aborted on launch defects (3 SPEC-GAP / 1 minor EXECUTOR-FAIL — see State); the committed pilot remains unfinished and needs a re-run after the fixes. The §1.10 STOP record is first-class input for the escalation-codes provisional step, with the caveat that it impugns the launch protocol, not upstream structure.
- The three SPEC-GAP fixes are owner-tier spec work (Parts 1–3 per §1.16 — this tier's job, evidence-grounded, same practice as the ~12 regeneration-test fixes): §2.1 explicit tag fetch; §1.10 enumerated pre-existing dirty paths (the tweakcc pin at minimum); §1.16/brief maintenance-on-STOP rule matching the direction doc's acceptance test. Fix the observation protocol too: gitignore or relocate the pilot logs so observing can't dirty §1.10's check again.
- Then slack Basil a summary: verdict tally, what the run did and didn't test, fixes applied, and that the re-run is next per the standing Next Step — he can object before it launches.
- The work likely splits into two relay units: (1) direction iteration + slack, (2) spec/brief/protocol fixes + relaunch + fresh observation. Keep each session small per the credit economy. The relaunch command pattern and executor setup are in State; write a fresh brief section or amend in place as the fixes dictate, and have the new observer session watch with a single background exit-watcher (worked well) rather than polling.
