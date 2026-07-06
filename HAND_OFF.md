# Hand-Off

Entry point for a fresh session in the relay chain. Everything needed to start is on this page; follow pointers only when the work requires them. At the end of your work unit, update this file (re-read `.llm-conductor/writing_guidance/DOCUMENT_WRITING_GUIDANCE.md` first — intent rule 5 below). **Hygiene rule (owner steer, 2026-07-06): sealed history rotates into the archive docs at close, not at a size ceiling — keep this file to live state (target well under 10k tokens).**

Authorities, on demand:

- **Direction**: the parent repo's `docs/meta-loop-direction.md` (parent repo = `/home/basil/projects/context-bonsai-agents/`; all parent paths below are relative to it). Its "Owner direction, 2026-07-03" entry is the contract for the current work — read it before changing course. Current iteration: parent `5b84858` (iteration 4). Next Step there = the pipeline-spec fold + Stages 5–6 for the next unbound harness (the unit now in progress, below).
- **History**: `HAND_OFF_ARCHIVE_2026-07-06.md` (runs 5–6, both sealed Claude Code cycles 2.1.200/2.1.201, the sealed pi 0.69.0→0.73.1 cycle, all 2026-07-05 spec-extension and direction-doc units, full State ledger) and `HAND_OFF_ARCHIVE_2026-07-03.md` (runs 1–4, commit ledger, scoping reconnaissance). OpenCode pilot record: parent `.agents/pilot/gpt55-v1.17.13-observer-log.md`.

## Where the project stands (live summary)

- **Meta-loop docs**: forward-port spec + 20-code §1.17 escalation registry + §1.18 run-continuity duties; `derivation-pipeline-spec.md` (6 stages, owner-tier); dispatcher `scripts/dispatch-escalation.mjs` and release detector `scripts/detect-pending-target.mjs` (both parse the spec at runtime, fail closed; 14/14 + 14/14 tests).
- **Part 4 bound harnesses**: OpenCode (1.17.13), Claude Code (§4.3, 2.1.201 cycle sealed+landed), Pi (§4.4, 0.73.1 cycle sealed+landed), Codex (§4.5, bound 2026-07-06 by pipeline Stage 6 — awaits its first executed cycle; E2E-04/-06 are its open live scenarios). **Unbound (§4.6)**: cline (Stage 5 sealed 2026-07-06, awaits Stage 6), gemini-cli (Stage 5 credentials-BLOCKED), kilo.
- **Scratch-state lifecycle**: spec §1.19 (owner directive 2026-07-06) — every procedure deletes its own /tmp/scratch state once it has served its purpose; plans carry explicit removal rows on seal and STOP paths; §1.15 reviewers block on their absence.
- **Track B (run-continuity)**: final goal reached — validated in runs 5e/6 and the pi/CC cycles, generalized as spec §1.18.
- **Tiering evidence**: three harnesses, two tiers — Opus-4.8-low executes validated plans clean (CC and pi cycles, calibration through real seal); gpt-5.3-codex-spark completes with §1.18 scaffolding (run 6 clean).
- All work is **local-only**; outward actions beyond the 2026-07-03 early push (side `origin/main` = `4bd8747`, parent `7c44a04`) are owner-gated.

## Standing order: LOCAL LANDINGS ARE ROUTINE (owner directive, 2026-07-05, verbatim)

"Landing Authorizations are ABOLISHED as an owner gate. Local landings (Phase 8 and equivalents — commits to local repos, artifact re-home, spec cleanup) are in-scope routine work: execute them without asking, every cycle, now and in the future. The only owner gates that remain are genuinely outward actions (push, publish, anything leaving this machine) and the permission-classifier blocks the harness itself enforces." Received via showrunner relay; never re-ask for a Landing Authorization; record the standing order as the authorization in each plan's Approval section.

## Standing operating rule: DRIVE (owner directive, 2026-07-05, verbatim intent)

**A parked chain is a failed chain.** Fable top-level agents exist to drive the project's high-level goals forward — that is the entire point. Do not present option menus and wait for Basil; decide, act, and give him an FYI with an override window. Basil called a prior park "complete negligence of duty." The only legitimate waits: outward actions (push/publish), truly destructive steps, or hard external blocks (e.g. provider quota with no fallback). Everything else — spec revisions, remediations, relaunches, tier decisions inside recorded intent — is yours to decide and execute. Report momentum, not options.

