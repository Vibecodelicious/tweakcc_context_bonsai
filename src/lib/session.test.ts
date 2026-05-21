// session.test.ts - Tests for session file operations
import { describe, expect, test, beforeEach, afterEach } from 'bun:test';
import { mkdir, rm, writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  findCurrentSession,
  readSessionMessages,
  validateJsonlIntegrity,
  findMessageByUuid,
  getMessageRange,
} from './session';

// Create a temp directory for test files
let testDir: string;
let testClaudeDir: string;

beforeEach(async () => {
  testDir = join(tmpdir(), `session-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  testClaudeDir = join(testDir, '.claude');
  await mkdir(testClaudeDir, { recursive: true });
});

afterEach(async () => {
  await rm(testDir, { recursive: true, force: true });
});

describe('validateJsonlIntegrity', () => {
  test('returns valid for file with valid JSON lines', async () => {
    const filePath = join(testDir, 'valid.jsonl');
    await writeFile(
      filePath,
      '{"line": 1}\n{"line": 2}\n{"line": 3}\n'
    );

    const result = await validateJsonlIntegrity(filePath);
    expect(result.valid).toBe(true);
    expect(result.lineCount).toBe(3);
    expect(result.error).toBeUndefined();
  });

  test('returns invalid for file with bad JSON in middle', async () => {
    const filePath = join(testDir, 'invalid.jsonl');
    await writeFile(
      filePath,
      '{"line": 1}\n{invalid json}\n{"line": 3}\n'
    );

    const result = await validateJsonlIntegrity(filePath);
    expect(result.valid).toBe(false);
    expect(result.lineCount).toBe(2); // Reports the line number where error occurred
    expect(result.error).toContain('line 2');
  });

  test('returns valid for file with incomplete final line', async () => {
    const filePath = join(testDir, 'incomplete.jsonl');
    await writeFile(
      filePath,
      '{"line": 1}\n{"line": 2}\n{"incomplete": tru'
    );

    const result = await validateJsonlIntegrity(filePath);
    expect(result.valid).toBe(true);
    expect(result.lineCount).toBe(2); // Only counts valid lines
    expect(result.error).toBeUndefined();
  });

  test('returns invalid for non-existent file', async () => {
    const result = await validateJsonlIntegrity('/nonexistent/path.jsonl');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('not found');
  });

  test('handles empty lines gracefully', async () => {
    const filePath = join(testDir, 'empty-lines.jsonl');
    await writeFile(
      filePath,
      '{"line": 1}\n\n{"line": 2}\n\n'
    );

    const result = await validateJsonlIntegrity(filePath);
    expect(result.valid).toBe(true);
  });

  test('handles empty file', async () => {
    const filePath = join(testDir, 'empty.jsonl');
    await writeFile(filePath, '');

    const result = await validateJsonlIntegrity(filePath);
    expect(result.valid).toBe(true);
    expect(result.lineCount).toBe(0);
  });
});

describe('readSessionMessages', () => {
  test('yields all valid messages', async () => {
    const filePath = join(testDir, 'session.jsonl');
    const messages = [
      { sessionId: 'test', uuid: '1', type: 'user' },
      { sessionId: 'test', uuid: '2', type: 'assistant' },
      { sessionId: 'test', uuid: '3', type: 'user' },
    ];
    await writeFile(
      filePath,
      messages.map((m) => JSON.stringify(m)).join('\n') + '\n'
    );

    const collected: unknown[] = [];
    for await (const msg of readSessionMessages(filePath)) {
      collected.push(msg);
    }

    expect(collected.length).toBe(3);
    expect((collected[0] as { uuid: string }).uuid).toBe('1');
    expect((collected[1] as { uuid: string }).uuid).toBe('2');
    expect((collected[2] as { uuid: string }).uuid).toBe('3');
  });

  test('skips incomplete final line', async () => {
    const filePath = join(testDir, 'incomplete.jsonl');
    await writeFile(
      filePath,
      '{"complete": true}\n{"incomplete": tru'
    );

    const collected: unknown[] = [];
    for await (const msg of readSessionMessages(filePath)) {
      collected.push(msg);
    }

    expect(collected.length).toBe(1);
    expect((collected[0] as { complete: boolean }).complete).toBe(true);
  });

  test('throws on invalid JSON in middle of file', async () => {
    const filePath = join(testDir, 'bad-middle.jsonl');
    await writeFile(
      filePath,
      '{"line": 1}\n{bad json}\n{"line": 3}\n'
    );

    const gen = readSessionMessages(filePath);

    // First message should succeed
    const first = await gen.next();
    expect(first.done).toBe(false);

    // Second should throw
    await expect(gen.next()).rejects.toThrow(/Invalid JSON at line 2/);
  });

  test('throws for non-existent file', async () => {
    const gen = readSessionMessages('/nonexistent/path.jsonl');
    await expect(gen.next()).rejects.toThrow(/not found/);
  });
});

describe('findCurrentSession', () => {
  // Note: findCurrentSession reads from ~/.claude/history.jsonl
  // We can't easily test this without mocking the path resolution
  // These tests verify the logic works with actual files if the user has them

  test('returns null for non-existent project', async () => {
    // This uses the real ~/.claude/history.jsonl if it exists
    // If it doesn't exist, it should return null
    const result = await findCurrentSession('/definitely/not/a/real/project/path/12345');
    expect(result).toBe(null);
  });
});

describe('findMessageByUuid', () => {
  test('finds message when UUID exists', async () => {
    const filePath = join(testDir, 'session.jsonl');
    const messages = [
      { sessionId: 'sess-1', uuid: 'uuid-1', parentUuid: null, type: 'user', timestamp: '2025-01-01T00:00:00Z' },
      { sessionId: 'sess-1', uuid: 'uuid-2', parentUuid: 'uuid-1', type: 'assistant', timestamp: '2025-01-01T00:01:00Z' },
      { sessionId: 'sess-1', uuid: 'uuid-3', parentUuid: 'uuid-2', type: 'user', timestamp: '2025-01-01T00:02:00Z' },
    ];
    await writeFile(
      filePath,
      messages.map((m) => JSON.stringify(m)).join('\n') + '\n'
    );

    const result = await findMessageByUuid(filePath, 'uuid-2');
    expect(result).not.toBeNull();
    expect(result?.type).toBe('assistant');
    expect((result as { uuid: string }).uuid).toBe('uuid-2');
  });

  test('returns null when UUID does not exist', async () => {
    const filePath = join(testDir, 'session.jsonl');
    const messages = [
      { sessionId: 'sess-1', uuid: 'uuid-1', parentUuid: null, type: 'user', timestamp: '2025-01-01T00:00:00Z' },
      { sessionId: 'sess-1', uuid: 'uuid-2', parentUuid: 'uuid-1', type: 'assistant', timestamp: '2025-01-01T00:01:00Z' },
    ];
    await writeFile(
      filePath,
      messages.map((m) => JSON.stringify(m)).join('\n') + '\n'
    );

    const result = await findMessageByUuid(filePath, 'nonexistent-uuid');
    expect(result).toBeNull();
  });

  test('returns null for messages without uuid field (summary, file-history-snapshot)', async () => {
    const filePath = join(testDir, 'session.jsonl');
    const messages = [
      { type: 'summary', summary: 'A summary message', timestamp: '2025-01-01T00:00:00Z' },
      { type: 'file-history-snapshot', messageId: 'msg-1', snapshot: {}, isSnapshotUpdate: false },
    ];
    await writeFile(
      filePath,
      messages.map((m) => JSON.stringify(m)).join('\n') + '\n'
    );

    // These messages don't have uuid field, so searching for any uuid should return null
    const result = await findMessageByUuid(filePath, 'any-uuid');
    expect(result).toBeNull();
  });

  test('throws error for non-existent session file', async () => {
    await expect(
      findMessageByUuid('/nonexistent/session.jsonl', 'any-uuid')
    ).rejects.toThrow(/not found/);
  });

  test('throws error for invalid JSON in middle of file', async () => {
    const filePath = join(testDir, 'session.jsonl');
    await writeFile(
      filePath,
      '{"uuid": "uuid-1", "type": "user"}\n{invalid json}\n{"uuid": "uuid-3", "type": "user"}\n'
    );

    await expect(
      findMessageByUuid(filePath, 'uuid-3')
    ).rejects.toThrow(/Invalid JSON at line 2/);
  });

  test('finds first matching uuid in file with duplicates', async () => {
    const filePath = join(testDir, 'session.jsonl');
    const messages = [
      { sessionId: 'sess-1', uuid: 'target-uuid', parentUuid: null, type: 'user', data: 'first' },
      { sessionId: 'sess-1', uuid: 'target-uuid', parentUuid: null, type: 'assistant', data: 'second' },
    ];
    await writeFile(
      filePath,
      messages.map((m) => JSON.stringify(m)).join('\n') + '\n'
    );

    const result = await findMessageByUuid(filePath, 'target-uuid');
    expect(result).not.toBeNull();
    expect((result as unknown as { data: string }).data).toBe('first');
  });
});

describe('getMessageRange', () => {
  test('extracts valid range of messages (inclusive)', async () => {
    const filePath = join(testDir, 'session.jsonl');
    const messages = [
      { sessionId: 'sess-1', uuid: 'uuid-1', parentUuid: null, type: 'user' },
      { sessionId: 'sess-1', uuid: 'uuid-2', parentUuid: 'uuid-1', type: 'assistant' },
      { sessionId: 'sess-1', uuid: 'uuid-3', parentUuid: 'uuid-2', type: 'user' },
      { sessionId: 'sess-1', uuid: 'uuid-4', parentUuid: 'uuid-3', type: 'assistant' },
      { sessionId: 'sess-1', uuid: 'uuid-5', parentUuid: 'uuid-4', type: 'user' },
    ];
    await writeFile(
      filePath,
      messages.map((m) => JSON.stringify(m)).join('\n') + '\n'
    );

    const result = await getMessageRange(filePath, 'uuid-2', 'uuid-4');

    expect(result.messages.length).toBe(3);
    expect(result.fromIndex).toBe(1);
    expect(result.toIndex).toBe(3);
    expect((result.messages[0] as { uuid: string }).uuid).toBe('uuid-2');
    expect((result.messages[1] as { uuid: string }).uuid).toBe('uuid-3');
    expect((result.messages[2] as { uuid: string }).uuid).toBe('uuid-4');
  });

  test('extracts single message when fromUuid equals toUuid', async () => {
    const filePath = join(testDir, 'session.jsonl');
    const messages = [
      { sessionId: 'sess-1', uuid: 'uuid-1', parentUuid: null, type: 'user' },
      { sessionId: 'sess-1', uuid: 'uuid-2', parentUuid: 'uuid-1', type: 'assistant' },
      { sessionId: 'sess-1', uuid: 'uuid-3', parentUuid: 'uuid-2', type: 'user' },
    ];
    await writeFile(
      filePath,
      messages.map((m) => JSON.stringify(m)).join('\n') + '\n'
    );

    const result = await getMessageRange(filePath, 'uuid-2', 'uuid-2');

    expect(result.messages.length).toBe(1);
    expect(result.fromIndex).toBe(1);
    expect(result.toIndex).toBe(1);
    expect((result.messages[0] as { uuid: string }).uuid).toBe('uuid-2');
  });

  test('extracts entire file when range spans first to last', async () => {
    const filePath = join(testDir, 'session.jsonl');
    const messages = [
      { sessionId: 'sess-1', uuid: 'uuid-1', parentUuid: null, type: 'user' },
      { sessionId: 'sess-1', uuid: 'uuid-2', parentUuid: 'uuid-1', type: 'assistant' },
      { sessionId: 'sess-1', uuid: 'uuid-3', parentUuid: 'uuid-2', type: 'user' },
    ];
    await writeFile(
      filePath,
      messages.map((m) => JSON.stringify(m)).join('\n') + '\n'
    );

    const result = await getMessageRange(filePath, 'uuid-1', 'uuid-3');

    expect(result.messages.length).toBe(3);
    expect(result.fromIndex).toBe(0);
    expect(result.toIndex).toBe(2);
  });

  test('throws error when fromUuid not found', async () => {
    const filePath = join(testDir, 'session.jsonl');
    const messages = [
      { sessionId: 'sess-1', uuid: 'uuid-1', parentUuid: null, type: 'user' },
      { sessionId: 'sess-1', uuid: 'uuid-2', parentUuid: 'uuid-1', type: 'assistant' },
    ];
    await writeFile(
      filePath,
      messages.map((m) => JSON.stringify(m)).join('\n') + '\n'
    );

    await expect(
      getMessageRange(filePath, 'nonexistent-from', 'uuid-2')
    ).rejects.toThrow(/fromUuid not found/);
  });

  test('throws error when toUuid not found', async () => {
    const filePath = join(testDir, 'session.jsonl');
    const messages = [
      { sessionId: 'sess-1', uuid: 'uuid-1', parentUuid: null, type: 'user' },
      { sessionId: 'sess-1', uuid: 'uuid-2', parentUuid: 'uuid-1', type: 'assistant' },
    ];
    await writeFile(
      filePath,
      messages.map((m) => JSON.stringify(m)).join('\n') + '\n'
    );

    await expect(
      getMessageRange(filePath, 'uuid-1', 'nonexistent-to')
    ).rejects.toThrow(/toUuid not found/);
  });

  test('throws error when neither UUID is found', async () => {
    const filePath = join(testDir, 'session.jsonl');
    const messages = [
      { sessionId: 'sess-1', uuid: 'uuid-1', parentUuid: null, type: 'user' },
    ];
    await writeFile(
      filePath,
      messages.map((m) => JSON.stringify(m)).join('\n') + '\n'
    );

    await expect(
      getMessageRange(filePath, 'nonexistent-from', 'nonexistent-to')
    ).rejects.toThrow(/Neither UUID found/);
  });

  test('throws error when range is inverted (toUuid before fromUuid)', async () => {
    const filePath = join(testDir, 'session.jsonl');
    const messages = [
      { sessionId: 'sess-1', uuid: 'uuid-1', parentUuid: null, type: 'user' },
      { sessionId: 'sess-1', uuid: 'uuid-2', parentUuid: 'uuid-1', type: 'assistant' },
      { sessionId: 'sess-1', uuid: 'uuid-3', parentUuid: 'uuid-2', type: 'user' },
    ];
    await writeFile(
      filePath,
      messages.map((m) => JSON.stringify(m)).join('\n') + '\n'
    );

    await expect(
      getMessageRange(filePath, 'uuid-3', 'uuid-1')
    ).rejects.toThrow(/Invalid range.*appears before/);
  });

  test('throws error for non-existent session file', async () => {
    await expect(
      getMessageRange('/nonexistent/session.jsonl', 'uuid-1', 'uuid-2')
    ).rejects.toThrow(/not found/);
  });

  test('includes messages without uuid in range', async () => {
    const filePath = join(testDir, 'session.jsonl');
    const messages = [
      { sessionId: 'sess-1', uuid: 'uuid-1', parentUuid: null, type: 'user' },
      { type: 'summary', summary: 'A summary in the middle', timestamp: '2025-01-01T00:01:00Z' },
      { sessionId: 'sess-1', uuid: 'uuid-2', parentUuid: 'uuid-1', type: 'assistant' },
    ];
    await writeFile(
      filePath,
      messages.map((m) => JSON.stringify(m)).join('\n') + '\n'
    );

    const result = await getMessageRange(filePath, 'uuid-1', 'uuid-2');

    expect(result.messages.length).toBe(3);
    expect((result.messages[0] as { uuid: string }).uuid).toBe('uuid-1');
    expect((result.messages[1] as { type: string }).type).toBe('summary');
    expect((result.messages[2] as { uuid: string }).uuid).toBe('uuid-2');
  });
});
