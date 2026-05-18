# Coding Standards — tweakcc_context_bonsai

## Authority

- This side repo holds Context Bonsai for Claude Code: the `ccsnap` CLI plus the `context-bonsai` MCP server (the tweakcc surface).
- Claude Code is closed-source. There is no agent-repo to mirror; conventions are set by the cross-agent spec at `docs/context-bonsai-agent-spec.md` (in the parent planning repo) and the per-agent spec at `docs/agent-specs/claude-code-context-bonsai-spec.md`.
- Claude Code patching is implemented in this repo with tweakcc 4.0's programmatic API. The apply harness composes local patch transforms over one content string and writes once.

## Language / runtime

- TypeScript, targeting Bun.
- ESM modules; `"type": "module"` in both root and `mcp-server/package.json`.
- Node/Bun built-ins imported via `node:*` prefix.
- No bundler / build step: TypeScript runs directly under Bun. `bun run src/index.ts` for the CLI; `bun run mcp-server/index.ts` for the MCP server.

## Linting / formatting

- TypeScript `strict: true` (root `tsconfig.json`).
- No project-level oxlint/biome config required; rely on `tsc --noEmit` typechecks as the discipline gate.

## Testing

- `bun:test` harness for both root (`src/`) and `mcp-server/`.
- `import { describe, test, expect } from "bun:test"`.
- Test files colocated with sources using `*.test.ts` suffix (e.g. `src/lib/compact.test.ts`, `mcp-server/index.test.ts`).
- Run: `bun test` from the repo root (covers both packages).

## File / directory conventions

- `src/` — `ccsnap` CLI and supporting libraries.
  - `src/index.ts` — CLI entry (`bin: ccsnap`).
  - `src/lib/session.ts` — Claude Code JSONL session loader (`findCurrentSession`, `findSessionPath`, `readSessionMessages`).
  - `src/lib/compact.ts` — archival logic (`markMessagesArchived`, `addArchivedMarkerEntries`, `retrieveSession`).
  - `src/types.ts` — shared `SessionMessage`, `CompactMetadata`, `SummaryMessage` types.
- `mcp-server/` — context-bonsai MCP server.
  - `mcp-server/index.ts` — MCP entry (`bin: context-bonsai`); wires `context-bonsai-prune` and `context-bonsai-retrieve` tools.
  - `mcp-server/index.test.ts` — unit + integration tests (Bun `describe`/`test`).
- `patches/` — Context Bonsai patch transform modules and their ordered registry. Patch modules export `BonsaiPatch` and must be composed by the apply harness, not run as separate `adhoc-patch` CLI calls.
- `apply/` — tweakcc 4.0 API wrapper and the Context Bonsai apply/restore harness.
- `docs/` — bonsai v2 specs, e2e protocol, validation docs.
- `scripts/validate/` — release-time validation scripts.

## Out of scope

- Maintaining a custom tweakcc distribution. Context Bonsai depends on published tweakcc 4.0.x and wraps its API locally because the published tarball currently omits `dist/lib/index.d.ts`.
- Direct edits to Claude Code source outside the apply harness. Native and npm installs are accessed through tweakcc `readContent`/`writeContent`, with `backupFile`/`restoreBackup` for reversibility.
- Other ccsnap features unrelated to context-bonsai: keep ccsnap focused on what bonsai needs (session loader, JSONL archival).
