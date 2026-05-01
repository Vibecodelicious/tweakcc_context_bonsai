# Development

This repo contains the Claude Code Context Bonsai side implementation. Claude Code is closed-source, so this repo provides the user-installable side pieces rather than a paired open-source harness checkout.

## Source Of Truth

Shared behavior is defined in the main Context Bonsai spec. Update the spec first for behavior changes, then update this implementation.

Existing historical docs in this repo are not canonical. Use the current TypeScript source, tests, and package metadata as the source of truth.

## Implementation Notes

- `src/index.ts` is the `ccsnap` CLI entrypoint.
- `mcp-server/index.ts` is the MCP stdio server entrypoint.
- `src/lib/compact.ts` contains archive/retrieve mutation logic for Claude Code JSONL sessions.
- `src/lib/paths.ts`, `src/lib/session.ts`, and `src/lib/process.ts` discover Claude Code session files.

The MCP server imports shared library code directly. It does not shell out to the `ccsnap` CLI for prune/retrieve operations.

## Commands

```sh
bun install
bun test
bun run typecheck
```

## Notes

Linux-like `/proc` support is required for process-based session discovery. Some commands fall back to Claude Code history files, but process discovery is still part of the current implementation.

`STANDARDS.md` contains coding standards for this repo.

## References

- Main project README: https://github.com/Vibecodelicious/context-bonsai-agents
- Shared spec: https://github.com/Vibecodelicious/context-bonsai-agents/blob/main/docs/context-bonsai-agent-spec.md
