# Hand-Off

This file is the single entry point: a fresh session pointed here needs nothing else to start. Reading order:

1. This file, in full.
2. `/home/basil/projects/context-bonsai-agents/docs/meta-loop-direction.md` — the authoritative direction statement, iterated onto the run-4 outcome at `8558733` and carrying the **branch-1 tiering decision** at `b4f02cf` (provenance corrected at `97f45f0`: originally executed from TUI ghost text misattributed to the owner, ratified 2026-07-03 by the watchdog under the owner's explicit delegation): cycle-plan generation and validation up-tiered to a Fable-class model, GPT-5.5 keeps execution of the approved plan and §1.16 maintenance, End Goal amended accordingly. Its Next Step's decision record enumerates the execution now owed.
3. Source documents on demand only — context budget matters in this project of all projects.

Keep this file updated as work progresses (read `/home/basil/projects/context-bonsai-agents/.llm-conductor/writing_guidance/DOCUMENT_WRITING_GUIDANCE.md` before rewriting it). This file lives in the Claude Code port's side repo, but most current work targets the **parent repo** `/home/basil/projects/context-bonsai-agents/`.

## What we are doing

Developing the Context Bonsai **meta-loop**: the machinery that keeps every harness port current as harnesses release new versions, and that can derive a port for a harness it has never seen. Basil calls the current activity the outer-outer loop — developing the loops themselves. The authoritative direction statement is **`docs/meta-loop-direction.md`** (parent repo).

## State as of 2026-07-03 ~16:45 UTC (RUN 5 PARKED ON ITS QUOTA HORIZON — probe negative, watchdog holds the timer)

**RUN 5 IS ASLEEP, NOT DEAD — and owner-sanctioned to stay that way until the horizon.** Launched 08:32 UTC in tmux window `bonsai:@15` (`gpt55-pilot-run5`), orchestrator PID 2049574. At 08:35:54 UTC — on the `bonsai-developer`'s **first** LLM call, ~4 minutes in — the opencode log (`~/.local/share/opencode/log/2026-07-03T083157.log`) recorded `session.processor error=Subscription quota exceeded. Retry in 2 days.` The process is alive on the same in-process sleep path runs 3–4 validated; self-resume is expected ~**2026-07-05 08:36 UTC**. No cycle work had begun: preflight passed clean (execute-only framing held, all four plan artifacts hash-verified, no §1.14 misfire — observer-log milestone 08:36), and the only executor activity was one friction event, already resolved cleanly: bootstrap `bun install` failed on missing `node-gyp` (friction-logged with evidence 08:33), the executor installed the missing helper and re-ran the plan command verbatim to success 08:34 (`bun-install-rerun.log`, 242 packages) — no verdict, environmental, handled well.

**The owner's disposition (2026-07-03, via the watchdog)**: retry in case quota was back early; if genuinely stuck, hold a timer past the horizon. Executed 16:34 UTC: a trivial GPT-5.5 probe in a scratch opencode session (not the live run) 429'd identically — quota is not back (observer-log entry 16:36, probe log `2026-07-03T163430.log`). Per the same instruction the sleeping process was untouched; kill-and-relaunch was sanctioned only for a successful probe. **The watchdog holds a timer for 2026-07-05 08:50 UTC** to restart the observation relay; no relay session runs until then (parking beats ~96 idle 30-minute sweeps).

Launch-prep record (unchanged): brief revised to execute-only mode at `f6d3513` (reviewed per the writing guidance; the §1.9 drift-remedy gap fixed pre-commit); run-4 records cleared after byte-verifying the archive under `.agents/pilot/archive/run4-v1.17.13/`.

**THE APPROVED PLAN — parent commit `37ed76c`**: `.agents/plans/story-rebase-cycle-0dfbeeda…​.md` + three validation artifacts (checksums recorded in the plan). Fable-tier generation closed the §1.15 loop at iteration 1 with zero blocking findings (GPT-5.5's run 4 went 0-for-3 — the contrast the experiment wanted); judge APPROVE covers the plan and the README manual-review row. The three run-4 residual defect classes were fixed at generation and reviewer-verified.

**RUN CONTEXT**: runs 1–4 records at `20d5d40`/`f9d9063`/`bddcf96`/`cb0a5fb`; run 4 was the first clean EXECUTOR-FAIL (STOP at §1.15), direction-doc iteration `8558733`, branch-1 decision `b4f02cf` (provenance corrected `97f45f0`). Item (3) rides this run: the runbook's COMPOSED command sequences get their first live outing at the e2e/install gates — a composed-command failure is a runbook finding, not license to improvise. If the run seals, it is the spec's first surviving live cycle and executes the full publish ladder (pushes to canonical remotes, plan-gated behind dry-runs and the install gate) — network/credential actions unseen in runs 1–4.

Worktree state, deliberate: parent tree clean except the `tweakcc_context_bonsai` submodule pointer (untouchable pin — never commit it) and the gitignored live run-5 files (`.agents/pilot/gpt55-v1.17.13-{observer-log,run.log,…}` — the executor adds friction-log/report files as it goes; all untracked by design). Windows `bonsai:@4`, `@7`, `@1`, `@5` remain inert and Basil's to close; `@15` is the live run — never kill it.

Prior-unit commits still relevant: `20d5d40`/`f9d9063`/`bddcf96`/`cb0a5fb` (run 1/2/3/4 records), `85dd3b8` + `3aaea2f` + `15c0463` (owner fixes/reviews), `2f8495a` (e2e runbook closing V2/V3), `565af44` + `da89bd8` (run-3/run-4 launch prep + watchdog decision records), `b4f02cf` (tiering decision) + `97f45f0` (its provenance correction), `37ed76c` (the approved plan), `f6d3513` (execute-only brief).

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

**Ghost text in claude input boxes is NOT user input (Basil, 2026-07-03).** Claude Code's TUI renders an AI-generated suggestion of the user's next message in an idle input box; in a pane capture it is indistinguishable from text Basil typed without pressing Enter, and it reads like a perfect answer to whatever the session just asked. Anyone reading panes — the watchdog, or a chain session inspecting another window — must not treat unsubmitted input-box text as Basil's instruction; confirm authorship with Basil before acting on it. Two owner-level decisions were wrongly executed from such ghost text on 2026-07-03 before this was caught (run-4 early launch; the branch-1 End Goal amendment — see the direction doc for their standing).

## Immediate next action

**Parked until the watchdog's 2026-07-05 08:50 UTC timer fires — no relay session should run before then.** The session that timer starts must: **verify self-resume at the horizon** — run log `.agents/pilot/gpt55-v1.17.13-run.log` growing again and `session.processor` activity in the newest `~/.local/share/opencode/log/*.log` (the 08:35:54 stall was on the developer's first LLM call, so fresh run-log bytes are the signal). If self-resume happened, resume the standing protocol below. If the horizon passed and the process is alive but did NOT resume, that is a new situation: injection requires watchdog sanction — escalate, don't improvise. If the process died, treat it as a false start: record disposition in the observer log, clear the run-5 record files, relaunch via `launch-run.sh` (owner sanction for relaunch-after-reset is on record, observer-log entry 16:36), then observe per protocol.

**Standing observation protocol** (full text at the top of the live observer log `.agents/pilot/gpt55-v1.17.13-observer-log.md`):

1. **Wake-and-verify every ≤30 minutes** (intent rule 6): process 2049574 alive, run log `.agents/pilot/gpt55-v1.17.13-run.log` growing, or the silence explained. On a silent stall, check the newest `~/.local/share/opencode/log/*.log` for `session.processor` errors — a provider 429 is EXPECTED: the session sleeps out the retry-after in-process and self-resumes at the horizon (runs 3–4 both validated this). Record milestones and any stumble-verdicts (`SPEC-GAP` vs `EXECUTOR-FAIL`) in the observer log as they appear. No hints, no fixes, no edits to anything the executor reads.
2. **Watch the run log for `PILOT-PROCESS-EXITED`** (it is teed into the log; a `grep` watcher on that marker is the reliable exit signal). Long monitors + relay at natural boundaries beat frequent polling (credit economy); each relay session holds a few sweeps, updates this file, relays.
3. **On exit**: read the executor's final report and friction log; write fix-recurrence checks and verdicts in the observer log (run-4 log under `archive/run4-v1.17.13/` is the format precedent); verify §1.16 maintenance ran (mandatory on seal AND STOP — skipping it invalidates the pilot); then archive the run records and commit the run-5 record to parent (runs 1–4 precedent). If sealed: verify the publish-ladder results the plan gates (pushes to canonical remotes) actually match the plan's final-verification commands before celebrating — then the direction doc gets its outcome iteration (owner-tier work, next unit). If STOP: verdict first, no re-tier on impressions (intent rule 3).
