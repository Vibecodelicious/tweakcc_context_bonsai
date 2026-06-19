# Context Bonsai v2 Runtime Architecture

## Purpose

This document defines the trusted runtime boundary, compatibility assumptions, and fail-closed behavior for context-bonsai-v2 in Claude Code environments.

## Trusted Runtime Boundary

- **In scope (trusted for model-visible behavior):**
  - Message read/update primitives used by prune/retrieve.
  - Message transform primitive used to render archive placeholders and hide archived followers.
  - Optional system/event runtime surfaces used only for gauge/guidance behavior.
- **Out of scope (non-contractual internals):**
  - Internal symbol/function names in minimized bundles.
  - Source line offsets and source formatting.
  - Internal identifier remapping algorithms.

## Prohibited Integration Patterns

- Fixed symbol-name coupling to patch points in minimized bundles.
- Fixed line/offset coupling to patch points in minimized bundles.
- Leaked/de-obfuscated source as an execution dependency.
- Third-party harness patterns interpreted as subscription-policy violations.

## Runtime Primitive Mapping

- `loadMessages` (required): reads current message state for boundary resolution and archive/retrieve targeting.
- `updateMessage` (required): writes archive metadata and restore mutations.
- `messages.transform` (required): controls placeholder visibility and archived follower hiding.
- `system.transform` (optional core, required parity-complete gauge): injects context-pressure guidance.
- `event/chat params` (optional core, required parity-complete gauge): provides context-pressure signals.

## Compatibility and Failure Model

- If any core primitive (`loadMessages`, `updateMessage`, `messages.transform`) is unavailable:
  - Prune/retrieve fail closed with deterministic compatibility error.
  - No archive-state mutation occurs.
- If only gauge primitives (`system.transform`, `event/chat params`) are unavailable:
  - Gauge is disabled.
  - Prune/retrieve remain functional when core primitives exist.
  - Deterministic warning path is emitted in diagnostics/logs.

## Archive State and Session Consistency

- Archive visibility state is represented by stable archive metadata that survives process restarts.
- v1 default is marker-free behavior unless an implementation blocker forces marker usage in a later story.

## Provider Message Structure and Range Omission

- **Request assembly.** Before each model request, Claude Code builds the provider-bound array — the per-request array sent to the model — from the session transcript (the persisted messages read via `loadMessages`), then inserts ephemeral units that are not part of the transcript.
- **Ephemeral injected units.** Injected units, such as context reminders and deferred-tool or hook notices, are not stored in the transcript and are regenerated on each request. Each is marked `isMeta` and is sent to the provider as a `system`-role message, and each receives a newly generated identifier per request, so it has no identifier that is stable across requests. An injected unit can sit between the boundaries of an archived range.
- **Provider ordering constraint.** In the provider-bound array, a `system`-role message MUST be immediately followed by an `assistant` message or be the last element; the provider rejects any other placement.
- **Range omission MUST be positional.** Hiding an archived range MUST remove every message positioned between the range boundaries (its first and last transcript message) in the assembled provider-bound array — that is, after ephemeral injection — selected by position, not by identifier. Positional selection is required because an injected unit carries an unrecorded, per-request identifier; identifier-based selection leaves it in the array, and the surviving `system`-role unit then violates the ordering constraint once its neighboring transcript messages are removed.
- **Range records are boundary pairs, not message lists.** The durable archive record MUST represent each archived range by its boundary pair — the first and last transcript message — persisted independently of the per-request array so the range resolves on every request, including after session resume. The boundary pair is the only persisted selection state: the record MUST NOT also record member or interior message identifiers (range members include ephemeral injected units whose identifiers are unstable, so interior membership is resolved positionally at build time), and MUST NOT live only in an in-array placeholder (which is not guaranteed to survive resume).
- **Conformance check.** Archiving a range that contains an injected `system`-role unit MUST yield a provider-bound array with no message between the boundaries, accepted by the provider.

## Minimized Bundle Patch Strategy (Fail-Closed)

- Discovery uses minification-resilient structural/runtime signatures only:
  - Message-shape flows.
  - Tool-call envelope patterns.
  - Transform boundaries.
- Each required patch insertion point has exactly one strict matcher.
- If any required matcher is unresolved or non-unique, patch apply fails closed with deterministic compatibility error.
- Validation must execute against the real current minimized Claude Code bundle path.

## Platform and Session Constraints

- v1 targets official Claude Code runtime sessions with subscription-backed access.
- OS/runtime-specific assumptions must be documented where introduced by implementation stories.
- Any unmet platform/session assumption must degrade deterministically to explicit compatibility error paths.
