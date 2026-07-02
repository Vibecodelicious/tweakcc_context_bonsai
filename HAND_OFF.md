# Hand-Off

This file is the single entry point: a fresh session pointed here needs nothing else to start. Reading order:

1. This file, in full.
2. `/home/basil/projects/context-bonsai-agents/docs/meta-loop-direction.md` — the authoritative direction statement.
3. The source documents listed under "Immediate next action," as the work requires them — not preemptively; context budget matters in this project of all projects.

Keep this file updated as work progresses (read `/home/basil/projects/context-bonsai-agents/.llm-conductor/writing_guidance/DOCUMENT_WRITING_GUIDANCE.md` before rewriting it). This file lives in the Claude Code port's side repo, but most current work targets the **parent repo** `/home/basil/projects/context-bonsai-agents/`.

## What we are doing

Developing the Context Bonsai **meta-loop**: the machinery that keeps every harness port current as harnesses release new versions, and that can derive a port for a harness it has never seen. Basil calls the current activity the outer-outer loop — developing the loops themselves. The authoritative direction statement is:

**`/home/basil/projects/context-bonsai-agents/docs/meta-loop-direction.md`** — read it in full before doing anything. It defines the end goal (three artifact levels, one pipeline with three entry points, executor tiering), the committed next step (restructure the rebase meta-plan into `docs/agent-specs/forward-port-spec.md`: shape-agnostic core + two shape bindings + per-harness slots, with two acceptance criteria), and provisional future steps. It carries its own iteration rule: Next Step and future steps are freely rewritable; End Goal changes need Basil's approval.

## State as of 2026-07-02

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

1. **Basil reviews the drafted spec** (`docs/agent-specs/forward-port-spec.md`, uncommitted in the parent repo) and approves or amends it. Commit it only when he says to.
2. **Run the direction doc's acceptance test**: regenerate the two executed cycle plans from the spec — OpenCode `4d88b95` (spec Parts 1+2+§4.2) and Claude Code `95c2422` (Parts 1+3+§4.3) — and compare against the real plans at `.agents/plans/story-rebase-cycle-<sha>.md`: same seal/blocking gates, same bucket taxonomy and precedence, same validation command set and working directories, same immutable e2e scope. Prose/ordering/formatting may differ. Delegate the regeneration to cheap subagents; a task-success reviewer already audited spec-vs-plans equivalence on paper and found it clean, but the direction doc's test is regeneration, which has not been run.
3. **Only after the test passes**: replace the meta-plan's content at `.agents/plans/story-meta-plan-for-future-rebase-planning.md` with a short pointer note to the spec (this is the one sanctioned modification), and update the spec's Status paragraph.
4. Then re-enter the direction doc's loop: provisional step 1 is formalizing escalation reason codes; step 4 is the GPT-5.5 pilot on the next real OpenCode release.
