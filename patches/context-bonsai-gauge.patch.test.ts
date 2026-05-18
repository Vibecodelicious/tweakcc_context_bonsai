import { afterEach, describe, expect, test } from 'bun:test';

import { archivedFilterPatch } from './archived-filter.patch';
import { contextBonsaiGaugePatch } from './context-bonsai-gauge.patch';
import { messageContentIdsPatch } from './message-content-ids.patch';
import { bonsaiPatches } from './registry';
import { BonsaiPatchError } from './types';

afterEach(() => {
  delete (globalThis as typeof globalThis & { __cbContextBonsaiGaugeState?: unknown }).__cbContextBonsaiGaugeState;
});

describe('context-bonsai-gauge patch metadata and registry', () => {
  test('exports the Contract A patch identity', () => {
    expect(contextBonsaiGaugePatch.name).toBe('context-bonsai-gauge');
    expect(contextBonsaiGaugePatch.sentinel).toBe('/*cb:context-bonsai-gauge:v1*/');
  });

  test('is registered as the third composed patch', () => {
    expect(bonsaiPatches[0]).toBe(archivedFilterPatch);
    expect(bonsaiPatches[1]).toBe(messageContentIdsPatch);
    expect(bonsaiPatches[2]).toBe(contextBonsaiGaugePatch);
  });
});

describe('context-bonsai-gauge patch application', () => {
  test('discovers all three anchors and self-verifies its sentinel', () => {
    const patched = contextBonsaiGaugePatch.apply(testRuntimeBundle(), fakePatchContext());

    expect(countOccurrences(patched, contextBonsaiGaugePatch.sentinel)).toBe(1);
    expect(patched).toContain('function __cbContextBonsaiGaugeAttachment');
    expect(patched).toContain('const __cbGauge=__cbContextBonsaiGaugeAttachment(M)');
    expect(patched).toContain('case"context-bonsai-gauge":return A.text;');
  });

  test('fails closed with BonsaiPatchError when an anchor is absent', () => {
    expect(() => contextBonsaiGaugePatch.apply(tokenUsageOnly(), fakePatchContext())).toThrow(BonsaiPatchError);
    expect(() => contextBonsaiGaugePatch.apply(tokenUsageOnly(), fakePatchContext())).toThrow(
      'no anchor candidate reached minScore'
    );
  });

  test('composes after archived-filter and message-content-ids', () => {
    const patched = bonsaiPatches.reduce(
      (content, patch, index) => patch.apply(content, { ...fakePatchContext(), patchIndex: index }),
      composedRuntimeBundle()
    );

    expect(countOccurrences(patched, archivedFilterPatch.sentinel)).toBe(1);
    expect(countOccurrences(patched, messageContentIdsPatch.sentinel)).toBe(1);
    expect(countOccurrences(patched, contextBonsaiGaugePatch.sentinel)).toBe(1);
  });
});

describe('injected context gauge behavior', () => {
  test('fires on threshold cadence and renders the low-severity reminder', () => {
    const runtime = buildPatchedRuntime({ usedTokens: 280, usableBudget: 1000 });
    const messages = makeTurns(22);
    const attachments: Array<{ type: string; text: string }> = [];

    runtime.registerAttachments(attachments, messages);
    const gauge = findGaugeAttachment(attachments);
    expect(gauge).toBeDefined();
    expect(runtime.renderAttachment(gauge!)).toContain('Informational: context is healthy');
  });

  test('stays silent before cadence and usage thresholds are met', () => {
    const runtime = buildPatchedRuntime({ usedTokens: 200, usableBudget: 1000 });
    const attachments: Array<{ type: string; text: string }> = [];

    runtime.registerAttachments(attachments, makeTurns(22));
    expect(findGaugeAttachment(attachments)).toBeUndefined();
  });

  test('fires on prune/retrieve tool responses and decodes metadata with Buffer', () => {
    const runtime = buildPatchedRuntime({ usedTokens: 100, usableBudget: 1000 });
    const metadata = Buffer.from(
      JSON.stringify({ op: 'prune', anchor_id: 'a', range_end_id: 'b', placeholder_text: 'p' }),
      'utf8'
    ).toString('base64');
    const messages = [
      {
        type: 'user',
        message: {
          content: `<context-bonsai-tool-response encoding="base64">${metadata}</context-bonsai-tool-response>`,
        },
      },
    ];
    const attachments: Array<{ type: string; text: string }> = [];

    runtime.registerAttachments(attachments, messages);
    const gauge = findGaugeAttachment(attachments);
    expect(gauge).toBeDefined();
    expect(gauge!.text).toContain('A context-bonsai prune/retrieve result was just observed.');
  });

  test('graduates severity bands through prune-ready, strong, and urgent guidance', () => {
    expect(renderGaugeText({ usedTokens: 450, usableBudget: 1000 })).toContain('Prune-ready advisory');
    expect(renderGaugeText({ usedTokens: 700, usableBudget: 1000 })).toContain('Strong reminder');
    expect(renderGaugeText({ usedTokens: 850, usableBudget: 1000 })).toContain('PRUNE NOW');
  });
});

