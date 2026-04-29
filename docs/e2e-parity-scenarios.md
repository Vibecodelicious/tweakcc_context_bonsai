# Context Bonsai v2 E2E Parity Scenarios

## Scope

This suite validates model-visible parity outcomes against the required v1 scenario set.

## Scenario Matrix

| ID | Scenario | Setup | Action | Deterministic pass criteria | Deterministic fail criteria |
|---|---|---|---|---|---|
| E2E-01 | Contiguous prune success | Conversation has one uniquely bounded completed block | Call `context-bonsai-prune` with unique `from_pattern`/`to_pattern`, non-empty `summary`, non-empty `index_terms` | Success output, one contiguous archive range, placeholder includes range+summary+index terms | Disjoint archive segments, missing placeholder fields, non-deterministic output |
| E2E-02 | Boundary ambiguity rejection | Boundaries are unresolved or ambiguous | Call `context-bonsai-prune` | Deterministic plain-text boundary error, no mutation | Silent success, partial mutation, unstable error text |
| E2E-03 | Retrieve by anchor success | Archived anchor exists | Call `context-bonsai-retrieve` with valid `anchor_id` | Full inclusive restore from anchor to stored range end, placeholder removed for restored segment | Partial restore, residual unresolved placeholder |
| E2E-04 | Gauge cadence and severity behavior | Session has deterministic pressure samples across thresholds | Observe gauge outputs across turn progression | Emission at every 5th turn only; exactly 4 bands with locked thresholds/messages | Off-cadence emission, missing/extra band, threshold drift |
| E2E-05 | Missing required primitive compatibility error | Simulate missing core primitive (`loadMessages`, `updateMessage`, or `messages.transform`) | Invoke prune/retrieve path | Deterministic compatibility error and no mutation | Silent no-op, mutation on failure, non-deterministic compatibility output |

## Gauge Contract Assertions (Locked)

- Cadence: every 5 turns.
- Exactly 4 bands:
  - `<30%`: informational continue-work guidance.
  - `30-60%`: prune-ready advisory.
  - `61-80%`: stronger reminder with recency/drift cues.
  - `>80%`: explicit `PRUNE NOW` urgency language.

## Execution Notes

- Validate against the real current minimized Claude Code bundle.
- Validate model-visible outcomes only; do not assert internal symbol names or line numbers.
- Persist evidence in the validation protocol schema from `docs/validation-protocol.md`.
