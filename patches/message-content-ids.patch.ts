import {
  findRuntimeHelpers,
  verifySentinel,
  type Candidate,
} from './discovery';
import { selectMessageContentConverterAnchor } from './anchors';
import { BonsaiPatchError, type BonsaiPatch } from './types';

const patchName = 'message-content-ids';
const sentinel = '/*cb:message-content-ids:v1*/';

export const messageContentIdsPatch: BonsaiPatch = {
  name: patchName,
  sentinel,
  apply(content) {
    try {
      const helpers = findRuntimeHelpers(content);
      const selected = selectMessageContentConverterAnchor(content);
      const patched = spliceTaggedContent(content, selected, selected.messageVar, helpers);

      verifySentinel(patched, sentinel);
      return patched;
    } catch (error) {
      if (error instanceof BonsaiPatchError && error.patchName === patchName) throw error;
      const message = error instanceof Error ? error.message : String(error);
      throw new BonsaiPatchError(patchName, message, { cause: error });
    }
  },
};

export default messageContentIdsPatch;

function spliceTaggedContent(
  content: string,
  candidate: Candidate,
  messageVar: string,
  helpers: { fsFunc: string; configDirFunc: string; sessionIdFunc: string }
): string {
  const contentMatch = /\bcontent\s*:\s*/.exec(candidate.text);
  if (!contentMatch) {
    throw new BonsaiPatchError(patchName, 'selected converter did not expose a content property');
  }

  const valueStart = candidate.index + contentMatch.index + contentMatch[0].length;
  const valueEnd = findContentExpressionEnd(content, valueStart);
  const originalExpression = content.slice(valueStart, valueEnd);
  const helper = buildInjectedTagger(helpers);
  const replacement = `__cbMessageContentIdsTag(${originalExpression},${messageVar})`;

  return `${content.slice(0, candidate.index)}${helper}${content.slice(
    candidate.index,
    valueStart
  )}${replacement}${content.slice(valueEnd)}`;
}

function findContentExpressionEnd(content: string, start: number): number {
  let depth = 0;
  let quote: string | null = null;
  for (let index = start; index < content.length; index += 1) {
    const char = content[index];
    const previous = content[index - 1];
    if (quote) {
      if (char === quote && previous !== '\\') quote = null;
      continue;
    }

    if (char === '"' || char === "'" || char === '`') {
      quote = char;
      continue;
    }

    if (char === '(' || char === '[' || char === '{') depth += 1;
    if (char === ')' || char === ']' || char === '}') {
      if (depth === 0) return index;
      depth -= 1;
    }
    if (depth === 0 && char === ',') return index;
  }

  throw new BonsaiPatchError(patchName, 'could not find content expression boundary');
}

function buildInjectedTagger(helpers: { fsFunc: string; configDirFunc: string; sessionIdFunc: string }): string {
  return `${sentinel}function __cbMessageContentIdsTag(__cbContent,__cbMessage){try{const __cbUuid=__cbMessage&&__cbMessage.uuid;if(!__cbUuid)return __cbContent;const __cbSessionId=${helpers.sessionIdFunc}();if(!__cbSessionId)return __cbContent;const __cbMarkerPath=String(${helpers.configDirFunc}()).replace(/\\/+$/,'')+"/compaction-mode-"+__cbSessionId;if(!${helpers.fsFunc}().existsSync(__cbMarkerPath))return __cbContent;const __cbTag="[msg:"+__cbUuid+"]";if(typeof __cbContent==="string")return __cbContent+"\\n"+__cbTag;if(Array.isArray(__cbContent))return __cbContent.concat([{type:"text",text:__cbTag}]);return __cbContent}catch{return __cbContent}}`;
}
