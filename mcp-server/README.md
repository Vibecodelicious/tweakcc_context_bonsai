# Context Bonsai MCP Server

> **Note:** Throughout this document, `<INSTALL_DIR>` should be replaced with the actual path where you cloned or installed this project (e.g., `/home/user/projects/the_observer`).

An MCP (Model Context Protocol) server that enables Claude Code to manage its own conversation context through selective archival and restoration.

## Overview

This MCP server provides two bonsai tools:

1. **`context-bonsai-prune`** - Archives one contiguous range resolved by unique `from_pattern` / `to_pattern`, storing summary metadata on the anchor message.

2. **`context-bonsai-retrieve`** - Restores an archived range using only `anchor_id`.

The server automatically discovers the current Claude Code session using procfs (Linux) to find the parent process and extract session information.

## Prerequisites

Before using this MCP server, ensure:

1. **Bun runtime** - The server runs with Bun (`bun` command must be available)

2. **tweakcc patches** (optional but recommended) - For full functionality, apply these tweakcc patches to Claude Code:
   - `archivedFilter` - Enables Claude Code to filter archived messages from the visible conversation context
   - `contextBonsaiGauge` - Injects context-pressure reminders into Claude's live runtime flow

   Apply patches with:
   ```bash
   cd <INSTALL_DIR>/tweakcc
   npx tweakcc --apply
   ```

## Installation

```bash
cd <INSTALL_DIR>/mcp-server
bun install
```

## Registration

Add the server to your Claude Code settings at `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "context-bonsai": {
      "command": "bun",
      "args": ["run", "<INSTALL_DIR>/mcp-server/index.ts"]
    }
  }
}
```

After adding the configuration, restart Claude Code for the MCP server to be loaded.

## Usage

### Pruning

Call `context-bonsai-prune` with:

- `from_pattern` - unique plain-text pattern matching the first message in the range
- `to_pattern` - unique plain-text pattern matching the last message in the range
- `summary` - non-empty model-authored summary
- `index_terms` - non-empty array of semantic index terms
- `reason` - optional

The tool will:
1. Load the active session
2. Resolve both boundaries uniquely by plain-text pattern match
3. Mark the inclusive range archived in the session JSONL
4. Write anchor metadata used for later retrieval
5. Append a placeholder summary message
6. Update the archived marker file used by the `archivedFilter` tweakcc patch

### Retrieving Archived Content

If you need to restore previously archived messages, use `context-bonsai-retrieve` with the anchor UUID:

```
Use context-bonsai-retrieve with:
- anchor_id: f8a9b0c1-d2e3-4567-89ab-cdef01234567
```

## How It Works

### Session Discovery

The MCP server discovers the current Claude Code session by:

1. Walking the parent-process chain from the MCP server process
2. Reading `/proc/<pid>/cmdline` to look for a resumed session id
3. Falling back to cwd-based session lookup when needed

### Architecture

```
Claude Code (with tweakcc patches applied)
    |
    +-- contextBonsaiGauge patch: Injects context-pressure reminders
    +-- archivedFilter patch: Hides archived messages from view
    |
    +-- MCP Server (this)
            |
            +-- context-bonsai-prune: Rewrites active session JSONL + archive metadata
            |
            +-- context-bonsai-retrieve: Restores archived range from anchor metadata
```

## Troubleshooting

### "Could not discover session ID"

This error occurs when the MCP server cannot determine which Claude Code session is active.

**Causes:**
- The parent process is not Claude Code
- The Claude Code process doesn't have `--resume` in its cmdline (fresh session)
- No matching entry found in `~/.claude/history.jsonl` for the current project

**Solutions:**
1. Ensure you're running Claude Code in a project directory that has been used before
2. Check that `~/.claude/history.jsonl` exists and contains entries for your project
3. If the session was just created, try sending a message first to establish history

### "ccsnap not found" or compaction errors

The MCP server expects ccsnap to be available at the relative path `../src/index.ts` from the mcp-server directory.

**Solutions:**
1. Ensure you're running from the correct project structure
2. Check that `<INSTALL_DIR>/src/index.ts` exists
3. Run `bun install` in the root project directory if dependencies are missing

### Archived messages still visible

This requires the `archivedFilter` tweakcc patch to be applied to Claude Code.

**Solutions:**
1. Apply tweakcc patches: `cd tweakcc && npx tweakcc --apply`
2. Restart Claude Code after applying patches
3. Verify `archivedFilter` applied successfully

### "Invalid range" or pattern not found errors

**Causes:**
- The pattern text does not uniquely match the intended messages
- The `to_pattern` resolves before `from_pattern`
- One or both patterns do not appear in the searchable session text

**Solutions:**
1. Use more specific plain-text boundary patterns
2. Ensure `from_pattern` refers to the earlier message and `to_pattern` to the later one
3. Retry with exact visible text from the target messages

## Tool Reference

### context-bonsai-prune

Archive one contiguous range using plain-text boundary patterns.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `from_pattern` | string | Yes | Unique plain-text pattern matching the first message in the range |
| `to_pattern` | string | Yes | Unique plain-text pattern matching the last message in the range |
| `summary` | string | Yes | Non-empty model-authored summary of archived content |
| `index_terms` | string[] | Yes | Non-empty semantic index terms |
| `reason` | string | No | Description of why this content is being archived |

**Returns:**
- Confirmation with the archived anchor id

### context-bonsai-retrieve

Restore an archived range from its anchor metadata.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `anchor_id` | string | Yes | UUID of the archived anchor message |

**Returns:** Confirmation with the restored anchor id
