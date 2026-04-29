# Context Bonsai v2 Parity Scenarios

These scenarios validate behavior-level parity without depending on internal source implementation.

## Scenario 1: Completed Task Block Prune

### Setup
- Conversation contains a completed contiguous task block with explicit outcomes.

### Action
- Invoke `context-bonsai-prune` with valid unique `from_pattern` and `to_pattern`, plus non-empty `summary` and `index_terms`.

### Expected outcomes
- Tool succeeds.
- Exactly one contiguous range is archived.
- Placeholder displays range, summary, and index terms.
- Summary retains key decisions/outcomes for future retrieval.

### Unacceptable outcomes
- Multiple disjoint ranges archived in one call.
- Summary omitted or placeholder missing summary/index terms.

## Scenario 2: Iteration Loop Prune

### Setup
- Conversation contains repeated troubleshooting attempts with constraints and current hypothesis.

### Action
- Invoke `context-bonsai-prune` over the loop segment with high-signal summary and index terms.

### Expected outcomes
- Tool succeeds and archives one contiguous range.
- Summary preserves attempts, constraints, and active hypothesis.
- Forward task flow remains understandable after prune.

### Unacceptable outcomes
- Loss of unresolved constraints needed for next steps.
- Non-deterministic outcome for identical inputs.

## Scenario 3: Boundary Validation Failure

### Setup
- `from_pattern` and/or `to_pattern` are ambiguous, unresolved, or provided as ID selectors.

### Action
- Invoke `context-bonsai-prune` with invalid boundary mode.

### Expected outcomes
- Tool fails with deterministic plain-text error.
- No archive mutation occurs.

### Unacceptable outcomes
- Partial archive writes.
- Silent success or non-deterministic error text.

## Scenario 4: Retrieve by Anchor Success

### Setup
- At least one prior successful prune with known archived anchor.

### Action
- Invoke `context-bonsai-retrieve` with valid `anchor_id`.

### Expected outcomes
- Full inclusive archived range from anchor to range-end is restored.
- Placeholder state for restored range is removed.
- Output is deterministic for same state and anchor.

### Unacceptable outcomes
- Partial restoration.
- Residual unresolved placeholder for restored segment.

## Scenario 5: Retrieve Failure Cases

### Setup
- Use missing anchor id or anchor that is not archived.

### Action
- Invoke `context-bonsai-retrieve`.

### Expected outcomes
- Deterministic plain-text not-found/not-archived style error.
- No mutation occurs.

### Unacceptable outcomes
- Silent no-op with success indication.
- Mutation to unrelated archive state.

## Scenario 6: Context-Pressure Guidance Continuity

### Setup
- Session approaches high context pressure.

### Action
- Observe gauge/reminder behavior during ongoing task flow.

### Expected outcomes
- Guidance remains actionable and does not block continued work.
- Guidance does not mutate archive state.
- If gauge primitives are unavailable, prune/retrieve still operate per core contract.

### Unacceptable outcomes
- Guidance that blocks all forward progress.
- Gauge path mutating archive state.
