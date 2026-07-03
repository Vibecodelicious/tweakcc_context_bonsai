# Hand-Off

This file is the single entry point: a fresh session pointed here needs nothing else to start. Reading order:

1. This file, in full.
2. `/home/basil/projects/context-bonsai-agents/docs/meta-loop-direction.md` — the authoritative direction statement, iterated onto the run-4 outcome at `8558733` and carrying the owner's **branch-1 tiering decision** at `b4f02cf`: cycle-plan generation and validation up-tiered to a Fable-class model, GPT-5.5 keeps execution of the approved plan and §1.16 maintenance, End Goal amended accordingly. Its Next Step's decision record enumerates the execution now owed.
3. Source documents on demand only — context budget matters in this project of all projects.

Keep this file updated as work progresses (read `/home/basil/projects/context-bonsai-agents/.llm-conductor/writing_guidance/DOCUMENT_WRITING_GUIDANCE.md` before rewriting it). This file lives in the Claude Code port's side repo, but most current work targets the **parent repo** `/home/basil/projects/context-bonsai-agents/`.

## What we are doing

Developing the Context Bonsai **meta-loop**: the machinery that keeps every harness port current as harnesses release new versions, and that can derive a port for a harness it has never seen. Basil calls the current activity the outer-outer loop — developing the loops themselves. The authoritative direction statement is **`docs/meta-loop-direction.md`** (parent repo).

## State as of 2026-07-03 ~08:40 UTC (RUN 5 IS LIVE — execution of the approved plan, execute-only preflight already held)

**RUN 5 LAUNCHED 08:32 UTC** in tmux window `bonsai:@15` (`gpt55-pilot-run5`), orchestrator PID 2049574, via `launch-run.sh` (dry-run plumbing check passed immediately before). This is decision-record item (2): GPT-5.5 executes the approved plan + §1.16 maintenance. Launch prep completed this unit:

- **Brief revised to execute-only mode, committed `f6d3513`.** New "Cycle stage" section supplies the completed generation as invoker fact (artifact paths, owner-tier provenance, steps 4–5 as the whole job, explicit §1.14 non-collision, pre-Phase-1 approval-section check). Reviewed per the writing guidance: source-truth clean; reader-state found one blocking gap — spec §1.9/plan Phase-1 drift-STOP text says a fresh plan "is required", which a literal executor could act on — fixed by assigning that remedy to the owner tier explicitly (like §1.17), re-reviewed clean.
- **Run-4 record files cleared** after byte-verifying all five archive copies under `.agents/pilot/archive/run4-v1.17.13/`.
- **First milestone clean (08:36 UTC, observer log)**: the executor framed its todos as execute-only (no generation step), verified all four committed artifacts by stage-hash + empty diff, passed the clean-state check with only the enumerated submodule path dirty, and launched a `bonsai-developer` to execute the plan. No §1.14 collision misfire.

**THE APPROVED PLAN — parent commit `37ed76c`**: `.agents/plans/story-rebase-cycle-0dfbeeda…​.md` + three validation artifacts (checksums recorded in the plan). Fable-tier generation closed the §1.15 loop at iteration 1 with zero blocking findings (GPT-5.5's run 4 went 0-for-3 — the contrast the experiment wanted); judge APPROVE covers the plan and the README manual-review row. The three run-4 residual defect classes were fixed at generation and reviewer-verified.

**RUN CONTEXT**: runs 1–4 records at `20d5d40`/`f9d9063`/`bddcf96`/`cb0a5fb`; run 4 was the first clean EXECUTOR-FAIL (STOP at §1.15), direction-doc iteration `8558733`, owner branch-1 decision `b4f02cf`. Item (3) rides this run: the runbook's COMPOSED command sequences get their first live outing at the e2e/install gates — a composed-command failure is a runbook finding, not license to improvise. If the run seals, it is the spec's first surviving live cycle and executes the full publish ladder (pushes to canonical remotes, plan-gated behind dry-runs and the install gate) — network/credential actions unseen in runs 1–4.

Worktree state, deliberate: parent tree clean except the `tweakcc_context_bonsai` submodule pointer (untouchable pin — never commit it) and the gitignored live run-5 files (`.agents/pilot/gpt55-v1.17.13-{observer-log,run.log,…}` — the executor adds friction-log/report files as it goes; all untracked by design). Windows `bonsai:@4`, `@7`, `@1`, `@5` remain inert and Basil's to close; `@15` is the live run — never kill it.

Prior-unit commits still relevant: `20d5d40`/`f9d9063`/`bddcf96`/`cb0a5fb` (run 1/2/3/4 records), `85dd3b8` + `3aaea2f` + `15c0463` (owner fixes/reviews), `2f8495a` (e2e runbook closing V2/V3), `565af44` + `da89bd8` (run-3/run-4 launch prep + watchdog decision records), `b4f02cf` (tiering decision), `37ed76c` (the approved plan), `f6d3513` (this unit: execute-only brief).

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

**Observe run 5 under the standing protocol until it exits, then process the outcome.** The protocol (full text at the top of the live observer log `.agents/pilot/gpt55-v1.17.13-observer-log.md`):

1. **Wake-and-verify every ≤30 minutes** (intent rule 6): process 2049574 alive, run log `.agents/pilot/gpt55-v1.17.13-run.log` growing, or the silence explained. On a silent stall, check the newest `~/.local/share/opencode/log/*.log` for `session.processor` errors — a provider 429 is EXPECTED: the session sleeps out the retry-after in-process and self-resumes at the horizon (runs 3–4 both validated this). Verify self-resume at the horizon before considering any injection; injection requires watchdog sanction. Record milestones and any stumble-verdicts (`SPEC-GAP` vs `EXECUTOR-FAIL`) in the observer log as they appear. No hints, no fixes, no edits to anything the executor reads.
2. **Watch the run log for `PILOT-PROCESS-EXITED`** (it is teed into the log; a `grep` watcher on that marker is the reliable exit signal). Long monitors + relay at natural boundaries beat frequent polling (credit economy); each relay session holds a few sweeps, updates this file, relays.
3. **On exit**: read the executor's final report and friction log; write fix-recurrence checks and verdicts in the observer log (run-4 log under `archive/run4-v1.17.13/` is the format precedent); verify §1.16 maintenance ran (mandatory on seal AND STOP — skipping it invalidates the pilot); then archive the run records and commit the run-5 record to parent (runs 1–4 precedent). If sealed: verify the publish-ladder results the plan gates (pushes to canonical remotes) actually match the plan's final-verification commands before celebrating — then the direction doc gets its outcome iteration (owner-tier work, next unit). If STOP: verdict first, no re-tier on impressions (intent rule 3).

The run may take hours including an expected multi-hour quota stall. A mid-observation relay is normal — this file plus the observer log carry the state.
