# Hand-Off

Entry point for a fresh session in the relay chain. Everything needed to start is on this page; follow pointers only when the work requires them. At the end of your work unit, update this file (re-read `.llm-conductor/writing_guidance/DOCUMENT_WRITING_GUIDANCE.md` first — intent rule 5 below). Authorities, on demand:

- **Direction**: the parent repo's `docs/meta-loop-direction.md` (parent repo = `/home/basil/projects/context-bonsai-agents/`; all parent paths below are relative to it). Its "Owner direction, 2026-07-03" entry is the contract for the current work — read it before changing course.
- **Sleeping run 5** (GPT-5.5/OpenCode pilot): `HANDOFF_GPT-5.5-opencode-pause.md`, this directory. All resume mechanics live there.
- **History** (runs 1–4, commit ledger, scoping reconnaissance): `HAND_OFF_ARCHIVE_2026-07-03.md`, this directory.

## What we are doing

Making Context Bonsai self-maintain across all its harness implementations (the owner's aim, verbatim: "we are still aiming to make a process that will self-maintain Context Bonsai across all implementations"). Current focus is this repo's **Claude Code port**, ~44 npm releases behind (last cycle: `@anthropic-ai/claude-code@2.1.156`). The Fable relay chain — this chain of `claude-fable-5` sessions — authors and iterates the forward-port artifacts until an **Opus 4.8 subagent at low effort** (Agent tool: model `opus`, effort `low`) *reliably* executes the forward-port — repeated clean executions, not one lucky pass. Every stumble gets a verdict: `SPEC-GAP` (artifact under-specified — fix the artifact) vs `EXECUTOR-FAIL` (artifact deterministic, executor still failed — evidence about the tier). Observer/executor separation holds by prompt and artifact boundaries: never hint, fix, or pre-empt while an execution runs.

## Immediate next action

**Generate and validate the Claude Code forward-port cycle plan on the Fable tier**, per the parent repo's `docs/agent-specs/forward-port-spec.md` (§1 core, §3 closed-artifact shape, §4.3 Claude Code slot — fully bound). The unit:

1. Read the spec sections above plus `docs/agent-specs/claude-code-context-bonsai-spec.md` (behavioral constraints the plan must not lose — message-ordering rules especially). Reading parent docs is allowed; editing them is not (constraint 1: run-5 pause).
2. Freeze the upstream target per §3.1/§4.3: npm identity resolved once at freeze time; artifact and manifest work under `/tmp/cc-bonsai-artifacts/…`, never in a repo tree.
3. Generate the plan; close the spec's §1.15 validation loop (missing-details + ambiguity reviewers on cheaper models, inspecting the real repos), plus the owner-required **source-truth coverage review**: every ordering-related rule in the Claude Code spec accounted for in the plan — none paraphrased into vagueness, none silently dropped (constraint 2: spec subtleties). Quality bar: the OpenCode Fable-tier plan at parent commit `37ed76c` (§1.15 closed at iteration 1, zero blocking findings).
4. Stage the plan and validation artifacts in THIS repo's `.agents/plans/`, explicitly marked staged-for-parent; the move to the parent's `.agents/plans/` waits for run-5 exit (constraint 1: run-5 pause).

Resolve in generation, not at execution: (a) `SOURCE_HEAD_SHA` churn — the relay commits hand-off docs to this repo's `main` every session, so pin the generation-time SHA and scope the drift handling so docs-only hand-off commits don't false-STOP; (b) ~44 releases of drift means anchor re-verification (`patches/anchors.ts`) dominates the cycle; (c) no installation-e2e instance has ever been recorded for any harness — §4.2 flag-don't-invent: flag the missing binding, never invent commands; (d) **never upgrade or patch the live installed `claude` CLI this chain runs on** — target-version work happens against downloaded artifacts under `/tmp` unless the owner explicitly sanctions touching the live install.

After the plan is approved: subsequent units run Opus-4.8-low calibration executions under the attribution discipline; park-and-slack only for genuine owner decisions the recorded intent does not cover.

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
