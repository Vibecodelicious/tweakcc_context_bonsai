// truncate.ts - Truncate snapshot command implementation
import { createInterface } from 'readline';
import { getSnapshot, truncateSnapshot } from '../lib/snapshot';
import { getProjectDir, getSessionPath } from '../lib/paths';
import { createReadStream } from 'fs';

/**
 * Represents a matching line in the JSONL file.
 */
interface LineMatch {
  lineNumber: number;
  content: string;
  preview: string; // Truncated content for display
}

/**
 * Prints help text for the truncate command.
 */
function printTruncateHelp(): void {
  console.log(`ccsnap truncate - Truncate a snapshot to before a matching message

Usage: ccsnap truncate <uuid> <search-string> [options]

Arguments:
  uuid            Snapshot UUID to truncate
  search-string   Text to search for in the snapshot JSONL

Options:
  --first         Use first match automatically (don't prompt)
  --help, -h      Show this help message

Description:
  Finds lines containing the search string in the snapshot's JSONL file.
  If multiple matches are found, prompts for selection (unless --first).
  Truncates the snapshot to the line BEFORE the selected match.

Examples:
  ccsnap truncate abc123 "refactor the authentication"
  ccsnap truncate abc123 "user message" --first
`);
}

/**
 * Parses truncate command arguments.
 *
 * @param args - Command arguments (after 'truncate')
 * @returns Parsed options or null if help was requested
 */
function parseTruncateArgs(
  args: string[]
): { snapshotId: string; searchString: string; first: boolean } | null {
  let snapshotId: string | undefined;
  let searchString: string | undefined;
  let first = false;
  let i = 0;

  while (i < args.length) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      printTruncateHelp();
      return null;
    }

    if (arg === '--first') {
      first = true;
      i++;
      continue;
    }

    // Positional arguments
    if (!arg.startsWith('-')) {
      if (snapshotId === undefined) {
        snapshotId = arg;
      } else if (searchString === undefined) {
        searchString = arg;
      } else {
        throw new Error(`Unexpected argument: ${arg}`);
      }
      i++;
      continue;
    }

    // Unknown flag
    throw new Error(`Unknown option: ${arg}`);
  }

  if (!snapshotId) {
    throw new Error('Missing required argument: snapshot UUID');
  }

  if (!searchString) {
    throw new Error('Missing required argument: search string');
  }

  return { snapshotId, searchString, first };
}

/**
 * Finds all lines containing the search string in the JSONL file.
 *
 * @param jsonlPath - Path to the JSONL file
 * @param searchString - String to search for
 * @returns Array of matching lines with their line numbers
 */
async function findMatchingLines(
  jsonlPath: string,
  searchString: string
): Promise<LineMatch[]> {
  const matches: LineMatch[] = [];

  const stream = createReadStream(jsonlPath);
  const rl = createInterface({
    input: stream,
    crlfDelay: Infinity,
  });

  let lineNumber = 0;

  for await (const line of rl) {
    lineNumber++;
    const trimmed = line.trim();

    if (trimmed === '') {
      continue;
    }

    if (trimmed.includes(searchString)) {
      // Create a preview - truncate to 80 chars
      const preview =
        trimmed.length > 80 ? trimmed.slice(0, 77) + '...' : trimmed;

      matches.push({
        lineNumber,
        content: trimmed,
        preview,
      });
    }
  }

  stream.close();

  return matches;
}

/**
 * Extracts a meaningful label from a JSONL line for display.
 * Tries to extract the message content or type for user-friendly output.
 *
 * @param jsonLine - Raw JSON line
 * @returns Human-readable label
 */
