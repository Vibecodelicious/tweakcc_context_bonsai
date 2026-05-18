// session.ts - Session file operations for Claude Code snapshot management
import { createReadStream, createWriteStream } from 'fs';
import { homedir } from 'os';
import { createInterface } from 'readline';
import { Glob } from 'bun';
import type { HistoryEntry, SessionMessage, UserMessage, AssistantMessage } from '../types';
import { getHistoryPath, getProjectDir } from './paths';

/**
 * Result of getMessageRange operation.
 */
export interface MessageRangeResult {
  messages: SessionMessage[];
  fromIndex: number;
  toIndex: number;
}

/**
 * Finds the most recent session for a given project path.
 * Reads ~/.claude/history.jsonl and finds the most recent entry matching the project.
 *
 * @param projectPath - Absolute path to the project directory
 * @returns The most recent history entry for the project, or null if not found
 */
export async function findCurrentSession(projectPath: string): Promise<HistoryEntry | null> {
  const historyPath = getHistoryPath();
  const file = Bun.file(historyPath);

  const exists = await file.exists();
  if (!exists) {
    return null;
  }

  // Read the entire history file and find entries matching the project
  // History files are typically small enough to read entirely
  const text = await file.text();
  const lines = text.split('\n').filter((line) => line.trim() !== '');

  let mostRecent: HistoryEntry | null = null;

  for (const line of lines) {
    try {
      const entry = JSON.parse(line) as HistoryEntry;
      // Match project path exactly
      if (entry.project === projectPath) {
        // Keep the most recent entry (highest timestamp)
        if (!mostRecent || entry.timestamp > mostRecent.timestamp) {
          mostRecent = entry;
        }
      }
    } catch {
      // Skip invalid JSON lines (shouldn't happen, but be defensive)
      continue;
    }
  }

  if (mostRecent) {
    return mostRecent;
  }

  // Print-mode sessions can create the JSONL before history.jsonl is updated.
  // Fall back to the newest session file under the project's session dir.
  const projectDir = getProjectDir(projectPath);
  if (!(await Bun.file(projectDir).exists())) {
    return null;
  }

  const sessionGlob = new Glob('*.jsonl');
  let newestPath: string | null = null;
  let newestMtime = -1;

  for await (const match of sessionGlob.scan({ cwd: projectDir, absolute: true })) {
    try {
      const file = Bun.file(match);
      const stat = await file.stat();
      const mtime = stat.mtime ? stat.mtime.getTime() : -1;
      if (mtime > newestMtime) {
        newestMtime = mtime;
        newestPath = match;
      }
    } catch {
      continue;
    }
  }

  if (!newestPath) {
    return null;
  }

  return {
    display: '',
    pastedContents: {},
    sessionId: newestPath.slice(newestPath.lastIndexOf('/') + 1, -'.jsonl'.length),
    project: projectPath,
    timestamp: newestMtime > 0 ? newestMtime : Date.now(),
  };
}

/**
 * Reads session messages from a JSONL file as an async generator.
 * Streams the file line-by-line to handle large files (250MB+) without loading into memory.
 *
 * @param sessionPath - Absolute path to the session JSONL file
 * @yields Each parsed session message
 * @throws Error if JSON parsing fails on a non-final line
 */
export async function* readSessionMessages(
  sessionPath: string
): AsyncGenerator<SessionMessage, void, unknown> {
  const fileHandle = Bun.file(sessionPath);
  const exists = await fileHandle.exists();
  if (!exists) {
    throw new Error(`Session file not found: ${sessionPath}`);
  }

  // Use Node.js readline for efficient line-by-line streaming
  // This is memory-efficient for large files
  const stream = createReadStream(sessionPath);
  const rl = createInterface({
    input: stream,
    crlfDelay: Infinity, // Handle both \n and \r\n
  });

  let lineNumber = 0;
  let lastLine: string | null = null;
  let lastLineNumber = 0;

  for await (const line of rl) {
    lineNumber++;

    // If we have a previous line, try to parse and yield it
    if (lastLine !== null) {
      try {
        const message = JSON.parse(lastLine) as SessionMessage;
        yield message;
      } catch (err) {
        // Error on a non-final line - this is corruption
        throw new Error(
          `Invalid JSON at line ${lastLineNumber} in ${sessionPath}: ${
            err instanceof Error ? err.message : String(err)
          }`
        );
      }
    }

    // Store current line as the "last" line for next iteration
    lastLine = line.trim();
    lastLineNumber = lineNumber;
  }

  // Handle the final line - skip if incomplete/invalid (incomplete write)
  if (lastLine !== null && lastLine !== '') {
    try {
      const message = JSON.parse(lastLine) as SessionMessage;
      yield message;
    } catch {
      // Skip incomplete final line silently - this is expected for active sessions
    }
  }

  stream.close();
}

