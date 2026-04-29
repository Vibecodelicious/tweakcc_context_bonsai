// compact.test.ts - Tests for session compaction logic
import { describe, expect, test, beforeEach, afterEach, mock } from 'bun:test';
import { mkdir, rm, writeFile, readFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { markMessagesArchived, compactSession, getArchivedMarkerPath, unarchiveMessages, retrieveSession } from './compact';

// Create a temp directory for test files
let testDir: string;

beforeEach(async () => {
  testDir = join(tmpdir(), `compact-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await mkdir(testDir, { recursive: true });
});

afterEach(async () => {
  await rm(testDir, { recursive: true, force: true });
});

// Helper to create test session files
function createTestMessages(count: number, sessionId: string = 'test-session'): unknown[] {
  const messages = [];
  for (let i = 0; i < count; i++) {
    const isUser = i % 2 === 0;
    messages.push({
      sessionId,
      uuid: `msg-${i}`,
      parentUuid: i > 0 ? `msg-${i - 1}` : null,
      timestamp: new Date(Date.now() + i * 1000).toISOString(),
      cwd: '/test/project',
      version: '1.0.0',
      gitBranch: 'main',
      type: isUser ? 'user' : 'assistant',
      ...(isUser
        ? {
            userType: 'external',
            message: { role: 'user', content: `User message ${i}` },
            todos: [],
            permissionMode: 'default',
          }
        : {
            message: {
              model: 'claude-opus-4-5-20251101',
              id: `resp-${i}`,
              type: 'message',
              role: 'assistant',
              content: [{ type: 'text', text: `Assistant response ${i}` }],
              stop_reason: 'end_turn',
              usage: {},
            },
            requestId: `req-${i}`,
          }),
    });
  }
  return messages;
}

async function writeTestSession(filePath: string, messages: unknown[]): Promise<void> {
  const content = messages.map((m) => JSON.stringify(m)).join('\n') + '\n';
  await writeFile(filePath, content);
}

async function readSessionFile(filePath: string): Promise<unknown[]> {
  const content = await readFile(filePath, 'utf-8');
  return content
    .trim()
    .split('\n')
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l));
}

describe('markMessagesArchived', () => {
  test('marks messages in range as archived', async () => {
    const sessionPath = join(testDir, 'session.jsonl');
    const messages = createTestMessages(6);
    await writeTestSession(sessionPath, messages);

    const result = await markMessagesArchived(sessionPath, 'msg-1', 'msg-4', 'summary-uuid');

    expect(result.messageCount).toBe(4); // msg-1, msg-2, msg-3, msg-4
    expect(result.messages.length).toBe(4);

    // Verify file was updated
    const updated = await readSessionFile(sessionPath);
    expect(updated.length).toBe(6);

    // Check archived flags
    const msg0 = updated[0] as { archived?: boolean };
    const msg1 = updated[1] as { archived?: boolean; archivedBy?: string };
    const msg4 = updated[4] as { archived?: boolean; archivedBy?: string };
    const msg5 = updated[5] as { archived?: boolean };

    expect(msg0.archived).toBeUndefined();
    expect(msg1.archived).toBe(true);
    expect(msg1.archivedBy).toBe('summary-uuid');
    expect(msg4.archived).toBe(true);
    expect(msg4.archivedBy).toBe('summary-uuid');
    expect(msg5.archived).toBeUndefined();
  });

  test('archives all messages when range covers entire session', async () => {
    const sessionPath = join(testDir, 'session.jsonl');
    const messages = createTestMessages(4);
    await writeTestSession(sessionPath, messages);

    const result = await markMessagesArchived(sessionPath, 'msg-0', 'msg-3', 'summary-uuid');

    expect(result.messageCount).toBe(4);

    const updated = await readSessionFile(sessionPath);
    for (const msg of updated) {
      const m = msg as { archived?: boolean };
      expect(m.archived).toBe(true);
    }
  });

  test('throws when fromUuid not found', async () => {
    const sessionPath = join(testDir, 'session.jsonl');
    const messages = createTestMessages(4);
    await writeTestSession(sessionPath, messages);

    await expect(
      markMessagesArchived(sessionPath, 'nonexistent', 'msg-3', 'summary-uuid')
    ).rejects.toThrow(/fromUuid not found/);
  });

  test('throws when toUuid not found', async () => {
    const sessionPath = join(testDir, 'session.jsonl');
    const messages = createTestMessages(4);
    await writeTestSession(sessionPath, messages);

    await expect(
      markMessagesArchived(sessionPath, 'msg-0', 'nonexistent', 'summary-uuid')
    ).rejects.toThrow(/toUuid not found/);
  });

  test('throws when range is inverted (to before from)', async () => {
    const sessionPath = join(testDir, 'session.jsonl');
    const messages = createTestMessages(6);
    await writeTestSession(sessionPath, messages);

    await expect(
      markMessagesArchived(sessionPath, 'msg-4', 'msg-1', 'summary-uuid')
    ).rejects.toThrow(/Invalid range/);
  });

  test('throws when session file not found', async () => {
    await expect(
      markMessagesArchived('/nonexistent/session.jsonl', 'msg-0', 'msg-1', 'summary-uuid')
    ).rejects.toThrow(/not found/);
  });

  test('sets archivedAt timestamp on archived messages', async () => {
    const sessionPath = join(testDir, 'session.jsonl');
    const messages = createTestMessages(4);
    await writeTestSession(sessionPath, messages);

    const before = new Date();
    await markMessagesArchived(sessionPath, 'msg-1', 'msg-2', 'summary-uuid');
    const after = new Date();

    const updated = await readSessionFile(sessionPath);
    const msg1 = updated[1] as { archivedAt?: string };

    expect(msg1.archivedAt).toBeDefined();
    const archivedAt = new Date(msg1.archivedAt!);
    expect(archivedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(archivedAt.getTime()).toBeLessThanOrEqual(after.getTime());
  });
});

describe('compactSession', () => {
  test('compacts with skipSummary option', async () => {
    const sessionPath = join(testDir, 'session.jsonl');
    const messages = createTestMessages(6);
    await writeTestSession(sessionPath, messages);

    const result = await compactSession(sessionPath, 'msg-1', 'msg-4', { skipSummary: true });

    expect(result.messageCount).toBe(4);
    expect(result.summary).toBeNull();
    expect(result.summaryUuid).toBeDefined();
    expect(typeof result.summaryUuid).toBe('string');

    // Verify summary message was appended
    const updated = await readSessionFile(sessionPath);
    expect(updated.length).toBe(7); // 6 original + 1 summary

    const summaryMsg = updated[6] as {
      type: string;
      uuid: string;
      summary: string;
      compactMetadata: { fromMessageId: string; toMessageId: string; messageCount: number };
    };

    expect(summaryMsg.type).toBe('summary');
    expect(summaryMsg.uuid).toBe(result.summaryUuid);
    expect(summaryMsg.summary).toContain('4 messages');
    expect(summaryMsg.compactMetadata.fromMessageId).toBe('msg-1');
    expect(summaryMsg.compactMetadata.toMessageId).toBe('msg-4');
    expect(summaryMsg.compactMetadata.messageCount).toBe(4);
  });

  test('generates valid UUID for summary', async () => {
    const sessionPath = join(testDir, 'session.jsonl');
    const messages = createTestMessages(4);
    await writeTestSession(sessionPath, messages);

    const result = await compactSession(sessionPath, 'msg-0', 'msg-3', { skipSummary: true });

    // UUID format validation (UUID v4 format)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(uuidRegex.test(result.summaryUuid)).toBe(true);
  });

  test('links archived messages to summary via archivedBy', async () => {
    const sessionPath = join(testDir, 'session.jsonl');
    const messages = createTestMessages(6);
    await writeTestSession(sessionPath, messages);

    const result = await compactSession(sessionPath, 'msg-1', 'msg-3', { skipSummary: true });

    const updated = await readSessionFile(sessionPath);

    // Messages in range should reference the summary UUID
    const msg1 = updated[1] as { archivedBy?: string };
    const msg2 = updated[2] as { archivedBy?: string };
    const msg3 = updated[3] as { archivedBy?: string };

    expect(msg1.archivedBy).toBe(result.summaryUuid);
    expect(msg2.archivedBy).toBe(result.summaryUuid);
    expect(msg3.archivedBy).toBe(result.summaryUuid);
  });

  test('summary message has correct timestamp', async () => {
    const sessionPath = join(testDir, 'session.jsonl');
    const messages = createTestMessages(4);
    await writeTestSession(sessionPath, messages);

    const before = new Date();
    await compactSession(sessionPath, 'msg-0', 'msg-3', { skipSummary: true });
    const after = new Date();

    const updated = await readSessionFile(sessionPath);
    const summaryMsg = updated[4] as { timestamp: string };

    const timestamp = new Date(summaryMsg.timestamp);
    expect(timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  test('throws when fromUuid not found', async () => {
    const sessionPath = join(testDir, 'session.jsonl');
    const messages = createTestMessages(4);
    await writeTestSession(sessionPath, messages);

    await expect(
      compactSession(sessionPath, 'nonexistent', 'msg-3', { skipSummary: true })
    ).rejects.toThrow(/fromUuid not found/);
  });

  test('throws when toUuid not found', async () => {
    const sessionPath = join(testDir, 'session.jsonl');
    const messages = createTestMessages(4);
    await writeTestSession(sessionPath, messages);

    await expect(
      compactSession(sessionPath, 'msg-0', 'nonexistent', { skipSummary: true })
    ).rejects.toThrow(/toUuid not found/);
  });

  test('throws when range is inverted', async () => {
    const sessionPath = join(testDir, 'session.jsonl');
    const messages = createTestMessages(6);
    await writeTestSession(sessionPath, messages);

    await expect(
      compactSession(sessionPath, 'msg-4', 'msg-1', { skipSummary: true })
    ).rejects.toThrow(/Invalid range/);
  });

  test('handles single message range', async () => {
    const sessionPath = join(testDir, 'session.jsonl');
    const messages = createTestMessages(4);
    await writeTestSession(sessionPath, messages);

    const result = await compactSession(sessionPath, 'msg-2', 'msg-2', { skipSummary: true });

    expect(result.messageCount).toBe(1);

    const updated = await readSessionFile(sessionPath);
    expect(updated.length).toBe(5); // 4 original + 1 summary

    // Only msg-2 should be archived
    const msg1 = updated[1] as { archived?: boolean };
    const msg2 = updated[2] as { archived?: boolean };
    const msg3 = updated[3] as { archived?: boolean };

    expect(msg1.archived).toBeUndefined();
    expect(msg2.archived).toBe(true);
    expect(msg3.archived).toBeUndefined();
  });

  test('preserves non-archived messages', async () => {
    const sessionPath = join(testDir, 'session.jsonl');
    const messages = createTestMessages(6);
    await writeTestSession(sessionPath, messages);

    await compactSession(sessionPath, 'msg-2', 'msg-3', { skipSummary: true });

    const updated = await readSessionFile(sessionPath);

    // First two and last two messages should be unchanged
    const msg0 = updated[0] as { uuid: string; archived?: boolean };
    const msg1 = updated[1] as { uuid: string; archived?: boolean };
    const msg4 = updated[4] as { uuid: string; archived?: boolean };
    const msg5 = updated[5] as { uuid: string; archived?: boolean };

    expect(msg0.uuid).toBe('msg-0');
    expect(msg0.archived).toBeUndefined();
    expect(msg1.uuid).toBe('msg-1');
    expect(msg1.archived).toBeUndefined();
    expect(msg4.uuid).toBe('msg-4');
    expect(msg4.archived).toBeUndefined();
    expect(msg5.uuid).toBe('msg-5');
    expect(msg5.archived).toBeUndefined();
  });
});

describe('marker file (archived UUIDs)', () => {
  test('creates marker file with archived UUIDs on first compaction', async () => {
    const sessionId = `test-session-${Date.now()}`;
    const sessionPath = join(testDir, `${sessionId}.jsonl`);
    const messages = createTestMessages(6, sessionId);
    await writeTestSession(sessionPath, messages);

    await markMessagesArchived(sessionPath, 'msg-1', 'msg-2', 'summary-uuid-1');

    const markerPath = getArchivedMarkerPath(sessionId);
    const markerContent = await Bun.file(markerPath).json();

    expect(Array.isArray(markerContent)).toBe(true);
    expect(markerContent).toContain('msg-1');
    expect(markerContent).toContain('msg-2');
    expect(markerContent.length).toBe(2);

    // Cleanup marker file
    await rm(markerPath, { force: true });
  });

  test('accumulates UUIDs across multiple compactions', async () => {
    const sessionId = `test-session-${Date.now()}`;
    const sessionPath = join(testDir, `${sessionId}.jsonl`);
    const messages = createTestMessages(10, sessionId);
    await writeTestSession(sessionPath, messages);

    // First compaction: archive msg-1 and msg-2
    await markMessagesArchived(sessionPath, 'msg-1', 'msg-2', 'summary-uuid-1');

    const markerPath = getArchivedMarkerPath(sessionId);
    let markerContent = await Bun.file(markerPath).json();
    expect(markerContent).toContain('msg-1');
    expect(markerContent).toContain('msg-2');
    expect(markerContent.length).toBe(2);

    // Second compaction: archive msg-4 and msg-5
    await markMessagesArchived(sessionPath, 'msg-4', 'msg-5', 'summary-uuid-2');

    markerContent = await Bun.file(markerPath).json();
    // Should contain both old and new UUIDs
    expect(markerContent).toContain('msg-1');
    expect(markerContent).toContain('msg-2');
    expect(markerContent).toContain('msg-4');
    expect(markerContent).toContain('msg-5');
    expect(markerContent.length).toBe(4);

    // Cleanup marker file
    await rm(markerPath, { force: true });
  });

  test('deduplicates UUIDs when same range is compacted twice', async () => {
    const sessionId = `test-session-${Date.now()}`;
    const sessionPath = join(testDir, `${sessionId}.jsonl`);
    const messages = createTestMessages(6, sessionId);
    await writeTestSession(sessionPath, messages);

    // Compact same range twice (edge case - shouldn't happen but should handle gracefully)
    await markMessagesArchived(sessionPath, 'msg-1', 'msg-2', 'summary-uuid-1');
    await markMessagesArchived(sessionPath, 'msg-1', 'msg-2', 'summary-uuid-2');

    const markerPath = getArchivedMarkerPath(sessionId);
    const markerContent = await Bun.file(markerPath).json();

    // Should not have duplicates
    expect(markerContent.length).toBe(2);
    expect(new Set(markerContent).size).toBe(2);

    // Cleanup marker file
    await rm(markerPath, { force: true });
  });
});

describe('unarchiveMessages', () => {
  test('unarchives messages via summary UUID (restores range, removes summary)', async () => {
    const sessionPath = join(testDir, 'session.jsonl');
    const messages = createTestMessages(6);
    await writeTestSession(sessionPath, messages);

    // First compact the session
    const compactResult = await compactSession(sessionPath, 'msg-1', 'msg-4', { skipSummary: true });

    // Verify messages are archived
    let updated = await readSessionFile(sessionPath);
    const msg1Before = updated[1] as { archived?: boolean };
    expect(msg1Before.archived).toBe(true);

    // Now unarchive by passing summary UUID
    const result = await unarchiveMessages(sessionPath, [compactResult.summaryUuid]);

    expect(result.messageCount).toBe(4);
    expect(result.summariesRemoved).toEqual([compactResult.summaryUuid]);
    expect(result.messages.length).toBe(4);

    // Verify messages are unarchived
    updated = await readSessionFile(sessionPath);
    expect(updated.length).toBe(6); // Summary was removed

    const msg1After = updated[1] as { archived?: boolean; archivedAt?: string; archivedBy?: string };
    expect(msg1After.archived).toBeUndefined();
    expect(msg1After.archivedAt).toBeUndefined();
    expect(msg1After.archivedBy).toBeUndefined();
  });

  test('unarchives a single archived message by UUID', async () => {
    const sessionPath = join(testDir, 'session.jsonl');
    const messages = createTestMessages(6);
    await writeTestSession(sessionPath, messages);

    // Compact messages 1-4
    await compactSession(sessionPath, 'msg-1', 'msg-4', { skipSummary: true });

    // Unarchive just msg-2
    const result = await unarchiveMessages(sessionPath, ['msg-2']);

    expect(result.messageCount).toBe(1);
    expect(result.summariesRemoved).toEqual([]);
    expect(result.messages.length).toBe(1);

    // Verify only msg-2 is unarchived, others remain archived
    const updated = await readSessionFile(sessionPath);
    const msg1 = updated[1] as { uuid: string; archived?: boolean };
    const msg2 = updated[2] as { uuid: string; archived?: boolean };
    const msg3 = updated[3] as { uuid: string; archived?: boolean };

    expect(msg1.archived).toBe(true);
    expect(msg2.archived).toBeUndefined();
    expect(msg3.archived).toBe(true);
  });

  test('unarchives multiple archived messages in one call', async () => {
    const sessionPath = join(testDir, 'session.jsonl');
    const messages = createTestMessages(6);
    await writeTestSession(sessionPath, messages);

    // Compact messages 1-4
    await compactSession(sessionPath, 'msg-1', 'msg-4', { skipSummary: true });

    // Unarchive msg-1 and msg-3
    const result = await unarchiveMessages(sessionPath, ['msg-1', 'msg-3']);

    expect(result.messageCount).toBe(2);
    expect(result.summariesRemoved).toEqual([]);

    // Verify msg-1 and msg-3 unarchived, msg-2 and msg-4 still archived
    const updated = await readSessionFile(sessionPath);
    const msg1 = updated[1] as { uuid: string; archived?: boolean };
    const msg2 = updated[2] as { uuid: string; archived?: boolean };
    const msg3 = updated[3] as { uuid: string; archived?: boolean };
    const msg4 = updated[4] as { uuid: string; archived?: boolean };

    expect(msg1.archived).toBeUndefined();
    expect(msg2.archived).toBe(true);
    expect(msg3.archived).toBeUndefined();
    expect(msg4.archived).toBe(true);
  });

  test('handles mixed array of summary UUID and individual message UUID', async () => {
    const sessionPath = join(testDir, 'session.jsonl');
    const messages = createTestMessages(10);
    await writeTestSession(sessionPath, messages);

    // Compact two separate ranges
    const compact1 = await compactSession(sessionPath, 'msg-1', 'msg-2', { skipSummary: true });
    const compact2 = await compactSession(sessionPath, 'msg-4', 'msg-7', { skipSummary: true });

    // Mixed: expand summary1 entirely + unarchive msg-5 individually
    const result = await unarchiveMessages(sessionPath, [compact1.summaryUuid, 'msg-5']);

    // compact1 range had 2 messages, plus 1 individual = 3 total
    expect(result.messageCount).toBe(3);
    expect(result.summariesRemoved).toEqual([compact1.summaryUuid]);

    // Verify: msg-1, msg-2 unarchived (via summary), msg-5 unarchived (individual)
    const updated = await readSessionFile(sessionPath);
    const msg1 = updated.find((m: unknown) => (m as { uuid?: string }).uuid === 'msg-1') as { archived?: boolean };
    const msg2 = updated.find((m: unknown) => (m as { uuid?: string }).uuid === 'msg-2') as { archived?: boolean };
    const msg5 = updated.find((m: unknown) => (m as { uuid?: string }).uuid === 'msg-5') as { archived?: boolean };
    const msg6 = updated.find((m: unknown) => (m as { uuid?: string }).uuid === 'msg-6') as { archived?: boolean };

    expect(msg1.archived).toBeUndefined();
    expect(msg2.archived).toBeUndefined();
    expect(msg5.archived).toBeUndefined();
    expect(msg6.archived).toBe(true); // Not requested, still archived
  });

  test('deduplicates input UUIDs silently', async () => {
    const sessionPath = join(testDir, 'session.jsonl');
    const messages = createTestMessages(6);
    await writeTestSession(sessionPath, messages);

    await compactSession(sessionPath, 'msg-1', 'msg-4', { skipSummary: true });

    // Pass the same UUID twice
    const result = await unarchiveMessages(sessionPath, ['msg-2', 'msg-2']);

    expect(result.messageCount).toBe(1); // Not 2
  });

  test('throws atomic error when UUID not found (no changes)', async () => {
    const sessionPath = join(testDir, 'session.jsonl');
    const messages = createTestMessages(6);
    await writeTestSession(sessionPath, messages);

    await compactSession(sessionPath, 'msg-1', 'msg-4', { skipSummary: true });

    // Save file state before
    const beforeContent = await readFile(sessionPath, 'utf-8');

    // Try to unarchive with a nonexistent UUID
    await expect(
      unarchiveMessages(sessionPath, ['nonexistent-uuid'])
    ).rejects.toThrow(/not found: nonexistent-uuid/);

    // Verify no changes were made
    const afterContent = await readFile(sessionPath, 'utf-8');
    expect(afterContent).toBe(beforeContent);
  });

  test('throws atomic error when UUID is not archived (no changes)', async () => {
    const sessionPath = join(testDir, 'session.jsonl');
    const messages = createTestMessages(6);
    await writeTestSession(sessionPath, messages);

    await compactSession(sessionPath, 'msg-1', 'msg-2', { skipSummary: true });

    // Save file state before
    const beforeContent = await readFile(sessionPath, 'utf-8');

    // msg-4 exists but is not archived
    await expect(
      unarchiveMessages(sessionPath, ['msg-4'])
    ).rejects.toThrow(/not archived: msg-4/);

    // Verify no changes were made
    const afterContent = await readFile(sessionPath, 'utf-8');
    expect(afterContent).toBe(beforeContent);
  });

  test('throws error when summary has no compactMetadata', async () => {
    const sessionPath = join(testDir, 'session.jsonl');
    const messages = createTestMessages(4);
    // Add a summary message without compactMetadata
    messages.push({
      type: 'summary',
      uuid: 'summary-no-metadata',
      summary: 'Test summary without metadata',
      timestamp: new Date().toISOString(),
    });
    await writeTestSession(sessionPath, messages);

    await expect(
      unarchiveMessages(sessionPath, ['summary-no-metadata'])
    ).rejects.toThrow(/summary has no compactMetadata: summary-no-metadata/);
  });

  test('only unarchives messages with matching archivedBy when using summary', async () => {
    const sessionPath = join(testDir, 'session.jsonl');
    const messages = createTestMessages(8);
    await writeTestSession(sessionPath, messages);

    // First compact messages 1-2
    const compact1 = await compactSession(sessionPath, 'msg-1', 'msg-2', { skipSummary: true });
    // Then compact messages 4-5
    const compact2 = await compactSession(sessionPath, 'msg-4', 'msg-5', { skipSummary: true });

    // Unarchive only the first compaction via summary
    const result = await unarchiveMessages(sessionPath, [compact1.summaryUuid]);

    expect(result.messageCount).toBe(2);
    expect(result.summariesRemoved).toEqual([compact1.summaryUuid]);

    // Verify first range is unarchived but second is still archived
    const updated = await readSessionFile(sessionPath);

    const msg1 = updated[1] as { archived?: boolean; uuid: string };
    const msg4 = updated.find((m: unknown) => (m as { uuid?: string }).uuid === 'msg-4') as { archived?: boolean };

    expect(msg1.archived).toBeUndefined();
    expect(msg4.archived).toBe(true);
  });

  test('handles file-history-snapshot in range (passes through unchanged)', async () => {
    const sessionPath = join(testDir, 'session.jsonl');
    const messages = createTestMessages(4);

    // Insert a file-history-snapshot in the middle
    const fileHistorySnapshot = {
      type: 'file-history-snapshot',
      messageId: 'fhs-1',
      snapshot: {
        messageId: 'fhs-1',
        trackedFileBackups: {},
        timestamp: new Date().toISOString(),
      },
      isSnapshotUpdate: false,
    };

    // Insert between msg-1 and msg-2
    const messagesWithSnapshot = [
      messages[0],
      messages[1],
      fileHistorySnapshot,
      messages[2],
      messages[3],
    ];
    await writeTestSession(sessionPath, messagesWithSnapshot);

    // Compact range that includes the file-history-snapshot
    const compactResult = await compactSession(sessionPath, 'msg-1', 'msg-3', { skipSummary: true });

    // Now unarchive via summary
    const result = await unarchiveMessages(sessionPath, [compactResult.summaryUuid]);

    // Should unarchive user/assistant messages but leave file-history-snapshot unchanged
    expect(result.messageCount).toBe(3); // msg-1, msg-2, msg-3

    const updated = await readSessionFile(sessionPath);

    // File history snapshot should still be there and unchanged
    const fhs = updated.find((m: unknown) => (m as { type: string }).type === 'file-history-snapshot');
    expect(fhs).toBeDefined();
  });

  test('returns accurate list of unarchived messages', async () => {
    const sessionPath = join(testDir, 'session.jsonl');
    const messages = createTestMessages(6);
    await writeTestSession(sessionPath, messages);

    const compactResult = await compactSession(sessionPath, 'msg-2', 'msg-3', { skipSummary: true });

    const result = await unarchiveMessages(sessionPath, [compactResult.summaryUuid]);

    expect(result.messages.length).toBe(2);

    const uuids = result.messages.map((m) => (m as { uuid: string }).uuid);
    expect(uuids).toContain('msg-2');
    expect(uuids).toContain('msg-3');
  });

  test('throws when session file not found', async () => {
    await expect(
      unarchiveMessages('/nonexistent/session.jsonl', ['some-uuid'])
    ).rejects.toThrow(/not found/);
  });
});

describe('retrieveSession', () => {
  test('retrieves messages via summary UUID (removes summary, unarchives messages)', async () => {
    const sessionId = `test-session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const sessionPath = join(testDir, `${sessionId}.jsonl`);
    const messages = createTestMessages(6, sessionId);
    await writeTestSession(sessionPath, messages);

    // First compact the session
    const compactResult = await compactSession(sessionPath, 'msg-1', 'msg-4', { skipSummary: true });

    // Verify compact worked
    let updated = await readSessionFile(sessionPath);
    expect(updated.length).toBe(7); // 6 + summary

    // Now retrieve via summary UUID
    const result = await retrieveSession(sessionPath, [compactResult.summaryUuid]);

    expect(result.messageCount).toBe(4);
    expect(result.ids.length).toBe(4);
    expect(result.summariesRemoved).toEqual([compactResult.summaryUuid]);

    // Verify summary was removed
    updated = await readSessionFile(sessionPath);
    expect(updated.length).toBe(6); // back to original count

    const hasSummary = updated.some((m: unknown) => (m as { type: string }).type === 'summary');
    expect(hasSummary).toBe(false);

    // Verify messages are unarchived
    const msg1 = updated[1] as { archived?: boolean };
    expect(msg1.archived).toBeUndefined();

    // Cleanup marker file
    const markerPath = getArchivedMarkerPath(sessionId);
    await rm(markerPath, { force: true });
  });

  test('retrieves individual archived messages', async () => {
    const sessionId = `test-session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const sessionPath = join(testDir, `${sessionId}.jsonl`);
    const messages = createTestMessages(6, sessionId);
    await writeTestSession(sessionPath, messages);

    // Compact
    await compactSession(sessionPath, 'msg-1', 'msg-4', { skipSummary: true });

    // Retrieve just msg-2
    const result = await retrieveSession(sessionPath, ['msg-2']);

    expect(result.messageCount).toBe(1);
    expect(result.ids).toEqual(['msg-2']);
    expect(result.summariesRemoved).toEqual([]);

    // Cleanup
    const markerPath = getArchivedMarkerPath(sessionId);
    await rm(markerPath, { force: true });
  });

  test('propagates errors from unarchiveMessages (UUID not found)', async () => {
    const sessionId = `test-session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const sessionPath = join(testDir, `${sessionId}.jsonl`);
    const messages = createTestMessages(4, sessionId);
    await writeTestSession(sessionPath, messages);

    await expect(
      retrieveSession(sessionPath, ['nonexistent-summary-uuid'])
    ).rejects.toThrow(/not found: nonexistent-summary-uuid/);
  });

  test('propagates errors from unarchiveMessages (not archived)', async () => {
    const sessionId = `test-session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const sessionPath = join(testDir, `${sessionId}.jsonl`);
    const messages = createTestMessages(4, sessionId);
    await writeTestSession(sessionPath, messages);

    await expect(
      retrieveSession(sessionPath, ['msg-0'])
    ).rejects.toThrow(/not archived: msg-0/);
  });

  test('updates marker file by removing unarchived UUIDs', async () => {
    const sessionId = `test-session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const sessionPath = join(testDir, `${sessionId}.jsonl`);
    const messages = createTestMessages(8, sessionId);
    await writeTestSession(sessionPath, messages);

    const markerPath = getArchivedMarkerPath(sessionId);

    // Compact two separate ranges
    const compact1 = await compactSession(sessionPath, 'msg-1', 'msg-2', { skipSummary: true });
    const compact2 = await compactSession(sessionPath, 'msg-4', 'msg-5', { skipSummary: true });

    // Verify marker file has all 4 UUIDs
    let markerContent = await Bun.file(markerPath).json();
    expect(markerContent).toContain('msg-1');
    expect(markerContent).toContain('msg-2');
    expect(markerContent).toContain('msg-4');
    expect(markerContent).toContain('msg-5');

    // Retrieve only the first compaction via summary
    await retrieveSession(sessionPath, [compact1.summaryUuid]);

    // Verify marker file no longer has msg-1 and msg-2, but still has msg-4 and msg-5
    markerContent = await Bun.file(markerPath).json();
    expect(markerContent).not.toContain('msg-1');
    expect(markerContent).not.toContain('msg-2');
    expect(markerContent).toContain('msg-4');
    expect(markerContent).toContain('msg-5');

    // Cleanup
    await rm(markerPath, { force: true });
  });

  test('preserves empty marker file when all UUIDs removed', async () => {
    const sessionId = `test-session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const sessionPath = join(testDir, `${sessionId}.jsonl`);
    const messages = createTestMessages(6, sessionId);
    await writeTestSession(sessionPath, messages);

    const markerPath = getArchivedMarkerPath(sessionId);

    // Compact
    const compactResult = await compactSession(sessionPath, 'msg-1', 'msg-2', { skipSummary: true });

    // Verify marker file has UUIDs
    let markerContent = await Bun.file(markerPath).json();
    expect(markerContent.length).toBe(2);

    // Retrieve all via summary
    await retrieveSession(sessionPath, [compactResult.summaryUuid]);

    // Verify marker file is empty array (not deleted, per Decision 3)
    const markerExists = await Bun.file(markerPath).exists();
    expect(markerExists).toBe(true);

    markerContent = await Bun.file(markerPath).json();
    expect(markerContent).toEqual([]);

    // Cleanup
    await rm(markerPath, { force: true });
  });

  test('handles missing marker file gracefully during retrieve', async () => {
    const sessionId = `test-session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const sessionPath = join(testDir, `${sessionId}.jsonl`);
    const messages = createTestMessages(6, sessionId);
    await writeTestSession(sessionPath, messages);

    const markerPath = getArchivedMarkerPath(sessionId);

    // Compact
    const compactResult = await compactSession(sessionPath, 'msg-1', 'msg-2', { skipSummary: true });

    // Remove marker file to simulate edge case
    await rm(markerPath, { force: true });

    // Retrieve should still work (handles missing file gracefully)
    const result = await retrieveSession(sessionPath, [compactResult.summaryUuid]);

    expect(result.messageCount).toBe(2);

    // Marker file should be created with empty array
    const markerContent = await Bun.file(markerPath).json();
    expect(markerContent).toEqual([]);

    // Cleanup
    await rm(markerPath, { force: true });
  });

  test('does not fail retrieve when marker cleanup throws after session mutation', async () => {
    const sessionId = `test-session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const sessionPath = join(testDir, `${sessionId}.jsonl`);
    const messages = createTestMessages(6, sessionId);
    await writeTestSession(sessionPath, messages);

    const compactResult = await compactSession(sessionPath, 'msg-1', 'msg-2', { skipSummary: true });

    const originalWrite = Bun.write;
    (Bun as unknown as { write: typeof Bun.write }).write = (async (...args: Parameters<typeof Bun.write>) => {
      const target = String(args[0]);
      if (target === getArchivedMarkerPath(sessionId)) {
        throw new Error('simulated marker cleanup failure');
      }
      return originalWrite(...args);
    }) as typeof Bun.write;

    try {
      const result = await retrieveSession(sessionPath, [compactResult.summaryUuid]);
      expect(result.messageCount).toBe(2);
      expect(result.summariesRemoved).toEqual([compactResult.summaryUuid]);

      const updated = await readSessionFile(sessionPath);
      expect(updated.some((m: unknown) => (m as { type: string }).type === 'summary')).toBe(false);
      const msg1 = updated.find((m: unknown) => (m as { uuid?: string }).uuid === 'msg-1') as {
        archived?: boolean;
      };
      expect(msg1.archived).toBeUndefined();
    } finally {
      (Bun as unknown as { write: typeof Bun.write }).write = originalWrite;
      const markerPath = getArchivedMarkerPath(sessionId);
      await rm(markerPath, { force: true });
    }
  });

  test('returns correct result structure', async () => {
    const sessionId = `test-session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const sessionPath = join(testDir, `${sessionId}.jsonl`);
    const messages = createTestMessages(6, sessionId);
    await writeTestSession(sessionPath, messages);

    const compactResult = await compactSession(sessionPath, 'msg-2', 'msg-3', { skipSummary: true });

    const result = await retrieveSession(sessionPath, [compactResult.summaryUuid]);

    // Verify result structure
    expect(result).toHaveProperty('messageCount');
    expect(result).toHaveProperty('ids');
    expect(result).toHaveProperty('summariesRemoved');

    expect(typeof result.messageCount).toBe('number');
    expect(Array.isArray(result.ids)).toBe(true);
    expect(Array.isArray(result.summariesRemoved)).toBe(true);

    // Cleanup
    const markerPath = getArchivedMarkerPath(sessionId);
    await rm(markerPath, { force: true });
  });
});