function extractMessageLabel(jsonLine: string): string {
  try {
    const obj = JSON.parse(jsonLine);

    // For user messages, show the content
    if (obj.type === 'user' && obj.message?.content) {
      const content =
        typeof obj.message.content === 'string'
          ? obj.message.content
          : JSON.stringify(obj.message.content);
      return `[user] ${content.slice(0, 60)}${content.length > 60 ? '...' : ''}`;
    }

    // For assistant messages, show type + model
    if (obj.type === 'assistant') {
      const model = obj.message?.model || 'unknown';
      return `[assistant] response (${model})`;
    }

    // For other types, show the type
    if (obj.type) {
      return `[${obj.type}]`;
    }

    return jsonLine.slice(0, 60) + (jsonLine.length > 60 ? '...' : '');
  } catch {
    return jsonLine.slice(0, 60) + (jsonLine.length > 60 ? '...' : '');
  }
}

/**
 * Prompts the user to select from multiple matches.
 *
 * @param matches - Array of matching lines
 * @returns Selected line number or null if cancelled
 */
async function promptForSelection(matches: LineMatch[]): Promise<number | null> {
  console.log(`\nFound ${matches.length} matches:\n`);

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const label = extractMessageLabel(match.content);
    console.log(`  ${i + 1}. Line ${match.lineNumber}: ${label}`);
  }

  console.log('');

  // Use readline for interactive input
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(
      `Select match (1-${matches.length}) or 'q' to cancel: `,
      (answer) => {
        rl.close();

        if (answer.toLowerCase() === 'q' || answer.toLowerCase() === 'quit') {
          resolve(null);
          return;
        }

        const num = parseInt(answer, 10);
        if (isNaN(num) || num < 1 || num > matches.length) {
          console.error('Invalid selection.');
          resolve(null);
          return;
        }

        resolve(matches[num - 1].lineNumber);
      }
    );
  });
}

/**
 * Implements the truncate command.
 * Truncates a snapshot to the line before a matching message.
 *
 * @param args - Command arguments (after 'truncate')
 */
export async function truncateCommand(args: string[]): Promise<void> {
  // Parse arguments
  let parsed: { snapshotId: string; searchString: string; first: boolean } | null;
  try {
    parsed = parseTruncateArgs(args);
  } catch (err) {
    console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
    console.error('Run "ccsnap truncate --help" for usage information.');
    process.exit(1);
  }

  // If help was requested, we already printed it
  if (parsed === null) {
    process.exit(0);
  }

  const { snapshotId, searchString, first } = parsed;
  const projectPath = process.cwd();

  // Validate snapshot exists
  const snapshot = await getSnapshot(projectPath, snapshotId);
  if (!snapshot) {
    console.error(`Error: Snapshot not found: ${snapshotId}`);
    process.exit(2);
  }

  // Get path to the snapshot's JSONL file
  const projectDir = getProjectDir(projectPath);
  const jsonlPath = getSessionPath(projectDir, snapshotId);

  // Find matching lines
  const matches = await findMatchingLines(jsonlPath, searchString);

  if (matches.length === 0) {
    console.error(`Error: No lines found containing: "${searchString}"`);
    process.exit(1);
  }

  // Determine which line to truncate before
  let targetLine: number;

  if (matches.length === 1 || first) {
    // Use first match
    targetLine = matches[0].lineNumber;
    const label = extractMessageLabel(matches[0].content);
    console.log(`Found match at line ${targetLine}: ${label}`);
  } else {
    // Prompt user to select
    const selected = await promptForSelection(matches);
    if (selected === null) {
      console.log('Operation cancelled.');
      process.exit(4);
    }
    targetLine = selected;
  }

  // Validate we're not truncating before line 1
  if (targetLine <= 1) {
    console.error(
      'Error: Cannot truncate before line 1. The snapshot would be empty.'
    );
    process.exit(1);
  }

  // Truncate to the line BEFORE the match
  const beforeLine = targetLine - 1;

  try {
    const updated = await truncateSnapshot(projectPath, snapshotId, beforeLine);
    console.log(`\nSnapshot truncated successfully!`);
    console.log(`  UUID:        ${updated.uuid}`);
    console.log(`  Lines:       ${updated.lineCount}`);
    console.log(`  Truncated:   ${updated.truncatedAt}`);
  } catch (err) {
    console.error(
      `Error: Failed to truncate snapshot: ${err instanceof Error ? err.message : String(err)}`
    );
    process.exit(1);
  }
}