/**
 * Transforms a JSON line by replacing the sessionId field.
 * Only modifies the sessionId field, preserving all other UUIDs (uuid, parentUuid, messageId).
 *
 * @param line - A single JSON line from a session JSONL file
 * @param oldSessionId - The session ID to replace
 * @param newSessionId - The new session ID
 * @returns The transformed JSON line (single line, no formatting)
 */
export function transformSessionId(
  line: string,
  oldSessionId: string,
  newSessionId: string
): string {
  const trimmed = line.trim();
  if (trimmed === '') {
    return '';
  }

  const obj = JSON.parse(trimmed);

  // Only modify sessionId if it matches the old value
  if (obj.sessionId === oldSessionId) {
    obj.sessionId = newSessionId;
  }

  // Return as single-line JSON
  return JSON.stringify(obj);
}

/**
 * Result of copying a session with a new ID.
 */
export interface CopySessionResult {
  lineCount: number;
}

/**
 * Copies a session JSONL file to a new location with a transformed session ID.
 * Uses streaming to handle large files (250MB+) without loading into memory.
 *
 * @param sourcePath - Absolute path to the source session JSONL file
 * @param destPath - Absolute path for the destination file
 * @param oldSessionId - The session ID to replace
 * @param newSessionId - The new session ID
 * @returns The number of lines written
 */
