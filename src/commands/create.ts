// create.ts - Create snapshot command implementation
import { createSnapshot } from '../lib/snapshot';

/**
 * Prints help text for the create command.
 */
function printCreateHelp(): void {
  console.log(`ccsnap create - Create a snapshot from current or specified session

Usage: ccsnap create [options] <label>

Arguments:
  label                  Human-readable label for the snapshot (required)

Options:
  --session <uuid>       Snapshot a specific session instead of current
  --help, -h             Show this help message

Examples:
  ccsnap create "before refactor"
  ccsnap create --session abc123 "checkpoint"
`);
}

/**
 * Parses create command arguments.
 *
 * @param args - Command arguments (after 'create')
 * @returns Parsed options or null if help was requested
 */
function parseCreateArgs(args: string[]): { label: string; sessionId?: string } | null {
  let sessionId: string | undefined;
  let label: string | undefined;
  let i = 0;

  while (i < args.length) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      printCreateHelp();
      return null;
    }

    if (arg === '--session') {
      if (i + 1 >= args.length) {
        throw new Error('--session requires a UUID argument');
      }
      sessionId = args[i + 1];
      i += 2;
      continue;
    }

    // Positional argument - should be the label
    if (!arg.startsWith('-')) {
      if (label !== undefined) {
        throw new Error(`Unexpected argument: ${arg}`);
      }
      label = arg;
      i++;
      continue;
    }

    // Unknown flag
    throw new Error(`Unknown option: ${arg}`);
  }

  if (!label) {
    throw new Error('Missing required argument: label');
  }

  return { label, sessionId };
}

/**
 * Implements the create command.
 * Creates a snapshot of the current or specified session.
 *
 * @param args - Command arguments (after 'create')
 */
export async function createCommand(args: string[]): Promise<void> {
  // Parse arguments
  let parsed: { label: string; sessionId?: string } | null;
  try {
    parsed = parseCreateArgs(args);
  } catch (err) {
    console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
    console.error('Run "ccsnap create --help" for usage information.');
    process.exit(1);
  }

  // If help was requested, we already printed it
  if (parsed === null) {
    process.exit(0);
  }

  const { label, sessionId } = parsed;
  const projectPath = process.cwd();

  try {
    const metadata = await createSnapshot(projectPath, label, sessionId);
    console.log(`Snapshot created successfully!`);
    console.log(`  UUID:  ${metadata.uuid}`);
    console.log(`  Label: ${metadata.label}`);
    console.log(`  Lines: ${metadata.lineCount}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    // Provide user-friendly error messages for common cases
    if (message.includes('No session found for project')) {
      console.error(
        `Error: No session history for project at ${projectPath}. Start a Claude session in this directory first.`
      );
      process.exit(2);
    }

    if (message.includes('Session file not found')) {
      console.error(`Error: Session file not found. The session may have been deleted.`);
      process.exit(2);
    }

    // Generic error
    console.error(`Error: ${message}`);
    process.exit(1);
  }
}
