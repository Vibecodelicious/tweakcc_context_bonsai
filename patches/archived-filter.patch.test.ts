import { describe, expect, test } from 'bun:test';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { BonsaiPatchError } from './types';
import { bonsaiPatches } from './registry';
import { archivedFilterPatch } from './archived-filter.patch';

const fixturesDir = join(import.meta.dir, '__fixtures__');

describe('archived-filter patch metadata and registry', () => {
  test('exports the Contract A patch identity', () => {
    expect(archivedFilterPatch.name).toBe('archived-filter');
    expect(archivedFilterPatch.sentinel).toBe('/*cb:archived-filter:v1*/');
  });

  test('is registered as the first composed patch', () => {
    expect(bonsaiPatches[0]).toBe(archivedFilterPatch);
  });
});

describe('archived-filter patch application', () => {
  test('uses discovery to select the provider message map and self-verifies its sentinel', () => {
    const content = testRuntimeBundle();
    const patched = archivedFilterPatch.apply(content, fakePatchContext());

    expect(countOccurrences(patched, archivedFilterPatch.sentinel)).toBe(1);
    expect(patched).toContain(`${archivedFilterPatch.sentinel}{`);
    expect(patched).not.toContain('globalThis.__cbArchivedFilterCache');
    expect(patched).not.toContain('__cbArchivedFilterCache');
    expect(patched).not.toContain('__cbMtimeMs');
    expect(patched).not.toContain('__cbEntry.mtimeMs!==__cbMtimeMs');
    expect(patched).toContain('let D=messages.map((X,L)=>');
  });

  test('rejects transcript UI visibility switches as plausible wrong anchors', async () => {
    const content = await fixtureBundle('visibility-switch.fixture.js');

    expect(() => archivedFilterPatch.apply(content, fakePatchContext())).toThrow('no anchor candidate reached minScore');
  });

  test('disambiguates the native 2.1.143 provider message map by surrounding context', () => {
    const content = `${testRuntimeBundle()}
      function noisyTrace(w){switch(w.type){case"user":case"assistant":{if("message"in w){let D=w.message.content;if(Array.isArray(D))for(let j of D){if(j.type==="tool_use")return D}}}}
    `;
    const patched = archivedFilterPatch.apply(content, fakePatchContext());

    expect(patched).toContain('function providerMap(messages,cache,ttl){d("tengu_api_cache_breakpoints",{});/*cb:archived-filter:v1*/{');
  });

  // 2.1.156 returns the provider map as the second arm of a comma-sequence right
  // after the cache-breakpoint telemetry call (`return d("tengu_api_cache_breakpoints",{...}),H.map(...)`)
  // rather than binding it to a local `let D=...`. The filter block must be injected
  // before that `return` so the captured map variable is filtered before it is mapped.
  test('selects the 2.1.156 comma-sequence return provider map and injects before the return', () => {
    const content = testRuntimeBundle2156();
    const patched = archivedFilterPatch.apply(content, fakePatchContext());

    expect(countOccurrences(patched, archivedFilterPatch.sentinel)).toBe(1);
    // The filter block is injected immediately before the `return d("tengu...",...),H.map(...)`
    // statement, so the captured map variable H is filtered before it is mapped.
    expect(patched).toMatch(/\/\*cb:archived-filter:v1\*\/\{[\s\S]*H=__cbFiltered;[\s\S]*\}return d\("tengu_api_cache_breakpoints",\{\}\),H\.map\(/);
  });

  test('the injected 2.1.156 filter actually removes archivedBy spans when executed', () => {
    const source = archivedFilterPatch.apply(testRuntimeBundle2156(), fakePatchContext());
    const factory = new Function('__fs', '__configDir', 'Z9', `${source};return providerMap;`);
    const providerMap = factory(testRuntimeFs(), '/tmp/fake-config', { sessionId: 'session-id' }) as (
      messages: Array<ArchivedMessage>,
      cache: boolean,
      ttl: string,
    ) => unknown;

    expect(
      providerMap(
        [
          message('kept-a', 'kept', { type: 'user' }),
          message('archived-start', 'removed', { type: 'assistant', archived: true, archivedBy: 'summary-1' }),
          message('archived-end', 'removed', { type: 'user', archived: true, archivedBy: 'summary-1' }),
          message('kept-b', 'kept', { type: 'assistant' }),
        ],
        false,
        '5m',
      ),
    ).toEqual([
      { role: 'user', content: 'kept' },
      { role: 'assistant', content: 'kept' },
    ]);
  });

  test('fails closed with BonsaiPatchError when the anchor is absent', async () => {
    const content = await fixtureBundle('runtime-helpers.fixture.js');

    expect(() => archivedFilterPatch.apply(content, fakePatchContext())).toThrow(BonsaiPatchError);
    expect(() => archivedFilterPatch.apply(content, fakePatchContext())).toThrow('no anchor candidate reached minScore');
  });
});

describe('injected archived positional filter', () => {
  test('removes a full archivedBy span from first to last marked index', () => {
    const visibilityPredicate = buildPatchedVisibilityPredicate();

    expect(
      visibilityPredicate([
        message('kept-a', 'kept'),
        message('archived-start', 'removed', { archived: true, archivedBy: 'summary-1', type: 'user' }),
        message('middle-reminder', 'removed', { type: 'api_system' }),
        message('archived-end', 'removed', { archived: true, archivedBy: 'summary-1', type: 'assistant' }),
        message('kept-b', 'kept'),
      ]),
    ).toEqual([
      { role: 'user', content: 'kept' },
      { role: 'user', content: 'kept' },
    ]);
  });

  test('handles single-message archived spans', () => {
    const visibilityPredicate = buildPatchedVisibilityPredicate();

    expect(
      visibilityPredicate([
        message('kept-a', 'kept'),
        message('single', 'removed', { archived: true, archivedBy: 'summary-1', type: 'assistant' }),
        message('kept-b', 'kept'),
      ]),
    ).toEqual([
      { role: 'user', content: 'kept' },
      { role: 'user', content: 'kept' },
    ]);
  });

  test('removes interior api_system reminders with span boundaries', () => {
    const visibilityPredicate = buildPatchedVisibilityPredicate();

    expect(
      visibilityPredicate([
        message('before', 'kept'),
        message('archived-start', 'removed', { archived: true, archivedBy: 'summary-1', type: 'assistant' }),
        message('system-inside', 'removed', { type: 'api_system' }),
        message('archived-end', 'removed', { archived: true, archivedBy: 'summary-1', type: 'user' }),
        message('after', 'kept', { type: 'api_system' }),
        message('after2', 'kept', { type: 'user' }),
      ]),
    ).toEqual([
      { role: 'user', content: 'kept' },
      { role: 'user', content: 'kept' },
    ]);
  });

  test('repairs orphan api_system boundaries with repeated passes', () => {
    const visibilityPredicate = buildPatchedVisibilityPredicate();

    expect(
      visibilityPredicate([
        message('kept-a', 'kept'),
        message('archived-start', 'removed', { archived: true, archivedBy: 'summary-1', type: 'user' }),
        message('archived-end', 'removed', { archived: true, archivedBy: 'summary-1', type: 'user' }),
        message('orphan-1', 'removed-after', { type: 'api_system' }),
        message('kept-b', 'kept', { type: 'assistant' }),
        message('orphan-2', 'removed-after', { type: 'api_system' }),
        message('kept-c', 'kept', { type: 'user' }),
      ]),
    ).toEqual([
      { role: 'user', content: 'kept' },
      { role: 'system', content: 'removed-after' },
      { role: 'assistant', content: 'kept' },
      { role: 'user', content: 'kept' },
    ]);
  });

  test('repairs cascading orphan api_system reminders until ordering is valid', () => {
    const visibilityPredicate = buildPatchedVisibilityPredicate();

    expect(
      visibilityPredicate([
        message('kept-a', 'kept'),
        message('archived-start', 'removed', { archived: true, archivedBy: 'summary-1', type: 'assistant' }),
        message('archived-end', 'removed', { archived: true, archivedBy: 'summary-1', type: 'assistant' }),
        message('orphan-1', 'removed-after', { type: 'api_system' }),
        message('orphan-2', 'removed-after', { type: 'api_system' }),
        message('kept-b', 'kept', { type: 'user' }),
      ]),
    ).toEqual([
      { role: 'user', content: 'kept' },
      { role: 'user', content: 'kept' },
    ]);
  });

  test('merges overlapping and touching archived spans deterministically', () => {
    const visibilityPredicate = buildPatchedVisibilityPredicate();

    expect(
      visibilityPredicate([
        message('kept-a', 'kept'),
        message('a-start', 'removed', { archived: true, archivedBy: 'summary-1', type: 'user' }),
        message('a-end', 'removed', { archived: true, archivedBy: 'summary-1', type: 'assistant' }),
        message('b-start', 'removed', { archived: true, archivedBy: 'summary-2', type: 'user' }),
        message('b-end', 'removed', { archived: true, archivedBy: 'summary-2', type: 'user' }),
        message('kept-b', 'kept'),
      ]),
    ).toEqual([
      { role: 'user', content: 'kept' },
      { role: 'user', content: 'kept' },
    ]);
  });

  test('keeps multiple disjoint archived spans deterministic without removing gaps', () => {
    const visibilityPredicate = buildPatchedVisibilityPredicate();

    expect(
      visibilityPredicate([
        message('kept-a', 'kept'),
        message('a-start', 'removed', { archived: true, archivedBy: 'summary-1', type: 'user' }),
        message('a-end', 'removed', { archived: true, archivedBy: 'summary-1', type: 'assistant' }),
        message('gap', 'kept'),
        message('b-start', 'removed', { archived: true, archivedBy: 'summary-2', type: 'user' }),
        message('b-end', 'removed', { archived: true, archivedBy: 'summary-2', type: 'user' }),
        message('kept-b', 'kept'),
      ]),
    ).toEqual([
      { role: 'user', content: 'kept' },
      { role: 'user', content: 'kept' },
      { role: 'user', content: 'kept' },
    ]);
  });

  test('ignores malformed archived marks', () => {
    const visibilityPredicate = buildPatchedVisibilityPredicate();

    expect(
      visibilityPredicate([
        message('kept-a', 'kept'),
        message('bad-mark', 'kept', { archived: true, archivedBy: '', type: 'user' }),
        message('bad-type', 'kept', { archived: true, archivedBy: 123 as unknown as string, type: 'user' }),
        message('kept-b', 'kept'),
      ]),
    ).toEqual([
      { role: 'user', content: 'kept' },
      { role: 'user', content: 'kept' },
      { role: 'user', content: 'kept' },
      { role: 'user', content: 'kept' },
    ]);
  });

  test('keeps the list unchanged with no archivedBy marks', () => {
    const visibilityPredicate = buildPatchedVisibilityPredicate();

    expect(
      visibilityPredicate([
        message('a', 'kept', { type: 'assistant' }),
        message('b', 'kept', { type: 'api_system' }),
        message('c', 'kept', { type: 'assistant' }),
      ]),
    ).toEqual([
      { role: 'assistant', content: 'kept' },
      { role: 'system', content: 'kept' },
      { role: 'assistant', content: 'kept' },
    ]);
  });
});

async function fixtureBundle(visibilityFixtureName: string): Promise<string> {
  const [helpers, visibility] = await Promise.all([
    readFile(join(fixturesDir, 'runtime-helpers.fixture.js'), 'utf8'),
    readFile(join(fixturesDir, visibilityFixtureName), 'utf8'),
  ]);

  return `${helpers}\n${visibility}`;
}

type ArchivedMessage = {
  type: string;
  uuid: string;
  message: { content: string };
  archived?: boolean;
  archivedBy?: string;
};

function buildPatchedVisibilityPredicate(): (messages: Array<ArchivedMessage>) => unknown {
  const source = archivedFilterPatch.apply(testRuntimeBundle(), fakePatchContext());
  const factory = new Function('__fs', '__configDir', 'Z9', `${source};return providerMap;`);
  return factory(testRuntimeFs(), '/tmp/fake-config', { sessionId: 'session-id' }) as (
    messages: Array<ArchivedMessage>,
  ) => unknown;
}

function testRuntimeBundle(): string {
  return `
function A1(){return __fs}
function C2(){return __configDir}
function S3(){return Z9.sessionId}
function J0(a,b){return String(a).replace(/\\/+$/,'')+'/'+b}
if(A1().existsSync(J0(C2(),"history.jsonl"))){A1().readFileSync(J0(C2(),"history.jsonl"))}
A1().writeFileSync(J0(C2(),"todos"),"[]")
function Bp5(X){return {role:"user", content:X.message.content}}
function pp5(X){return {role:"assistant", content:X.message.content}}
function d(){}
function providerMap(messages,cache,ttl){d("tengu_api_cache_breakpoints",{});let D=messages.map((X,L)=>{let P=L===0;if(X.type==="user")return Bp5(X,P,cache,ttl);if(X.type==="api_system")return{role:"system",content:X.message.content};return pp5(X,P,cache,ttl)});if(cache){D[0].content=[{type:"text",text:"x",cache_control:{ttl}}]}return D}
`;
}

// 2.1.156-shaped runtime: the provider map is returned as the second arm of a
// comma sequence after the `tengu_api_cache_breakpoints` telemetry call, and the
// user/assistant converters use the 4-arg `(H,$=!1,q,K)` signature. Mirrors the
// real bundle structure the visibility-switch anchor's first alternation targets.
function testRuntimeBundle2156(): string {
  return `
function A1(){return __fs}
function C2(){return __configDir}
function S3(){return Z9.sessionId}
function J0(a,b){return String(a).replace(/\\/+$/,'')+'/'+b}
if(A1().existsSync(J0(C2(),"history.jsonl"))){A1().readFileSync(J0(C2(),"history.jsonl"))}
A1().writeFileSync(J0(C2(),"todos"),"[]")
function hLz(H,$=!1,q,K){return {role:"user", content:H.message.content}}
function SLz(H,$=!1,q,K){return {role:"assistant", content:H.message.content}}
function d(){}
function providerMap(H,cache,ttl){let Y=new Set;return d("tengu_api_cache_breakpoints",{}),H.map((M,j)=>{let w=Y.has(j);if(M.type==="user")return hLz(M,w,cache,ttl);if(M.type==="api_system")return{role:"system",content:M.message.content};return SLz(M,w,cache,ttl)})}
`;
}

function fakePatchContext() {
  return {
    installation: { path: '/tmp/fake-claude', version: 'test', kind: 'native' as const },
    originalContent: '',
    patchIndex: 0,
  };
}

function message(
  uuid: string,
  content = 'visible content',
  {
    type = 'user',
    archived = false,
    archivedBy,
  }: {
    type?: string;
    archived?: boolean;
    archivedBy?: string;
  } = {},
): ArchivedMessage {
  return {
    type,
    uuid,
    message: { content },
    ...(archived ? { archived } : {}),
    ...(archivedBy !== undefined ? { archivedBy } : {}),
  };
}

function testRuntimeFs() {
  return {
    existsSync: () => false,
    writeFileSync: () => {},
    readFileSync: () => '',
  };
}

function countOccurrences(content: string, needle: string): number {
  let count = 0;
  let index = content.indexOf(needle);
  while (index !== -1) {
    count += 1;
    index = content.indexOf(needle, index + needle.length);
  }
  return count;
}
