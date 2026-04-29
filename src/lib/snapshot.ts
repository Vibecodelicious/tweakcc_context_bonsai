// snapshot.ts - Snapshot creation and management for Claude Code sessions
import { copyFile, mkdir, readdir, rm, unlink } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';
import type { SnapshotMetadata } from '../types';
import {
  getProjectDir,
  getSessionPath,
  getSessionDir,
  getFileHistoryDir,
  getSessionEnvDir,
  getTodosDir,
  getTasksDir,
} from './paths';
import { findCurrentSession, copySessionWithNewId } from './session';
import { readSnapshotIndex, writeSnapshotIndex } from './config';

/**
 * Creates a snapshot of a Claude Code session.
 * Copies all session files to create an independent snapshot with a new UUID.
 *
 * Files copied:
 * - Main JSONL (`<session-id>.jsonl`) - with session ID transformation
 * - Session directory (`<session-id>/` including subagents/ and tool-results/)
 * - File history (`~/.claude/file-history/<session-id>/`)
 * - Session env (`~/.claude/session-env/<session-id>/` if exists)
 * - Todos (files matching `<session-id>-*` renamed to `<new-id>-*`)
 * - Tasks (`~/.claude/tasks/<session-id>/`)
 *
 * @param projectPath - Absolute path to the project directory
 * @param label - Human-readable label for the snapshot
 * @param sessionId - Session ID to snapshot (optional, defaults to current session)
 * @returns Snapshot metadata
 * @throws Error if session not found or copy fails
 */
export async function createSnapshot(
  projectPath: string,
  label: string,
  sessionId?: string
): Promise<SnapshotMetadata> {
  // Find session ID if not provided
  let sourceSessionId = sessionId;
  if (!sourceSessionId) {
    const currentSession = await findCurrentSession(projectPath);
    if (!currentSession) {
      throw new Error(`No session found for project: ${projectPath}`);
    }
    sourceSessionId = currentSession.sessionId;
  }

  // Generate new UUID for the snapshot
  const snapshotId = randomUUID();

  // Get project directory in Claude's storage
  const projectDir = getProjectDir(projectPath);

  // Calculate destination paths for cleanup tracking
  const destJsonlPath = getSessionPath(projectDir, snapshotId);
  const destSessionDir = getSessionDir(projectDir, snapshotId);
  const destFileHistoryDir = getFileHistoryDir(snapshotId);
  const destSessionEnvDir = getSessionEnvDir(snapshotId);
  const destTasksDir = getTasksDir(snapshotId);

  // Track created todo files for potential cleanup
  const createdTodoFiles: string[] = [];

  try {
    // Copy main JSONL file with session ID transformation
    const sourceJsonlPath = getSessionPath(projectDir, sourceSessionId);
    const lineCount = await copySessionWithNewId(
      sourceJsonlPath,
      destJsonlPath,
      sourceSessionId,
      snapshotId
    );

    // Copy session directory (subagents/, tool-results/)
    const sourceSessionDir = getSessionDir(projectDir, sourceSessionId);
    await copyDirectoryWithJsonlTransform(
      sourceSessionDir,
      destSessionDir,
      sourceSessionId,
      snapshotId
    );

    // Copy file history
    const sourceFileHistoryDir = getFileHistoryDir(sourceSessionId);
    await copyDirectoryDirect(sourceFileHistoryDir, destFileHistoryDir);

    // Copy session env (if exists)
    const sourceSessionEnvDir = getSessionEnvDir(sourceSessionId);
    await copyDirectoryDirect(sourceSessionEnvDir, destSessionEnvDir);

    // Copy todos with filename transformation
    await copyTodoFilesTracked(sourceSessionId, snapshotId, createdTodoFiles);

    // Copy tasks directory
    const sourceTasksDir = getTasksDir(sourceSessionId);
    await copyDirectoryDirect(sourceTasksDir, destTasksDir);

    // Create snapshot metadata
    const metadata: SnapshotMetadata = {
      uuid: snapshotId,
      sourceSessionId,
      label,
      created: new Date().toISOString(),
      lineCount,
      projectPath,
    };

    // Update snapshot index
    const index = await readSnapshotIndex(projectPath);
    index.snapshots.push(metadata);
    await writeSnapshotIndex(projectPath, index);

    return metadata;
  } catch (error) {
    // Clean up any partially created files on error (best-effort)
    await cleanupSnapshotFiles(
      destJsonlPath,
      destSessionDir,
      destFileHistoryDir,
      destSessionEnvDir,
      destTasksDir,
      createdTodoFiles
    );
    throw error;
  }
}

