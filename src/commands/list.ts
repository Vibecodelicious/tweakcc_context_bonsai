// list.ts - List command for displaying snapshots
import { listSnapshots } from '../lib/snapshot';
import type { SnapshotMetadata } from '../types';

/**
 * Displays help for the list command.
 */
function printHelp(): void {
  console.log(`ccsnap list - List all snapshots for the current project

Usage: ccsnap list [options]

Options:
  --help, -h    Show this help message

Description:
  Lists all snapshots for the current project directory.
  Snapshots are displayed in reverse chronological order (newest first).

Output format:
  UUID        Label                Created              Lines
  ────────────────────────────────────────────────────────────
  abc123...   before refactor      2026-02-04 10:30     1,234

Examples:
  ccsnap list
`);
}

/**
 * Formats a number with thousands separators.
 *
 * @param num - Number to format
 * @returns Formatted string with commas (e.g., "1,234")
 */
function formatNumber(num: number): string {
  return num.toLocaleString('en-US');
}

/**
 * Formats an ISO timestamp to a human-readable format.
 *
 * @param isoString - ISO 8601 timestamp
 * @returns Formatted date string (e.g., "2026-02-04 10:30")
 */
function formatDate(isoString: string): string {
  const date = new Date(isoString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

/**
 * Truncates a string and adds ellipsis if it exceeds maxLen.
 *
 * @param str - String to truncate
 * @param maxLen - Maximum length including ellipsis
 * @returns Truncated string with "..." if too long
 */
function truncateString(str: string, maxLen: number): string {
  if (str.length <= maxLen) {
    return str;
  }
  return str.slice(0, maxLen - 3) + '...';
}

/**
 * Pads a string to a minimum length.
 *
 * @param str - String to pad
 * @param len - Desired length
 * @returns Padded string
 */
function padEnd(str: string, len: number): string {
  return str.padEnd(len);
}

/**
 * Pads a string to a minimum length (right-aligned).
 *
 * @param str - String to pad
 * @param len - Desired length
 * @returns Padded string
 */
function padStart(str: string, len: number): string {
  return str.padStart(len);
}

/**
 * Renders the snapshots table.
 *
 * @param snapshots - Array of snapshot metadata
 */
function renderTable(snapshots: SnapshotMetadata[]): void {
  // Column widths
  const uuidWidth = 12;
  const labelWidth = 20;
  const dateWidth = 20;
  const linesWidth = 8;

  // Header
  const header = [
    padEnd('UUID', uuidWidth),
    padEnd('Label', labelWidth),
    padEnd('Created', dateWidth),
    padStart('Lines', linesWidth),
  ].join('  ');
  console.log(header);

  // Separator line
  const totalWidth = uuidWidth + labelWidth + dateWidth + linesWidth + 6; // 6 = 3 gaps of 2 spaces
  console.log('─'.repeat(totalWidth));

  // Data rows
  for (const snapshot of snapshots) {
    const shortUuid = truncateString(snapshot.uuid, uuidWidth);
    const label = truncateString(snapshot.label || '(no label)', labelWidth);
    const created = formatDate(snapshot.created);
    const lines = formatNumber(snapshot.lineCount);

    const row = [
      padEnd(shortUuid, uuidWidth),
      padEnd(label, labelWidth),
      padEnd(created, dateWidth),
      padStart(lines, linesWidth),
    ].join('  ');
    console.log(row);
  }
}

/**
 * List command - displays all snapshots for the current project.
 *
 * @param args - Command arguments (supports --help)
 */
export async function listCommand(args: string[]): Promise<void> {
  // Handle help flag
  if (args.includes('--help') || args.includes('-h')) {
    printHelp();
    return;
  }

  // Get project path from current working directory
  const projectPath = process.cwd();

  // Retrieve snapshots
  const snapshots = await listSnapshots(projectPath);

  // Handle empty list
  if (snapshots.length === 0) {
    console.log('No snapshots found for this project.');
    return;
  }

  // Display header with project path
  console.log(`Snapshots for ${projectPath}:\n`);

  // Render the table
  renderTable(snapshots);

  // Display count
  console.log(`\n${snapshots.length} snapshot${snapshots.length === 1 ? '' : 's'}`);
}
