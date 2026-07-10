# Maintenance Report: Claude Code Forward-Port 2.1.201 -> 2.1.205

- Source HEAD SHA: `1c0f553ecaf6d6472e43b523e218bec0ae43769d` (side repo `main`)
- Target: `@anthropic-ai/claude-code@2.1.205`
- Cycle shape: closed-artifact rebase cycle (clean rebind); Phases 0-8 executed, no push.
- Outcome: SEALED at side-repo level; full e2e scope PASS with E2E-04 PARTIAL under the standing gauge exception.

## Changed slot-level facts (with evidence)

- Anchor scan reproduced against the frozen 2.1.205 bundle (sha256 `4b58a8dbec46ae10f5f3f2c346295f8dcde5ba26ad13d3b21a6db1dea14e687b`, 19175988 bytes). All 8 anchors select with the same scores as 2.1.201 (`105`/`110`/`62`/`50`/`40`) and the full patch composition + 3 sentinels verify green with zero selector/scorer/threshold edits.
- Two mechanical differences from the zero-drift 2.1.201 hop, both absorbed by the version-agnostic selectors (no re-derivation required):
  - Minified identifier churn: user converter `mVf`->`m0y`, usage accumulator `a6p`->`Upg` (init helper `Mwr`->`m5o`), attachment pipeline `I8a`->`Wbu`, runtime helpers `Xt`/`rr`/`Dt` -> `Gt`/`sn`/`wt`. Structural/behavioral selectors are identifier-agnostic, so this needed no code change.
  - `attachment-pipeline` raw candidate count moved from 17 (2.1.201) to 15 (2.1.205); winner still unique at score 50. Offsets shifted non-uniformly as the bundle grew 18698064 -> 19175988 bytes.
- No Behavioral Constraint (1-10) code path changed; all named regression suites pass (`bun test` 165 pass, 0 fail).

## Failure-attribution verdicts (stumbles)

- **EXECUTOR-FAIL (recovered): live-drive delegation.** A fork dispatched to run the live e2e drives returned a confabulated "still in progress" result without producing the pre/post session files, oracle JSONs, or results doc (it left 17 empty scratch dirs). Recovered by driving the live e2e directly in the main thread. Attribution: executor/delegation, not a spec or product defect.
- **EXECUTOR-FAIL (recovered): prune-drive prompt echoed the boundary phrase.** The first prune-drive turn embedded the literal `from_pattern` in the plain user prompt, creating a second searchable match and correctly triggering the ambiguity fail-closed path ("from_pattern matched multiple messages"). Recovered by re-driving with a recall-based instruction (model recalls the codewords into the tool-call args only; tool-call messages are excluded by the prune-wrapper filter, Constraint 7). This is the same class as the 2.1.201 marker-echo SPEC-GAP already folded into §3.6; no new spec change needed.
- **SPEC-GAP (informational): `--allowedTools` breaks trailing positional prompt parsing.** With `--allowedTools` present, the native 2.1.205 binary did not parse a trailing positional prompt (it waited on stdin, then hit "No deferred tool marker found"). Worked around by piping the prompt via stdin. Recorded as a live-drive mechanics note; candidate for the e2e-protocol Drive Discipline section (flag only, not invented here).
- **Disk-truncation flake (environmental, recovered):** the `apply/apply-bonsai.test.ts` "native no-op round-trip" test exited 135 (bus error) once under /tmp pressure while the 437MB patched binary occupied tmpfs; freeing space and re-running was green (11 pass). Matches the recorded disk-discipline hazard; not a code regression.

## Carried-forward flags (recorded even when nothing new)

- (a) Per-version literal defaults in `e2e/native-e2e.ts` / `patches/discovery.test.ts` force a mechanical rebind every cycle — candidate for deriving from the manifest instead (owner-tier decision; flag only).
- (b) The installation-e2e instance for Claude Code remains unrecorded anywhere — flagged, not invented.
- (c) No bound live gauge driver for E2E-04 — the `gauge-live-render-not-driven` conditional exception recurs until one exists.

## Disposition of the maintenance edit (§1.16)

No Part 4 slot-level fact changed this cycle (clean rebind; the §4.3 Claude Code runbook and slot table remain accurate). No parent-spec edit is proposed. The two live-drive mechanics notes above (recall-based prune driving already covered by §3.6; the `--allowedTools`/stdin parsing note) are recorded here for the owner tier; neither is committed to any spec by this cycle.
