# tweakcc_context_bonsai

Side project for the Context Bonsai Claude Code port. Ships:

- **`ccsnap`** — CLI for archiving / restoring Claude Code session JSONL ranges.
- **`context-bonsai` MCP server** — exposes `context-bonsai-prune` and `context-bonsai-retrieve` tools to Claude Code via MCP.

Together these implement context-bonsai for Claude Code: the model invokes the prune/retrieve tools through MCP, and `ccsnap` performs the underlying JSONL mutations.

## Scope

- `src/` — `ccsnap` CLI source + libs.
- `mcp-server/` — the context-bonsai MCP server.
- `docs/` — context-bonsai v2 spec, e2e protocol, validation docs.
- `scripts/validate/` — release-time validation scripts.
- `STANDARDS.md` — coding standards authoritative for this side repo.

## Related

- Parent planning repo: [`context-bonsai-agents`](../).
- Per-agent spec: `docs/agent-specs/claude-code-context-bonsai-spec.md` (in parent repo).
- Cross-agent spec: `docs/context-bonsai-agent-spec.md` (in parent repo).
- Companion patch: the [`tweakcc`](https://github.com/Piebald-AI/tweakcc) fork — apply with `npx tweakcc --apply` to enable the `archivedFilter` and gauge UI patches in your local Claude Code install.

## Integration

Register the MCP server in `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "context-bonsai": {
      "command": "bun",
      "args": ["run", "/absolute/path/to/tweakcc_context_bonsai/mcp-server/index.ts"]
    }
  }
}
```

Then (optionally) apply the tweakcc patches:

```sh
npx tweakcc --apply
```

The MCP server reads Claude Code's session JSONL at `~/.claude/projects/<project-hash>/<session-id>.jsonl`, performs prune/retrieve operations, and writes archive marker files to `~/.claude/archived-<session-id>.json`. The optional tweakcc patches hide archived ranges from the live transcript and surface the gauge UI.

## Development

```sh
bun install
bun test          # both root + mcp-server tests
bun run typecheck # both packages
```

See `STANDARDS.md` for coding conventions and `docs/e2e-protocol.md` for the end-to-end validation procedure.
