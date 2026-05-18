#!/usr/bin/env bun
/**
 * ccsnap - Claude Code Session Snapshot Tool
 *
 * Manages snapshots of Claude Code sessions for checkpoint/restore functionality.
 */

import { createCommand } from './commands/create';
import { listCommand } from './commands/list';
import { switchCommand } from './commands/switch';
import { psCommand } from './commands/ps';
import { truncateCommand } from './commands/truncate';
import { compactCommand } from './commands/compact';
import { retrieveCommand } from './commands/retrieve';

const VERSION = "0.1.1";

function printUsage(): void {
  console.log(`ccsnap v${VERSION} - Claude Code Session Snapshot Tool

Usage: ccsnap <command> [options]

Commands:
  create [label]         Create a snapshot from current session
  list                   List all snapshots for this project
  switch <uuid>          Switch to a snapshot (kills current CC session)
  truncate <uuid> <str>  Truncate snapshot to before matching message
  compact                Compact session by archiving message range
  retrieve               Retrieve archived messages by UUID
  ps                     List Claude processes for this project
  show <uuid>            Show snapshot details

Global Flags:
  --help, -h             Show help for command
  --version, -v          Show tool version
  --force                Skip confirmation prompts
  --quiet                Suppress non-error output

Examples:
  ccsnap create "before refactor"
  ccsnap list
  ccsnap switch abc123
  ccsnap truncate abc123 "search text"
  ccsnap compact --from <uuid> --to <uuid>
  ccsnap retrieve --id <uuid>
`);
}

function printVersion(): void {
  console.log(`ccsnap v${VERSION}`);
}

async function main(): Promise<void> {
  const args = Bun.argv.slice(2); // Remove 'bun' and script path

  // Handle global flags (only when they are the first/only argument)
  if (args.length === 0) {
    printUsage();
    process.exit(0);
  }

  if (args[0] === "--help" || args[0] === "-h") {
    printUsage();
    process.exit(0);
  }

  if (args[0] === "--version" || args[0] === "-v") {
    printVersion();
    process.exit(0);
  }

  const command = args[0];
  const commandArgs = args.slice(1);

  // Route to command handlers
  // Requires: Story 0.2+ for actual implementations
  switch (command) {
    case "create":
      await createCommand(commandArgs);
      break;

    case "list":
      await listCommand(commandArgs);
      break;

    case "switch":
      await switchCommand(commandArgs);
      break;

    case "truncate":
      await truncateCommand(commandArgs);
      break;

    case "compact":
      await compactCommand(commandArgs);
      break;

    case "retrieve":
      await retrieveCommand(commandArgs);
      break;

    case "ps":
      await psCommand(commandArgs);
      break;

    case "show":
      // Integrate in: Story 2.x - Show command implementation
      console.log("show command - not yet implemented");
      console.log("Args:", commandArgs);
      process.exit(1);

    default:
      console.error(`Unknown command: ${command}`);
      console.error('Run "ccsnap --help" for usage information.');
      process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err.message);
  process.exit(1);
});
