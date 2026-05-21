// types.ts - TypeScript interfaces for Claude Code session files

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
  // Archive fields persisted by Context Bonsai prune operations.
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
  uuid?: string;
  summary: string;
  timestamp: string;
  compactMetadata?: CompactMetadata;
}

/**
 * Discriminated union of all session message types.
 * Use the 'type' field to discriminate between message types.
 */
export type SessionMessage = UserMessage | AssistantMessage | FileHistorySnapshot | SummaryMessage;

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
