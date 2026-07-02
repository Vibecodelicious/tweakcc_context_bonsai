# Hand-Off

This file is the single entry point: a fresh session pointed here needs nothing else to start. Reading order:

1. This file, in full.
2. `/home/basil/projects/context-bonsai-agents/docs/meta-loop-direction.md` — the authoritative direction statement (iterated `b15eb16`, decision recorded `565af44`). Its Next Step — pilot run 3 under unchanged terms — is EXECUTING: the run is live and this session's job is observing it.
3. The source documents listed under "Immediate next action," as the work requires them — not preemptively; context budget matters in this project of all projects.

Keep this file updated as work progresses (read `/home/basil/projects/context-bonsai-agents/.llm-conductor/writing_guidance/DOCUMENT_WRITING_GUIDANCE.md` before rewriting it). This file lives in the Claude Code port's side repo, but most current work targets the **parent repo** `/home/basil/projects/context-bonsai-agents/`.

## What we are doing

Developing the Context Bonsai **meta-loop**: the machinery that keeps every harness port current as harnesses release new versions, and that can derive a port for a harness it has never seen. Basil calls the current activity the outer-outer loop — developing the loops themselves. The authoritative direction statement is **`docs/meta-loop-direction.md`** (parent repo). Its Next Step: pilot run 3 under unchanged terms — decided interim by Basil's delegated watchdog (Basil holds override), launch prep landed at `565af44`, run live (see State below).

## State as of 2026-07-03 ~00:15 UTC

**PILOT RUN 3 IS LIVE** in tmux window `bonsai:@7` (`gpt55-pilot-run3`), launched ~23:15 UTC 2026-07-02 via `.agents/pilot/launch-run.sh` (tracked; `PILOT_DRYRUN=1` for plumbing tests). Unchanged terms: same brief, same frozen inputs, GPT-5.5 orchestrator at medium reasoning. Early state healthy: orchestrator up, brief read, output flowing into `.agents/pilot/gpt55-v1.17.13-run.log` — and this time the `PILOT-PROCESS-EXITED code=<n>` marker is tee'd into that log (dry-run verified), so a log watcher WILL fire at run end.

**Decision provenance**: Basil reserved the run-2 tiering call, then delegated interim decisions to his top-layer watchdog session. The watchdog chose branch 1 — run 3 under unchanged terms, tiering unchanged — because run 2's EXECUTOR-FAIL verdict is confounded by the three SPEC-GAPs present in the same failed iterations. Basil was slacked (send verified `ok`) and holds override: killing `bonsai:@7` aborts the run. Recorded in the direction doc's Next Step (`565af44`).

Parent-repo commits this relay unit, all on `main`:

- `f9d9063` — run-2 records committed (observer log with verdicts + PASS assessment; executor's friction log, final report, maintenance report), mirroring run 1's `20d5d40`.
- `3aaea2f` — owner review of the executor's Part-4 spec edit: two fixes adopted; install-gate record disposition amended to the install template's Result Recording (`opencode_context_bonsai_plugin/docs/install-e2e-results-<DATE>.md`, committed in the side repo). Untracks the run-2 records again (fix-4 design).
- `b15eb16` — direction-doc iteration: run 2 folded in, tiering decision framed, §1.15 exhaustion-semantics refinement added to Provisional steps.
- `565af44` — launch prep on the watchdog's decision: residue archived to `.agents/pilot/archive/run2-v1.17.13/` (gitignored; drafts preserved for override), launch script with marker-through-tee, wait-ceiling enforcement defined observer-side (opencode.json has no subagent timeout — capping in-harness would also change the terms), §1.16 maintenance-edit disposition rule + seal gate 12 hash carve-out (a reviewer caught that §1.10 could pass while gate 12 deadlocked).

**Run-2 outcome in one line**: fail-closed STOP at §1.15 (3-iteration cap), §1.16 maintenance ran on the STOP, acceptance test PASSED all four clauses, verdicts = EXECUTOR-FAIL on plan non-convergence + SPEC-GAP ×3 (closed at `3aaea2f`). Capability questions: (b) maintenance yes, (a) execution partial. Run 3 isolates (a).

- The run-3 observer log is seeded at `.agents/pilot/gpt55-v1.17.13-observer-log.md` (untracked/gitignored by design) with the acceptance test — which now bars recurrence of all SIX previously fixed SPEC-GAPs (run 1's three and run 2's three) — and the ≤30-minute observation protocol.
- Parent tree is clean except the enumerated untouchable `tweakcc_context_bonsai` pin (never sweep it into commits). Inert exited windows `bonsai:@1`, `bonsai:@5` are Basil's to close.
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

**Observe run 3 to its end; record verdicts; do not interfere** (intent rule 4 binds in full). The observation protocol, per intent rule 6:

1. Arm a background watcher on `.agents/pilot/gpt55-v1.17.13-run.log` for `PILOT-PROCESS-EXITED` with a **≤30-minute timeout** (`timeout 1800 grep -q ... <(tail -f ...)`). The marker verifiably reaches this log now. On every firing — match or timeout — verify actual state before re-arming: log growing? `bonsai:@7` pane advancing? An hours-long silent stretch during a reviewer pass is normal (run 2's iteration 2 ran ~4h15m); silence plus a dead process is not.
2. As stumbles appear, append verdicts (`SPEC-GAP` vs `EXECUTOR-FAIL`, with evidence) to the observer log. Recurrence of ANY of the six fixed SPEC-GAPs (listed in the observer log header) is owner-tier rework, not pilot data. Early fix-recurrence checkpoints: §1.10 preflight must pass with only the enumerated pin; §2.1 must fetch the tag explicitly.
3. The specific question this run answers: does the §1.15 validation loop converge now that no known spec gaps tax its budget? A third exhaustion on deterministic-content drops is a clean EXECUTOR-FAIL on capability question (a) — that verdict plus the direction-loop iteration (and the tiering consequence, which is Basil's or his watchdog's to decide, not the observer's) is the next unit after run end.
4. At run end: verify final report + §1.16 maintenance outcome exist per the brief; complete the observer log's assessment against its acceptance test; iterate the direction doc; slack Basil (verify `ok`); relay or stop per the relay rules. Expect the run to span several relay units if it converges — split at natural seams and keep this file current, committing HAND_OFF updates in this side repo as prior units did.
