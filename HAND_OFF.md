# Hand-Off

Entry point for a fresh session in the relay chain. Everything needed to start is on this page; follow pointers only when the work requires them. At the end of your work unit, update this file (re-read `.llm-conductor/writing_guidance/DOCUMENT_WRITING_GUIDANCE.md` first — intent rule 5 below). **Hygiene rule (owner steer, 2026-07-06): sealed history rotates into the archive docs at close, not at a size ceiling — keep this file to live state (target well under 10k tokens).**

Authorities, on demand:

- **Direction**: the parent repo's `docs/meta-loop-direction.md` (parent repo = `/home/basil/projects/context-bonsai-agents/`; all parent paths below are relative to it). Its "Owner direction, 2026-07-03" entry is the contract for the current work — read it before changing course. Current iteration: parent `5b84858` (iteration 4). Next Step there = the pipeline-spec fold + Stages 5–6 for the next unbound harness (the unit now in progress, below).
- **History**: `HAND_OFF_ARCHIVE_2026-07-06.md` (runs 5–6, both sealed Claude Code cycles 2.1.200/2.1.201, the sealed pi 0.69.0→0.73.1 cycle, all 2026-07-05 spec-extension and direction-doc units, full State ledger) and `HAND_OFF_ARCHIVE_2026-07-03.md` (runs 1–4, commit ledger, scoping reconnaissance). OpenCode pilot record: parent `.agents/pilot/gpt55-v1.17.13-observer-log.md`.

## Where the project stands (live summary)

- **Meta-loop docs**: forward-port spec + 20-code §1.17 escalation registry + §1.18 run-continuity duties; `derivation-pipeline-spec.md` (6 stages, owner-tier); dispatcher `scripts/dispatch-escalation.mjs` and release detector `scripts/detect-pending-target.mjs` (both parse the spec at runtime, fail closed; 14/14 + 16/16 tests — detector's `git-remote-tag` now takes an optional literal tag suffix for Cline's `v<version>-cli` family); §1.20 update cadence + `scripts/check-cycle-cadence.mjs` gate + cadence ledger (15/15 tests); §1.21 invoker chain `scripts/invoke-routine-cycle.mjs` + weekly wake `scripts/routine-wake.sh` (11/11 tests; 56/56 suite-wide).
- **Part 4 bound harnesses**: OpenCode (1.17.13), Claude Code (§4.3, 2.1.201 cycle sealed+landed), Pi (§4.4, 0.73.1 cycle sealed+landed), Codex (§4.5, rust-v0.125.0 cycle sealed 2026-07-06; 0.126.0…0.142.5 pending as later cycles), Cline (§4.6, v2.17.0-cli cycle sealed + fresh-machine install gate PASS 2026-07-06; only the manual VS Code checkpoint half open; `retrieve_same_step` defect candidate recorded for the next cycle; 2.18.0-cli/3.32.6-cli pending), **Kilo (§4.7, Stage 6 emitted + acceptance gate PASSED 2026-07-06, parent `5f4df5b` — first cycle vs pending v7.4.1 eligible 2026-07-13 per §1.20; two defect candidates for that cycle: worktree-`/` in non-git dirs, per-process gauge counter)**. **Unbound (§4.8)**: gemini-cli only (Stage 5 credentials-BLOCKED).
- **Scratch-state lifecycle**: spec §1.19 (owner directive 2026-07-06) — every procedure deletes its own /tmp/scratch state once it has served its purpose; plans carry explicit removal rows on seal and STOP paths; §1.15 reviewers block on their absence.
- **Track B (run-continuity)**: final goal reached — validated in runs 5e/6 and the pi/CC cycles, generalized as spec §1.18.
- **Tiering evidence**: five harnesses, two tiers — Opus-4.8-low executes validated plans clean (CC, pi, cline, and codex cycles; cline was the first end-to-end consumption of a derivation-pipeline-emitted binding with zero EXECUTOR-FAIL; codex sealed with 3 SPEC-GAPs absorbed and 2 self-corrected EXECUTOR-FAILs, none fatal); gpt-5.3-codex-spark completes with §1.18 scaffolding (run 6 clean).
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

## STEADY STATE — the relay is PARKED (2026-07-06, showrunner-steered; parked-on-schedule is completion, not a stall)

**The buildable backlog is empty.** This unit (Track A) closed direction-doc Provisional Future Step 2: the routine path is chained end-to-end. `scripts/invoke-routine-cycle.mjs` (parent `2788dce`, 11 tests, 56/56 across all four spec-parsing scripts) chains detector → cadence gate into one survey (`up-to-date`/`pending-rate-limited`/`launch-ready`, exit 3 on launch-ready); its `--start --harness <name> --intent-log <path>` mode performs the invoker's cycle-start acts in one invocation — §1.20 ledger record committed alone, §1.18 `RUN-START` seed (existing log fails closed), JSON launch packet with the reconstructed target. Spec §1.21 binds the chain and the steady-state wake: weekly cron runs `scripts/routine-wake.sh` (survey + Slack report); a `launch-ready` report is the signal to start an owner-tier session that runs `--start` and drives the cycle per the calibration loop below. Source-truth + reader-state reviews clean. Direction iteration 6 (`7f10234`) supersedes Next Step accordingly. The cron entry is NOT installed — the permission classifier refused crontab persistence; installing it is Basil's one-liner (the line is in §1.21). Basil slacked with the proposal and override window.

**Wake conditions (any of these restarts the chain):**

1. **2026-07-13 — the §1.20 gate opens.** Live survey (2026-07-06): kilo v7.4.1, codex rust-v0.142.5, cline v3.32.6-cli all pending-rate-limited until then. First cycle: **kilo v7.4.1**, driven through `node scripts/invoke-routine-cycle.mjs --start --harness Kilo --intent-log <fresh path>` (parent repo root), then the calibration loop; fold kilo's two recorded defect candidates into the plan. Then codex, then cline (§1.20 allows one start per harness-week — they can run the same week, serially per the calibration rule). A pi cycle must first Stage-1 re-explore its two DEMOTED bindings rows (`gauge-channel`, `searchable-text`) or generation STOPs on the freshness consultation.
2. **Basil provisions gemini credentials** → gemini-cli Stage 5 resumes immediately (below) and outranks the backlog.
3. **Basil clears the run-6 credentials gate** (below).
4. **An owner announcement record** (§1.20) → `--announcement` on a manual survey/start.

Do not invent units to keep the relay busy (showrunner steer, 2026-07-06). A fresh session waking here with none of the above conditions met should verify state briefly and re-park.

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
