# Context Bonsai v2 Policy-Safety Checklist

Use this checklist as a release gate before enabling autonomous prune behavior in production-like environments.

## A. Runtime Policy Envelope

- [x] Integration path avoids third-party harnessing behavior disallowed by current subscription enforcement.
- [x] Runtime wiring targets official Claude Code execution surfaces only.
- [x] No secondary summarization subprocess is invoked for prune summaries.

## B. Trusted-Boundary Safety

- [x] Core runtime primitives are available: `loadMessages`, `updateMessage`, `messages.transform`.
- [x] Missing core primitive path returns deterministic compatibility error and performs no mutation.
- [x] Optional gauge primitives are handled as degrade-only paths, not core blockers.

## C. Minimized-Bundle Patch Safety (Fail-Closed)

- [x] Patch-point discovery uses minification-agnostic structural/runtime signatures.
- [x] No patch selector depends on fixed symbol names.
- [x] No patch selector depends on fixed line numbers or source offsets.
- [x] Each required insertion point has exactly one strict matcher.
- [x] Any unresolved or non-unique matcher causes fail-closed compatibility error.
- [x] Validation is executed against the real current minimized Claude Code bundle path.

## D. Deterministic Error and Degradation Behavior

- [x] Blocking compatibility failures are deterministic plain text and non-mutating.
- [x] Gauge-capability misses produce deterministic warning/degrade path while preserving prune/retrieve operation.
- [x] No silent no-op behavior is present for required capability failures.

## E. Release Gate Decision

- [x] Required parity scenarios pass for prune/retrieve core behavior.
- [x] Compatibility-failure paths are validated and non-mutating.
- [x] Patch discovery + smoke validation pass on current minimized bundle.
- [x] Rollback path exists to disable autonomous prune immediately on policy-compatibility regression.

## Outcome Rule

- Release is blocked until all checklist items above are completed.
