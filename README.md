# tweakcc Context Bonsai

Context Bonsai support for Claude Code.

Claude Code is closed-source, so this repo provides the side implementation: a `ccsnap` CLI plus a `context-bonsai` MCP server that can operate on Claude Code session files.

For the shared explanation of Context Bonsai, see the main project README: https://github.com/Vibecodelicious/context-bonsai-agents

## Installation

Install dependencies from this repo:

```sh
bun install
cd mcp-server
bun install
```

Register the MCP server in Claude Code by adding it to `~/.claude/settings.json`:

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

Restart Claude Code after changing MCP settings.

The optional tweakcc patches improve the Claude Code runtime experience by filtering archived messages and surfacing context-pressure guidance in the harness. The core CLI and MCP server can start without those patches, but full in-harness behavior depends on Claude Code being able to hide archived messages from the live context.

## Usage

The MCP server exposes:

- `context-bonsai-prune`
- `context-bonsai-retrieve`

It discovers the active Claude Code session, resolves prune boundaries by unique text patterns, updates the session JSONL, records archive metadata, and appends a summary placeholder. Retrieval restores archived messages from the anchor metadata.

The repo also provides the `ccsnap` CLI for session snapshot and archive operations:

```sh
bun run src/index.ts --help
```

## How This Is Implemented For Claude Code

The MCP server and CLI share TypeScript library code. The MCP server imports the library directly rather than shelling out to the CLI.

Current persistence uses Claude Code's local session layout under `~/.claude`, including session JSONL files in `~/.claude/projects/...` and archive marker files named `~/.claude/archived-<session-id>.json`.

Because Claude Code is not open-source, there is no paired harness repo in this workspace.

## Requirements And Limitations

- Bun is required.
- Claude Code local session files must be available under `~/.claude`.
- Linux-like `/proc` support is used for process-based session discovery.
- Prune uses unique plain-text boundaries; UUID selectors are rejected by the MCP tool.

## Development

See [DEVELOPMENT.md](DEVELOPMENT.md).

```sh
bun test
bun run typecheck
```
