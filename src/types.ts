// types.ts - TypeScript interfaces for Claude Code session snapshots

// ============================================================================
// Snapshot Types
// ============================================================================

/**
 * Metadata for a single snapshot, stored in the snapshot index.
 */
export interface SnapshotMetadata {
  uuid: string;
  sourceSessionId: string;
  label: string;
  created: string; // ISO timestamp
  lineCount: number;
  projectPath: string;
  truncatedAt?: string; // Description of truncation point
}

/**
 * Schema for the snapshot index file (.claude-snapshots/index.json)
 */
export interface SnapshotIndex {
  version: 1;
  snapshots: SnapshotMetadata[];
}

// ============================================================================
// Session Message Types
// ============================================================================

/**
 * Base fields common to all JSONL message types in a session file.
 */
export interface BaseMessage {
  sessionId: string;
  uuid: string;
  parentUuid: string | null;
  timestamp: string;
  cwd: string;
  version: string;
  gitBranch: string;
  // Archive fields - added by ccsnap compact command
  archived?: boolean;
  archivedAt?: string;    // ISO timestamp
  archivedBy?: string;    // UUID of summary message that replaced this range
}

/**
 * A user message in the session transcript.
 */
export interface UserMessage extends BaseMessage {
  type: 'user';
  userType: 'external';
  message: { role: 'user'; content: string };
  thinkingMetadata?: { maxThinkingTokens: number };
  todos: unknown[];
  permissionMode: string;
}

/**
 * An assistant (Claude) message in the session transcript.
 */
export interface AssistantMessage extends BaseMessage {
  type: 'assistant';
  message: {
    model: string;
    id: string;
    type: 'message';
    role: 'assistant';
    content: unknown[];
    stop_reason: string | null;
    usage: unknown;
  };
  requestId: string;
}

/**
 * File history snapshot - checkpoints for /rewind functionality.
 */
export interface FileHistorySnapshot {
  type: 'file-history-snapshot';
  messageId: string;
  snapshot: {
    messageId: string;
    trackedFileBackups: Record<string, unknown>;
    timestamp: string;
  };
  isSnapshotUpdate: boolean;
}

/**
 * Metadata for compact operation - tracks which messages were summarized.
 */
export interface CompactMetadata {
  fromMessageId: string;  // UUID of first archived message
  toMessageId: string;    // UUID of last archived message
  messageCount: number;   // Number of messages that were archived
}

/**
 * Summary message - context compression when conversation gets long.
 */
export interface SummaryMessage {
  type: 'summary';
  uuid?: string;        // Added by ccsnap compact command
  summary: string;
  timestamp: string;
  // Added by ccsnap compact command
  compactMetadata?: CompactMetadata;
}

/**
 * Discriminated union of all session message types.
 * Use the 'type' field to discriminate between message types.
 */
export type SessionMessage = UserMessage | AssistantMessage | FileHistorySnapshot | SummaryMessage;

// ============================================================================
// Process Types
// ============================================================================

/**
 * Information about a running Claude Code process.
 * Used by the switch command to identify which process to kill.
 */
export interface ClaudeProcess {
  pid: number;
  sessionId: string | null; // null if not started with --resume
  cwd: string;
  cmdline: string;
}

// ============================================================================
// History Types
// ============================================================================

/**
 * An entry in ~/.claude/history.jsonl
 * Tracks user prompts and their associated sessions.
 */
export interface HistoryEntry {
  display: string;          // User's prompt text
  pastedContents: Record<string, unknown>;
  timestamp: number;        // Unix timestamp in milliseconds
  project: string;          // Full path to project directory
  sessionId: string;        // UUID of session
}
