// process.ts - Claude process detection and management (Linux /proc filesystem)
import { readdir, readlink, readFile } from 'fs/promises';
import { join, resolve } from 'path';
import type { ClaudeProcess } from '../types';

/**
 * Checks if a path looks like a Claude executable.
 * Must be the Claude binary itself, not just a file in a claude-related directory.
 *
 * @param path - A file path (executable or script path)
 * @returns true if this looks like the Claude executable
 */
function isClaudeExecutablePath(path: string): boolean {
  // Valid patterns for Claude executable:
  // - Is exactly "claude" (bare command)
  // - Ends with /claude (e.g., /usr/local/bin/claude, /home/user/.claude/bin/claude)
  return path === 'claude' || path.endsWith('/claude');
}

/**
 * Checks if a cmdline represents a genuine Claude process.
 * Prevents false positives from matching `grep claude`, directories containing "claude", etc.
 *
 * @param cmdline - The full command line string (with arguments separated by spaces or null bytes)
 * @returns true if this appears to be a genuine Claude process
 */
export function isGenuineClaudeProcess(cmdline: string): boolean {
  // Normalize null bytes to spaces and split into tokens
  const normalized = cmdline.replace(/\0/g, ' ').trim();
  const tokens = normalized.split(/\s+/);

  if (tokens.length === 0) {
    return false;
  }

  // Get the first token (executable path)
  const executable = tokens[0];

  // Check if the first token is the Claude binary
  if (isClaudeExecutablePath(executable)) {
    return true;
  }

  // Check for node/bun/deno running claude as a script
  // e.g., /usr/bin/node /path/to/.claude/bin/claude
  // Only check second token if first token looks like a JS runtime
  if (tokens.length >= 2) {
    const runtimePatterns = ['/node', '/bun', '/deno', 'node', 'bun', 'deno'];
    const isRuntime = runtimePatterns.some(
      (pattern) => executable === pattern || executable.endsWith(pattern)
    );

    if (isRuntime) {
      const scriptPath = tokens[1];
      if (isClaudeExecutablePath(scriptPath)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Parses the session UUID from a Claude process command line.
 * Looks for --resume <uuid> argument pattern.
 *
 * @param cmdline - The full command line string (with arguments separated by spaces or null bytes)
 * @returns The session UUID if found, null otherwise
 */
export function parseSessionIdFromCmdline(cmdline: string): string | null {
  // cmdline from /proc uses null bytes as separators, but may also come as space-separated
  // Normalize to space-separated for easier parsing
  const normalized = cmdline.replace(/\0/g, ' ').trim();

  // Split into tokens
  const tokens = normalized.split(/\s+/);

  // Find --resume flag and get the next token
  for (let i = 0; i < tokens.length - 1; i++) {
    if (tokens[i] === '--resume') {
      const nextToken = tokens[i + 1];
      // Validate it looks like a UUID (basic check: contains hex chars and dashes)
      // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
      if (nextToken && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(nextToken)) {
        return nextToken;
      }
      // If next token doesn't look like a UUID, --resume might be at end without value
      return null;
    }
  }

  // Check if --resume is the last token (edge case: --resume at end without value)
  if (tokens[tokens.length - 1] === '--resume') {
    return null;
  }

  return null;
}

/**
 * Scans /proc for Claude processes.
 * Returns information about all running Claude Code processes.
 *
 * @returns Array of ClaudeProcess objects
 */
export async function findClaudeProcesses(): Promise<ClaudeProcess[]> {
  const processes: ClaudeProcess[] = [];

  let procEntries: string[];
  try {
    procEntries = await readdir('/proc');
  } catch {
    // Can't read /proc - likely not on Linux
    return [];
  }

  // Filter to numeric directories (PIDs)
  const pidDirs = procEntries.filter((entry) => /^\d+$/.test(entry));

  // Process each PID in parallel
  const results = await Promise.allSettled(
    pidDirs.map(async (pidStr): Promise<ClaudeProcess | null> => {
      const pid = parseInt(pidStr, 10);
      const procPath = join('/proc', pidStr);

      // Read cmdline
      let cmdline: string;
      try {
        const cmdlineBuffer = await readFile(join(procPath, 'cmdline'));
        cmdline = cmdlineBuffer.toString('utf-8');
      } catch {
        // Permission denied or process exited - skip
        return null;
      }

      // Check if this is a Claude process
      // First, quick filter: look for 'claude' in the command
      const cmdlineLower = cmdline.toLowerCase();
      if (!cmdlineLower.includes('claude')) {
        return null;
      }

      // Second, stricter check: verify this is a genuine Claude executable
      // This prevents matching `grep claude`, directories containing "claude", etc.
      if (!isGenuineClaudeProcess(cmdline)) {
        return null;
      }

      // Read cwd symlink
      let cwd: string;
      try {
        cwd = await readlink(join(procPath, 'cwd'));
      } catch {
        // Permission denied - skip this process
        return null;
      }

      // Parse session ID from cmdline
      const sessionId = parseSessionIdFromCmdline(cmdline);

      // Convert null-separated cmdline to readable format for display
      const readableCmdline = cmdline.replace(/\0/g, ' ').trim();

      return {
        pid,
        sessionId,
        cwd,
        cmdline: readableCmdline,
      };
    })
  );

  // Collect successful results
  for (const result of results) {
    if (result.status === 'fulfilled' && result.value !== null) {
      processes.push(result.value);
    }
  }

  return processes;
}

/**
 * Finds Claude processes that are running in a specific project directory.
 *
 * @param projectPath - The project directory path to filter by
 * @returns Array of ClaudeProcess objects with matching cwd
 */
export async function findClaudeProcessesForProject(projectPath: string): Promise<ClaudeProcess[]> {
  const allProcesses = await findClaudeProcesses();

  // Normalize the project path to handle trailing slashes and resolve any relative components
  const normalizedProjectPath = resolve(projectPath);

  // Filter to processes where cwd matches the project path
  // Both paths are normalized with resolve() to handle:
  // - Trailing slash differences (/foo/bar vs /foo/bar/)
  // - Relative path components (. and ..)
  // - Double slashes
  return allProcesses.filter((proc) => resolve(proc.cwd) === normalizedProjectPath);
}

/**
 * Kills a process, optionally with graceful termination.
 *
 * @param pid - The process ID to kill
 * @param graceful - If true, sends SIGTERM first and waits up to 2 seconds before SIGKILL.
 *                   If false, sends SIGKILL immediately.
 * @returns true if process terminated, false if still running after attempts
 */
export async function killProcess(pid: number, graceful: boolean = true): Promise<boolean> {
  // Helper to check if process is still running
  const isRunning = (): boolean => {
    try {
      // Sending signal 0 checks if process exists without actually sending a signal
      process.kill(pid, 0);
      return true;
    } catch {
      // Process doesn't exist or we don't have permission
      return false;
    }
  };

  // Helper to wait for process to terminate
  const waitForTermination = async (timeoutMs: number): Promise<boolean> => {
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      if (!isRunning()) {
        return true;
      }
      // Wait 100ms between checks
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    return !isRunning();
  };

  if (!isRunning()) {
    // Process already not running
    return true;
  }

  if (graceful) {
    // Send SIGTERM first
    try {
      process.kill(pid, 'SIGTERM');
    } catch {
      // If we can't send the signal, process might have already exited
      return !isRunning();
    }

    // Wait up to 2 seconds for graceful termination
    const terminated = await waitForTermination(2000);
    if (terminated) {
      return true;
    }

    // Still running - send SIGKILL
    try {
      process.kill(pid, 'SIGKILL');
    } catch {
      // Process might have exited between check and kill
      return !isRunning();
    }

    // Wait a bit for SIGKILL to take effect
    await new Promise((resolve) => setTimeout(resolve, 100));
    return !isRunning();
  } else {
    // Non-graceful: SIGKILL immediately
    try {
      process.kill(pid, 'SIGKILL');
    } catch {
      return !isRunning();
    }

    // Wait a bit for SIGKILL to take effect
    await new Promise((resolve) => setTimeout(resolve, 100));
    return !isRunning();
  }
}
