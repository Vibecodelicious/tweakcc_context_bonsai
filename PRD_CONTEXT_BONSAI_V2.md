# PRD: Context Bonsai v2

## 1. Product Goal

Context Bonsai v2 provides model-visible pruning and retrieval behavior that matches OpenCode from the LLM perspective while remaining implementation-portable for tweakcc runtime integration.

## 2. Scope

### 2.1 In Scope (v1)
- Prune API contract and failure behavior.
- Retrieve API contract and failure behavior.
- Gauge/reminder behavior contract for context pressure.
- Archive placeholder rendering contract.
- Behavior-level parity scenarios that are implementation-independent.

### 2.2 Non-Goals (v1)
- Reproducing OpenCode internal source structure, symbol names, or identifier reconciliation internals.
- Defining or depending on pseudo-ID to stored-ID resolution algorithms.
- Introducing out-of-band summarization workflows for prune calls.
- Batch retrieval workflows beyond anchor-based retrieval.

## 3. User Outcomes

- Users MUST be able to prune completed or stale context in one tool turn with a high-quality summary and index terms.
- Users MUST be able to restore archived context by anchor without partial state.
- Users SHOULD receive deterministic context-pressure guidance during long sessions.
- Users MUST receive clear deterministic tool errors for unsupported or invalid operations.

## 4. Normative Tool Contract

### 4.1 `context-bonsai-prune`
- Inputs MUST include `from_pattern`, `to_pattern`, `summary`, and `index_terms`; `reason` MAY be provided.
- `summary` MUST be non-empty after trim.
- `index_terms` MUST be a non-empty array of non-empty strings after trim.
- ID selectors MUST be rejected with deterministic plain-text error output.
- Boundary patterns MUST resolve uniquely before mutation; unresolved or ambiguous boundaries MUST fail without mutation.
- Exactly one contiguous range MUST be archived per invocation.
- Errors MUST be deterministic plain-text messages suitable for Claude Code tool output.

### 4.2 `context-bonsai-retrieve`
- Input MUST be `anchor_id` only for v1.
- Retrieval MUST succeed only when anchor metadata exists for an archived range.
- Missing anchor or non-archived anchor MUST fail with deterministic plain-text error output.
- Retrieval MUST restore full inclusive visibility from anchor to stored range end.

### 4.3 Gauge/Reminder
- Gauge behavior SHOULD provide actionable reminders under context pressure.
- Gauge behavior MUST NOT mutate archive state.
- Gauge behavior MAY be disabled if required runtime primitives are unavailable, but prune/retrieve contracts MUST remain intact when core capabilities exist.

## 5. Archive Model and Invariants

- Archive metadata MUST be anchor-scoped.
- Metadata MUST include summary text, index terms, and range-end identifier.
- Placeholder rendering MUST include archive range, summary, and index terms.
- Prune/retrieve operations MUST appear atomic from the model perspective.
- v1 retrieval validation MUST be archive-presence based on the anchor metadata.

## 6. Inference and Policy-Safety Contract

- Prune summaries MUST be model-authored in-band as tool arguments.
- The system MUST NOT invoke a secondary summarization subprocess for prune summary generation.
- Tool failures MUST be surfaced directly as deterministic tool outputs.
- Hidden retries that alter summary semantics MUST NOT be used.
- Unsupported capability states MUST fail closed with deterministic compatibility errors and no mutation.

## 7. Behavioral Parity Scenarios (Implementation-Independent)

- Completed-task prune MUST preserve decisions and outcomes in the archived summary and remain retrievable.
- Iteration-loop prune MUST preserve attempts, constraints, and active hypothesis for forward-useful continuity.
- Context-pressure gauge MUST provide actionable guidance while allowing continued task execution.
- Retrieval MUST remove unresolved placeholder state and restore original archived range visibility.

## 8. Acceptance Criteria Mapping

- LLM-facing contract is specified with normative MUST/SHOULD/MAY language in Sections 3-7.
- In-band summary requirement and explicit no-out-of-band summarizer policy are specified in Section 6.
- Non-goals preventing OpenCode implementation leakage are specified in Section 2.2.
- Behavior-level parity scenarios independent of implementation details are specified in Section 7.
- Policy-safety and deterministic failure expectations are specified in Section 6.
