// ps.ts - List Claude processes for the current project
import { findClaudeProcessesForProject } from '../lib/process';
import type { ClaudeProcess } from '../types';

/**
 * Displays help for the ps command.
 */
function printHelp(): void {
  console.log(`ccsnap ps - List Claude processes for the current project

Usage: ccsnap ps [options]

Options:
  --help, -h    Show this help message

Description:
  Lists all running Claude Code processes associated with the current project
  directory. Shows PID, session ID (if resumed), and command line.

Output format:
  PID      Session ID                            CWD
  ───────────────────────────────────────────────────────────────
  12345    abc12345-1234-1234-1234-123456789abc  /path/to/project

Examples:
  ccsnap ps
`);
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
 * Renders the process table.
 *
 * @param processes - Array of Claude processes
 */
function renderTable(processes: ClaudeProcess[]): void {
  // Column widths
  const pidWidth = 8;
  const sessionWidth = 38;
  const cwdWidth = 40;

  // Header
  const header = [
    'PID'.padEnd(pidWidth),
    'Session ID'.padEnd(sessionWidth),
    'CWD'.padEnd(cwdWidth),
  ].join('  ');
  console.log(header);

  // Separator line
  const totalWidth = pidWidth + sessionWidth + cwdWidth + 4; // 4 = 2 gaps of 2 spaces
  console.log('─'.repeat(totalWidth));

  // Data rows
  for (const proc of processes) {
    const pid = String(proc.pid).padEnd(pidWidth);
    const session = (proc.sessionId ?? '(no --resume)').padEnd(sessionWidth);
    const cwd = truncateString(proc.cwd, cwdWidth).padEnd(cwdWidth);

    console.log(`${pid}  ${session}  ${cwd}`);
  }
}

/**
 * Implements the ps command.
 * Lists all Claude Code processes for the current project directory.
 *
 * Exit codes:
 *   0 - Success (processes found)
 *   3 - No Claude process found
 *
 * @param args - Command arguments (supports --help)
 */
export async function psCommand(args: string[]): Promise<void> {
  // Handle help flag
  if (args.includes('--help') || args.includes('-h')) {
    printHelp();
    return;
  }

  // Get project path from current working directory
  const projectPath = process.cwd();

  // Find Claude processes for this project
  const processes = await findClaudeProcessesForProject(projectPath);

  // Handle empty list
  if (processes.length === 0) {
    console.log(`No Claude processes found for project: ${projectPath}`);
    process.exit(3);
  }

  // Display header with project path
  console.log(`Claude processes for ${projectPath}:\n`);

  // Render the table
  renderTable(processes);

  // Display count
  console.log(`\n${processes.length} process${processes.length === 1 ? '' : 'es'}`);
}
