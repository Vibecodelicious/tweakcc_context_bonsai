// process.test.ts - Tests for Claude process detection
import { describe, expect, test } from 'bun:test';
import { parseSessionIdFromCmdline, isGenuineClaudeProcess } from './process';

describe('parseSessionIdFromCmdline', () => {
  test('extracts session UUID from --resume argument (space-separated)', () => {
    const cmdline = 'claude --resume 12345678-1234-1234-1234-123456789abc --other-flag';
    expect(parseSessionIdFromCmdline(cmdline)).toBe('12345678-1234-1234-1234-123456789abc');
  });

  test('extracts session UUID from --resume argument (null-separated like /proc/cmdline)', () => {
    // Use String.fromCharCode(0) to avoid octal escape sequence interpretation
    const NUL = String.fromCharCode(0);
    const cmdline = `claude${NUL}--resume${NUL}12345678-1234-1234-1234-123456789abc${NUL}--other-flag${NUL}`;
    expect(parseSessionIdFromCmdline(cmdline)).toBe('12345678-1234-1234-1234-123456789abc');
  });

  test('returns null when --resume is not present', () => {
    const cmdline = 'claude --some-other-flag value';
    expect(parseSessionIdFromCmdline(cmdline)).toBe(null);
  });

  test('returns null when --resume is at end without value', () => {
    const cmdline = 'claude --some-flag value --resume';
    expect(parseSessionIdFromCmdline(cmdline)).toBe(null);
  });

  test('returns null when --resume value is not a valid UUID', () => {
    const cmdline = 'claude --resume not-a-uuid --other-flag';
    expect(parseSessionIdFromCmdline(cmdline)).toBe(null);
  });

  test('handles case-insensitive UUID', () => {
    const cmdline = 'claude --resume ABCDEF12-1234-5678-90AB-CDEF12345678';
    expect(parseSessionIdFromCmdline(cmdline)).toBe('ABCDEF12-1234-5678-90AB-CDEF12345678');
  });

  test('handles mixed null and space separators', () => {
    const cmdline = '/home/user/.bun/bin/bun\0run\0claude\0--resume\0a1b2c3d4-e5f6-7890-abcd-ef1234567890';
    expect(parseSessionIdFromCmdline(cmdline)).toBe('a1b2c3d4-e5f6-7890-abcd-ef1234567890');
  });

  test('handles complex cmdline with multiple arguments', () => {
    const cmdline =
      '/usr/bin/node /home/user/.claude/bin/claude --verbose --resume 99999999-8888-7777-6666-555555555555 --project /some/path';
    expect(parseSessionIdFromCmdline(cmdline)).toBe('99999999-8888-7777-6666-555555555555');
  });

  test('returns null for empty cmdline', () => {
    expect(parseSessionIdFromCmdline('')).toBe(null);
  });

  test('returns null for cmdline with only whitespace', () => {
    expect(parseSessionIdFromCmdline('   \t\n   ')).toBe(null);
  });
});

describe('isGenuineClaudeProcess', () => {
  // Genuine Claude processes - should return true
  test('matches bare claude command', () => {
    expect(isGenuineClaudeProcess('claude --resume abc')).toBe(true);
  });

  test('matches claude with absolute path ending in /claude', () => {
    expect(isGenuineClaudeProcess('/usr/local/bin/claude --resume abc')).toBe(true);
  });

  test('matches claude from .claude directory', () => {
    expect(isGenuineClaudeProcess('/home/user/.claude/bin/claude --resume abc')).toBe(true);
  });

  test('matches claude from .claude/local path', () => {
    expect(isGenuineClaudeProcess('/home/user/.claude/local/claude --project /foo')).toBe(true);
  });

  test('matches node running claude script', () => {
    expect(isGenuineClaudeProcess('/usr/bin/node /home/user/.claude/bin/claude --resume abc')).toBe(true);
  });

  test('matches bun running claude script', () => {
    expect(isGenuineClaudeProcess('/home/user/.bun/bin/bun /usr/local/bin/claude')).toBe(true);
  });

  test('matches null-separated cmdline (from /proc)', () => {
    const NUL = String.fromCharCode(0);
    expect(isGenuineClaudeProcess(`/usr/bin/claude${NUL}--resume${NUL}abc`)).toBe(true);
  });

  // False positives - should return false
  test('rejects grep claude (common false positive)', () => {
    expect(isGenuineClaudeProcess('grep claude')).toBe(false);
  });

  test('rejects grep -r claude pattern', () => {
    expect(isGenuineClaudeProcess('grep -r claude /some/directory')).toBe(false);
  });

  test('rejects process with claude in directory path but not executable', () => {
    expect(isGenuineClaudeProcess('/home/user/claude-projects/bin/my-app')).toBe(false);
  });

  test('rejects vim editing a file with claude in the name', () => {
    expect(isGenuineClaudeProcess('vim /home/user/claude-config.json')).toBe(false);
  });

  test('rejects cat reading a claude file', () => {
    expect(isGenuineClaudeProcess('cat /home/user/.claude/settings.json')).toBe(false);
  });

  test('rejects ps aux | grep claude (the grep part)', () => {
    expect(isGenuineClaudeProcess('/bin/grep claude')).toBe(false);
  });

  test('rejects empty cmdline', () => {
    expect(isGenuineClaudeProcess('')).toBe(false);
  });

  test('rejects whitespace-only cmdline', () => {
    expect(isGenuineClaudeProcess('   ')).toBe(false);
  });
});
