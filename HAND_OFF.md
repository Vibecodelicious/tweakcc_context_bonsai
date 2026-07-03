# Hand-Off

This file is the single entry point: a fresh session pointed here needs nothing else to start. Reading order:

1. This file, in full.
2. `/home/basil/projects/context-bonsai-agents/docs/meta-loop-direction.md` — the authoritative direction statement, iterated onto the run-4 outcome at `8558733` and carrying the owner's **branch-1 tiering decision** at `b4f02cf`: cycle-plan generation and validation up-tiered to a Fable-class model, GPT-5.5 keeps execution of the approved plan and §1.16 maintenance, End Goal amended accordingly. Its Next Step's decision record enumerates the execution now owed.
3. Source documents on demand only — context budget matters in this project of all projects.

Keep this file updated as work progresses (read `/home/basil/projects/context-bonsai-agents/.llm-conductor/writing_guidance/DOCUMENT_WRITING_GUIDANCE.md` before rewriting it). This file lives in the Claude Code port's side repo, but most current work targets the **parent repo** `/home/basil/projects/context-bonsai-agents/`.

## What we are doing

Developing the Context Bonsai **meta-loop**: the machinery that keeps every harness port current as harnesses release new versions, and that can derive a port for a harness it has never seen. Basil calls the current activity the outer-outer loop — developing the loops themselves. The authoritative direction statement is **`docs/meta-loop-direction.md`** (parent repo).

## State as of 2026-07-03 ~08:25 UTC (decision item (1) complete: Fable-tier plan generated, validated, approved, committed)

**THE v1.17.13 CYCLE PLAN EXISTS AND IS APPROVED — parent commit `37ed76c`** (`.agents/plans/story-rebase-cycle-0dfbeeda…​.md` plus the three validation artifacts: replay set, manual-review approvals with the README row approved, empty exception ledger; all checksums recorded as literals in the plan and verified against disk). This closes execution-owed item (1) of the branch-1 decision record. The contrast the experiment wanted: GPT-5.5 went 0-for-3 at the §1.15 three-iteration cap; the Fable-tier generation **closed the loop at iteration 1 with zero blocking findings** from two independent repository-inspecting reviewers (missing-details, ambiguity — Sonnet-class subagents per the credit economy), then a judge APPROVE covering the plan and the README manual-review row. The three run-4 residual defect classes were fixed at generation and explicitly re-checked by the reviewers: template-verbatim single HTTPS `insteadOf` rule (bundles at `/tmp/bundles`, no SSH rules), concrete plugin pin-bump commands, fixed install-gate result ordering (gate → side-repo result commit → parent pin bump → §2.9 step-5 pushes). Generation-side fidelity checks that passed: runbook Protocol A/B and install-gate blocks verified line-by-line as verbatim; upstream `.opencode/opencode.jsonc` at the frozen tag reproduced byte-for-byte plus the plugin key; bun 1.3.14 toolchain pin bound as a preflight; baseline logs moved to the worktree's genuinely-ignored `.agent_tmp/baseline/`.

**PILOT RUN 4 CONTEXT** (details in the archived records and the direction doc): fail-closed STOP at §1.15, first clean EXECUTOR-FAIL, all four acceptance clauses PASS, verdicts at `cb0a5fb`, direction-doc iteration at `8558733`, owner branch-1 decision + End Goal amendment at `b4f02cf`, run-4 residue archived under `.agents/pilot/archive/run4-v1.17.13/`.

**Execution still owed per the decision record**: (2) hand the approved plan to the GPT-5.5 orchestrator for execution + §1.16 maintenance under the run-4 observation protocol (`launch-run.sh`, exit marker teed into the run log, ≤30-minute sweeps, 429 self-resume expectation); (3) the runbook's COMPOSED command sequences get their first live run at that cycle's gates — a composed-command failure is a finding against the runbook, not license to improvise.

Worktree state, deliberate: parent tree is clean except the `tweakcc_context_bonsai` submodule pointer (untouchable pin — never commit it). The untracked run-4 record files still sit at the live `.agents/pilot/gpt55-v1.17.13-*` paths (gitignored; archive copies exist) — run-5 launch prep must clear them so the run starts with a fresh friction log. Windows `bonsai:@4`, `@7`, `@1`, `@5` remain inert and Basil's to close.

Prior-unit commits still relevant: `20d5d40`/`f9d9063`/`bddcf96`/`cb0a5fb` (run 1/2/3/4 records), `85dd3b8` + `3aaea2f` + `15c0463` (owner fixes/reviews), `2f8495a` (e2e runbook closing V2/V3), `565af44` + `da89bd8` (run-3/run-4 launch prep + watchdog decision records), `b4f02cf` (tiering decision), `37ed76c` (this unit: the approved plan).

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

**Begin execution-owed item (2): launch prep for the GPT-5.5 execution run (run 5) of the approved plan.** Three parts, in order:

1. **Revise the tracked brief `.agents/pilot/gpt55-v1.17.13-brief.md` for execute-only mode.** It currently instructs the orchestrator to run the spec's full five-step sequence, including plan generation — but generation is done (plan approved and committed at `37ed76c`). The revised brief must state as invoker-supplied fact: the cycle plan and validation artifacts for `SOURCE_HEAD_SHA 0dfbeeda…​` already exist, generated and approved on the owner tier per the direction doc's decision record; the orchestrator's job is spec steps 4–5 only (execute the plan phase by phase; §1.16 maintenance in either outcome). Without this, §1.14's collision STOP fires correctly on the cycle's own committed artifacts and the run dies at generation preflight. Keep everything else (friction log, STOP discipline, wiring) intact; commit the brief revision with a body.
2. **Clear the untracked run-4 record files** at `.agents/pilot/gpt55-v1.17.13-{observer-log,friction-log,final-report,maintenance,run.log}*` (archive copies verified under `.agents/pilot/archive/run4-v1.17.13/` — verify before deleting; `da89bd8` precedent) so run 5 starts with fresh logs.
3. **Launch via `.agents/pilot/launch-run.sh`** under the run-4 observation protocol: exit marker teed into the run log, wake-and-verify sweeps ≤30 minutes (intent rule 6), mid-run 429 = expected in-harness self-resume at the retry-after horizon (runs 3–4 precedent), observer records verdicts only — no hints, no edits to anything the executor reads. Expect the runbook's COMPOSED sequences to run live for the first time at the e2e/install gates; a composed-command failure is a runbook finding, not license to improvise. The launch itself has watchdog precedent (`565af44`, `da89bd8`) — if in doubt whether a fresh launch decision needs Basil or the watchdog, slack Basil per the relay rules rather than assuming.

If run 5 seals, it is the spec's first surviving live cycle and executes the full publish ladder (pushes to canonical remotes) — the plan gates every push behind dry-runs and the install gate, but the observer should expect network/credential actions unseen in runs 1–4.
