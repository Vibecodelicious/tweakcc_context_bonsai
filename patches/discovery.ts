import { BonsaiPatchError } from './types';

export interface Candidate {
  index: number;
  length: number;
  score: number;
  text: string;
}

export type Scorer = (content: string, candidate: Candidate) => number;

export interface RuntimeHelpers {
  fsFunc: string;
  configDirFunc: string;
  sessionIdFunc: string;
}

const DISCOVERY_PATCH_NAME = 'discovery';
const IDENTIFIER = String.raw`[$A-Z_a-z][$\w]*`;

export class AnchorNotFoundError extends BonsaiPatchError {
  constructor(message: string, options?: ErrorOptions) {
    super(DISCOVERY_PATCH_NAME, message, options);
    this.name = 'AnchorNotFoundError';
  }
}

export class AnchorAmbiguousError extends BonsaiPatchError {
  constructor(message: string, options?: ErrorOptions) {
    super(DISCOVERY_PATCH_NAME, message, options);
    this.name = 'AnchorAmbiguousError';
  }
}

export class RuntimeHelpersError extends BonsaiPatchError {
  constructor(message: string, options?: ErrorOptions) {
    super(DISCOVERY_PATCH_NAME, message, options);
    this.name = 'RuntimeHelpersError';
  }
}

export function findCandidates(content: string, patterns: RegExp[]): Candidate[] {
  const candidates = new Map<string, Candidate>();

  for (const pattern of patterns) {
    const matcher = toGlobalRegExp(pattern);
    let match: RegExpExecArray | null;
    while ((match = matcher.exec(content)) !== null) {
      const text = match[0];
      const key = `${match.index}:${text.length}`;
      candidates.set(key, { index: match.index, length: text.length, score: 0, text });

      if (text.length === 0) matcher.lastIndex += 1;
    }
  }

  return [...candidates.values()].sort((a, b) => a.index - b.index || a.length - b.length);
}

export function scoreCandidates(
  content: string,
  candidates: Candidate[],
  scorers: Scorer[]
): Candidate[] {
  return candidates
    .map((candidate) => ({
      ...candidate,
      score: candidate.score + scorers.reduce((score, scorer) => score + scorer(content, candidate), 0),
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index || a.length - b.length);
}

export function selectUnique(
  _content: string,
  candidates: Candidate[],
  opts: { minScore: number; minMargin: number }
): Candidate {
  const sorted = [...candidates].sort((a, b) => b.score - a.score || a.index - b.index || a.length - b.length);
  const eligible = sorted.filter((candidate) => candidate.score >= opts.minScore);
  if (eligible.length === 0) {
    throw new AnchorNotFoundError(
      `no anchor candidate reached minScore ${opts.minScore}; candidates=${candidates.length}`
    );
  }

  const [best, second] = eligible;
  if (best === undefined) {
    throw new AnchorNotFoundError(`no anchor candidate reached minScore ${opts.minScore}`);
  }

  if (second !== undefined && best.score - second.score <= opts.minMargin) {
    throw new AnchorAmbiguousError(
      `ambiguous anchor candidates: top score ${best.score}, second score ${second.score}, minMargin ${opts.minMargin}`
    );
  }

  return best;
}

export function findRuntimeHelpers(content: string): RuntimeHelpers {
  const fsFunc = selectUniqueIdentifier(
    countMatches(content, new RegExp(String.raw`\b(${IDENTIFIER})\s*\(\s*\)\s*\.\s*(?:existsSync|readFileSync|writeFileSync)\s*\(`, 'g')),
    'fs module getter'
  );
  const configDirFunc = selectUniqueIdentifier(findConfigDirCandidates(content), 'config-dir getter');
  const sessionIdFunc = selectUniqueIdentifier(findSessionIdCandidates(content), 'session-id getter');

  return { fsFunc, configDirFunc, sessionIdFunc };
}

export function verifySentinel(content: string, sentinel: string): void {
  const count = countOccurrences(content, sentinel);
  if (count !== 1) {
    throw new BonsaiPatchError(
      DISCOVERY_PATCH_NAME,
      `expected sentinel ${sentinel} exactly once, found ${count}`
    );
  }
}

function toGlobalRegExp(pattern: RegExp): RegExp {
  const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`;
  return new RegExp(pattern.source, flags);
}

function countMatches(content: string, matcher: RegExp): Map<string, number> {
  const counts = new Map<string, number>();
  let match: RegExpExecArray | null;
  while ((match = matcher.exec(content)) !== null) {
    const value = match[1];
    if (value !== undefined) counts.set(value, (counts.get(value) ?? 0) + 1);
    if (match[0].length === 0) matcher.lastIndex += 1;
  }
  return counts;
}

function findConfigDirCandidates(content: string): Map<string, number> {
  const counts = new Map<string, number>();
  const matcher = new RegExp(
    String.raw`\b${IDENTIFIER}\s*\(\s*(${IDENTIFIER})\s*\(\s*\)\s*,\s*["'](?:history\.jsonl|projects|todos)["']\s*\)`,
    'g'
  );
  let match: RegExpExecArray | null;
  while ((match = matcher.exec(content)) !== null) {
    const value = match[1];
    if (value !== undefined) counts.set(value, (counts.get(value) ?? 0) + 1);
    if (match[0].length === 0) matcher.lastIndex += 1;
  }
  return counts;
}

function findSessionIdCandidates(content: string): Map<string, number> {
  const counts = countMatches(
    content,
    new RegExp(String.raw`function\s+(${IDENTIFIER})\s*\(\s*\)\s*\{\s*return\s+${IDENTIFIER}\s*\.\s*sessionId\s*;?\s*\}`, 'g')
  );
  const optionalSessionCounts = countMatches(
    content,
    new RegExp(
      String.raw`function\s+(${IDENTIFIER})\s*\(\s*\)\s*\{\s*return\s+${IDENTIFIER}\s*\(\s*\)\s*\?\.\s*sessionId\s*\?\?\s*${IDENTIFIER}\s*\.\s*sessionId\s*;?\s*\}`,
      'g'
    )
  );
  const arrowCounts = countMatches(
    content,
    new RegExp(String.raw`(?:const|let|var)\s+(${IDENTIFIER})\s*=\s*\(\s*\)\s*=>\s*${IDENTIFIER}\s*\.\s*sessionId\b`, 'g')
  );
  for (const [identifier, count] of optionalSessionCounts) {
    counts.set(identifier, (counts.get(identifier) ?? 0) + count);
  }
  for (const [identifier, count] of arrowCounts) {
    counts.set(identifier, (counts.get(identifier) ?? 0) + count);
  }
  return counts;
}

function selectUniqueIdentifier(candidates: Map<string, number>, label: string): string {
  const ranked = [...candidates.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  if (ranked.length === 0) throw new RuntimeHelpersError(`could not resolve ${label}`);

  const [best, second] = ranked;
  if (best === undefined) throw new RuntimeHelpersError(`could not resolve ${label}`);
  if (second !== undefined && second[1] === best[1]) {
    throw new RuntimeHelpersError(`ambiguous ${label}: ${best[0]} and ${second[0]} both scored ${best[1]}`);
  }

  return best[0];
}

function countOccurrences(content: string, needle: string): number {
  if (needle.length === 0) return 0;
  let count = 0;
  let index = content.indexOf(needle);
  while (index !== -1) {
    count += 1;
    index = content.indexOf(needle, index + needle.length);
  }
  return count;
}
