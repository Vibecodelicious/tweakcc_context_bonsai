// switch.ts - Switch to a snapshot by killing current Claude process
import { getSnapshot } from '../lib/snapshot';
import { findClaudeProcessesForProject, killProcess } from '../lib/process';
import type { ClaudeProcess } from '../types';

/**
 * Displays help for the switch command.
 */
function printHelp(): void {
  console.log(`ccsnap switch - Switch to a snapshot (kills current Claude session)

Usage: ccsnap switch [options] <uuid>

Arguments:
  uuid                   UUID of the snapshot to switch to (required)

Options:
  --pid <pid>            Target a specific process by PID
  --force                Skip confirmation prompt
  --help, -h             Show this help message

Description:
  Switches to a snapshot by killing the current Claude Code process for this
  project and printing the command to resume from the snapshot.

  If multiple Claude processes are found, you must either select one
  interactively or specify the target with --pid.

Exit Codes:
  0 - Success
  1 - General error
  3 - No Claude process found
  4 - User cancelled operation

Examples:
  ccsnap switch abc12345-1234-1234-1234-123456789abc
  ccsnap switch --force abc12345
  ccsnap switch --pid 12345 abc12345
`);
}

/**
 * Parsed arguments for the switch command.
 */
interface SwitchArgs {
  snapshotUuid: string;
  targetPid?: number;
  force: boolean;
}

/**
 * Parses switch command arguments.
 *
 * @param args - Command arguments (after 'switch')
 * @returns Parsed options or null if help was requested
 * @throws Error if arguments are invalid
 */
function parseSwitchArgs(args: string[]): SwitchArgs | null {
  let snapshotUuid: string | undefined;
  let targetPid: number | undefined;
  let force = false;
  let i = 0;

  while (i < args.length) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      printHelp();
      return null;
    }

    if (arg === '--force') {
      force = true;
      i++;
      continue;
    }

    if (arg === '--pid') {
      if (i + 1 >= args.length) {
        throw new Error('--pid requires a PID argument');
      }
      const pidStr = args[i + 1];
      targetPid = parseInt(pidStr, 10);
      if (isNaN(targetPid) || targetPid <= 0) {
        throw new Error(`Invalid PID: ${pidStr}`);
      }
      i += 2;
      continue;
    }

    // Positional argument - should be the snapshot UUID
    if (!arg.startsWith('-')) {
      if (snapshotUuid !== undefined) {
        throw new Error(`Unexpected argument: ${arg}`);
      }
      snapshotUuid = arg;
      i++;
      continue;
    }

    // Unknown flag
    throw new Error(`Unknown option: ${arg}`);
  }

  if (!snapshotUuid) {
    throw new Error('Missing required argument: snapshot UUID');
  }

  return { snapshotUuid, targetPid, force };
}

/**
 * Prompts user for confirmation.
 * Uses simple stdin reading for compatibility with Bun.
 *
 * @param message - Prompt message
 * @returns true if user confirmed, false otherwise
 */
async function promptConfirmation(message: string): Promise<boolean> {
  process.stdout.write(`${message} [y/N] `);

  // Read from stdin
  const reader = Bun.stdin.stream().getReader();
  const { value } = await reader.read();
  reader.releaseLock();

  if (!value) {
    return false;
  }

  const input = new TextDecoder().decode(value).trim().toLowerCase();
  return input === 'y' || input === 'yes';
}

/**
 * Prompts user to select a process from a list.
 *
 * @param processes - List of processes to choose from
 * @returns Selected process or null if cancelled
 */
async function promptProcessSelection(processes: ClaudeProcess[]): Promise<ClaudeProcess | null> {
  console.log('\nMultiple Claude processes found. Select one to kill:\n');

  for (let i = 0; i < processes.length; i++) {
    const proc = processes[i];
    const sessionInfo = proc.sessionId ? proc.sessionId : '(no --resume)';
    console.log(`  [${i + 1}] PID ${proc.pid} - Session: ${sessionInfo}`);
    console.log(`      CWD: ${proc.cwd}`);
  }

  process.stdout.write('\nEnter number (or "q" to cancel): ');

  // Read from stdin
  const reader = Bun.stdin.stream().getReader();
  const { value } = await reader.read();
  reader.releaseLock();

  if (!value) {
    return null;
  }

  const input = new TextDecoder().decode(value).trim().toLowerCase();

  if (input === 'q' || input === 'quit' || input === 'cancel') {
    return null;
  }

  const selection = parseInt(input, 10);
  if (isNaN(selection) || selection < 1 || selection > processes.length) {
    console.error(`Invalid selection: ${input}`);
    return null;
  }

  return processes[selection - 1];
}

