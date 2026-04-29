// snapshot.test.ts - Tests for snapshot creation and management
import { describe, expect, test, beforeEach, afterEach, mock, spyOn } from 'bun:test';
import { mkdir, rm, writeFile, readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir, homedir } from 'os';
import {
  createSnapshot,
  getSnapshot,
  listSnapshots,
  deleteSnapshot,
} from './snapshot';
import { readSnapshotIndex, writeSnapshotIndex } from './config';
import type { SnapshotIndex, SnapshotMetadata } from '../types';

// Create a temp directory structure that mimics ~/.claude
let testDir: string;
let testProjectPath: string;
let testClaudeDir: string;
let testProjectClaudeDir: string;
let testSessionId: string;

// Helper to create the full Claude directory structure for a session
async function createTestSession(sessionId: string): Promise<void> {
  // Create project directory in Claude's structure
  // Claude encodes paths by replacing "/" with "-"
  const encodedPath = testProjectPath.replace(/\//g, '-');
  testProjectClaudeDir = join(testClaudeDir, 'projects', encodedPath);
  await mkdir(testProjectClaudeDir, { recursive: true });

  // Create main JSONL file
  const sessionJsonl = join(testProjectClaudeDir, `${sessionId}.jsonl`);
  const messages = [
    { sessionId, uuid: 'msg-1', type: 'user', message: { role: 'user', content: 'Hello' } },
    { sessionId, uuid: 'msg-2', type: 'assistant', message: { role: 'assistant', content: 'Hi!' } },
  ];
  await writeFile(sessionJsonl, messages.map((m) => JSON.stringify(m)).join('\n') + '\n');

  // Create session directory with subagents
  const sessionDir = join(testProjectClaudeDir, sessionId);
  const subagentsDir = join(sessionDir, 'subagents');
  await mkdir(subagentsDir, { recursive: true });
  const subagentJsonl = join(subagentsDir, 'agent-abc123.jsonl');
  const subagentMessages = [
    { sessionId, uuid: 'sub-1', type: 'user' },
    { sessionId, uuid: 'sub-2', type: 'assistant' },
  ];
  await writeFile(subagentJsonl, subagentMessages.map((m) => JSON.stringify(m)).join('\n') + '\n');

  // Create tool-results directory
  const toolResultsDir = join(sessionDir, 'tool-results');
  await mkdir(toolResultsDir, { recursive: true });
  await writeFile(join(toolResultsDir, 'toolu_12345.txt'), 'tool output content');

  // Create file-history directory
  const fileHistoryDir = join(testClaudeDir, 'file-history', sessionId);
  await mkdir(fileHistoryDir, { recursive: true });
  await writeFile(join(fileHistoryDir, 'file-hash@v1'), 'file backup content');

  // Create session-env directory (usually empty but exists)
  const sessionEnvDir = join(testClaudeDir, 'session-env', sessionId);
  await mkdir(sessionEnvDir, { recursive: true });

  // Create todos directory with matching files
  const todosDir = join(testClaudeDir, 'todos');
  await mkdir(todosDir, { recursive: true });
  await writeFile(
    join(todosDir, `${sessionId}-agent-${sessionId}.json`),
    JSON.stringify({ tasks: [] })
  );
  await writeFile(
    join(todosDir, `${sessionId}-agent-subagent123.json`),
    JSON.stringify({ tasks: [] })
  );

  // Create tasks directory
  const tasksDir = join(testClaudeDir, 'tasks', sessionId);
  await mkdir(tasksDir, { recursive: true });
  await writeFile(join(tasksDir, '.lock'), '');
  await writeFile(join(tasksDir, '.highwatermark'), '0');

  // Create history.jsonl with entry for this session
  const historyPath = join(testClaudeDir, 'history.jsonl');
  const historyEntry = {
    display: 'Test prompt',
    pastedContents: {},
    timestamp: Date.now(),
    project: testProjectPath,
    sessionId: sessionId,
  };
  await writeFile(historyPath, JSON.stringify(historyEntry) + '\n');
}

beforeEach(async () => {
  testDir = join(tmpdir(), `snapshot-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  testProjectPath = join(testDir, 'test-project');
  testClaudeDir = join(testDir, '.claude');
  testSessionId = 'test-session-' + Math.random().toString(36).slice(2);

  await mkdir(testProjectPath, { recursive: true });
  await mkdir(testClaudeDir, { recursive: true });
});

afterEach(async () => {
  await rm(testDir, { recursive: true, force: true });
});

describe('listSnapshots', () => {
  test('returns empty array when no snapshots exist', async () => {
    const snapshots = await listSnapshots(testProjectPath);
    expect(snapshots).toEqual([]);
  });

  test('returns snapshots sorted by created date (newest first)', async () => {
    // Create snapshot index with multiple snapshots
    const index: SnapshotIndex = {
      version: 1,
      snapshots: [
        {
          uuid: 'snap-1',
          sourceSessionId: 'session-1',
          label: 'First',
          created: '2024-01-01T00:00:00.000Z',
          lineCount: 10,
          projectPath: testProjectPath,
        },
        {
          uuid: 'snap-2',
          sourceSessionId: 'session-2',
          label: 'Second',
          created: '2024-01-03T00:00:00.000Z',
          lineCount: 20,
          projectPath: testProjectPath,
        },
        {
          uuid: 'snap-3',
          sourceSessionId: 'session-3',
          label: 'Third',
          created: '2024-01-02T00:00:00.000Z',
          lineCount: 15,
          projectPath: testProjectPath,
        },
      ],
    };
    await writeSnapshotIndex(testProjectPath, index);

    const snapshots = await listSnapshots(testProjectPath);

    expect(snapshots.length).toBe(3);
    expect(snapshots[0].uuid).toBe('snap-2'); // Newest
    expect(snapshots[1].uuid).toBe('snap-3');
    expect(snapshots[2].uuid).toBe('snap-1'); // Oldest
  });
});

describe('getSnapshot', () => {
  test('returns null when snapshot not found', async () => {
    const snapshot = await getSnapshot(testProjectPath, 'nonexistent-uuid');
    expect(snapshot).toBeNull();
  });

  test('returns snapshot when found', async () => {
    const index: SnapshotIndex = {
      version: 1,
      snapshots: [
        {
          uuid: 'target-snap',
          sourceSessionId: 'session-1',
          label: 'Target',
          created: '2024-01-01T00:00:00.000Z',
          lineCount: 10,
          projectPath: testProjectPath,
        },
      ],
    };
    await writeSnapshotIndex(testProjectPath, index);

    const snapshot = await getSnapshot(testProjectPath, 'target-snap');

    expect(snapshot).not.toBeNull();
    expect(snapshot!.uuid).toBe('target-snap');
    expect(snapshot!.label).toBe('Target');
  });
});

describe('deleteSnapshot', () => {
  test('returns false when snapshot not found', async () => {
    const result = await deleteSnapshot(testProjectPath, 'nonexistent-uuid');
    expect(result).toBe(false);
  });

  test('removes snapshot from index when found', async () => {
    const index: SnapshotIndex = {
      version: 1,
      snapshots: [
        {
          uuid: 'snap-to-delete',
          sourceSessionId: 'session-1',
          label: 'Delete Me',
          created: '2024-01-01T00:00:00.000Z',
          lineCount: 10,
          projectPath: testProjectPath,
        },
        {
          uuid: 'snap-to-keep',
          sourceSessionId: 'session-2',
          label: 'Keep Me',
          created: '2024-01-02T00:00:00.000Z',
          lineCount: 20,
          projectPath: testProjectPath,
        },
      ],
    };
    await writeSnapshotIndex(testProjectPath, index);

    const result = await deleteSnapshot(testProjectPath, 'snap-to-delete');
    expect(result).toBe(true);

    const updatedIndex = await readSnapshotIndex(testProjectPath);
    expect(updatedIndex.snapshots.length).toBe(1);
    expect(updatedIndex.snapshots[0].uuid).toBe('snap-to-keep');
  });
});

describe('createSnapshot', () => {
  // These tests require mocking path resolution since we can't use the real ~/.claude
  // For now, we test the integration behavior with a note about the limitation

  test('throws error when session not found', async () => {
    // Without a valid history.jsonl for this project, it should throw
    await expect(
      createSnapshot(testProjectPath, 'Test Snapshot')
    ).rejects.toThrow(/No session found/);
  });

  // Note: Full integration tests for createSnapshot would require mocking
  // the path resolution functions (getClaudeDir, etc.) to point to our test directory.
  // For MVP, we rely on manual testing and the unit tests of the underlying functions.
});

// Note: Full integration tests for createSnapshot() are complex because they require
// mocking path resolution functions (getClaudeDir, etc.) to use test directories.
// The createSnapshot function is tested via its constituent unit functions:
// - copySessionWithNewId (tested in session.test.ts)
// - readSnapshotIndex / writeSnapshotIndex (tested in config implicitly)
// - findCurrentSession (tested in session.test.ts)
// Manual testing supplements the automated coverage.
