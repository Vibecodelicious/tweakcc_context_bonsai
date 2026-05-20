# tweakcc Context Bonsai

Context Bonsai support for Claude Code through a local MCP server and optional runtime patches applied via [tweakcc](https://github.com/Piebald-AI/tweakcc), a third-party tool for customizing Claude Code's bundled runtime files.

Claude Code is closed-source, so this repo provides the side implementation: a `ccsnap` CLI plus a `context-bonsai` MCP server that can operate on Claude Code session files.

For the shared explanation of Context Bonsai, see the main project README: https://github.com/Vibecodelicious/context-bonsai-agents

## Installation

### Prerequisites

- Bun. Confirm with `bun --version`.
- Claude Code installed and signed in.
- Linux-like `/proc` support for process-based active-session discovery.

Install dependencies from this repo:

```sh
bun install
cd mcp-server
bun install
cd ..
```

Register the MCP server in Claude Code by adding it to `~/.claude.json`:

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

### Optional: apply tweakcc runtime patches

The MCP server can mutate Claude Code session files on its own. Full in-harness behavior also needs the tweakcc runtime patch so archived messages are filtered from provider-bound context and context-pressure guidance is surfaced inside Claude Code.

Apply the patch from this repo:

```sh
cd /absolute/path/to/tweakcc_context_bonsai
bun run apply
```

To restore Claude Code's original runtime files later:

```sh
cd /absolute/path/to/tweakcc_context_bonsai
bun run apply:restore
```

### Verify the MCP server loaded

Start Claude Code from a project directory and ask:

```text
list your tools
```

The response should include the MCP-prefixed tools `mcp__context-bonsai__context-bonsai-prune` and `mcp__context-bonsai__context-bonsai-retrieve`. If those names are missing, check that `bun` is on `PATH` and that the script path in `args` is absolute and points at this checkout.

## Usage

The MCP server exposes:

- `context-bonsai-prune`
- `context-bonsai-retrieve`

It discovers the active Claude Code session, resolves prune boundaries by unique text patterns, updates the session JSONL, records archive metadata, and appends a summary placeholder. Retrieval restores archived messages from the anchor metadata.

The repo also provides the `ccsnap` CLI for session snapshot and archive operations:

```sh
bun run src/index.ts --help
```

## Security Disclosure

- **What the integration reads.** Claude Code session JSONL files under `~/.claude/projects/...` and Claude Code process information needed to discover the active session.
- **Where archive state persists on disk.** Archive flags and placeholders are written to the active Claude Code session JSONL. Marker files named `~/.claude/archived-<session-id>.json` track archived message ids for the runtime patch.
- **What is transmitted to the LLM provider.** Placeholder summaries and index terms remain in the active transcript and can be sent to the model. Archived original messages are hidden from active context when the runtime patch is applied, and become visible again after retrieval.
- **Network egress.** The MCP server and CLI do not initiate model-provider network calls separately from Claude Code.

## Uninstall

1. Remove the `context-bonsai` MCP server entry from `~/.claude.json`.
2. Restart Claude Code.
3. Optional: delete marker files matching `~/.claude/archived-*.json` if you do not need to preserve archive state for old sessions.

## How This Is Implemented For Claude Code

The MCP server and CLI share TypeScript library code. The MCP server imports the library directly rather than shelling out to the CLI.

Current persistence uses Claude Code's local session layout under `~/.claude`, including session JSONL files in `~/.claude/projects/...` and archive marker files named `~/.claude/archived-<session-id>.json`.

Because Claude Code is not open-source, there is no paired harness repo in this workspace.

## Requirements And Limitations

- Claude Code local session files must be available under `~/.claude`.
- Retrieval restores archived JSONL rows in their original transcript positions, but immediate same-turn visibility depends on Claude Code's in-memory transcript handling.

## Development

See [DEVELOPMENT.md](DEVELOPMENT.md).

```sh
bun test
bun run typecheck
```
