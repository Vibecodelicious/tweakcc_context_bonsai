import { describe, expect, test } from 'bun:test';

import {
  selectAttachmentPipelineAnchor,
  selectMessageContentConverterAnchor,
  selectReminderRenderAnchor,
  selectTokenUsageHelperAnchor,
  selectVisibilitySwitchAnchor,
} from './anchors';
import { AnchorAmbiguousError, AnchorNotFoundError } from './discovery';

describe('production patch anchors', () => {
  test('rejects broad visibility switches without transcript/reduction context', () => {
    const broad = `function broad(M){switch(M.type){case"user":case"assistant":return M.message&&M.message.content||M.tool_use;default:return false}}`;

    expect(() => selectVisibilitySwitchAnchor(broad)).toThrow(AnchorNotFoundError);
  });

  test('fails closed when visibility candidates tie on strong native-like evidence', () => {
    const tied = `${nativeVisibility('A')}\n${nativeVisibility('B')}`;

    expect(() => selectVisibilitySwitchAnchor(tied)).toThrow(AnchorAmbiguousError);
  });

  test('selects the intended native-like visibility switch over noisy switches', () => {
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
      ${converter('M')}
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
  return `function toolUseId${messageVar}(X){if(X.type==="assistant")return X.message.content[0]?.id;if(X.type==="user")return X.message.content[0]?.tool_use_id;return X.toolUseID}
function visibility${messageVar}(${messageVar},$,q,K,_,R){if(_==="transcript")return!0;switch(${messageVar}.type){case"attachment":case"user":case"assistant":{let z=toolUseId${messageVar}(${messageVar});if(!z)return!0;if($.has(z))return!1;if(q.has(z))return!1;return R.resolvedToolUseIDs.has(z)}case"system":return ${messageVar}.subtype!=="api_error";case"grouped_tool_use":return ${messageVar}.messages.every((Y)=>R.resolvedToolUseIDs.has(Y.message.content[0].id));case"collapsed_read_search":return!1}}`;
}

function converter(messageVar: string): string {
  return `function convert${messageVar}(${messageVar}){return{role:${messageVar}.type,content:${messageVar}.message.content,id:${messageVar}.uuid,metadata:{uuid:${messageVar}.uuid}}}`;
}
