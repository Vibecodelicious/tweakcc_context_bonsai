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

This section governs how an archived range is hidden from the message list sent to the model, so the next request stays valid.

- **How the message list is built.** Before each request, Claude Code assembles the message list it sends to the model from the saved conversation, then inserts extra messages that are not part of the saved conversation.
- **Auto-generated system reminders.** Some of those inserted messages are system reminders (for example, "you haven't used your task tools recently"). They are not saved in the conversation; Claude Code regenerates them on every request, and each one gets a new random ID each time, so no ID identifies the same reminder across requests. A reminder can land between the messages of an archived range.
- **The API's ordering rule.** In the message list sent to the model, a `system` message MUST be immediately followed by an `assistant` message, or be the last message. The API rejects any other placement.
- **Hiding MUST work by position, not by ID.** To hide an archived range, an implementation MUST remove every message from the range's first archived message through its last — the whole stretch, those two included — whatever each message's type or ID. Removing only the messages it can match by ID is not enough: the inserted reminders get a new ID each request, so an ID match never catches them, and a reminder left inside the stretch ends up next to the wrong kind of message and the request is rejected.
- **Stranded reminders MUST be removed.** Removing the stretch can strand a reminder just outside it: if the `assistant` message a reminder was attached to is removed, that reminder is no longer followed by an `assistant` message. An implementation MUST remove any reminder left stranded this way. The whole resulting message list, not just the removed stretch, MUST satisfy the ordering rule above.
- **The range MUST be recoverable from saved state.** On every request, including after the session is resumed, an implementation MUST be able to find the range's first and last message from state held outside the per-request message list. That state MAY be a saved record of those two messages, or a per-message "archived" mark left on the saved conversation. When it is per-message marks, the first and last marked message give the range's edges, and the implementation MUST then remove the whole stretch between them — including the unmarked reminders inside it — never only the marked messages. The saved state MUST NOT be only the in-list placeholder, which is not guaranteed to survive a resume.
- **Restoring a range MUST clear the saved state.** To restore (un-hide) a range, an implementation MUST clear that range's "archived" state on its messages and remove its placeholder, and MUST persist this so the range stays visible after a resume.
- **How to verify.** Hiding a range MUST produce a message list the live API accepts, with no archived message left in it. Test it with a reminder placed inside the range (removed with the stretch) and a reminder placed next to a range edge (not left stranded). The result MUST also pass the ordering rule offline, without calling the API: every `system` message is immediately followed by an `assistant` message or is the last message.

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
