import { afterEach, describe, expect, test } from 'bun:test';
import * as nodeFs from 'node:fs';
import { mkdtemp, readFile, rm, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { BonsaiPatchError } from './types';
import { bonsaiPatches } from './registry';
import { archivedFilterPatch } from './archived-filter.patch';

const fixturesDir = join(import.meta.dir, '__fixtures__');
const sessionId = 'session-1';

let tempDirs: string[] = [];

afterEach(async () => {
  delete (globalThis as typeof globalThis & { __cbArchivedFilterCache?: unknown }).__cbArchivedFilterCache;
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
  test('uses discovery to select the visibility predicate and self-verifies its sentinel', async () => {
    const content = await fixtureBundle('visibility-switch-133.fixture.js');
    const patched = archivedFilterPatch.apply(content, fakePatchContext());

    expect(countOccurrences(patched, archivedFilterPatch.sentinel)).toBe(1);
    expect(patched).toContain(`${archivedFilterPatch.sentinel}{const __cbArchivedFilterCache`);
    expect(patched).toContain('function visibilityPredicate(X,$,q,K,_,A){if(_==="transcript")return!0;/*cb:archived-filter:v1*/{');
  });

  test('disambiguates the native 2.1.143 transcript visibility switch by surrounding context', async () => {
    const content = `${await fixtureBundle('visibility-switch.fixture.js')}
      function noisyTrace(w){switch(w.type){case"user":case"assistant":{if("message"in w){let D=w.message.content;if(Array.isArray(D))for(let j of D){if(j.type==="tool_use")return D}}}}
      function toolUseId(H){switch(H.type){case"attachment":return H.attachment.toolUseID;case"assistant":if(H.message.content[0]?.type!=="tool_use")return null;return H.message.content[0].id;case"user":if(H.message.content[0]?.type!=="tool_result")return null;return H.message.content[0].tool_use_id;case"progress":return H.toolUseID;case"system":return H.subtype==="informational"?H.toolUseID??null:null}}
      function nativeVisibility(H,$,q,K,_,A){if(_==="transcript")return!0;switch(H.type){case"attachment":case"user":case"assistant":{if(H.type==="assistant"){let Y=H.message.content[0];if(Y?.type==="server_tool_use")return A.resolvedToolUseIDs.has(Y.id)}let z=toolUseId(H);if(!z)return!0;if($.has(z))return!1;if(q.has(z))return!1;return K.has(z)}case"system":return H.subtype!=="api_error";case"grouped_tool_use":return H.messages.every((Y)=>A.resolvedToolUseIDs.has(Y.message.content[0].id));case"collapsed_read_search":return!1}}
    `;
    const patched = archivedFilterPatch.apply(content, fakePatchContext());

    expect(patched).toContain('function nativeVisibility(H,$,q,K,_,A){if(_==="transcript")return!0;/*cb:archived-filter:v1*/{');
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

    expect(visibilityPredicate(message('archived-message'))).toBe(false);
    expect(visibilityPredicate(message('active-message'))).toBe('visible content');
  });

  test('picks up marker-file changes through mtime-based cache refresh', async () => {
    const configDir = await makeTempDir();
    const markerPath = join(configDir, `archived-${sessionId}.json`);
    await writeFile(markerPath, JSON.stringify(['first-message']));
    const visibilityPredicate = buildPatchedVisibilityPredicate(configDir);

    expect(visibilityPredicate(message('first-message'))).toBe(false);
    expect(visibilityPredicate(message('second-message'))).toBe('visible content');

    await writeFile(markerPath, JSON.stringify(['second-message']));
    const future = new Date(Date.now() + 2000);
    await utimes(markerPath, future, future);

    expect(visibilityPredicate(message('first-message'))).toBe('visible content');
    expect(visibilityPredicate(message('second-message'))).toBe(false);
  });

  test('fails safe for missing, empty, or corrupt marker files', async () => {
    const configDir = await makeTempDir();
    const visibilityPredicate = buildPatchedVisibilityPredicate(configDir);

    expect(visibilityPredicate(message('missing-marker'))).toBe('visible content');

    const markerPath = join(configDir, `archived-${sessionId}.json`);
    await writeFile(markerPath, '');
    const future = new Date(Date.now() + 2000);
    await utimes(markerPath, future, future);
    expect(visibilityPredicate(message('empty-marker'))).toBe('visible content');

    await writeFile(markerPath, '{not json');
    const later = new Date(Date.now() + 4000);
    await utimes(markerPath, later, later);
    expect(visibilityPredicate(message('corrupt-marker'))).toBe('visible content');
  });
});

async function fixtureBundle(visibilityFixtureName: string): Promise<string> {
  const [helpers, visibility] = await Promise.all([
    readFile(join(fixturesDir, 'runtime-helpers.fixture.js'), 'utf8'),
    readFile(join(fixturesDir, visibilityFixtureName), 'utf8'),
  ]);

  return `${helpers}\n${visibility}`;
}

function buildPatchedVisibilityPredicate(configDir: string): (message: { type: string; uuid: string; message: { content: string } }) => unknown {
  const source = archivedFilterPatch.apply(testRuntimeBundle(), fakePatchContext());
  const factory = new Function('__fs', '__configDir', 'Z9', `${source};return visibilityPredicate;`);
  return factory(nodeFs, configDir, { sessionId }) as (message: { type: string; uuid: string; message: { content: string } }) => unknown;
}

function testRuntimeBundle(): string {
  return `
function A1(){return __fs}
function C2(){return __configDir}
function S3(){return Z9.sessionId}
function J0(a,b){return String(a).replace(/\\/+$/,'')+'/'+b}
if(A1().existsSync(J0(C2(),"history.jsonl"))){A1().readFileSync(J0(C2(),"history.jsonl"))}
A1().writeFileSync(J0(C2(),"todos"),"[]")
function toolUseId(X){if(X.type==="assistant")return X.message.content[0]?.id;if(X.type==="user")return X.message.content[0]?.tool_use_id;return X.toolUseID}
function visibilityPredicate(X,$,q,K,_,A){if(_==="transcript")return!0;switch(X.type){case"attachment":case"user":case"assistant":{let z=toolUseId(X);if(!z)return X.message&&X.message.content||X.tool_use;return A.resolvedToolUseIDs.has(z)}case"system":return X.subtype!=="api_error";case"grouped_tool_use":return A.resolvedToolUseIDs.has(X.message.content[0].id);case"collapsed_read_search":return false}}
`;
}

function fakePatchContext() {
  return {
    installation: { path: '/tmp/fake-claude', version: 'test', kind: 'native' as const },
    originalContent: '',
    patchIndex: 0,
  };
}

function message(uuid: string): { type: string; uuid: string; message: { content: string } } {
  return { type: 'user', uuid, message: { content: 'visible content' } };
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
