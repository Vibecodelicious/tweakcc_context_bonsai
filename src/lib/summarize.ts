// summarize.ts - LLM summary generation using Claude CLI

import type { SessionMessage } from '../types';

/**
 * Generates a summary of a conversation excerpt using the Claude CLI.
 * Filters messages to only user and assistant types, formats them,
 * and shells out to the claude CLI for summarization.
 *
 * @param messages - Array of session messages to summarize
 * @returns A 2-3 sentence summary of the conversation
 * @throws Error if the Claude CLI returns a non-zero exit code
 */
export async function generateSummary(messages: SessionMessage[]): Promise<string> {
  // Filter to only user and assistant messages
  const relevantMessages = messages.filter(
    (m): m is Extract<SessionMessage, { type: 'user' | 'assistant' }> =>
      m.type === 'user' || m.type === 'assistant'
  );

  // Format messages as role: content pairs
  const content = relevantMessages
    .map((m) => `${m.type}: ${JSON.stringify(m.message.content)}`)
    .join('\n\n');

  const prompt = `Summarize the following conversation excerpt in 2-3 sentences, capturing the key topics discussed and any decisions made:\n\n${content}`;

  const proc = Bun.spawn(['claude', '-p', prompt], {
    stdout: 'pipe',
    stderr: 'pipe',
  });

  const output = await new Response(proc.stdout).text();
  const exitCode = await proc.exited;

  if (exitCode !== 0) {
    const errorOutput = await new Response(proc.stderr).text();
    throw new Error(`Summary generation failed: ${errorOutput}`);
  }

  return output.trim();
}