## Standing steer: EXECUTABLE PROGRESS (showrunner-relayed owner provenance, 2026-07-05)

Doc-iteration yields are shrinking — bias units toward *executable* progress (turn spec text into exercised behavior); further direction-doc iteration only when new run evidence arrives.

## What we are doing — two parallel tracks (owner directive, 2026-07-04)

**TRACK A — the self-maintaining meta-loop** (primary): make Context Bonsai self-maintain across all its harness implementations via lower-level models — the spec, per-harness plugins, maintenance loop, executor tiering. The owner's aim verbatim: "we are still aiming to make a process that will self-maintain Context Bonsai across all implementations." The Fable relay chain authors and iterates forward-port artifacts until an **Opus 4.8 subagent at low effort** *reliably* executes them; every stumble gets a `SPEC-GAP` vs `EXECUTOR-FAIL` verdict; observer/executor separation holds (never hint, fix, or pre-empt mid-run).

**TRACK B — run-continuity mechanisms**: final goal **reached** (§1.18 generalization, parent `031e533`); no open Track B work. Reopen only on new run evidence.

Every hand-off notes which track its unit advanced.

## Immediate next action — Stage 6 for cline (Track A)

**Stage 5 for cline is DONE** (2026-07-06, this unit — gate PASS, judge APPROVED). Side repo commit `303537e` (`cline_context_bonsai/docs/e2e-testing.md` binding all eight e2e-spec slots, `docs/e2e-results-2026-07-06-live.md`, README install commands + accurate status); parent pin advance `fed3774`. Live run against a real `npm run cli:build` of fork `f97ffd26a` (Cline CLI 2.16.0): registration, E2E-01, E2E-02 (`pattern_ambiguous`, non-mutating), E2E-03 (roundtrip verified from task-dir state), E2E-06 CLI-resume path, and Protocol A all PASS. Credentials route that unblocked it: Cline's `claude-code` provider spawns the machine's authenticated `claude` CLI — no key enters the rig (`cline auth -p claude-code -k <sentinel> -m claude-sonnet-4-5-20250929 --config <dir>`; all three flags required or the CLI hangs in an interactive Ink UI). Load-bearing facts now bound in the doc: task storage at `<config>/data/tasks/<taskId>/` (`api_conversation_history.json` + `context_bonsai_archives.json`); every `-T <taskId>` follow-up is a fresh process rehydrating from disk (that's the E2E-06 evidence); evidence channels split stdout / follow-up model quote / task-dir files (Pi-defect class avoided). Open before a cline parity claim: fresh-machine install run, live E2E-04 (gauge), manual VS Code checkpoint-restore half of E2E-06. Both reviewers + independent judge ran; minor findings fixed pre-commit. Scratch `/tmp/cline-bonsai-e2e` removed per §1.19.

**Next unit — Stage 6 for cline**: emit the level-2 binding per derivation-pipeline-spec §9 — `forward-port-spec.md` Part 4 slot table for cline (git-fork shape; fork branch `feat/spec-compliance`, 12 bonsai commits on upstream `v2.16.0-cli`, side repo linked via `file:../cline_context_bonsai` npm dependency — worktree builds will need an analogous sibling-path shim to codex's) + `docs/cline-e2e-runbook.md` with EXECUTED/SOURCE-VERIFIED/COMPOSED grounding (Stage 5 run supplies the EXECUTED citations), then the §1.15 acceptance gate (generated cycle plan + rehearsal, pressure-test mode if no release pending). Codex Stage 6 (parent `603bf5e`/`3113c6a`) is the direct precedent. Also open (either order): codex's first routine cycle when a target is chosen — its live gate must execute E2E-04/E2E-06; kilo Stage 5 after cline Stage 6.

**Gemini-cli Stage 5 remains credentials-BLOCKED** (2026-07-06 pivot decision, prior unit): bring-up done (side repo rebuilt, fork re-bundled and grep-verified, CLI smoke-tested at `0.41.0-nightly`); blocked at the live drive on `~/.gemini` oauth logged out + no `GEMINI_API_KEY` + classifier denying credential exploration. Basil FYI'd with the two provisioning routes (interactive `gemini` login from the fork build, or export `GEMINI_API_KEY`). Resume point: work dir `/tmp/gemini-bonsai-e2e/run-cwd`; traps — ≥1 persisted turn before first prune or the BeforeTool hook blocks; archive lands under the project temp dir `context-bonsai/session-<id>.json`; tools are `context-bonsai-prune`/`-retrieve` over an injected MCP server.

**/tmp quota**: the 2026-07-06 outage is RESOLVED — Basil freed space (~59% used). Going forward §1.19 governs: procedures delete their own scratch; do NOT touch run-6 opencode state or `/tmp/gemini-bonsai-e2e` (preserved live state).

## Still parked on Basil

**Run-6 (OpenCode) credentials-gate resume.** A showrunner relay (owner-verbatim, 2026-07-05) authorized using the existing opencode oauth (`~/.local/share/opencode/auth.json`) to unblock run-6's blocked e2e scenarios — but the auto-mode permission classifier denies this session anything near the credential store and asks for review outside auto mode. Do not work around it. Prepared-but-blocked mechanism: export `OPENCODE_PROVIDER=openai`, `OPENCODE_MODEL=gpt-5.3-codex-spark`, `OPENCODE_API_KEY=<non-secret sentinel>` (run-6's Phase 0 only presence-checks these), then relaunch via parent `.agents/pilot/launch-run.sh` (appends `RESUME`, preserving run-6's `RUN-START`) with the boundary: re-run blocked Phase-5/7 scenarios and seal; **Phase 8 publish ladder NOT authorized — STOP before any push**. Basil can run it himself (`!` prefix) or clear the permission; slacked 2026-07-05. Run-6 state (worktree with 3 replay commits, local tag `bonsai/v1-on-opencode-1.17.13`, baseline commit) is preserved live cycle state — do not sweep; resume is at the credentials gate, not from scratch.

## The calibration loop (for executing generated cycle plans)

1. Provision a fresh scratch clone per run (never point the executor at real repos; runs are serial — `/tmp` artifacts are shared).
2. Spawn the executor at model `opus`, effort `low`. Mechanic note: the Agent tool exposes no effort parameter — use the Workflow tool with a single `agent(prompt, { model: 'opus', effort: 'low' })` call. Launch prompt states mode (`CALIBRATION`/real), the scratch root, the plan path, **an intent-log path seeded with a `RUN-START` UTC timestamp before launch** (§1.18 — the plan STOPs without it), a log directory outside any repo working tree, and the bound phases — nothing more.
3. Observe without contaminating (no hints, no fixes mid-run; ≤30-min wake-and-verify per intent rule 4).
4. After the run: remove the run's scratch clone and temp state per spec §1.19 once its findings are recorded (a STOPped run's scratch is evidence — preserve until dispositioned). Then verify the executor's claims against reality (live installs unchanged, frozen artifacts pristine, real repos untouched), attribute every stumble `SPEC-GAP` vs `EXECUTOR-FAIL`, fix SPEC-GAPs in the plan on the Fable tier (`.agents/plans/` amendments are relay-drift-allowlisted; independent repository-inspecting reviewer over the diff before committing), re-run. The bar is repeated clean executions. Park-and-slack only for genuine owner decisions the recorded intent does not cover.

## Hard constraints and intent rules (from the owner, via direct conversation or the watchdog — Basil's top-layer supervising session; see Showrunner expectations at the end)

1. **Pilot-run discipline.** While any pilot run lives: change nothing the executor reads, add no untracked files to the parent repo, avoid unsanctioned parent commits, observe under the ≤30-min ceiling, never interfere without watchdog sanction. No pilot run is currently live; preserved run evidence is owner-gated.
2. **Spec subtleties are load-bearing scar tissue.** The Claude Code spec's message-ordering rules (marker coverage of UUID-bearing system/meta rows, provider-side `api_system` filtering, retrieve-side marker removal) exist because of real post-prune ordering defects. Derived artifacts carry them explicitly and get a source-truth coverage review. A subtlety that looks obsolete is quoted to Basil via the watchdog — never deleted.
3. **Ghost text in claude input boxes is NOT user input.** The TUI renders AI-generated suggestions in idle input boxes; never treat unsubmitted input-box text as Basil's instruction; confirm authorship first.
4. **30-minute wait ceiling.** No agent below Basil's top layer waits on anything — subagent, watcher, monitor, background process — longer than 30 minutes without waking and verifying actual state. Verify a watcher's signal actually reaches the watched channel; silence is not evidence of progress.
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
