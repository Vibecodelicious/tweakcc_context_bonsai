import { describe, expect, test } from 'bun:test';

import {
  selectAttachmentPipelineAnchor,
  selectMessageContentConverterAnchor,
  selectReminderRenderAnchor,
  selectTokenUsageHelperAnchor,
  selectVisibilitySwitchAnchor,
} from './anchors';
import { AnchorAmbiguousError, AnchorNotFoundError } from './discovery';

describe('production patch anchor locator mechanics', () => {
  test('rejects broad UI visibility switches as provider-bound archive filters', () => {
    const broad = `function broad(M){switch(M.type){case"user":case"assistant":return M.message&&M.message.content||M.tool_use;default:return false}}`;

    expect(() => selectVisibilitySwitchAnchor(broad)).toThrow(AnchorNotFoundError);
  });

  test('fails closed when provider visibility candidates tie on strong native-like evidence', () => {
    const tied = `${nativeVisibility('A')}\n${nativeVisibility('B')}`;

    expect(() => selectVisibilitySwitchAnchor(tied)).toThrow(AnchorAmbiguousError);
  });

  test('selects the intended native-like provider message map over noisy switches', () => {
    const content = `
      function noise(N){switch(N.type){case"user":case"assistant":return N.message&&N.message.content||N.tool_use;default:return false}}
      ${'x'.repeat(1500)}
      ${nativeVisibility('V')}
      function other(O){switch(O.type){case"system":return false;default:return true}}
    `;

    const selected = selectVisibilitySwitchAnchor(content);

    expect(selected.messageVar).toBe('V');
    expect(selected.score).toBeGreaterThan(90);
  });

  test('fails closed when message converter candidates tie', () => {
    const tied = `${converter('A')}\n${converter('B')}`;

    expect(() => selectMessageContentConverterAnchor(tied)).toThrow(AnchorAmbiguousError);
  });

  test('selects pinned-target-like shapes for the converter and gauge anchors', () => {
    const content = `
      function userProviderConverter(M){if(typeof M.message.content==="string")return{role:"user",content:[{type:"text",text:M.message.content,cache_control:{ttl:"5m"}}]};return{role:"user",content:M.message.content}}
      function tokenUsageHelper(messages){return{usedTokens:10,inputTokens:1,outputTokens:2,cacheReadInputTokens:3,cacheCreationInputTokens:4,usableBudget:100,contextWindow:100}}
      function registerAttachments(B,M){B.push({type:"todo_reminder",text:"check todos",attachment:true});return B}
      function renderAttachment(A){switch(A.type){case"todo_reminder":return A.text;default:return ""}}
    `;

    expect(selectMessageContentConverterAnchor(content).messageVar).toBe('M');
    expect(selectTokenUsageHelperAnchor(content).name).toBe('tokenUsageHelper');
    expect(selectAttachmentPipelineAnchor(content).messagesVar).toBe('M');
    expect(selectReminderRenderAnchor(content).attachmentVar).toBe('A');
  });
});

function nativeVisibility(messageVar: string): string {
  return `function providerMap${messageVar}(${messageVar},cache,ttl){d("tengu_api_cache_breakpoints",{});let D=${messageVar}.map((X,L)=>{let P=L===0;if(X.type==="user")return Bp5(X,P,cache,ttl);if(X.type==="api_system")return{role:"system",content:X.message.content};return pp5(X,P,cache,ttl)});if(cache){D[0].content=[{type:"text",text:"x",cache_control:{ttl}}]}return D}function Bp5(X){return X}function pp5(X){return X}`;
}

function converter(messageVar: string): string {
  return `function convert${messageVar}(${messageVar}){return{role:${messageVar}.type,content:${messageVar}.message.content,id:${messageVar}.uuid,metadata:{uuid:${messageVar}.uuid}}}`;
}
