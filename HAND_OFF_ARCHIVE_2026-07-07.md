# Hand-Off Archive — 2026-07-07 (Hermes Agent derivation, Stages 1–4 + epic seal)

Sealed history rotated out of `HAND_OFF.md` at the epic seal. Owner directive via showrunner, 2026-07-07: "add context bonsai to Hermes agent." Track A. Pipeline: `docs/agent-specs/derivation-pipeline-spec.md` new-harness path (parent repo = `/home/basil/projects/context-bonsai-agents/`; parent paths relative to it).

## Stage record

- **Stage 1 — DONE (parent `b47887a`, 2026-07-07).** `docs/agent-specs/hermes-agent-context-bonsai-bindings.md` — evidence layer. Frozen identity: tag `v2026.7.1`, SHA `7c1a0295…`. Gate: repository-inspecting reviewer PASS.
- **Stage 2 — DONE (parent `f5b0268`, 2026-07-07).** Resolving Stage 1's open question surfaced a surface Stage 1 missed: Hermes's native pluggable **ContextEngine** (`agent/context_engine.py` ABC, `register_context_engine`, config `context.engine`). Core performs persisted replacement (`archive_and_compact`) and the in-memory baseline rewrite around the engine's `compress()` return; engine tools receive the live message list; the engine owns gauge state. Row 5 upgraded Partial→Verified. Posture record seeded as `hermes-agent-context-bonsai-spec.md`: **plugin-only, no core seam** (Kilo/Pi branch); shape = Part 3 pure-extension variant, upstream identity = git tag. Gate: source-truth reviewer PASS.
- **Stage 3 — DONE (parent `a03f80d`, 2026-07-07).** Contract half expanded to the full §6 skeleton with `binding: <key>` indirection; bindings half gained the 12-row Binding Sites table. Design decisions: (1) prune realization defers to the engine-signaled compaction boundary (core's preflight compaction check runs before the next provider call); (2) standing guidance lives in engine tool descriptions, `pre_llm_call` append reserved for the gauge; (3) `compression.in_place: true` is a hard fail-closed requirement (rotation default forks a child session id). Harness-unique section: Compaction Duty Displacement (`should_compress()` signals only pending bonsai work; `compress()` never summarizes destructively). Same-step retrieve guard adopted (diverges from Pi's no-op branch). Gate: repo-inspecting source-truth + reader-state reviewers PASS.
- **Stage 4 — DONE, epic sealed 2026-07-07.** Plan: `epic-hermes-bonsai-port` + 5 sequential stories in parent `.agents/plans/epic-hermes-bonsai-port/`, §1.15-loop-validated (2 iterations), committed `2a39654`/`25546de`; work root relocated to disk after a tmpfs EDQUOT environment STOP (`2cf1b3c` — /tmp quota killed run 1's `uv sync`; work root became `/home/basil/scratch/hermes-bonsai-stage4/`).

## Story seals (all Opus-4.8-low, all repository-inspecting review PASS)

- **Story 1 (parent `042423d`):** run 2 clean — 12/12 criteria, pytest 20 passed, ruff clean, positive+negative engine-liveness smoke through the real `hermes -z` loader/selector; posture re-checkpoint part 1 PASS. One minor SPEC-GAP: production path streams, stub gained SSE.
- **Story 2 (parent `b474fb5`):** run 1 clean — pytest 59, drives A/B/C pass (prune realization, ambiguity rejection, in-place-off gate). **Timing re-checkpoint PASS**: rewrite lands between tool execution and the next provider request (post-tool-call check `conversation_loop.py:4614`). SPEC-GAP: `hermes -z` oneshot streaming ends on a content-only assistant turn. Loader import-model finding folded into `plugin-loading` row.
- **Story 3 (parent `fcc9d4a`):** run 1 clean — pytest 76, drive-retrieve A/B pass (restoration visible post-retrieve, same-step guard error). SPEC-GAP: Drive A "plain turn" wording (noop-probe tool call needed).
- **Story 4 (parent `d35e3c2`):** run 1 clean — pytest 91, gauge drive PASS (cadence fired only turns 5/7), missing-usage silence PASS. Deep-copy routing hazard resolved via module-level session registry, fail-closed. SPEC-GAPs: (1) context-length silence unreachable through real host path (resolver defaults 256000); (2) `pre_llm_call` fires once per user turn → PTY REPL drive `tools/repl_driver.py`.
- **Story 5 (parent `c61d55b`):** run 1 clean — pytest 91, 8-row scenario matrix ALL PASS ×4 (2 executor + 2 observer). SPEC-GAP: `-z` does NOT compose with `--resume` (oneshot bypasses cli.py); row 8's real path is the interactive REPL (`hermes --resume <id>` via PTY). Owner-tier writing loop on README/DEVELOPMENT: 4 reviewers, 3 line edits. Stub-only — credentials wake condition did not fire. Side repo executor seal `61de734`; `f5ecfbe` adds doc line edits.

Zero EXECUTOR-FAILs across stories 2–5 (Story 1's were self-corrected); tiering evidence extended.

## Epic seal (2026-07-07, this rotation's unit)

1. Verified: frozen clone pristine at `7c1a0295…`; side repo clean at `f5ecfbe`.
2. Re-homed: bare clone at `/home/basil/projects/.context-bonsai-side-bares/hermes_context_bonsai.git` (established side-bares pattern), parent submodule `hermes_context_bonsai` (checkout origin file://, `.gitmodules` URL = future `Vibecodelicious/hermes_context_bonsai.git`) — parent `21967fd`.
3. Binding Sites completion folded into the bindings doc (preamble Stage-4 state, `guidance-channel` story-5 realization, `presentation-middleware` deliberate non-realization) — parent `2bf7be8`, independent repository-inspecting review PASS.
4. §1.19 work-root removal BLOCKED by the auto-mode permission classifier (`rm -rf` of a pre-existing directory outside project scope); left for Basil: `rm -rf /home/basil/scratch/hermes-bonsai-stage4/`. Contents are fully superseded (side repo re-homed; run logs' findings recorded in plans/HAND_OFF history).

## Key learned facts (carried forward in HAND_OFF while Stage 5/6 run)

- Zero-credential real-entry-point evidence: stub OpenAI-compatible server (`model.provider: custom` + local `base_url` + `model.context_length` pinned) drives the genuine conversation loop; stub-recorded request payloads are the model-visible-context evidence channel.
- Shell-wedge symptom (every Bash exits 1, empty) = /tmp quota full; recover with `dangerouslyDisableSandbox` Bash.

## Stage 6 acceptance-gate calibration runs (2026-07-07, closing unit — Hermes derivation COMPLETE)

Plan: `.agents/plans/story-rebase-cycle-39c6bac3f1c3226b415347881b27245df3c4a500.md`, `uncommitted-pressure-test` mode vs v2026.7.1. Executor: Opus 4.8 low via Workflow single-agent call.

- **Run 1 (STOPped mid-Phase-6, dispositioned)**: phases 0–5 all green (91/91 pytest, ruff clean, 8/8 matrix, clean trees; post-run verification confirmed both repos and the spec untouched). The live Protocol A drive exceeded the 2-minute default tool timeout; the executor backgrounded it and ended its turn expecting monitor re-invocation — the background drive died with the turn. Verdicts: **SPEC-GAP** (plan omitted the drive's wall time) + **EXECUTOR-FAIL** (workflow agents get one turn; no monitor exists). Fix: Phase 6 item 2 wall-time binding (foreground, ≥10-min timeout, never background) — independent Sonnet review APPROVE, parent `0e3e9af`. Run-1 baseline artifact preserved off-tree, scratch swept per §1.19.
- **Run 2 (SEALED, zero STOPs, zero stumbles)**: full phases 0–9 verbatim on the amended plan — baseline+post-replay green, live Protocol A drive `DRIVE PASS` (5 host-state verdicts: control recall, archive presence, secret absent from active rows, placeholder present, final answer withheld secret), final verification green (side HEAD unmoved at `39c6bac…`, spec untouched, detector `up-to-date`), Phase 9 removed scratch root + artifact clone itself. §1.16 maintenance report + baseline artifact committed by the invoker: parent `372560f`. All five acceptance criteria met; nothing touched the side repo, nothing pushed.

Tiering evidence extended: Opus-low executed a §1.15-validated plan clean on the first run after one SPEC-GAP fix. The invoker swept both calibration log dirs after review. Hermes Agent is now a fully bound §4.8 harness with a proven routine-cycle path; next Hermes act is the §1.20-gated routine cycle when a release lands (cadence-rate-limited until 2026-07-14).