/**
 * Retrieves a snapshot by its ID.
 *
 * @param projectPath - Absolute path to the project directory
 * @param snapshotId - UUID of the snapshot
 * @returns Snapshot metadata or null if not found
 */
export async function getSnapshot(
  projectPath: string,
  snapshotId: string
): Promise<SnapshotMetadata | null> {
  const index = await readSnapshotIndex(projectPath);
  const snapshot = index.snapshots.find((s) => s.uuid === snapshotId);
  return snapshot ?? null;
}

/**
 * Lists all snapshots for a project, sorted by created date (newest first).
 *
 * @param projectPath - Absolute path to the project directory
 * @returns Array of snapshot metadata sorted by created date (newest first)
 */
export async function listSnapshots(projectPath: string): Promise<SnapshotMetadata[]> {
  const index = await readSnapshotIndex(projectPath);
  // Sort by created date, newest first
  return index.snapshots.sort((a, b) => {
    return new Date(b.created).getTime() - new Date(a.created).getTime();
  });
}

/**
 * Truncates a snapshot's JSONL file to a specified line number.
 * Updates the snapshot index with new lineCount and truncatedAt metadata.
 *
 * @param projectPath - Absolute path to the project directory
 * @param snapshotId - UUID of the snapshot to truncate
 * @param beforeLine - Line number to truncate to (keep lines 1 through beforeLine)
 * @returns Updated snapshot metadata
 * @throws Error if snapshot not found or truncation fails
 */
export async function truncateSnapshot(
  projectPath: string,
  snapshotId: string,
  beforeLine: number
): Promise<SnapshotMetadata> {
  // Get snapshot metadata
  const index = await readSnapshotIndex(projectPath);
  const snapshotIdx = index.snapshots.findIndex((s) => s.uuid === snapshotId);

  if (snapshotIdx === -1) {
    throw new Error(`Snapshot not found: ${snapshotId}`);
  }

  const snapshot = index.snapshots[snapshotIdx];

  // Validate beforeLine
  if (beforeLine < 1) {
    throw new Error('Cannot truncate to less than 1 line');
  }

  if (beforeLine >= snapshot.lineCount) {
    throw new Error(
      `Cannot truncate to line ${beforeLine}: snapshot only has ${snapshot.lineCount} lines`
    );
  }

  // Get path to the snapshot's JSONL file
  const projectDir = getProjectDir(projectPath);
  const jsonlPath = getSessionPath(projectDir, snapshotId);

  // Truncate the file
  const newLineCount = await truncateJsonlFile(jsonlPath, beforeLine);

  // Update metadata
  snapshot.lineCount = newLineCount;
  snapshot.truncatedAt = `Truncated to line ${beforeLine} on ${new Date().toISOString()}`;

  // Write updated index
  await writeSnapshotIndex(projectPath, index);

  return snapshot;
}

/**
 * Truncates a JSONL file to the specified number of lines.
 * Creates a new file with only the first N lines, then replaces the original.
 *
 * @param filePath - Path to the JSONL file
 * @param keepLines - Number of lines to keep
 * @returns Actual number of lines written
 */
