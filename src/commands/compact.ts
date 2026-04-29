// compact.ts - Compact session command implementation
import { compactSession } from '../lib/compact';
import { findCurrentSession, findSessionPath, getMessageRange } from '../lib/session';
import { getProjectDir, getSessionPath } from '../lib/paths';

/**
 * Prints help text for the compact command.
 */
function printCompactHelp(): void {
  console.log(`ccsnap compact - Compact a session by archiving a message range

Usage: ccsnap compact --from <uuid> --to <uuid> [options]

Range specification (by full message UUID):
  --from <uuid>         Start of range (inclusive)
  --to <uuid>           End of range (inclusive)

Session targeting (default: active session for current project):
  --session <uuid>      Target specific session

Options:
  --no-summary          Skip LLM summary generation
  --dry-run             Preview without changes
  --help, -h            Show this help message

Description:
  Archives messages in the specified UUID range and generates a summary.
  The summary replaces the archived messages in Claude's context window.
  Original messages are marked as archived but preserved in the JSONL.

Examples:
  ccsnap compact --from a1b2c3d4-e5f6-7890-abcd-1234567890ab --to e5f6g7h8-b9c0-1234-efab-5678901234ef
  ccsnap compact --from <uuid> --to <uuid> --no-summary
  ccsnap compact --from <uuid> --to <uuid> --dry-run
`);
}

/**
 * Parsed options for the compact command.
 */
interface CompactOptions {
  fromUuid: string;
  toUuid: string;
  sessionId?: string;
  noSummary: boolean;
  dryRun: boolean;
}

/**
 * Parses compact command arguments.
 *
 * @param args - Command arguments (after 'compact')
 * @returns Parsed options or null if help was requested
 */
function parseCompactArgs(args: string[]): CompactOptions | null {
  let fromUuid: string | undefined;
  let toUuid: string | undefined;
  let sessionId: string | undefined;
  let noSummary = false;
  let dryRun = false;
  let i = 0;

  while (i < args.length) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      printCompactHelp();
      return null;
    }

    if (arg === '--from') {
      if (i + 1 >= args.length) {
        throw new Error('--from requires a UUID argument');
      }
      fromUuid = args[i + 1];
      i += 2;
      continue;
    }

    if (arg === '--to') {
      if (i + 1 >= args.length) {
        throw new Error('--to requires a UUID argument');
      }
      toUuid = args[i + 1];
      i += 2;
      continue;
    }

    if (arg === '--session') {
      if (i + 1 >= args.length) {
        throw new Error('--session requires a UUID argument');
      }
      sessionId = args[i + 1];
      i += 2;
      continue;
    }

    if (arg === '--no-summary') {
      noSummary = true;
      i++;
      continue;
    }

    if (arg === '--dry-run') {
      dryRun = true;
      i++;
      continue;
    }

    // Unknown flag or unexpected positional argument
    if (arg.startsWith('-')) {
      throw new Error(`Unknown option: ${arg}`);
    } else {
      throw new Error(`Unexpected argument: ${arg}`);
    }
  }

  if (!fromUuid) {
    throw new Error('Missing required argument: --from <uuid>');
  }

  if (!toUuid) {
    throw new Error('Missing required argument: --to <uuid>');
  }

  return { fromUuid, toUuid, sessionId, noSummary, dryRun };
}

/**
 * Implements the compact command.
 * Compacts a session by archiving a range of messages and generating a summary.
 *
 * @param args - Command arguments (after 'compact')
 */
export async function compactCommand(args: string[]): Promise<void> {
  // Parse arguments
  let parsed: CompactOptions | null;
  try {
    parsed = parseCompactArgs(args);
  } catch (err) {
    console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
    console.error('Run "ccsnap compact --help" for usage information.');
    process.exit(1);
  }

  // If help was requested, we already printed it
  if (parsed === null) {
    process.exit(0);
  }

  const { fromUuid, toUuid, sessionId, noSummary, dryRun } = parsed;
  const projectPath = process.cwd();

  // Resolve session path
  let sessionPath: string;

  if (sessionId) {
    // Session explicitly specified - find it by UUID
    try {
      sessionPath = await findSessionPath(sessionId);
    } catch (err) {
      console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(2);
    }
  } else {
    // No session specified - find active session for current project
    const session = await findCurrentSession(projectPath);
    if (!session) {
      console.error(
        `Error: No active session found for project at ${projectPath}. Use --session to specify one.`
      );
      process.exit(2);
    }
    const projectDir = getProjectDir(projectPath);
    sessionPath = getSessionPath(projectDir, session.sessionId);
  }

  // Dry run - just preview the range
  if (dryRun) {
    try {
      const range = await getMessageRange(sessionPath, fromUuid, toUuid);
      console.log('Dry run - no changes made');
      console.log(`Session: ${sessionPath}`);
      console.log(`From: ${fromUuid} (index ${range.fromIndex})`);
      console.log(`To: ${toUuid} (index ${range.toIndex})`);
      console.log(`Messages in range: ${range.messages.length}`);

      // Show message type breakdown
      const typeCounts: Record<string, number> = {};
      for (const msg of range.messages) {
        typeCounts[msg.type] = (typeCounts[msg.type] || 0) + 1;
      }
      console.log('Message types:', JSON.stringify(typeCounts));

      process.exit(0);
    } catch (err) {
      console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }
  }

  // Execute compaction
  try {
    const result = await compactSession(sessionPath, fromUuid, toUuid, {
      skipSummary: noSummary,
    });

    // Output JSON for MCP server parsing
    const output = {
      messageCount: result.messageCount,
      summary: result.summary,
      summaryUuid: result.summaryUuid,
    };
    console.log(JSON.stringify(output));
  } catch (err) {
    console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}
