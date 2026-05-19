import {
  findCandidates,
  findRuntimeHelpers,
  scoreCandidates,
  selectUnique,
  verifySentinel,
  type Candidate,
} from './discovery';
import { BonsaiPatchError, type BonsaiPatch } from './types';

const patchName = 'message-content-ids';
const sentinel = '/*cb:message-content-ids:v1*/';
const identifier = String.raw`[$A-Z_a-z][$\w]*`;
const converterPatterns = [
  new RegExp(
    String.raw`function\s+${identifier}\s*\(\s*(${identifier})[^)]*\)\s*\{[\s\S]{0,900}?return\s*\{\s*role\s*:\s*["'](?:user|assistant)["']\s*,\s*content\s*:`,
    'g'
  ),
  new RegExp(
    String.raw`function\s+${identifier}\s*\(\s*(${identifier})\s*\)\s*\{(?=[\s\S]{0,800}\buuid\b)(?=[\s\S]{0,800}\bcontent\s*:)[\s\S]{0,800}?return\s*\{[\s\S]{0,400}?\bcontent\s*:\s*[^,}]+`,
    'g'
  ),
  new RegExp(
    String.raw`(?:const|let|var)\s+${identifier}\s*=\s*\(?\s*(${identifier})\s*\)?\s*=>\s*\{(?=[\s\S]{0,800}\buuid\b)(?=[\s\S]{0,800}\bcontent\s*:)[\s\S]{0,800}?return\s*\{[\s\S]{0,400}?\bcontent\s*:\s*[^,}]+`,
    'g'
  ),
  new RegExp(
    String.raw`(?:const|let|var)\s+${identifier}\s*=\s*\(?\s*(${identifier})\s*\)?\s*=>\s*\(\s*\{(?=[\s\S]{0,800}\buuid\b)(?=[\s\S]{0,800}\bcontent\s*:)[\s\S]{0,400}?\bcontent\s*:\s*[^,}]+`,
    'g'
  ),
];

export const messageContentIdsPatch: BonsaiPatch = {
  name: patchName,
  sentinel,
  apply(content) {
    try {
      const helpers = findRuntimeHelpers(content);
      const candidates = findCandidates(content, converterPatterns);
      const scored = scoreCandidates(content, candidates, [converterScorer]);
      const selected = selectUnique(content, scored, { minScore: 35, minMargin: 10 });
      const messageVar = extractMessageVariable(selected);
      const patched = spliceTaggedContent(content, selected, messageVar, helpers);

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

function converterScorer(_content: string, candidate: Candidate): number {
  let score = 0;
  if (/\buuid\b/.test(candidate.text)) score += 15;
  if (/\bcontent\s*:/.test(candidate.text)) score += 15;
  if (/\brole\s*:/.test(candidate.text)) score += 10;
  if (/\bmessage\b/.test(candidate.text)) score += 5;
  if (/\btype\b/.test(candidate.text)) score += 5;
  if (/\b\w+\.message\.content\b/.test(candidate.text)) score += 15;
  if (/\brole\s*:\s*["']user["']/.test(candidate.text)) score += 20;
  if (/\brole\s*:\s*["']assistant["']/.test(candidate.text)) score += 5;
  if (/\brole\s*:\s*["']system["']/.test(candidate.text)) score -= 20;
  if (/\bmetadata\s*:\s*\{\s*uuid\b/.test(candidate.text)) score += 10;
  if (/typeof\s+\w+\.message\.content\s*===\s*["']string["']/.test(candidate.text)) score += 10;
  if (/\.map\s*\(/.test(candidate.text)) score -= 40;
  return score;
}

function extractMessageVariable(candidate: Candidate): string {
  for (const pattern of [
    new RegExp(String.raw`function\s+${identifier}\s*\(\s*(${identifier})(?:\s*[,)=])`),
    new RegExp(String.raw`function\s+${identifier}\s*\(\s*(${identifier})\s*\)`),
    new RegExp(String.raw`(?:const|let|var)\s+${identifier}\s*=\s*\(?\s*(${identifier})\s*\)?\s*=>`),
  ]) {
    const variable = pattern.exec(candidate.text)?.[1];
    if (variable) return variable;
  }

  throw new BonsaiPatchError(patchName, 'selected converter did not expose a message variable');
}

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
