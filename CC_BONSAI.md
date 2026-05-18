# CC Bonsai: Shipping Context Compaction

## What This Is

A context management system for Claude Code. Three pieces working together:

1. **tweakcc 4.0 apply harness + patches** — Patch the active Claude Code install through tweakcc's programmatic API so archived messages are removed from model-facing context and model-visible message tags can be injected when compaction mode is enabled
2. **MCP server** — Two tools (`context-bonsai-prune`, `context-bonsai-retrieve`) the LLM calls to manage its own context
3. **ccsnap CLI** — The engine that reads/writes Claude Code's JSONL session files

A user hits their 200k context limit, the LLM compacts old messages into a summary, and retrieves specific ones later when needed. The patches keep the runtime and model context aligned; the MCP tools make it callable; ccsnap makes it work.

## Current State

### Done

| Component | Status | Location |
|-----------|--------|----------|
| ccsnap CLI | Working | `src/` — 39 tests passing |
| MCP server | Working | `mcp-server/index.ts` |
| tweakcc 4.0 foundation | In progress | `apply/`, `patches/` |
| retrieve-by-anchor workflow | Complete | Commits `a8ac1db`, `11fe35d` on main |
| Orchestration review loops | Complete | Both stories APPROVED AS-IS |

### Not Done

| Step | Blocks | Effort | Notes |
|------|--------|--------|-------|
| Real patch transforms | Context reduction | Stories 4-6 | `archived-filter`, `message-content-ids`, and `context-bonsai-gauge` plug into `patches/registry.ts` |
| MCP fail-closed guard | Safe prune behavior | Story 7 | Prune must check the running Claude Code executable for the archived-filter sentinel before writing archives |
| Native end-to-end test | Release confidence | Story 8 | Apply the documented flow to a native install copy and prove a prune reduces model-facing context |
| Operator docs | End users | Story 9 | Publish final install, verify, restore, and auto-update guidance |

## Shipping Sequence

```
Step 1: Apply harness foundation
   │
   ├── Step 2: Add resilient discovery
   │      │
   │      └── Step 3: Add the three patch transforms
   │             │
   │             └── Step 4: Refresh MCP/ccsnap patch awareness
   │                    │
   │                    └── Step 5: Native end-to-end verification and operator docs
```

The current shipping path is self-contained in this repo: `bun run apply` detects the Claude Code installation, creates a backup, reads content once, composes registered patch transforms in order, writes once, and verifies sentinels. `bun run apply:restore` restores from the backup.

## Step 1: Apply Harness Foundation

The harness uses published tweakcc 4.0.x directly:

```bash
bun install
bun run apply
bun run apply:restore
```

Patch modules are normal TypeScript transforms registered in `patches/registry.ts`. They are not independent `tweakcc adhoc-patch` CLI calls; separate CLI calls would re-read pristine content and would not provide the one-backup, one-read, one-write composition guarantee this port needs.

## Step 2: Package ccsnap

Planned as Story 2 of the distribution epic. The plan is at:
`.agents/plans/epic-distribute-context-compaction/story-distribute-context-compaction.2-ccsnap-repo.md`

Summary:
- Create `Vibecodelicious/ccsnap` GitHub repo
- Copy `src/` and `mcp-server/` from the_observer (exclude tweakcc submodule, .agents/, extracted-cli files)
- Write a README covering installation, tweakcc config, MCP registration, and the two-phase compaction workflow
- MIT license
- Verify `bun install && bun run src/index.ts --help` works from fresh clone

This is ready to orchestrate whenever you want.

## Step 3: Smoke Test

Before calling it shipped, test the full workflow in a real Claude Code session:

1. Apply Context Bonsai patches with `bun run apply`
2. Register MCP server in `~/.claude.json` (Story 7 verified top-level and per-project `mcpServers` maps in current Claude Code 2.1.x)
3. Start a Claude Code session, generate some conversation
4. Ask Claude to prune a uniquely bounded message range with `context-bonsai-prune`
5. Verify archived messages disappear from the UI
6. Ask Claude to retrieve the archived range by `anchor_id`
7. Verify the message reappears

## Step 4: Auto-Update Handling

Claude Code updates replace the executable and remove embedded sentinels. The apply harness reports a reverted-after-update state when a previous backup exists but patch sentinels are absent, and the MCP prune path must fail closed until `bun run apply` is rerun.

## Risk Register

| Risk | Impact | Mitigation |
|------|--------|------------|
| tweakcc API drift | Apply harness breaks | Keep the typed wrapper in `apply/tweakcc-api.ts` small and validate against tweakcc 4.0.x |
| Claude Code update breaks minification patterns | Patches stop working | `findRuntimeHelpers()` dynamically discovers names; regex patterns cover known variants |
| Session file format changes | ccsnap breaks | JSONL format has been stable; types.ts defines the contract |
| `/proc` dependency (Linux-only) | No macOS support for `ps`/`switch` | MCP server session discovery has `/proc` fallback to `history.jsonl`; snapshot features are Linux-only for now |

## File Map

```
the_observer/
├── src/                          # ccsnap CLI
│   ├── index.ts                  # Entry point, command routing
│   ├── commands/                 # Command handlers (create, list, switch, compact, retrieve, ps, truncate)
│   ├── lib/
│   │   ├── compact.ts            # Core compaction engine (archive, summarize, retrieve)
│   │   ├── session.ts            # JSONL session file I/O
│   │   ├── snapshot.ts           # Snapshot creation/switching via procfs
│   │   ├── paths.ts              # Claude Code directory resolution
│   │   └── *.test.ts             # Tests
│   └── types.ts                  # Message type definitions
├── mcp-server/
│   └── index.ts                  # MCP server (context-bonsai-prune, context-bonsai-retrieve)
├── apply/                        # tweakcc 4.0 API wrapper and apply/restore harness
├── patches/                      # Ordered Context Bonsai patch transforms
└── .agents/plans/                # Story plans (not shipped)
```

## IPC Between Components

```
                    MCP Server
                   /          \
        creates   /            \  shells out to
                 v              v
   ~/.claude/compaction-mode-<session>     ccsnap compact/retrieve
        (marker file)                          |
                 |                             v
                 |                    ~/.claude/projects/<hash>/<session>.jsonl
                 v                        (session data)
    messageContentIds patch                     |
    (reads marker, injects IDs for the model)   v
                                    ~/.claude/archived-<session>.json
                                        (archived UUID list)
                                               |
                                               v
                                    archivedFilter patch
                                    (reads list, hides messages)
```

## TL;DR

1. Build the tweakcc 4.0 apply harness
2. Add resilient discovery and the three patch transforms
3. Refresh MCP fail-closed behavior
4. Smoke test the full native workflow

The old external-review path is gone; Context Bonsai now owns its patch modules and composes them through published tweakcc 4.0 APIs.
