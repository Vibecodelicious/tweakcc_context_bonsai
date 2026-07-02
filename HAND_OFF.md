# Hand-Off

This file is the single entry point: a fresh session pointed here needs nothing else to start. Reading order:

1. This file, in full.
2. `/home/basil/projects/context-bonsai-agents/docs/meta-loop-direction.md` — the authoritative direction statement.
3. The source documents listed under "Immediate next action," as the work requires them — not preemptively; context budget matters in this project of all projects.

Keep this file updated as work progresses (read `/home/basil/projects/context-bonsai-agents/.llm-conductor/writing_guidance/DOCUMENT_WRITING_GUIDANCE.md` before rewriting it). This file lives in the Claude Code port's side repo, but most current work targets the **parent repo** `/home/basil/projects/context-bonsai-agents/`.

## What we are doing

Developing the Context Bonsai **meta-loop**: the machinery that keeps every harness port current as harnesses release new versions, and that can derive a port for a harness it has never seen. Basil calls the current activity the outer-outer loop — developing the loops themselves. The authoritative direction statement is:

**`/home/basil/projects/context-bonsai-agents/docs/meta-loop-direction.md`** — read it in full before doing anything. It defines the end goal (three artifact levels, one pipeline with three entry points, executor tiering), the committed next step (restructure the rebase meta-plan into `docs/agent-specs/forward-port-spec.md`: shape-agnostic core + two shape bindings + per-harness slots, with two acceptance criteria), and provisional future steps. It carries its own iteration rule: Next Step and future steps are freely rewritable; End Goal changes need Basil's approval.

## State as of 2026-07-02 (UTC; dates here are UTC)

- **The direction loop has been re-run twice** (parent commits `74b2b41`, then `d016ec0`). The first pass made escalation codes the Next Step with a "pilot preempts if a release lands" rule — written under a stale premise. Checking upstream showed the premise false: **upstream OpenCode is at v1.17.13 (published 2026-07-01), 21 releases and two minor versions past the pinned v1.15.7**. Basil decided (2026-07-02): pilot first, straight onto v1.17.13, treating the break-prone jump as part of the test. The direction doc's **Next Step is now: run the GPT-5.5 pilot against v1.17.13**; escalation codes is provisional step 1, to be fed by whatever STOPs the pilot hits. Lesson recorded the hard way: verify external gates against the world, not against hand-off phrasing.
- **The plugin-wiring loose end is resolved** (parent commit `e0e20db`). Basil confirmed the wiring is meant to be generated fresh each cycle during e2e (worktree-local, uncommitted — the executed cycle did exactly that; it still sits as a modified file in `opencode/.agent_tmp/rebase-on-v1.15.7/`). The real defect was in the spec: §4.2 said to template the worktree config "from the pinned harness's copy," but the pinned committed copy has no `"plugin"` key (the uncommitted edit the reviewer saw is gone). §4.2 now states the wiring content explicitly. Nothing needs to durably carry the wiring.
- Prior milestone (2026-07-02, earlier): **the acceptance test PASSED and the meta-plan is superseded** (parent commit `1fedcd9`). Both executed cycle plans (OpenCode `4d88b95`, Claude Code `95c2422`) were regenerated clean-room from the spec by Sonnet agents and audited equivalent on all four criteria. Three rounds: rounds 1–2 surfaced ~12 spec fixes (all folded in); round 3 ran the spec's own §1.15 validation loop, which is what caught recurring executor transfer drops — evidence the loop is load-bearing for weak-executor generation, directly relevant to the GPT-5.5 pilot. Also from the test: a regenerator hit the §1.14 same-cycle collision STOP and refused waivers (fail-closed machinery binds hard; historical-regeneration exercises need document-production framing, not cycle-executor framing), and the strict input grammar caught a 39-char SHA.
- Standing facts: Basil chose direct document authoring + the writing-guidance review loop over the formal plan system for this work. The parent repo's dirty `tweakcc_context_bonsai` submodule pin is pre-existing and unrelated — do not sweep it into commits.

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

Execute the direction doc's Next Step: **the GPT-5.5 pilot against upstream OpenCode v1.17.13**. The full specification — executor setup, the cycle, the maintenance step, failure attribution, what a STOP means, the acceptance test — is in `docs/meta-loop-direction.md` §Next Step; work from that text, not from this summary. First concrete task is step 1 there: set up the process orchestrator in OpenCode on GPT-5.5 at low/medium thinking, re-reading `.llm-conductor/ORCHESTRATOR_AGENT.md` at setup time per Basil's rules. Note the pilot's constraint on *this* session's role: GPT-5.5 executes and maintains; Fable observes, records attribution verdicts, and does not intervene in ways that would contaminate the tiering experiment.
