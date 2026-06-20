// compact.ts - Core compaction logic for session context compression
import { createReadStream, createWriteStream } from 'fs';
import { createInterface } from 'readline';
import { rename, unlink } from 'fs/promises';
import type { SessionMessage, SummaryMessage, CompactMetadata } from '../types';
import { getMessageRange } from './session';
import { generateSummary } from './summarize';

/**
 * Result of the compactSession operation.
 */
export interface CompactResult {
  messageCount: number;
  summary: string | null;
  summaryUuid: string;
}

/**
 * Result of the unarchiveMessages operation.
 */
export interface UnarchiveResult {
  messages: SessionMessage[];
  messageCount: number;
  summariesRemoved: string[];
}

/**
 * Result of the retrieveSession operation.
 */
export interface RetrieveResult {
  messageCount: number;
  ids: string[];
  summariesRemoved: string[];
}

/**
 * Result of the markMessagesArchived operation.
 */
export interface MarkArchivedResult {
  messages: SessionMessage[];
  messageCount: number;
  allMessages: SessionMessage[];
}

/**
 * Delays execution for a specified number of milliseconds.
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Writes a JSONL file atomically with retry logic.
 * Uses temp file + atomic rename pattern.
 *
 * @param filePath - Target file path
 * @param lines - Array of JSON-serializable objects to write
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 */
async function writeJsonlAtomic(
  filePath: string,
  lines: unknown[],
  maxRetries: number = 3
): Promise<void> {
  const tempPath = `${filePath}.compact.tmp`;
  const backoffDelays = [100, 200, 400];

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const writeStream = createWriteStream(tempPath);

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
        for (const obj of lines) {
          await writeLine(JSON.stringify(obj));
        }
      } finally {
        writeStream.end();
        await new Promise<void>((resolve, reject) => {
          writeStream.on('finish', resolve);
          writeStream.on('error', reject);
        });
      }

      // Atomic rename
      await rename(tempPath, filePath);
      return;
    } catch (error) {
      // Clean up temp file on error (best-effort)
      try {
        await unlink(tempPath);
      } catch {
        /* ignore cleanup errors */
      }

      // If we have retries left, wait and try again
      if (attempt < maxRetries - 1) {
        await delay(backoffDelays[attempt] ?? 400);
        continue;
      }

      throw error;
    }
  }
}

/**
 * Marks messages in a UUID range as archived and returns them for summary generation.
 * Uses streaming for memory efficiency with large files.
 * By default, writes atomically using temp file + rename pattern.
 * When skipWrite is true, does NOT write to the session file - caller is responsible.
 *
 * @param sessionPath - Absolute path to the session JSONL file
 * @param fromUuid - UUID of the first message in the range to archive
 * @param toUuid - UUID of the last message in the range to archive
 * @param summaryUuid - UUID of the summary message that will replace this range
 * @param options - Optional settings (skipWrite skips writing the session file)
 * @returns Object containing the archived messages, count, and all messages (for atomic write)
 * @throws Error if either UUID is not found or if fromUuid appears after toUuid
 */
export async function markMessagesArchived(
  sessionPath: string,
  fromUuid: string,
  toUuid: string,
  summaryUuid: string,
  options?: { skipWrite?: boolean }
): Promise<MarkArchivedResult> {
  const fileHandle = Bun.file(sessionPath);
  const exists = await fileHandle.exists();
  if (!exists) {
    throw new Error(`Session file not found: ${sessionPath}`);
  }

  // First pass: validate range and collect UUIDs to archive
  const rangeResult = await getMessageRange(sessionPath, fromUuid, toUuid);
  const archivedMessages = rangeResult.messages;
  const archiveUuids = new Set<string>();

  // Collect UUIDs of messages that have uuid field (user/assistant)
  for (const msg of archivedMessages) {
    if (msg.type === 'user' || msg.type === 'assistant') {
      archiveUuids.add(msg.uuid);
    }
  }

  // Second pass: stream through file, mark messages, and collect all lines
  const allMessages: SessionMessage[] = [];
  const readStream = createReadStream(sessionPath);
  const rl = createInterface({
    input: readStream,
    crlfDelay: Infinity,
  });

  const archivedAt = new Date().toISOString();
  let lineNumber = 0;
  let lastLine: string | null = null;
  let lastLineNumber = 0;

  try {
    for await (const line of rl) {
      lineNumber++;

      // Process the previous line (not the final one yet)
      if (lastLine !== null) {
        try {
          const message = JSON.parse(lastLine) as SessionMessage;

          // Check if this message should be archived
          if (
            (message.type === 'user' || message.type === 'assistant') &&
            archiveUuids.has(message.uuid)
          ) {
            message.archived = true;
            message.archivedAt = archivedAt;
            message.archivedBy = summaryUuid;
          }

          allMessages.push(message);
        } catch (err) {
          throw new Error(
            `Invalid JSON at line ${lastLineNumber} in ${sessionPath}: ${
              err instanceof Error ? err.message : String(err)
            }`
          );
        }
      }

      lastLine = line.trim();
      lastLineNumber = lineNumber;
    }

    // Handle the final line - skip if incomplete/invalid
    if (lastLine !== null && lastLine !== '') {
      try {
        const message = JSON.parse(lastLine) as SessionMessage;

        // Check if this message should be archived
        if (
          (message.type === 'user' || message.type === 'assistant') &&
          archiveUuids.has(message.uuid)
        ) {
          message.archived = true;
          message.archivedAt = archivedAt;
          message.archivedBy = summaryUuid;
        }

        allMessages.push(message);
      } catch {
        // Skip incomplete final line silently - expected for active sessions
      }
    }
  } finally {
    readStream.close();
  }

  // Write session file atomically (unless skipWrite is set)
  if (!options?.skipWrite) {
    await writeJsonlAtomic(sessionPath, allMessages);
  }

  return {
    messages: archivedMessages,
    messageCount: archivedMessages.length,
    allMessages,
  };
}