/**
 * Displays process details for confirmation.
 *
 * @param proc - Process to display
 */
function displayProcessDetails(proc: ClaudeProcess): void {
  console.log('\nProcess to be killed:');
  console.log(`  PID:      ${proc.pid}`);
  console.log(`  Session:  ${proc.sessionId ?? '(no --resume)'}`);
  console.log(`  CWD:      ${proc.cwd}`);
  console.log(`  Command:  ${proc.cmdline.length > 80 ? proc.cmdline.slice(0, 77) + '...' : proc.cmdline}`);
}

/**
 * Implements the switch command.
 * Validates snapshot, finds and kills Claude process, prints resume command.
 *
 * Exit codes:
 *   0 - Success
 *   1 - General error (invalid args, snapshot not found, etc.)
 *   3 - No Claude process found
 *   4 - User cancelled operation
 *
 * @param args - Command arguments (after 'switch')
 */
export async function switchCommand(args: string[]): Promise<void> {
  // Parse arguments
  let parsed: SwitchArgs | null;
  try {
    parsed = parseSwitchArgs(args);
  } catch (err) {
    console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
    console.error('Run "ccsnap switch --help" for usage information.');
    process.exit(1);
  }

  // If help was requested, we already printed it
  if (parsed === null) {
    process.exit(0);
  }

  const { snapshotUuid, targetPid, force } = parsed;
  const projectPath = process.cwd();

  // Validate snapshot exists
  const snapshot = await getSnapshot(projectPath, snapshotUuid);
  if (!snapshot) {
    console.error(`Error: Snapshot not found: ${snapshotUuid}`);
    console.error('Run "ccsnap list" to see available snapshots.');
    process.exit(1);
  }

  // Find Claude processes for this project
  const processes = await findClaudeProcessesForProject(projectPath);

  if (processes.length === 0) {
    console.error(`Error: No Claude process found for project: ${projectPath}`);
    console.error('Start a Claude session in this directory first.');
    process.exit(3);
  }

  // Determine which process to kill
  let targetProcess: ClaudeProcess | null = null;

  if (targetPid !== undefined) {
    // User specified a PID - find it in the list
    targetProcess = processes.find((p) => p.pid === targetPid) ?? null;
    if (!targetProcess) {
      console.error(`Error: PID ${targetPid} is not a Claude process for this project.`);
      console.error('Run "ccsnap ps" to see Claude processes.');
      process.exit(1);
    }
  } else if (processes.length === 1) {
    // Only one process - use it
    targetProcess = processes[0];
  } else {
    // Multiple processes - need to select
    if (force) {
      console.error('Error: Multiple Claude processes found. Use --pid to specify which one.');
      console.error('Run "ccsnap ps" to see Claude processes.');
      process.exit(1);
    }
    targetProcess = await promptProcessSelection(processes);
    if (!targetProcess) {
      console.log('Operation cancelled.');
      process.exit(4);
    }
  }

  // Show what will be killed
  displayProcessDetails(targetProcess);

  // Confirm unless --force
  if (!force) {
    const confirmed = await promptConfirmation('\nKill this process and switch to snapshot?');
    if (!confirmed) {
      console.log('Operation cancelled.');
      process.exit(4);
    }
  }

  // Kill the process
  console.log(`\nKilling process ${targetProcess.pid}...`);
  const killed = await killProcess(targetProcess.pid, true);

  if (!killed) {
    console.error(`Error: Failed to kill process ${targetProcess.pid}. It may still be running.`);
    process.exit(1);
  }

  console.log('Process terminated.');

  // Print the resume command
  console.log('\nTo resume from the snapshot, run:');
  console.log(`  claude --resume ${snapshot.uuid}`);
}
