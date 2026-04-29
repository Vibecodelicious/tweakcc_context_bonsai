// retrieve.ts - Retrieve (unarchive) session command implementation
import { retrieveSession } from '../lib/compact';
import { findCurrentSession, findSessionPath } from '../lib/session';
import { getProjectDir, getSessionPath } from '../lib/paths';

/**
 * Prints help text for the retrieve command.
 */
function printRetrieveHelp(): void {
  console.log(`ccsnap retrieve - Restore archived messages by their UUIDs

Usage: ccsnap retrieve --id <uuid> [--id <uuid> ...] [options]

Required:
  --id <uuid>           UUID of a message or summary to retrieve (repeatable)

Session targeting (default: active session for current project):
  --session <uuid>      Target specific session

Other options:
  --dry-run             Preview without changes
  --help, -h            Show this help message

Description:
  Retrieves archived messages by their UUIDs. Pass original message IDs to
  restore individual messages, or a summary ID to restore all messages from
  that summary (and remove the summary message).

  Multiple --id flags can be combined in a single call to retrieve a mix of
  individual messages and summaries atomically.

Examples:
  ccsnap retrieve --id a1b2c3d4-e5f6-7890-abcd-1234567890ab
  ccsnap retrieve --id <msg-uuid> --id <summary-uuid>
  ccsnap retrieve --id <uuid> --session <session-uuid>
  ccsnap retrieve --id <uuid> --dry-run
`);
}

/**
 * Parsed options for the retrieve command.
 */
interface RetrieveOptions {
  ids: string[];
  sessionId?: string;
  dryRun: boolean;
}

/**
 * Parses retrieve command arguments.
 *
 * @param args - Command arguments (after 'retrieve')
 * @returns Parsed options or null if help was requested
 */
function parseRetrieveArgs(args: string[]): RetrieveOptions | null {
  const ids: string[] = [];
  let sessionId: string | undefined;
  let dryRun = false;
  let i = 0;

  while (i < args.length) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      printRetrieveHelp();
      return null;
    }

    if (arg === '--id') {
      if (i + 1 >= args.length) {
        throw new Error('--id requires a UUID argument');
      }
      ids.push(args[i + 1]);
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

  if (ids.length === 0) {
    throw new Error('Missing required argument: --id <uuid>');
  }

  return { ids, sessionId, dryRun };
}

/**
 * Implements the retrieve command.
 * Retrieves (unarchives) messages by their UUIDs.
 *
 * @param args - Command arguments (after 'retrieve')
 */
export async function retrieveCommand(args: string[]): Promise<void> {
  // Parse arguments
  let parsed: RetrieveOptions | null;
  try {
    parsed = parseRetrieveArgs(args);
  } catch (err) {
    console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
    console.error('Run "ccsnap retrieve --help" for usage information.');
    process.exit(1);
  }

  // If help was requested, we already printed it
  if (parsed === null) {
    process.exit(0);
  }

  const { ids, sessionId, dryRun } = parsed;
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

  // Dry run - just preview what would be retrieved
  if (dryRun) {
    console.log('Dry run - no changes made');
    console.log(`Session: ${sessionPath}`);
    console.log(`IDs: ${ids.join(', ')}`);
    process.exit(0);
  }

  // Execute retrieval
  try {
    const result = await retrieveSession(sessionPath, ids);

    // Output JSON for MCP server parsing
    const output = {
      messageCount: result.messageCount,
      ids: result.ids,
      summariesRemoved: result.summariesRemoved,
    };
    console.log(JSON.stringify(output));
  } catch (err) {
    console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}
