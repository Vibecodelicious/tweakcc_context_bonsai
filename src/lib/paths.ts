// paths.ts - Path resolution utilities for Claude Code session management
import { homedir } from 'os';
import { join } from 'path';

/**
 * Returns the path to ~/.claude
 */
export function getClaudeDir(): string {
  return join(homedir(), '.claude');
}

/**
 * Returns the path to ~/.claude/projects/
 */
export function getProjectsDir(): string {
  return join(getClaudeDir(), 'projects');
}

/**
 * Encodes a project path to Claude's directory structure format.
 * Claude Code encodes paths by replacing "/" and "_" with "-".
 * Example: "/home/user/projects/my_app" -> "-home-user-projects-my-app"
 */
export function encodeProjectPath(projectPath: string): string {
  // Replace forward slashes and underscores with dashes
  return projectPath.replace(/[/_]/g, '-');
}

/**
 * Returns the path to a project's Claude directory.
 * Example: "/home/user/myproject" -> "~/.claude/projects/-home-user-myproject"
 */
export function getProjectDir(projectPath: string): string {
  const encoded = encodeProjectPath(projectPath);
  return join(getProjectsDir(), encoded);
}

/**
 * Returns the path to a session's JSONL file.
 * Example: getSessionPath(projectDir, "abc-123") -> "<projectDir>/abc-123.jsonl"
 */
export function getSessionPath(projectDir: string, sessionId: string): string {
  return join(projectDir, `${sessionId}.jsonl`);
}

/**
 * Returns the path to ~/.claude/history.jsonl
 * Session index with all prompts and their session IDs.
 */
export function getHistoryPath(): string {
  return join(getClaudeDir(), 'history.jsonl');
}
