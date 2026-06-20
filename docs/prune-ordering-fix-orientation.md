# Orientation: planning the prune message-ordering fix

Your task is to **produce the implementation plan** for the post-prune message-ordering fix — not to implement it, and not to re-derive the problem or the requirements. Follow the planning procedure in `.llm-conductor/planning_guidance.md` (re-read it before you start; if `.llm-conductor` is absent here, create it as a symlink to `/home/basil/projects/llm-conductor/`, per the global setup). This document only orients you and points at the durable sources; it deliberately does not restate them.

## Read these first

- **The problem, how it was found, and the root cause** — `docs/prune-ordering-case-study.md`. Read this for context and for the methodology you will reuse to verify your plan's claims.
- **The requirements your implementation must meet** — `docs/runtime-architecture.md`, section "Provider Message Structure and Range Omission". This is the normative contract. Every `MUST` there is an acceptance criterion for the plan.
- **The model-visible behavior contract** — `docs/behavioral-contract.md` (a successful prune must not produce a request the API rejects).
- **The cross-agent requirement this descends from** — the shared spec at `../docs/context-bonsai-agent-spec.md` (parent repo `context-bonsai-agents`).
- **How to verify against the real runtime** — `docs/e2e-protocol.md`, including the "Provider-Request Capture" technique. You will need this to confirm behavior rather than reason about it.

## Already decided — do not relitigate

- **Design: flag-based positional omission, no separate marker file.** The runtime reads the per-message `archived` / `archivedBy` marks already written into the saved conversation, finds each range's edges, and removes the whole stretch by position. The decision and the live evidence behind it (the marks are readable at the filter's seam) are in the case-study; the resulting requirements are in the spec section above.
- **Three parts to the fix**, all specified normatively in that spec section: positional removal of each range's stretch; removal of any reminder the cut strands at a boundary; retrieve by clearing the marks. Treat the spec as the source of truth for what each must do.

## Surface to change — starting pointers, confirm against current code

These are where the relevant logic lives today; verify line-level details yourself during planning (they drift).

- **Runtime filter** — `patches/archived-filter.patch.ts` (the injected filter body; today it removes by ID membership). Its patch anchor lives in `patches/anchors.ts` and is expected to stay; the change is to the injected body.
- **Prune write + retrieve** — `src/lib/compact.ts` and `mcp-server/index.ts` (where the marks and the placeholder are written, and where retrieve clears state).
- **Tests** — `src/lib/compact.test.ts`, `patches/archived-filter.patch.test.ts`, `mcp-server/index.test.ts`. Several assert the old by-ID marker shape and will need to move to the new behavior.

## Target artifact and verification

Target the pinned **`2.1.156`** Claude Code artifact. The forward-port to `2.1.156` is already done and all patches apply there (see `docs/e2e-results-2026-05-29-2.1.156.md` and `docs/semantic-anchor-analysis-2.1.156.md`), so the new filter body can be live-verified on it using the capture technique. Note: the machine's Claude Code has since auto-updated past `2.1.156` to a build where `apply` fails — the `context-bonsai-gauge` patch's anchor is ambiguous there, which aborts the whole apply (so the archived filter can't be applied either). Re-forward-porting to newer builds is a **separate** task and is not a prerequisite for this fix.

## Open questions to resolve in the plan

These are not yet decided and need a position (with evidence) in the plan:

1. **Does the `[PRUNED]` placeholder actually reach the model?** It was not seen in the captured filtered request during the investigation (the case-study shows that request's shape). Confirm whether the model still sees the placeholder; if not, decide whether fixing that is in scope or a separate item.
2. **Boundary-repair edge cases** — cascading orphans, and multiple or overlapping ranges — need a defined behavior and tests.
3. **Existing `archived` / `archivedBy` semantics** — retrieve depends on them; confirm the plan keeps them coherent.

## Constraints

- Keep patches minimal and within what tweakcc can do; the host-internals rules apply — `planning_guidance.md` ("Core Principle: Semantic Discovery For Host Internals") and the spec's fail-closed requirements for missing or ambiguous anchors.
- Verify against the real artifact (the bundle, or the live API via the capture technique), not by reasoning alone — see the case-study's methodology lessons.
- Do not bump the parent repo's submodule pin until the fix works end to end.
- Project standards: `STANDARDS.md`, `DEVELOPMENT.md`.

## Deliverable

An implementation plan that satisfies every `MUST` in the spec section, produced and validated per `planning_guidance.md` (single-story vs epic triage, then the mandatory validation loop), and committed before any implementation begins.