/**
 * Extended SummaryMessage type that includes the archive placeholder UUID.
 */
export interface CompactSummaryMessage extends SummaryMessage {
  uuid: string;
}

/**
 * Compacts a session by archiving a range of messages and generating a summary.
 *
 * Algorithm:
 * 1. Generate summary UUID upfront
 * 2. Validate and mark messages in range as archived
 * 3. Generate LLM summary via generateSummary() (unless skipSummary: true)
 * 4. Append summary message to JSONL with compact metadata
 * 5. Write atomically using temp file + rename
 *
 * @param sessionPath - Absolute path to the session JSONL file
 * @param fromUuid - UUID of the first message to archive
 * @param toUuid - UUID of the last message to archive
 * @param options - Optional settings (skipSummary skips LLM summary generation)
 * @returns Object containing message count, summary text, and summary UUID
 * @throws Error if UUIDs not found, invalid range, or summary generation fails
 */
export async function compactSession(
  sessionPath: string,
  fromUuid: string,
  toUuid: string,
  options?: { skipSummary?: boolean }
): Promise<CompactResult> {
  // Step 1: Generate summary UUID upfront
  const summaryUuid = crypto.randomUUID();

  // Step 2: Mark messages as archived and get all messages for atomic write
  // Using skipWrite: true to avoid double-write race condition - we do a single atomic write at the end
  const { messages, messageCount, allMessages } = await markMessagesArchived(
    sessionPath,
    fromUuid,
    toUuid,
    summaryUuid,
    { skipWrite: true }
  );

  // Step 3: Generate summary (unless skipped)
  let summary: string | null = null;
  if (!options?.skipSummary) {
    try {
      summary = await generateSummary(messages);
    } catch (error) {
      throw new Error(
        `Summary generation failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  // Step 4: Create summary message with compact metadata
  const compactMetadata: CompactMetadata = {
    fromMessageId: fromUuid,
    toMessageId: toUuid,
    messageCount,
  };

  const summaryMessage: CompactSummaryMessage = {
    type: 'summary',
    uuid: summaryUuid,
    summary: summary ?? `[Compacted ${messageCount} messages]`,
    timestamp: new Date().toISOString(),
    compactMetadata,
  };

  // Step 5: Append summary message to allMessages from markMessagesArchived
  // This uses the already-parsed messages, avoiding a second file read and
  // ensuring a single atomic write operation (fixes race condition)
  allMessages.push(summaryMessage as unknown as SessionMessage);

  // Write atomically with retry
  await writeJsonlAtomic(sessionPath, allMessages);

  return {
    messageCount,
    summary,
    summaryUuid,
  };
}


/**
 * Helper to extract UUID from any session message type.
 * Returns uuid for user/assistant/summary messages, messageId for file-history-snapshot.
 */
function getMessageUuidFromAny(message: SessionMessage): string | null {
  if (message.type === 'user' || message.type === 'assistant') {
    return message.uuid;
  }
  if (message.type === 'summary' && message.uuid) {
    return message.uuid;
  }
  if (message.type === 'file-history-snapshot') {
    return message.messageId;
  }
  return null;
}

/**
 * Unarchives messages by their UUIDs. Accepts any combination of archived message UUIDs
 * and summary UUIDs. Summary UUIDs expand to all messages archived by that summary and
 * remove the summary message itself.
 *
 * Algorithm (single-pass read, in-memory process, atomic write):
 * 1. Load: Read JSONL into ordered array, build UUID->index Map
 * 2. Validate: Check all input UUIDs exist and are archived or summaries
 * 3. Expand summaries: Walk ranges to find archived messages
 * 4. Add individual messages: Add their indices to unarchive set
 * 5. Mutate in-memory: Remove archive flags / omit summaries
 * 6. Write: Atomic write via writeJsonlAtomic()
 *
 * @param sessionPath - Absolute path to the session JSONL file
 * @param messageUuids - Array of UUIDs to unarchive (archived messages or summary UUIDs)
 * @returns Object containing unarchived messages, count, and which summaries were removed
 * @throws Error if any UUID is not found, not archived, or a summary without compactMetadata
 */
export async function unarchiveMessages(
  sessionPath: string,
  messageUuids: string[]
): Promise<UnarchiveResult> {
  // Step 1 — Load: Read JSONL into ordered array and build UUID->index Map
  const fileHandle = Bun.file(sessionPath);
  const exists = await fileHandle.exists();
  if (!exists) {
    throw new Error(`Session file not found: ${sessionPath}`);
  }

  const allMessages: SessionMessage[] = [];
  const uuidToIndex = new Map<string, number>();

  const readStream = createReadStream(sessionPath);
  const rl = createInterface({
    input: readStream,
    crlfDelay: Infinity,
  });

  let lineNumber = 0;
  let lastLine: string | null = null;
  let lastLineNumber = 0;

  try {
    for await (const line of rl) {
      lineNumber++;

      if (lastLine !== null) {
        try {
          const message = JSON.parse(lastLine) as SessionMessage;
          const idx = allMessages.length;
          allMessages.push(message);

          const uuid = getMessageUuidFromAny(message);
          if (uuid) {
            uuidToIndex.set(uuid, idx);
          }
        } catch (err) {
          throw new Error(
            `Invalid JSON at line ${lastLineNumber} in ${sessionPath}: ${
              err instanceof Error ? err.message : String(err)
            }`
          );
        }
      }

      lastLine = line.trim();
      lastLineNumber = lineNumber;
    }

    // Handle the final line
    if (lastLine !== null && lastLine !== '') {
      try {
        const message = JSON.parse(lastLine) as SessionMessage;
        const idx = allMessages.length;
        allMessages.push(message);

        const uuid = getMessageUuidFromAny(message);
        if (uuid) {
          uuidToIndex.set(uuid, idx);
        }
      } catch {
        // Skip incomplete final line silently
      }
    }
  } finally {
    readStream.close();
  }

  // Deduplicate input UUIDs
  const uniqueUuids = [...new Set(messageUuids)];

  // Step 2 — Validate: Classify each input UUID
  const summaryUuids: Array<{ uuid: string; index: number; message: SummaryMessage }> = [];
  const archivedMessageIndices: number[] = [];
  const errors: string[] = [];

  for (const uuid of uniqueUuids) {
    const index = uuidToIndex.get(uuid);
    if (index === undefined) {
      errors.push(`not found: ${uuid}`);
      continue;
    }

    const message = allMessages[index];
    if (!message) {
      errors.push(`not found: ${uuid}`);
      continue;
    }

    if (message.type === 'summary' && message.compactMetadata) {
      summaryUuids.push({ uuid, index, message });
    } else if (message.type === 'summary' && !message.compactMetadata) {
      errors.push(`summary has no compactMetadata: ${uuid}`);
    } else if (
      (message.type === 'user' || message.type === 'assistant') &&
      message.archived === true
    ) {
      archivedMessageIndices.push(index);
    } else {
      errors.push(`not archived: ${uuid}`);
    }
  }

  // Atomic error handling: if any errors, throw with all listed
  if (errors.length > 0) {
    throw new Error(`Invalid UUIDs: ${errors.join('; ')}`);
  }

  // Step 3 — Expand summaries: Walk ranges, collect indices to unarchive
  const unarchiveSet = new Set<number>();
  const summaryRemovalSet = new Set<number>();
  const summariesRemoved: string[] = [];

  for (const { uuid: summaryUuid, index: summaryIndex, message: summary } of summaryUuids) {
    const { fromMessageId, toMessageId } = summary.compactMetadata!;

    const fromIndex = uuidToIndex.get(fromMessageId);
    const toIndex = uuidToIndex.get(toMessageId);

    if (fromIndex === undefined || toIndex === undefined) {
      // Range endpoints missing — should not happen, but handle gracefully
      errors.push(`summary range endpoints not found for: ${summaryUuid}`);
      continue;
    }

    // Walk the range and collect messages archived by this summary
    for (let i = fromIndex; i <= toIndex; i++) {
      const msg = allMessages[i];
      if (
        msg &&
        (msg.type === 'user' || msg.type === 'assistant') &&
        msg.archivedBy === summaryUuid
      ) {
        unarchiveSet.add(i);
      }
    }

    // Mark summary for removal
    summaryRemovalSet.add(summaryIndex);
    summariesRemoved.push(summaryUuid);
  }

  // Check for errors from expansion
  if (errors.length > 0) {
    throw new Error(`Invalid UUIDs: ${errors.join('; ')}`);
  }

  // Step 4 — Add individual archived messages
  for (const index of archivedMessageIndices) {
    unarchiveSet.add(index);
  }

  // Step 5 — Mutate in-memory
  const outputMessages: SessionMessage[] = [];
  const unarchivedMessages: SessionMessage[] = [];
  const retrievedSummaryUuids = new Set(summariesRemoved);

  for (let i = 0; i < allMessages.length; i++) {
    if (summaryRemovalSet.has(i)) {
      // Omit summary messages from output
      continue;
    }

    if (unarchiveSet.has(i)) {
      // Remove archive flags
      const message = allMessages[i];
      if (!message) {
        continue;
      }
      const unarchived = { ...message };
      if (unarchived.type === 'user' || unarchived.type === 'assistant') {
        delete unarchived.archived;
        delete unarchived.archivedAt;
        delete unarchived.archivedBy;
        const restored = unarchived as SessionMessage & { context_bonsai_v2?: { summary_uuid?: string } };
        if (
          restored.context_bonsai_v2 &&
          typeof restored.context_bonsai_v2.summary_uuid === 'string' &&
          retrievedSummaryUuids.has(restored.context_bonsai_v2.summary_uuid)
        ) {
          delete restored.context_bonsai_v2;
        }
      }
      outputMessages.push(unarchived as SessionMessage);
      unarchivedMessages.push(unarchived as SessionMessage);
    } else {
      const message = allMessages[i];
      if (message) {
        if (retrievedSummaryUuids.size > 0) {
          const restored = { ...message } as SessionMessage & {
            context_bonsai_v2?: { summary_uuid?: string };
          };
          if (
            restored.context_bonsai_v2 &&
            typeof restored.context_bonsai_v2.summary_uuid === 'string' &&
            retrievedSummaryUuids.has(restored.context_bonsai_v2.summary_uuid)
          ) {
            delete restored.context_bonsai_v2;
            outputMessages.push(restored as SessionMessage);
            continue;
          }
        }
        outputMessages.push(message);
      }
    }
  }

  // Step 6 — Write atomically
  await writeJsonlAtomic(sessionPath, outputMessages);

  return {
    messages: unarchivedMessages,
    messageCount: unarchivedMessages.length,
    summariesRemoved,
  };
}

/**
 * Retrieves (unarchives) messages by their UUIDs. This is the high-level orchestration
 * function for unarchiving and result shaping.
 *
 * Pass archived message UUIDs to restore individual messages, or summary UUIDs to
 * restore all messages from that summary (and remove the summary).
 *
 * @param sessionPath - Absolute path to the session JSONL file
 * @param ids - Array of UUIDs to retrieve (archived messages or summary UUIDs)
 * @returns Object containing message count, retrieved IDs, and which summaries were removed
 * @throws Error if any UUID is not found, not archived, or invalid
 */
export async function retrieveSession(
  sessionPath: string,
  ids: string[]
): Promise<RetrieveResult> {
  // Step 1: Call unarchiveMessages with the IDs array
  const unarchiveResult = await unarchiveMessages(sessionPath, ids);

  // Step 2: Collect unarchived message UUIDs only (user/assistant; exclude summary UUIDs)
  const unarchivedUuids: string[] = [];
  for (const msg of unarchiveResult.messages) {
    if (msg.type === 'user' || msg.type === 'assistant') {
      unarchivedUuids.push(msg.uuid);
    }
  }

  // Step 3b: Return complete result
  return {
    messageCount: unarchiveResult.messageCount,
    ids: unarchivedUuids,
    summariesRemoved: unarchiveResult.summariesRemoved,
  };
}