export async function copySessionWithNewId(
  sourcePath: string,
  destPath: string,
  oldSessionId: string,
  newSessionId: string
): Promise<number> {
  const sourceFile = Bun.file(sourcePath);
  const exists = await sourceFile.exists();
  if (!exists) {
    throw new Error(`Source session file not found: ${sourcePath}`);
  }

  // Use Node.js readline for efficient line-by-line streaming
  const readStream = createReadStream(sourcePath);
  const writeStream = createWriteStream(destPath);
  const rl = createInterface({
    input: readStream,
    crlfDelay: Infinity,
  });

  let lineCount = 0;
  let lineNumber = 0;
  let lastLine: string | null = null;
  let lastLineNumber = 0;

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

      // Process the previous line (not the final one yet)
      if (lastLine !== null) {
        try {
          const transformed = transformSessionId(lastLine, oldSessionId, newSessionId);
          if (transformed !== '') {
            await writeLine(transformed);
            lineCount++;
          }
        } catch (err) {
          throw new Error(
            `Invalid JSON at line ${lastLineNumber} in ${sourcePath}: ${
              err instanceof Error ? err.message : String(err)
            }`
          );
        }
      }

      lastLine = line;
      lastLineNumber = lineNumber;
    }

    // Handle final line - skip if incomplete/invalid
    if (lastLine !== null && lastLine.trim() !== '') {
      try {
        const transformed = transformSessionId(lastLine, oldSessionId, newSessionId);
        if (transformed !== '') {
          await writeLine(transformed);
          lineCount++;
        }
      } catch {
        // Skip incomplete final line silently
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

  return lineCount;
}

/**
 * Result of JSONL integrity validation.
 */
export interface ValidationResult {
  valid: boolean;
  lineCount: number;
  error?: string;
}

/**
 * Validates that a JSONL file has valid JSON on all lines.
 * Incomplete final lines are silently skipped (expected for active sessions).
 * Returns validation result with line count and any error found.
 *
 * @param filePath - Absolute path to the JSONL file to validate
 * @returns Validation result with valid status, line count, and optional error
 */
export async function validateJsonlIntegrity(filePath: string): Promise<ValidationResult> {
  const file = Bun.file(filePath);
  const exists = await file.exists();
  if (!exists) {
    return {
      valid: false,
      lineCount: 0,
      error: `File not found: ${filePath}`,
    };
  }

  const stream = createReadStream(filePath);
  const rl = createInterface({
    input: stream,
    crlfDelay: Infinity,
  });

  let lineNumber = 0;
  let validLineCount = 0;
  let lastLine: string | null = null;
  let lastLineNumber = 0;

  try {
    for await (const line of rl) {
      lineNumber++;
      const trimmed = line.trim();

      // Skip empty lines
      if (trimmed === '') {
        continue;
      }

      // If we have a previous line, validate it (non-final lines must be valid)
      if (lastLine !== null) {
        try {
          JSON.parse(lastLine);
          validLineCount++;
        } catch (err) {
          stream.close();
          return {
            valid: false,
            lineCount: lastLineNumber,
            error: `Invalid JSON at line ${lastLineNumber}: ${
              err instanceof Error ? err.message : String(err)
            }`,
          };
        }
      }

      // Store current line as the "last" line for next iteration
      lastLine = trimmed;
      lastLineNumber = lineNumber;
    }

    // Handle the final line - skip if incomplete/invalid (incomplete write)
    if (lastLine !== null) {
      try {
        JSON.parse(lastLine);
        validLineCount++;
      } catch {
        // Skip incomplete final line silently - this is expected for active sessions
      }
    }
  } catch (err) {
    stream.close();
    return {
      valid: false,
      lineCount: lineNumber,
      error: `Error reading file: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  stream.close();

  return {
    valid: true,
    lineCount: validLineCount,
  };
}

/**
 * Helper to extract UUID from a session message.
 * Returns the uuid field from any message that has one, regardless of type.
 * This ensures every [msg:<uuid>] the LLM sees in its context can be found
 * by the compact tool when scanning the session JSONL.
 */
function getMessageUuid(message: SessionMessage): string | null {
  return (message as any).uuid ?? null;
}

/**
 * Finds a message by its UUID in a session file.
 * Streams through the JSONL file to find the message without loading all into memory.
 *
 * @param sessionPath - Absolute path to the session JSONL file
 * @param uuid - The UUID of the message to find
 * @returns The message if found, null otherwise
 */
export async function findMessageByUuid(
  sessionPath: string,
  uuid: string
): Promise<SessionMessage | null> {
  for await (const message of readSessionMessages(sessionPath)) {
    const messageUuid = getMessageUuid(message);
    if (messageUuid === uuid) {
      return message;
    }
  }
  return null;
}

/**
 * Gets all messages between two UUIDs (inclusive).
 * Validates that fromUuid appears before toUuid in the session file.
 *
 * @param sessionPath - Absolute path to the session JSONL file
 * @param fromUuid - UUID of the first message in the range
 * @param toUuid - UUID of the last message in the range
 * @returns Object containing messages array and the from/to indices
 * @throws Error if either UUID is not found or if fromUuid appears after toUuid
 */
export async function getMessageRange(
  sessionPath: string,
  fromUuid: string,
  toUuid: string
): Promise<MessageRangeResult> {
  const messages: SessionMessage[] = [];
  let fromIndex = -1;
  let toIndex = -1;
  let index = 0;
  let collecting = false;

  for await (const message of readSessionMessages(sessionPath)) {
    const messageUuid = getMessageUuid(message);

    // Check if we've hit the start of the range
    if (messageUuid === fromUuid) {
      if (collecting) {
        // We already found toUuid before fromUuid - wrong order
        throw new Error(
          `Invalid range: toUuid (${toUuid}) appears before fromUuid (${fromUuid}) in the session`
        );
      }
      fromIndex = index;
      collecting = true;
    }

    // If we're collecting, add this message
    if (collecting) {
      messages.push(message);
    }

    // Check if we've hit the end of the range
    if (messageUuid === toUuid) {
      if (!collecting) {
        // toUuid found before fromUuid - wrong order
        // Mark that we found toUuid first and keep looking for fromUuid
        toIndex = index;
        messages.push(message);
        // Continue to see if fromUuid comes later (which would be an error)
        collecting = false;
        // We need a different approach - restart and validate order
      } else {
        // Normal case - we found toUuid after fromUuid
        toIndex = index;
        break;
      }
    }

    index++;
  }

  // Handle error cases
  if (fromIndex === -1 && toIndex === -1) {
    throw new Error(`Neither UUID found in session: fromUuid=${fromUuid}, toUuid=${toUuid}`);
  }

  if (fromIndex === -1) {
    throw new Error(`fromUuid not found in session: ${fromUuid}`);
  }

  if (toIndex === -1) {
    throw new Error(`toUuid not found in session: ${toUuid}`);
  }

  if (toIndex < fromIndex) {
    throw new Error(
      `Invalid range: toUuid (${toUuid}) appears before fromUuid (${fromUuid}) in the session`
    );
  }

  return {
    messages,
    fromIndex,
    toIndex,
  };
}

/**
 * Finds the JSONL path for a session ID by searching across all project directories.
 *
 * @param sessionId - The session UUID to find
 * @returns Absolute path to the session JSONL file
 * @throws Error if session not found
 */
export async function findSessionPath(sessionId: string): Promise<string> {
  const projectsDir = `${homedir()}/.claude/projects`;
  if (!(await Bun.file(projectsDir).exists())) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  const glob = new Glob(`*/${sessionId}.jsonl`);

  for await (const match of glob.scan({ cwd: projectsDir, absolute: true })) {
    return match;
  }

  throw new Error(`Session not found: ${sessionId}`);
}
