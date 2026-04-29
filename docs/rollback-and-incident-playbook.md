# Context Bonsai v2 Rollback and Incident Playbook

## Purpose

Provide an immediate disable path for autonomous pruning and a deterministic incident workflow for reproduction.

## Immediate Rollback Path

When parity or policy-safety regressions are detected:

1. Disable autonomous prune behavior immediately in runtime configuration.
2. Keep manual/non-autonomous operation available where safe.
3. If disable is not granular in the current runtime, disable bonsai patch activation entirely (fail closed).
4. Verify no further autonomous prune mutations occur.

Target state after rollback: non-pruning operation restored and no autonomous prune execution.

## Rollback Verification Checklist

- [ ] Autonomous prune trigger path no longer executes.
- [ ] Retrieve behavior remains deterministic if previously archived data exists.
- [ ] New prune mutations are blocked or require explicit manual invocation per current safety mode.
- [ ] Compatibility errors remain deterministic plain text.

## Incident Capture Requirements

Capture these artifacts for every incident:

- Tool arguments (`from_pattern`, `to_pattern`, `summary`, `index_terms`, `anchor_id` where relevant).
- Tool outputs (full deterministic error/success text).
- Transform state snapshot (pre and post operation).
- Runtime fingerprint: build identifier, minimized bundle hash, platform, timestamp.
- Matcher status: hit/miss/non-unique result for required patch points.

## Incident Triage Workflow

1. Classify incident:
   - Contract violation,
   - Compatibility failure,
   - Policy-safety regression,
   - Gauge parity regression.
2. Reproduce from captured artifacts in an isolated run.
3. Determine if failure is non-mutating; if not, escalate as severity-high safety defect.
4. Keep autonomous prune disabled until fix and validation gates pass.

## Return-to-Service Criteria

Only re-enable autonomous prune when all are true:

- Required E2E parity scenarios pass.
- Compatibility-failure and fail-closed checks pass.
- Policy-safety checklist is fully complete.
- Validation evidence is recorded with the standard schema.
