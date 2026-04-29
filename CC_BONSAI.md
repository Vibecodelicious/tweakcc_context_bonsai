# CC Bonsai: Shipping Context Compaction

## What This Is

A context management system for Claude Code. Three pieces working together:

1. **tweakcc patches** — Hide archived messages and inject model-visible message tags when compaction mode is enabled
2. **MCP server** — Two tools (`context-bonsai-prune`, `context-bonsai-retrieve`) the LLM calls to manage its own context
3. **ccsnap CLI** — The engine that reads/writes Claude Code's JSONL session files

A user hits their 200k context limit, the LLM compacts old messages into a summary, and retrieves specific ones later when needed. The patches keep the runtime and model context aligned; the MCP tools make it callable; ccsnap makes it work.

## Current State

### Done

| Component | Status | Location |
|-----------|--------|----------|
| ccsnap CLI | Working | `src/` — 39 tests passing |
| MCP server | Working | `mcp-server/index.ts` |
| tweakcc patches | Working, reviewed | `tweakcc/` — 4 commits on `context-compaction-patches` |
| retrieve-by-anchor workflow | Complete | Commits `a8ac1db`, `11fe35d` on main |
| Orchestration review loops | Complete | Both stories APPROVED AS-IS |

### Not Done

| Step | Blocks | Effort | Notes |
|------|--------|--------|-------|
| Push tweakcc branch + create PR | ccsnap README | 5 min | Ready now. Branch, fork, commits all set. |
| Get tweakcc PR merged | End users | Unknown | Depends on Piebald-AI maintainer review |
| Create `Vibecodelicious/ccsnap` repo | End users | ~2 hrs | Story 2 planned at `.agents/plans/epic-distribute-context-compaction/story-distribute-context-compaction.2-ccsnap-repo.md` |
| End-to-end smoke test | Confidence | ~30 min | Compact + retrieve in a live session |

## Shipping Sequence

```
Step 1: Push tweakcc PR          ← you can do this right now
   │
   ├── Step 2: Create ccsnap repo   ← can start immediately (README links to PR)
   │      │
   │      └── Step 3: Smoke test    ← fresh clone, install, test the workflow
   │
   └── Step 4: PR gets merged       ← external dependency (Piebald-AI review)
          │
          └── Step 5: Users can install ← tweakcc ships patches, ccsnap ships tools
```

Steps 1 and 2 are in your control. Step 4 is not.

## Step 1: Push tweakcc PR

Everything is ready. Four commits on `context-compaction-patches` in the tweakcc submodule:

```
af7c181 Add archived message filter patch
dda426a Add archived/context compaction patches
94a9461 Add message content ID injection patch
84d94f0 [Story] Fix misleading message-ids patch description
```

Fork remote (`Vibecodelicious/tweakcc`) is configured. To ship:

```bash
cd ~/projects/the_observer/tweakcc
git push fork context-compaction-patches
gh pr create --repo Piebald-AI/tweakcc \
  --head Vibecodelicious:context-compaction-patches \
  --base main \
  --title "Add context compaction patches" \
  --body "..."
```

The PR body and commit messages are already written in the story plan. I can do this for you on command.

**Decision point:** The branch has 4 commits (3 feature + 1 description fix). You may want to squash the fix into commit 2 with `git rebase -i` before pushing, so the PR has exactly 3 clean commits as originally planned. Or ship 4 — the fix commit is small and self-explanatory.

## Step 2: Create ccsnap Repo

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

1. Apply tweakcc patches (`enableContextCompaction: true`, `enableArchivedFilter: true`)
2. Register MCP server in `~/.claude/settings.json`
3. Start a Claude Code session, generate some conversation
4. Ask Claude to prune a uniquely bounded message range with `context-bonsai-prune`
5. Verify archived messages disappear from the UI
6. Ask Claude to retrieve the archived range by `anchor_id`
7. Verify the message reappears

## Step 4: tweakcc PR Merge

External dependency. Things that help it merge:
- Each commit is independently buildable (`npm run build` passes)
- Zero impact on existing users (config flags off by default)
- Clean diffs (purely additive, 0 lines removed from existing files)
- Tests included for the complex patches
- `findRuntimeHelpers()` handles version-independent minification discovery

If Piebald-AI wants changes, that's a new review cycle in the tweakcc submodule.

## Risk Register

| Risk | Impact | Mitigation |
|------|--------|------------|
| tweakcc PR rejected or stalls | Can't distribute patches | Patches still work locally; users could apply manually |
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
├── tweakcc/                      # Submodule: Piebald-AI/tweakcc fork
│   └── src/patches/
│       ├── archivedFilter.ts     # Hide archived messages from UI
│       ├── messageContentIds.ts  # Inject [msg:<uuid>] into model-visible context
│       └── helpers.ts            # findRuntimeHelpers() addition
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

1. Push the tweakcc PR (5 min, ready now)
2. Create the ccsnap repo (orchestrate Story 2)
3. Smoke test the full workflow
4. Wait for tweakcc merge

You're closer than it feels. The hard engineering is done.
