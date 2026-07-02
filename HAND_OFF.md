# Hand-Off

This file is the single entry point: a fresh session pointed here needs nothing else to start. Reading order:

1. This file, in full.
2. `/home/basil/projects/context-bonsai-agents/docs/meta-loop-direction.md` — the authoritative direction statement.
3. The source documents listed under "Immediate next action," as the work requires them — not preemptively; context budget matters in this project of all projects.

Keep this file updated as work progresses (read `/home/basil/projects/context-bonsai-agents/.llm-conductor/writing_guidance/DOCUMENT_WRITING_GUIDANCE.md` before rewriting it). This file lives in the Claude Code port's side repo, but most current work targets the **parent repo** `/home/basil/projects/context-bonsai-agents/`.

## What we are doing

Developing the Context Bonsai **meta-loop**: the machinery that keeps every harness port current as harnesses release new versions, and that can derive a port for a harness it has never seen. Basil calls the current activity the outer-outer loop — developing the loops themselves. The authoritative direction statement is:

**`/home/basil/projects/context-bonsai-agents/docs/meta-loop-direction.md`** — read it in full before doing anything. It defines the end goal (three artifact levels, one pipeline with three entry points, executor tiering), the committed next step (restructure the rebase meta-plan into `docs/agent-specs/forward-port-spec.md`: shape-agnostic core + two shape bindings + per-harness slots, with two acceptance criteria), and provisional future steps. It carries its own iteration rule: Next Step and future steps are freely rewritable; End Goal changes need Basil's approval.

## State as of 2026-07-02 (evening)

- **The acceptance test PASSED and the meta-plan is superseded** (parent commit `1fedcd9`). Both executed cycle plans (OpenCode `4d88b95`, Claude Code `95c2422`) were regenerated clean-room from the spec by Sonnet agents and independently audited equivalent on all four criteria. It took three rounds: rounds 1–2 surfaced ~12 spec fixes (all folded in, each grounded in the executed artifacts) plus recurring executor transfer drops; round 3 ran the spec's own §1.15 validation loop, which caught the drops — evidence that the loop is load-bearing for weak-executor generation, directly relevant to the GPT-5.5 pilot.
- Notable test events, all recorded here because they carry signal: a regenerator hit the spec's §1.14 same-cycle collision STOP, independently verified the cycle had already run, and refused invoker waivers — the fail-closed machinery binds hard (good for the pilot; also means historical-regeneration exercises need document-production framing, not cycle-executor framing). The strict input grammar caught a 39-char SHA in a task brief. A reviewer discovered the OpenCode plugin wiring (`"plugin"` key in `opencode/.opencode/opencode.jsonc`) exists ONLY as an uncommitted edit in the pinned harness working copy — nothing durable carries it; Basil should decide where it belongs.
- Earlier state (2026-07-02 morning), kept for context:

- `docs/meta-loop-direction.md` committed in full (`80bac8b` + amendment `b0b446b`); parent repo git state verified clean apart from the pre-existing dirty `tweakcc_context_bonsai` submodule pin (unrelated — do not sweep it into commits).
- **`docs/agent-specs/forward-port-spec.md` is DRAFTED, review-looped, and UNCOMMITTED in the parent repo.** Basil chose direct document authoring over the formal plan system for this work ("I suspect my existing formal plan system is token inefficient with Fable"). Authored by extraction via two Sonnet extractor subagents + full read of the meta-plan, DEVELOPMENT.md, and e2e spec; reviewed by three Sonnet reviewers (source-truth, task-success, reader-state; 12 findings, all fixed) plus a Sonnet verification pass (2 residual findings, fixed). Structure: Part 1 shape-agnostic core, Part 2 git-fork binding (incl. DEVELOPMENT.md release/publish ladder), Part 3 closed-npm-artifact binding, Part 4 per-harness slots (OpenCode and Claude Code bound; cline/codex/gemini-cli/kilo/pi explicitly unbound).
- Load-bearing design decisions recorded in the spec itself: approvals/exception/checksum artifacts and isolated worktrees are shape-bound (git-fork requires them; the executed Claude Code cycle used in-plan recording and in-place work — making them universal would break the acceptance test); release tags are the default git-fork `UPSTREAM_REF`, deliberately superseding the meta-plan's tag-approval exception; target version is an invoker-supplied input; validation mode defaults to `committed-final`. The OpenCode slot fixes the meta-plan's dead e2e citation (`.agents/e2e-context-bonsai-opencode-integration.md` → `docs/context-bonsai-e2e-template.md`).
- The meta-plan `.agents/plans/story-meta-plan-for-future-rebase-planning.md` remains untouched, per the direction doc: it stays the operative generator until the acceptance test passes.

