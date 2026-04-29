# Context Bonsai v2 Validation Protocol

## Purpose

Define deterministic validation evidence for Story 2.3 and later implementation epochs.

## Command Evidence Schema

Use this row format for every command in an epoch:

`Command | Result (pass/fail) | Evidence`

Evidence must include the relevant output line(s) or stable failure identifier(s).

## Required Validation Epoch Metadata

Every baseline and post-change run MUST capture:

- Claude Code build identifier
- Minimized bundle hash
- Runtime platform
- Execution timestamp

## Locked Command Set (Story 2.3)

Run in order:

1. `test -n "$BONSAI_V2_ROOT" && test -d "$BONSAI_V2_ROOT"`
2. `cd "$BONSAI_V2_ROOT" && ./scripts/validate/validate-core.sh`

## Baseline/Post-Change Delta Protocol

1. Capture baseline results before implementation changes.
2. Run post-change with the exact same command set.
3. Classify each command as one of:
   - `pass->pass`
   - `fail->pass`
   - `pass->fail`
   - `fail->fail (same identifier)`
   - `fail->fail (new identifier)`
4. Treat `pass->fail` and `fail->fail (new identifier)` as regressions.

If a command failure has no stable tool-emitted identifier, classify any repeated fail as `fail->fail (new identifier)`.

## Gauge Parity Validation Requirements

Validation must explicitly verify:

- cadence is every 5 turns,
- exactly 4 severity bands exist,
- no fifth band is introduced,
- language expectation includes explicit `PRUNE NOW` urgency for `>80%`.

Gauge checks are mandatory parity checks, not optional smoke checks.

## Minification-Resilience Validation Requirements

- Record matcher hit/miss outcomes for required patch points.
- Confirm fail-closed behavior on unresolved or non-unique matcher.
- Treat any matcher miss as a release blocker.