async function truncateJsonlFile(filePath: string, keepLines: number): Promise<number> {
  const { createReadStream, createWriteStream } = await import('fs');
  const { createInterface } = await import('readline');
  const { rename, unlink } = await import('fs/promises');

  const tempPath = filePath + '.truncate.tmp';

  let writtenLines = 0;

  try {
    const readStream = createReadStream(filePath);
    const writeStream = createWriteStream(tempPath);
    const rl = createInterface({
      input: readStream,
      crlfDelay: Infinity,
    });

    let lineNumber = 0;

    // Helper to write a line with backpressure handling
    const writeLine = (line: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        const canContinue = writeStream.write(line + '\n');
        if (canContinue) {
          resolve();
        } else {
          writeStream.once('drain', resolve);
          writeStream.once('error', reject);
        }
      });
    };

    try {
      for await (const line of rl) {
        lineNumber++;

        if (lineNumber > keepLines) {
          // Stop reading once we've written enough lines
          break;
        }

        const trimmed = line.trim();
        if (trimmed !== '') {
          // Validate JSON before writing
          try {
            JSON.parse(trimmed);
            await writeLine(trimmed);
            writtenLines++;
          } catch {
            // Skip invalid JSON lines (shouldn't happen in middle of file)
            if (lineNumber < keepLines) {
              throw new Error(`Invalid JSON at line ${lineNumber}`);
            }
          }
        }
      }
    } finally {
      readStream.close();
      writeStream.end();

      // Wait for write stream to finish
      await new Promise<void>((resolve, reject) => {
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      });
    }

    // Atomic replace: POSIX rename() atomically replaces the destination file
    // This is safe because rename on the same filesystem is atomic
    await rename(tempPath, filePath);
  } catch (error) {
    // Clean up temp file on any error (best-effort)
    try {
      await unlink(tempPath);
    } catch {
      /* ignore cleanup errors */
    }
    throw error;
  }

  return writtenLines;
}

/**
 * Deletes a snapshot from the index.
 * Note: For MVP, this only removes from index - snapshot files remain for potential recovery.
 *
 * @param projectPath - Absolute path to the project directory
 * @param snapshotId - UUID of the snapshot to delete
 * @returns true if snapshot was found and deleted, false if not found
 */
export async function deleteSnapshot(projectPath: string, snapshotId: string): Promise<boolean> {
  const index = await readSnapshotIndex(projectPath);
  const originalLength = index.snapshots.length;
  index.snapshots = index.snapshots.filter((s) => s.uuid !== snapshotId);

  if (index.snapshots.length === originalLength) {
    // Snapshot not found
    return false;
  }

  await writeSnapshotIndex(projectPath, index);
  return true;
}

// ============================================================================
// Internal helper functions
// ============================================================================

/**
 * Copies a directory recursively with JSONL files transformed for new session ID.
 * Non-JSONL files are copied directly without transformation.
 *
 * @param sourceDir - Source directory path
 * @param destDir - Destination directory path
 * @param oldSessionId - Session ID to replace in JSONL files
 * @param newSessionId - New session ID
 */
async function copyDirectoryWithJsonlTransform(
  sourceDir: string,
  destDir: string,
  oldSessionId: string,
  newSessionId: string
): Promise<void> {
  // Check if source directory exists
  const sourceDirExists = await directoryExists(sourceDir);
  if (!sourceDirExists) {
    return; // Skip if source doesn't exist
  }

  // Create destination directory
  await mkdir(destDir, { recursive: true });

  // Read source directory contents
  const entries = await readdir(sourceDir, { withFileTypes: true });

  for (const entry of entries) {
    const sourcePath = join(sourceDir, entry.name);
    const destPath = join(destDir, entry.name);

    if (entry.isDirectory()) {
      // Recursively copy subdirectory
      await copyDirectoryWithJsonlTransform(sourcePath, destPath, oldSessionId, newSessionId);
    } else if (entry.isFile()) {
      if (entry.name.endsWith('.jsonl')) {
        // Transform JSONL files
        await copySessionWithNewId(sourcePath, destPath, oldSessionId, newSessionId);
      } else {
        // Direct copy for non-JSONL files
        await copyFile(sourcePath, destPath);
      }
    }
  }
}

/**
 * Copies a directory recursively without any transformation.
 * Skips if source directory doesn't exist.
 *
 * @param sourceDir - Source directory path
 * @param destDir - Destination directory path
 */