## Intent you must not lose (from direct conversation with Basil)

1. **The deterministic-gate machinery is calibrated scaffolding.** It compensates for weak model judgment (GPT-5.5 / Opus 4.8 era). It is load-bearing where a weak model executes, and only there is it non-negotiable. Relaxation experiments are allowed only in strong-model (Fable-class) tiers.
2. **First goal is a capability experiment, not a build-out**: a process orchestrator (`.llm-conductor/ORCHESTRATOR_AGENT.md` pattern) in OpenCode on GPT-5.5 at low/medium thinking should (a) execute the routine per-release cycle and (b) maintain the routine's own instructions from cycle friction. Fallback ladder if (b) fails: GPT-5.5 executes, Fable maintains.
3. **Failure attribution before tiering decisions.** Every pilot stumble gets classified `SPEC-GAP` (our artifact under-specified — add determinism) vs `EXECUTOR-FAIL` (deterministic spec, executor still failed — evidence for fallback). Never re-tier on impressions.
4. **Scope**: the harnesses in this workspace plus new ones on request. Proactive ecosystem tracking is explicitly deferred as not cost-effective now.
5. Writing plans → re-read `.llm-conductor/planning_guidance.md` first; orchestrating → re-read `.llm-conductor/ORCHESTRATOR_AGENT.md`; any document authoring → the writing guidance. Basil's rules require re-reading these, not trusting memory of them.

## Fable credit economy (binding)

Fable tokens are scarce (~25% consumed in the 2026-07-01 session alone). Spend them only on judgment, synthesis, and intent-sensitive decisions. Rules:

- Subagents inherit the session model unless overridden. **Always pass an explicit cheaper model** (`sonnet`, or `haiku` for mechanical work) when spawning readers, extractors, reviewers, or drafters. The 2026-07-01 session burned ~230k Fable tokens on four doc reviewers that Sonnet could have run.
- Long sessions reprocess their whole history every turn. Finish a work unit, update this file, end the session; start the next unit fresh from this entry point.
- Read sources on demand, not preemptively; delegate bulk reading to cheap subagents and consume their conclusions.

## Immediate next action

The direction doc's Next Step is COMPLETE (spec authored, acceptance test passed, meta-plan superseded — all committed). Re-enter the direction loop per its Iteration Rule: re-read `docs/meta-loop-direction.md`, update its Current State section against the repo (the Next Step it describes is done), and rewrite Next Step / Provisional Future Steps. Current best candidates, in the doc's own provisional order:

1. **Formalize escalation reason codes** (provisional step 1) — enumerate the structural-break codes and what each invalidates; input to the path-selection dispatcher.
2. **The GPT-5.5 pilot** (provisional step 4) waits on the next real OpenCode release. Test evidence to carry into it: the §1.15 validation loop is what closed executor transfer drops for Sonnet-class regenerators — treat it as non-negotiable scaffolding in the pilot's orchestration; seal-gate checklists alone were not enough at generation time.

Small loose end for Basil: decide where the OpenCode plugin-wiring config (`"plugin"` key in `opencode/.opencode/opencode.jsonc`, currently only an uncommitted local edit) should durably live.
