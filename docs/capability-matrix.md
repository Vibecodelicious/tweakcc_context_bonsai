# Context Bonsai v2 Capability Matrix

This matrix defines required versus optional capabilities and the exact failure/degradation behavior when a capability is missing.

## Capability Classes

| Capability | Runtime primitive(s) | Required for core prune/retrieve | Required for parity-complete behavior | Missing capability behavior | Error/degrade semantics |
|---|---|---|---|---|---|
| Message read | `loadMessages` | Yes | Yes | Block core operations | Deterministic compatibility error; no mutation |
| Message update | `updateMessage` | Yes | Yes | Block core operations | Deterministic compatibility error; no mutation |
| Archive placeholder + follower visibility control | `messages.transform` | Yes | Yes | Block core operations | Deterministic compatibility error; no mutation |
| System guidance injection | `system.transform` | No | Yes | Disable gauge/guidance only | Deterministic warning; prune/retrieve remain available |
| Context-pressure signal observation | `event/chat params` | No | Yes | Disable gauge/guidance only | Deterministic warning; prune/retrieve remain available |
| Minified-bundle patch-point discovery | Structural/runtime matcher set | Yes | Yes | Block feature activation when unresolved/non-unique | Deterministic compatibility error; fail closed |

## Core vs Parity-Complete Mode

- **Core-operational mode:** requires all core capabilities (message read, message update, message transform).
- **Parity-complete mode:** requires core-operational mode plus gauge capabilities (`system.transform`, `event/chat params`).

## Failure and Degradation Strategy by Class

### Class A: Missing core capability

- Affected features: prune/retrieve and archive placeholder lifecycle.
- User-visible result: deterministic compatibility error.
- Safety invariant: no archive writes, no partial state, no hidden retries.

### Class B: Missing gauge-only capability

- Affected features: context-pressure reminders/guidance.
- User-visible/system-visible result: deterministic warning path; no hard failure for prune/retrieve.
- Safety invariant: archive state remains untouched by degraded gauge path.

### Class C: Patch discovery unresolved or non-unique

- Affected features: runtime patch activation on minimized bundles.
- User-visible result: deterministic compatibility error.
- Safety invariant: fail closed; do not activate with weak or multiple ambiguous matches.

## Determinism Requirements

- Identical missing-capability conditions must emit identical plain-text compatibility/warning messages.
- Any path classified as blocking must be non-mutating.
- Any path classified as recoverable must preserve prune/retrieve correctness invariants.