async function copyDirectoryDirect(sourceDir: string, destDir: string): Promise<void> {
  // Check if source directory exists
  const sourceDirExists = await directoryExists(sourceDir);
  if (!sourceDirExists) {
    return; // Skip if source doesn't exist
  }

  // Create destination directory
  await mkdir(destDir, { recursive: true });

  // Read source directory contents
  const entries = await readdir(sourceDir, { withFileTypes: true });

  for (const entry of entries) {
    const sourcePath = join(sourceDir, entry.name);
    const destPath = join(destDir, entry.name);

    if (entry.isDirectory()) {
      // Recursively copy subdirectory
      await copyDirectoryDirect(sourcePath, destPath);
    } else if (entry.isFile()) {
      await copyFile(sourcePath, destPath);
    }
  }
}

/**
 * Copies todo files with filename transformation.
 * Todo files are named `<session-id>-agent-<hash>.json` and need filename renaming.
 *
 * @param oldSessionId - Original session ID
 * @param newSessionId - New session ID for the snapshot
 */
async function copyTodoFiles(oldSessionId: string, newSessionId: string): Promise<void> {
  await copyTodoFilesTracked(oldSessionId, newSessionId, []);
}

/**
 * Copies todo files with filename transformation, tracking created files for cleanup.
 * Todo files are named `<session-id>-agent-<hash>.json` and need filename renaming.
 *
 * @param oldSessionId - Original session ID
 * @param newSessionId - New session ID for the snapshot
 * @param createdFiles - Array to append created file paths to (for cleanup tracking)
 */
async function copyTodoFilesTracked(
  oldSessionId: string,
  newSessionId: string,
  createdFiles: string[]
): Promise<void> {
  const todosDir = getTodosDir();

  // Check if todos directory exists
  const todosDirExists = await directoryExists(todosDir);
  if (!todosDirExists) {
    return;
  }

  // Read directory and find matching files
  const entries = await readdir(todosDir, { withFileTypes: true });
  const prefix = `${oldSessionId}-`;

  for (const entry of entries) {
    if (entry.isFile() && entry.name.startsWith(prefix)) {
      const sourcePath = join(todosDir, entry.name);
      // Transform filename: replace old session ID with new
      const newFilename = entry.name.replace(oldSessionId, newSessionId);
      const destPath = join(todosDir, newFilename);

      // Direct copy - todo file content doesn't contain sessionId
      await copyFile(sourcePath, destPath);
      createdFiles.push(destPath);
    }
  }
}

/**
 * Checks if a directory exists.
 *
 * @param dirPath - Path to check
 * @returns true if directory exists, false otherwise
 */
async function directoryExists(dirPath: string): Promise<boolean> {
  try {
    const file = Bun.file(dirPath);
    // Bun.file().exists() returns false for directories, need to use stat
    const fs = await import('fs/promises');
    const stats = await fs.stat(dirPath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Cleans up partially created snapshot files on error.
 * Uses best-effort deletion - ignores errors during cleanup.
 *
 * @param jsonlPath - Path to the snapshot JSONL file
 * @param sessionDir - Path to the snapshot session directory
 * @param fileHistoryDir - Path to the snapshot file history directory
 * @param sessionEnvDir - Path to the snapshot session-env directory
 * @param tasksDir - Path to the snapshot tasks directory
 * @param todoFiles - Array of todo file paths created for this snapshot
 */
async function cleanupSnapshotFiles(
  jsonlPath: string,
  sessionDir: string,
  fileHistoryDir: string,
  sessionEnvDir: string,
  tasksDir: string,
  todoFiles: string[]
): Promise<void> {
  // Delete JSONL file (best-effort)
  try {
    await unlink(jsonlPath);
  } catch {
    // Ignore - file may not have been created
  }

  // Delete directories (best-effort, recursive)
  const directories = [sessionDir, fileHistoryDir, sessionEnvDir, tasksDir];
  for (const dir of directories) {
    try {
      await rm(dir, { recursive: true, force: true });
    } catch {
      // Ignore - directory may not have been created
    }
  }

  // Delete individual todo files (best-effort)
  for (const todoFile of todoFiles) {
    try {
      await unlink(todoFile);
    } catch {
      // Ignore - file may not have been created
    }
  }
}
