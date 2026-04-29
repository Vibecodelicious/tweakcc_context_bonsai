# Context Bonsai v2 Behavioral Contract

This document defines model-visible behavior only. Internal runtime wiring is intentionally non-contractual unless stated otherwise.

## 1. Contract Boundaries

- Parity target is LLM-observable behavior and tool outcomes.
- Internal symbol names, minified bundle layout, and ID reconciliation mechanics are out of scope.
- Any behavior not explicitly defined here is non-contractual for v1.

## 2. Prune Contract

### Required inputs
- `from_pattern` (required)
- `to_pattern` (required)
- `summary` (required, non-empty after trim)
- `index_terms` (required, non-empty array of non-empty strings after trim)
- `reason` (optional)

### Required behavior
- Pattern boundaries MUST resolve uniquely before mutation.
- Ambiguous or unresolved boundaries MUST return deterministic plain-text error and perform no mutation.
- ID selectors MUST be rejected with deterministic plain-text error.
- One call MUST archive exactly one contiguous inclusive range.
- Placeholder rendering MUST expose archive range, summary, and index terms.

## 3. Retrieve Contract

### Required inputs
- `anchor_id` only.

### Required behavior
- Retrieve MUST succeed when anchor metadata is present and archived.
- Retrieve MUST restore the full inclusive range from anchor to stored range-end identifier.
- Missing anchor or non-archived anchor MUST return deterministic plain-text error.
- Retrieve MUST leave no unresolved placeholder state for the restored range.

## 4. Gauge and Context-Pressure Guidance

- Gauge reminders SHOULD be actionable and concise.
- Gauge logic MUST not mutate archive state.
- Missing gauge-specific runtime primitives MAY disable gauge behavior.
- Missing core prune/retrieve primitives MUST return deterministic compatibility errors and do no mutation.

## 5. Inference Topology

- Prune summary generation MUST happen in-band by the acting model in tool arguments.
- Out-of-band summarizer subprocess invocation is prohibited.
- Failures MUST be surfaced directly with deterministic outputs, not hidden retries that alter semantics.

## 6. Deterministic Failure Expectations

- Error outputs MUST be plain text and deterministic for identical invalid inputs.
- Invalid input failures MUST be non-mutating.
- Compatibility failures MUST be fail-closed and non-mutating.

## 7. Explicit v1 Deferrals

- Batch retrieval or query-by-index-terms workflows.
- Contracts on internal identifier remapping methods.
- Any requirement to mirror OpenCode implementation internals.
