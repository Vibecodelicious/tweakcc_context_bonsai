# Context Bonsai v2 Implementation Roadmap

## Objective

Deliver Story 2.3 execution sequencing that is demoable by milestone and enforces behavior-contract parity, including locked gauge behavior.

## Locked Milestones (Dependency Ordered)

### Milestone 1 - Contract Baseline Complete

- Dependency: Story 2.1 outputs exist and are approved.
- Inputs: `PRD_CONTEXT_BONSAI_V2.md`, `docs/behavioral-contract.md`, `docs/parity-scenarios.md`.
- Demo: show normative prune/retrieve/gauge contract and parity scenarios are documented.
- Exit criteria: contract artifacts present and internally consistent.

### Milestone 2 - Core Prune/Retrieve Behavior

- Dependency: Milestone 1.
- Focus: deterministic prune/retrieve contract with explicit compatibility failures.
- Demo: prune and retrieve commands produce deterministic pass/fail outcomes for valid/invalid cases.
- Exit criteria: contiguous prune, anchor retrieve, and deterministic non-mutating failure behavior available.

### Milestone 3 - Gauge and Context-Pressure Behavior

- Dependency: Milestone 2.
- Focus: guidance behavior parity without mutating archive state.
- Locked gauge contract:
  - Cadence: every 5 turns.
  - Exactly 4 severity bands:
    - `<30%`: informational continue-work guidance.
    - `30-60%`: prune-ready advisory.
    - `61-80%`: stronger reminder with recency/drift cues.
    - `>80%`: explicit `PRUNE NOW` urgency.
- Demo: deterministic guidance output for each band and cadence checkpoint.
- Exit criteria: cadence and four-band behavior validated as parity-critical.

### Milestone 4 - Hardening, Parity Validation, and Release Readiness

- Dependency: Milestone 3.
- Focus: required scenario pass set, policy-safety release gates, and rollback readiness.
- Demo: parity harness scenario suite passes against current minimized Claude Code bundle.
- Exit criteria:
  - required parity scenarios pass,
  - compatibility-error checks pass,
  - policy-safety checklist complete,
  - minimized-bundle patch discovery checks pass,
  - rollback/incident playbook ready.

## Validation and Evidence Handshake

- Validation command set is locked by `docs/validation-protocol.md`.
- Baseline and post-change runs use the same command set within an epoch.
- Each epoch records build identifier, bundle hash, platform, and timestamp.

## Release Decision Rule

- Do not release if any Milestone 4 gate fails.
- On regression, execute `docs/rollback-and-incident-playbook.md` before further rollout.
