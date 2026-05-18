import { describe, expect, test } from 'bun:test';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import {
  AnchorAmbiguousError,
  AnchorNotFoundError,
  RuntimeHelpersError,
  findCandidates,
  findRuntimeHelpers,
  scoreCandidates,
  selectUnique,
  verifySentinel,
  type Candidate,
} from './discovery';

const fixturesDir = join(import.meta.dir, '__fixtures__');

describe('anchor candidate discovery', () => {
  test('finds candidates from multiple regex strategies and deduplicates identical spans', () => {
    const content = 'aa switch(X.type){case"user":return true} bb switch(Y.type){case"assistant":return false}';
    const candidates = findCandidates(content, [/switch\([A-Z]\.type\)\{[^}]+\}/, /switch\([A-Z]\.type\)\{[^}]+\}/g]);

    expect(candidates).toHaveLength(2);
    expect(candidates.map((candidate) => candidate.text)).toEqual([
      'switch(X.type){case"user":return true}',
      'switch(Y.type){case"assistant":return false}',
    ]);
  });

  test('scores candidates with contextual signals and selects a unique winner', async () => {
    const content = await readFile(join(fixturesDir, 'visibility-switch.fixture.js'), 'utf8');
    const candidates = findCandidates(content, [/switch\([A-Z]\.type\)\{[^}]+\}/g]);
    const scored = scoreCandidates(content, candidates, [visibilitySwitchScorer]);

    expect(candidates).toHaveLength(3);
    expect(selectUnique(content, scored, { minScore: 20, minMargin: 10 }).text).toContain('case"user"');
  });

  test('throws AnchorNotFoundError when there are no candidates', () => {
    expect(() => selectUnique('', [], { minScore: 1, minMargin: 1 })).toThrow(AnchorNotFoundError);
  });

  test('throws AnchorNotFoundError when no candidate reaches minScore', () => {
    const candidates: Candidate[] = [{ index: 0, length: 1, text: 'x', score: 1 }];
    expect(() => selectUnique('x', candidates, { minScore: 2, minMargin: 1 })).toThrow(AnchorNotFoundError);
  });

  test('throws AnchorAmbiguousError when top candidates are inside minMargin', () => {
    const candidates: Candidate[] = [
      { index: 0, length: 1, text: 'a', score: 10 },
      { index: 2, length: 1, text: 'b', score: 8 },
    ];
    expect(() => selectUnique('a b', candidates, { minScore: 1, minMargin: 3 })).toThrow(AnchorAmbiguousError);
  });

  test('throws AnchorAmbiguousError when top candidates are exactly at minMargin', () => {
    const candidates: Candidate[] = [
      { index: 0, length: 1, text: 'a', score: 10 },
      { index: 2, length: 1, text: 'b', score: 7 },
    ];
    expect(() => selectUnique('a b', candidates, { minScore: 1, minMargin: 3 })).toThrow(AnchorAmbiguousError);
  });
});

describe('runtime helper discovery', () => {
  test('resolves fs, config-dir, and session-id helper names from minified shapes', async () => {
    const content = await readFile(join(fixturesDir, 'runtime-helpers.fixture.js'), 'utf8');

    expect(findRuntimeHelpers(content)).toEqual({
      fsFunc: 'A1',
      configDirFunc: 'C2',
      sessionIdFunc: 'S3',
    });
  });

  test('throws RuntimeHelpersError if any helper cannot be resolved', () => {
    expect(() => findRuntimeHelpers('function A(){return require("fs")}')).toThrow(RuntimeHelpersError);
  });
});

describe('sentinel verification', () => {
  test('passes only when the sentinel appears exactly once', () => {
    expect(() => verifySentinel('a /*cb:test:v1*/ b', '/*cb:test:v1*/')).not.toThrow();
    expect(() => verifySentinel('a b', '/*cb:test:v1*/')).toThrow('expected sentinel /*cb:test:v1*/ exactly once, found 0');
    expect(() => verifySentinel('/*cb:test:v1*/ x /*cb:test:v1*/', '/*cb:test:v1*/')).toThrow('expected sentinel /*cb:test:v1*/ exactly once, found 2');
  });
});

test('real extract visibility-predicate disambiguation selects one switch candidate when available', async () => {
  const extractPath = process.env.CB_CLAUDE_EXTRACT_JS;
  if (!extractPath || !existsSync(extractPath)) {
    console.warn('SKIP real extract discovery: set CB_CLAUDE_EXTRACT_JS to an extracted Claude Code JS bundle');
    return;
  }

  const content = await readFile(extractPath, 'utf8');
  const candidates = findCandidates(content, [/switch\([A-Za-z_$][\w$]*\.type\)\{[^}]+\}/g]);
  const scored = scoreCandidates(content, candidates, [visibilitySwitchScorer]);
  const selected = selectUnique(content, scored, { minScore: 20, minMargin: 10 });

  expect(candidates.length).toBeGreaterThan(100);
  expect(selected.text).toContain('case"user"');
  expect(selected.text).toContain('case"assistant"');
});

test('committed 133-candidate visibility fixture selects exactly one switch candidate', async () => {
  const content = await readFile(join(fixturesDir, 'visibility-switch-133.fixture.js'), 'utf8');
  const candidates = findCandidates(content, [/switch\([A-Za-z_$][\w$]*\.type\)\{[^}]+\}/g]);
  const scored = scoreCandidates(content, candidates, [visibilitySwitchScorer]);
  const selected = selectUnique(content, scored, { minScore: 20, minMargin: 10 });

  expect(candidates).toHaveLength(133);
  expect(scored.filter((candidate) => candidate.score >= 20)).toHaveLength(1);
  expect(selected.text).toContain('case"user"');
  expect(selected.text).toContain('case"assistant"');
  expect(selected.text).toContain('tool_use');
});

function visibilitySwitchScorer(_content: string, candidate: Candidate): number {
  let score = 0;
  if (candidate.text.includes('case"user"')) score += 15;
  if (candidate.text.includes('case"assistant"')) score += 15;
  if (candidate.text.includes('message')) score += 5;
  if (candidate.text.includes('content')) score += 5;
  if (candidate.text.includes('tool_use')) score += 3;
  return score;
}