function buildPatchedRuntime(usage: { usedTokens: number; usableBudget: number }): {
  registerAttachments: (attachments: Array<{ type: string; text: string }>, messages: unknown[]) => void;
  renderAttachment: (attachment: { type: string; text: string }) => string;
} {
  const source = contextBonsaiGaugePatch.apply(testRuntimeBundle(usage), fakePatchContext());
  const factory = new Function(`${source};return{registerAttachments,renderAttachment};`);
  return factory() as {
    registerAttachments: (attachments: Array<{ type: string; text: string }>, messages: unknown[]) => void;
    renderAttachment: (attachment: { type: string; text: string }) => string;
  };
}

function renderGaugeText(usage: { usedTokens: number; usableBudget: number }): string {
  delete (globalThis as typeof globalThis & { __cbContextBonsaiGaugeState?: unknown }).__cbContextBonsaiGaugeState;
  const runtime = buildPatchedRuntime(usage);
  const attachments: Array<{ type: string; text: string }> = [];
  runtime.registerAttachments(attachments, makeTurns(22));
  return runtime.renderAttachment(findGaugeAttachment(attachments)!);
}

function findGaugeAttachment(
  attachments: Array<{ type: string; text: string }>
): { type: string; text: string } | undefined {
  return attachments.find((attachment) => attachment.type === 'context-bonsai-gauge');
}

function composedRuntimeBundle(): string {
  return `${runtimeHelpersOnly()}
function visibilityPredicate(X){switch(X.type){case"user":case"assistant":return X.message&&X.message.content||X.tool_use;default:return false}}
function convertMessage(M){return{role:M.type,content:M.message.content,id:M.uuid,metadata:{uuid:M.uuid}}}
${testRuntimeBundle()}`;
}

function testRuntimeBundle(usage: { usedTokens: number; usableBudget: number } = { usedTokens: 450, usableBudget: 1000 }): string {
  return `${tokenUsageOnly(usage)}
function registerAttachments(B,M){B.push({type:"todo_reminder",text:"check todos",attachment:true});return B}
function renderAttachment(A){switch(A.type){case"todo_reminder":return A.text;default:return ""}}`;
}

function tokenUsageOnly(usage: { usedTokens: number; usableBudget: number } = { usedTokens: 450, usableBudget: 1000 }): string {
  return `function tokenUsageHelper(messages){return{usedTokens:${usage.usedTokens},inputTokens:1,outputTokens:2,cacheReadInputTokens:3,cacheCreationInputTokens:4,usableBudget:${usage.usableBudget},contextWindow:${usage.usableBudget}}}`;
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

function makeTurns(count: number): Array<{ type: 'user' | 'assistant'; message: { content: string } }> {
  return Array.from({ length: count }, (_, index) => ({
    type: index % 2 === 0 ? 'user' : 'assistant',
    message: { content: `turn ${index}` },
  }));
}

function fakePatchContext() {
  return {
    installation: { path: '/tmp/fake-claude', version: 'test', kind: 'native' as const },
    originalContent: '',
    patchIndex: 2,
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
