import { afterEach, describe, expect, test } from 'bun:test';
import * as nodeFs from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { BonsaiPatchError } from './types';
import { bonsaiPatches } from './registry';
import { archivedFilterPatch } from './archived-filter.patch';

const fixturesDir = join(import.meta.dir, '__fixtures__');
const sessionId = 'session-1';

let tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
  tempDirs = [];
});

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

  test('fails closed with BonsaiPatchError when the anchor is absent', async () => {
    const content = await fixtureBundle('runtime-helpers.fixture.js');

    expect(() => archivedFilterPatch.apply(content, fakePatchContext())).toThrow(BonsaiPatchError);
    expect(() => archivedFilterPatch.apply(content, fakePatchContext())).toThrow('no anchor candidate reached minScore');
  });
});

describe('injected archived UUID filter', () => {
  test('reads archived marker files and filters matching message UUIDs', async () => {
    const configDir = await makeTempDir();
    await writeFile(join(configDir, `archived-${sessionId}.json`), JSON.stringify(['archived-message']));
    const visibilityPredicate = buildPatchedVisibilityPredicate(configDir);

    expect(visibilityPredicate([message('archived-message', 'archived'), message('active-message', 'active')])).toEqual([
      { role: 'user', content: 'active' },
    ]);
  });

  test('picks up marker rewrites to another UUID set without forced mtime changes', async () => {
    const configDir = await makeTempDir();
    const markerPath = join(configDir, `archived-${sessionId}.json`);
    await writeFile(markerPath, JSON.stringify(['first-message']));
    const visibilityPredicate = buildPatchedVisibilityPredicate(configDir);

    expect(visibilityPredicate([message('first-message', 'first'), message('second-message', 'second')])).toEqual([
      { role: 'user', content: 'second' },
    ]);

    await writeFile(markerPath, JSON.stringify(['second-message']));

    expect(visibilityPredicate([message('first-message', 'first'), message('second-message', 'second')])).toEqual([
      { role: 'user', content: 'first' },
    ]);
  });

  test('picks up marker rewrites to an empty array without forced mtime changes', async () => {
    const configDir = await makeTempDir();
    const markerPath = join(configDir, `archived-${sessionId}.json`);
    await writeFile(markerPath, JSON.stringify(['first-message']));
    const visibilityPredicate = buildPatchedVisibilityPredicate(configDir);

    expect(visibilityPredicate([message('first-message', 'first'), message('second-message', 'second')])).toEqual([
      { role: 'user', content: 'second' },
    ]);

    await writeFile(markerPath, JSON.stringify([]));

    expect(visibilityPredicate([message('first-message', 'first'), message('second-message', 'second')])).toEqual([
      { role: 'user', content: 'first' },
      { role: 'user', content: 'second' },
    ]);
  });

  test('fails safe for missing, empty, or corrupt marker files', async () => {
    const configDir = await makeTempDir();
    const visibilityPredicate = buildPatchedVisibilityPredicate(configDir);

    expect(visibilityPredicate([message('missing-marker')])).toEqual([{ role: 'user', content: 'visible content' }]);

    const markerPath = join(configDir, `archived-${sessionId}.json`);
    await writeFile(markerPath, '');
    expect(visibilityPredicate([message('empty-marker')])).toEqual([{ role: 'user', content: 'visible content' }]);

    await writeFile(markerPath, '{not json');
    expect(visibilityPredicate([message('corrupt-marker')])).toEqual([{ role: 'user', content: 'visible content' }]);

    await writeFile(markerPath, JSON.stringify({ archived: ['not-an-array'] }));
    expect(visibilityPredicate([message('non-array-marker')])).toEqual([{ role: 'user', content: 'visible content' }]);
  });

  test('reads the marker through a strict host-wrapper fs that requires an encoding argument', async () => {
    const configDir = await makeTempDir();
    await writeFile(join(configDir, `archived-${sessionId}.json`), JSON.stringify(['archived-message']));
    const visibilityPredicate = buildPatchedVisibilityPredicateWithWrapperFs(configDir);

    expect(visibilityPredicate([message('archived-message', 'archived'), message('active-message', 'active')])).toEqual([
      { role: 'user', content: 'active' },
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

function buildPatchedVisibilityPredicate(configDir: string): (messages: Array<{ type: string; uuid: string; message: { content: string } }>) => unknown {
  const source = archivedFilterPatch.apply(testRuntimeBundle(), fakePatchContext());
  const factory = new Function('__fs', '__configDir', 'Z9', `${source};return providerMap;`);
  return factory(nodeFs, configDir, { sessionId }) as (messages: Array<{ type: string; uuid: string; message: { content: string } }>) => unknown;
}

// Mirrors the Claude Code host fs wrapper: readFileSync dereferences options.encoding,
// so a call with no second argument throws (the live-binary failure mode this story fixes).
// A real, separate stub on purpose — __fixtures__/runtime-helpers.fixture.js is wired only
// into the anchor/fail-closed tests and is not exercised by the injected-filter predicate.
function createWrapperFs(): {
  existsSync: (path: string) => boolean;
  writeFileSync: (path: string, data: unknown) => void;
  readFileSync: (path: string, options?: { encoding?: BufferEncoding } | BufferEncoding) => string | Buffer;
} {
  return {
    existsSync: () => false,
    writeFileSync: () => {},
    readFileSync: (path, options) => {
      const encoding = typeof options === 'string' ? options : options?.encoding;
      if (encoding === undefined) {
        throw new TypeError("undefined is not an object (evaluating 'options.encoding')");
      }
      return nodeFs.readFileSync(path, encoding);
    },
  };
}

function buildPatchedVisibilityPredicateWithWrapperFs(configDir: string): (messages: Array<{ type: string; uuid: string; message: { content: string } }>) => unknown {
  const source = archivedFilterPatch.apply(testRuntimeBundle(), fakePatchContext());
  const factory = new Function('__fs', '__configDir', 'Z9', `${source};return providerMap;`);
  return factory(createWrapperFs(), configDir, { sessionId }) as (messages: Array<{ type: string; uuid: string; message: { content: string } }>) => unknown;
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

function fakePatchContext() {
  return {
    installation: { path: '/tmp/fake-claude', version: 'test', kind: 'native' as const },
    originalContent: '',
    patchIndex: 0,
  };
}

function message(uuid: string, content = 'visible content'): { type: string; uuid: string; message: { content: string } } {
  return { type: 'user', uuid, message: { content } };
}

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'cbonsai-archived-filter-'));
  tempDirs.push(dir);
  return dir;
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
