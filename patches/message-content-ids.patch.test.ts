import { afterEach, describe, expect, test } from 'bun:test';
import * as nodeFs from 'node:fs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { archivedFilterPatch } from './archived-filter.patch';
import { BonsaiPatchError } from './types';
import { bonsaiPatches } from './registry';
import { messageContentIdsPatch } from './message-content-ids.patch';

const sessionId = 'session-1';

let tempDirs: string[] = [];

afterEach(async () => {
  delete (globalThis as typeof globalThis & { __cbArchivedFilterCache?: unknown }).__cbArchivedFilterCache;
  await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
  tempDirs = [];
});

describe('message-content-ids patch metadata and registry', () => {
  test('exports the Contract A patch identity', () => {
    expect(messageContentIdsPatch.name).toBe('message-content-ids');
    expect(messageContentIdsPatch.sentinel).toBe('/*cb:message-content-ids:v1*/');
  });

  test('is registered as the second composed patch', () => {
    expect(bonsaiPatches[0]).toBe(archivedFilterPatch);
    expect(bonsaiPatches[1]).toBe(messageContentIdsPatch);
  });
});

describe('message-content-ids patch application', () => {
  test('uses discovery to select the converter and self-verifies its sentinel', () => {
    const patched = messageContentIdsPatch.apply(testRuntimeBundle(), fakePatchContext());

    expect(countOccurrences(patched, messageContentIdsPatch.sentinel)).toBe(1);
    expect(patched).toContain('function __cbMessageContentIdsTag');
    expect(patched).toContain('function convertMessage(M){return{role:M.type,content:__cbMessageContentIdsTag');
  });

  test('fails closed with BonsaiPatchError when the anchor is absent', () => {
    expect(() => messageContentIdsPatch.apply(runtimeHelpersOnly(), fakePatchContext())).toThrow(BonsaiPatchError);
    expect(() => messageContentIdsPatch.apply(runtimeHelpersOnly(), fakePatchContext())).toThrow(
      'no anchor candidate reached minScore'
    );
  });

  test('operates on content already transformed by archived-filter', () => {
    const archivedPatched = archivedFilterPatch.apply(composedRuntimeBundle(), fakePatchContext());
    const fullyPatched = messageContentIdsPatch.apply(archivedPatched, fakePatchContext());

    expect(countOccurrences(fullyPatched, archivedFilterPatch.sentinel)).toBe(1);
    expect(countOccurrences(fullyPatched, messageContentIdsPatch.sentinel)).toBe(1);
  });

});

describe('injected message content tags', () => {
  test('does not alter content when compaction mode marker is absent', async () => {
    const configDir = await makeTempDir();
    const convertMessage = buildPatchedConverter(configDir);

    expect(convertMessage(message('msg-1', 'hello')).content).toBe('hello');
  });

  test('appends string tags when compaction mode marker exists', async () => {
    const configDir = await makeTempDir();
    await writeFile(join(configDir, `compaction-mode-${sessionId}`), '');
    const convertMessage = buildPatchedConverter(configDir);

    expect(convertMessage(message('msg-1', 'hello')).content).toBe('hello\n[msg:msg-1]');
  });

  test('appends array text blocks when compaction mode marker exists', async () => {
    const configDir = await makeTempDir();
    await writeFile(join(configDir, `compaction-mode-${sessionId}`), '');
    const convertMessage = buildPatchedConverter(configDir);

    expect(convertMessage(message('msg-2', [{ type: 'text', text: 'hello' }])).content).toEqual([
      { type: 'text', text: 'hello' },
      { type: 'text', text: '[msg:msg-2]' },
    ]);
  });
});

function buildPatchedConverter(configDir: string): (message: { type: string; uuid: string; message: { content: unknown } }) => { role: string; content: unknown } {
  const source = messageContentIdsPatch.apply(testRuntimeBundle(), fakePatchContext());
  const factory = new Function('__fs', '__configDir', 'Z9', `${source};return convertMessage;`);
  return factory(nodeFs, configDir, { sessionId }) as (message: { type: string; uuid: string; message: { content: unknown } }) => { role: string; content: unknown };
}

function composedRuntimeBundle(): string {
  return `${runtimeHelpersOnly()}
function d(){}
function Bp5(X){return{role:"user",content:X.message.content}}
function pp5(X){return{role:"assistant",content:X.message.content}}
function providerMap(messages,cache,ttl){d("tengu_api_cache_breakpoints",{});let D=messages.map((X,L)=>{let P=L===0;if(X.type==="user")return Bp5(X,P,cache,ttl);if(X.type==="api_system")return{role:"system",content:X.message.content};return pp5(X,P,cache,ttl)});if(cache){D[0].content=[{type:"text",text:"x",cache_control:{ttl}}]}return D}
function convertMessage(M){return{role:M.type,content:M.message.content,id:M.uuid,metadata:{uuid:M.uuid}}}`;
}

function testRuntimeBundle(): string {
  return `${runtimeHelpersOnly()}
function noise(M){return{role:"system",content:M.message.content}}
function convertMessage(M){return{role:M.type,content:M.message.content,id:M.uuid,metadata:{uuid:M.uuid}}}`;
}

function runtimeHelpersOnly(): string {
  return `
function A1(){return __fs}
function C2(){return __configDir}
function S3(){return Z9.sessionId}
function J0(a,b){return String(a).replace(/\\/+$/,'')+'/'+b}
if(A1().existsSync(J0(C2(),"history.jsonl"))){A1().readFileSync(J0(C2(),"history.jsonl"))}
A1().writeFileSync(J0(C2(),"todos"),"[]")`;
}

function fakePatchContext() {
  return {
    installation: { path: '/tmp/fake-claude', version: 'test', kind: 'native' as const },
    originalContent: '',
    patchIndex: 1,
  };
}

function message(uuid: string, content: unknown): { type: string; uuid: string; message: { content: unknown } } {
  return { type: 'user', uuid, message: { content } };
}

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'cbonsai-message-content-ids-'));
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
