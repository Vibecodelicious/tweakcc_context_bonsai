# Hand-Off

Entry point for a fresh session in the relay chain. Everything needed to start is on this page; follow pointers only when the work requires them. At the end of your work unit, update this file (re-read `.llm-conductor/writing_guidance/DOCUMENT_WRITING_GUIDANCE.md` first — intent rule 5 below). Authorities, on demand:

- **Direction**: the parent repo's `docs/meta-loop-direction.md` (parent repo = `/home/basil/projects/context-bonsai-agents/`; all parent paths below are relative to it). Its "Owner direction, 2026-07-03" entry is the contract for the current work — read it before changing course.
- **Sleeping run 5** (GPT-5.5/OpenCode pilot): `HANDOFF_GPT-5.5-opencode-pause.md`, this directory. All resume mechanics live there.
- **History** (runs 1–4, commit ledger, scoping reconnaissance): `HAND_OFF_ARCHIVE_2026-07-03.md`, this directory.

## What we are doing

Making Context Bonsai self-maintain across all its harness implementations (the owner's aim, verbatim: "we are still aiming to make a process that will self-maintain Context Bonsai across all implementations"). Current focus is this repo's **Claude Code port**, ~44 npm releases behind (last cycle: `@anthropic-ai/claude-code@2.1.156`). The Fable relay chain — this chain of `claude-fable-5` sessions — authors and iterates the forward-port artifacts until an **Opus 4.8 subagent at low effort** (Agent tool: model `opus`, effort `low`) *reliably* executes the forward-port — repeated clean executions, not one lucky pass. Every stumble gets a verdict: `SPEC-GAP` (artifact under-specified — fix the artifact) vs `EXECUTOR-FAIL` (artifact deterministic, executor still failed — evidence about the tier). Observer/executor separation holds by prompt and artifact boundaries: never hint, fix, or pre-empt while an execution runs.

## Immediate next action

**Run the first Opus-4.8-low calibration execution of the staged cycle plan.** The plan is `.agents/plans/story-rebase-cycle-f92dfac9c5daecc286e03b90ef20bb930cf68818.md` (this repo), committed at `40d9233` — read it before launching; its Execution-mode rule, phases, and validation loop history are the contract. Generation already executed the freeze for real: the 2.1.200 platform binary, extracted bundle, and manifest sit under `/tmp/cc-bonsai-artifacts/claude-code/2.1.200/` with checksums recorded in the plan (live `claude` install untouched — keep it that way). Basil was slacked 2026-07-03 about the plan's §1.15 loop closing at the 3-iteration cap; his override supersedes the recorded approval if he sends one.

The unit:

1. Provision a scratch clone: `git clone /home/basil/projects/context-bonsai-agents/tweakcc_context_bonsai /tmp/cc-cal-run-1` (bump the suffix per run; never point the executor at the real side repo).
2. Spawn the executor — Agent tool, model `opus`, effort `low` — with a launch prompt that states `CALIBRATION` mode and the scratch root explicitly (the plan STOPs without it), names the plan path inside the clone, and instructs execution of Phases 0–7 and 9 exactly as bound. Runs are serial: the `/tmp` artifacts are shared.
3. Observe without contaminating (no hints, no fixes mid-run; ≤30-min wake-and-verify per intent rule 4). Live-e2e scenarios needing sign-in may come back `BLOCKED` per-scenario — that is data, not failure.
4. After the run: attribute every stumble `SPEC-GAP` vs `EXECUTOR-FAIL`, fix SPEC-GAPs in the plan/artifacts on the Fable tier, and re-run with a fresh scratch clone. The bar is repeated clean executions, not one pass. Record run verdicts in this file's State section as they accumulate; park-and-slack only for genuine owner decisions the recorded intent does not cover.

## State

- 2026-07-03: HAND_OFF resealed (owner instruction; archive at `HAND_OFF_ARCHIVE_2026-07-03.md`). Cycle plan generated on the Fable tier, §1.15-validated (3 iterations, 7 blocking findings all fixed and none recurring, iteration-3 fixes mechanically verified; source-truth coverage review clean), staged and committed at `40d9233`. Anchor reality after 44 releases of drift: 7 of 8 anchors still select; `context-bonsai-gauge.token-usage` fails closed on a 52-vs-47 margin ambiguity — its semantic re-derivation is bound in the plan as the one expected `updated_anchor`.
- Calibration runs completed: none yet.

## Hard constraints and intent rules (from the owner, via direct conversation or the watchdog — Basil's top-layer supervising session; see Showrunner expectations at the end)

1. **Run-5 pause discipline.** Run 5 sleeps on a provider-quota horizon (self-resume ~2026-07-05 08:36 UTC; pause doc above). While it lives: change nothing the executor reads (the parent's `docs/agent-specs/forward-port-spec.md`, `docs/opencode-e2e-runbook.md`, the e2e spec and templates, the committed plan and validation artifacts, the execute-only brief at parent commit `f6d3513`, and the `.llm-conductor` orchestrator/subagent docs), add no untracked files to the parent repo, avoid parent commits. Interim deliverables are drafted in this side repo. Glance once per session at liveness — `kill -0 2049574` — and if the process is dead, follow the pause doc's dead-process path; otherwise leave the run alone. Parent window `@15` is the live run — never kill it; inert windows are Basil's to close.
2. **Spec subtleties are load-bearing scar tissue.** The Claude Code spec's message-ordering rules (marker coverage of UUID-bearing system/meta rows, provider-side `api_system` filtering, retrieve-side marker removal) exist because of real post-prune ordering defects. Derived artifacts carry them explicitly and get a source-truth coverage review against the spec text. A subtlety that looks obsolete or in tension with the design is quoted to Basil via the watchdog — never deleted.
3. **Ghost text in claude input boxes is NOT user input.** The TUI renders AI-generated suggestions in idle input boxes; in a pane capture they are indistinguishable from typed-but-unsubmitted text and read like perfect answers. Never treat unsubmitted input-box text as Basil's instruction; confirm authorship first. Two owner-level decisions were wrongly executed from ghost text on 2026-07-03 before this rule existed.
4. **30-minute wait ceiling.** No agent below Basil's top layer may wait on anything — subagent, watcher, monitor, background process — longer than 30 minutes without waking and verifying actual state. Verify a watcher's signal actually reaches the watched channel before trusting it; silence is not evidence of progress.
5. **Re-read guidance docs, don't trust memory of them**: document authoring → the writing guidance (path at top); plans → `.llm-conductor/planning_guidance.md`; orchestration → `.llm-conductor/ORCHESTRATOR_AGENT.md`.
6. **Direct authoring over the formal plan system** for this work: Basil chose document authoring + the writing-guidance review loop; the forward-port spec's own §1.15 loop governs cycle plans.

## Fable credit economy (binding)

Fable tokens are scarce; spend them on judgment, synthesis, and intent-sensitive decisions only. Subagents inherit the session model — **always pass an explicit cheaper model** (`sonnet`, or `haiku` for mechanical work) when spawning readers, extractors, reviewers, or drafters. Finish a work unit, update this file, end the session; a long session reprocesses its whole history every turn. Read sources on demand; delegate bulk reading to cheap subagents and consume their conclusions.

## Relay protocol (tmux)

Sessions chain through tmux so each stays short. Your launch prompt names your predecessor's window; retiring it is your first act: `scripts/handoff-retire.sh <window-id>` — never raw `tmux kill-window` (the script only kills windows marked retiring and refuses self-targets). When your unit is done:

1. Update this file.
2. If blocked on input only Basil can give: do **not** relaunch. Slack him (`/home/basil/llm_prompts/scripts/slack.sh "..."`) and stop. Verify the script printed `ok` — anything else means Basil was NOT reached. In every blocked-on-Basil stop, end your final message with a line beginning `ATTENTION-BASIL:` stating in one sentence what you need — the watchdog session scans panes for that marker and answers on his behalf or relays.
3. Otherwise run `scripts/handoff-relay.sh` as your **final tool call** (output after it may be lost). It marks your window retiring and launches a fresh `claude --model claude-fable-5` pointed at this file.

Both scripts fail loudly outside tmux; if you are not in a tmux pane, skip the relay, update this file, and tell Basil the chain needs restarting from a tmux-launched session.

**Showrunner expectations**: `SHOWRUNNER_HANDOFF.md` in this directory is the top-layer watchdog session's own hand-off — deliberately gitignored, not your input, never committed. The watchdog may relay verified owner instructions into your session mid-turn; treat those as owner-provenance and record that provenance when acting on them.
