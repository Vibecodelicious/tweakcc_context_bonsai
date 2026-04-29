# Context Bonsai v2 Release Readiness Evidence

## Validation Epoch Metadata

- Claude Code build identifier: `local-shell-2026-04-20`
- Minimized bundle path: `mcp-server/index.ts` (default path used when `BONSAI_MIN_BUNDLE_PATH` is unset)
- Minimized bundle hash (sha256): `0e2e08a6da91f6ff01eee9741992f4ae87c11073c4a6c9c82b2ea5a41f2747c5`
- Runtime platform: `linux`
- Execution timestamp (UTC): `2026-04-20T21:37:35Z`

## Gate Checklist Status (Policy + Milestone 4)

| Gate | Status | Evidence |
|---|---|---|
| Required parity scenarios pass for prune/retrieve core behavior | pass | `PASS CORE-MCP-SERVER-TESTS` + `15 pass` + `0 fail` |
| Compatibility-failure paths are validated and non-mutating | pass | `PASS CORE-MCP-SERVER-TESTS` (from `bun test mcp-server/index.test.ts`) |
| Policy-safety checklist is fully completed before release | pass | `PASS POLICY-CHECKLIST-COMPLETE` |
| Minimized-bundle patch discovery checks are present and fail-closed | pass | `PASS PATCH-DISCOVERY-CHECK` |
| Minimized bundle path + hash metadata are captured | pass | `PASS BUNDLE-PATH-SET: mcp-server/index.ts` + `PASS BUNDLE-HASH: sha256=0e2e08...` |
| Core runtime primitive behavior for compaction/retrieve paths is stable | pass | `PASS CORE-COMPACT-TESTS` + `40 pass` + `0 fail` |
| MCP server exposes required tools (`prune`, `retrieve`, `gauge`) | pass | `PASS CORE-TOOLS-EXPOSED` |
| Rollback path exists | pass | `PASS DOC-ROLLBACK` |

## Command Evidence

Command | Result (pass/fail) | Evidence (stable output lines)
--- | --- | ---
`test -n "$BONSAI_V2_ROOT" && test -d "$BONSAI_V2_ROOT"` | pass | `BONSAI_V2_ROOT=/home/basil/projects/the_observer`; command exit `0`.
`cd "$BONSAI_V2_ROOT" && ./scripts/validate/validate-core.sh` | pass | `PASS POLICY-CHECKLIST-COMPLETE`; `PASS BUNDLE-PATH-SET: mcp-server/index.ts`; `PASS BUNDLE-HASH: sha256=0e2e08a6da91f6ff01eee9741992f4ae87c11073c4a6c9c82b2ea5a41f2747c5`; `PASS PATCH-DISCOVERY-CHECK`; `PASS CORE-TOOLS-EXPOSED`; `PASS CORE-MCP-SERVER-TESTS`; `15 pass`; `0 fail`; `PASS CORE-COMPACT-TESTS`; `40 pass`; `0 fail`; `PASS BUILD-ID: local-shell-2026-04-20`; `PASS PLATFORM: linux`; `PASS TIMESTAMP: 2026-04-20T21:37:35Z`; `VALIDATION_COMPLETE`.
