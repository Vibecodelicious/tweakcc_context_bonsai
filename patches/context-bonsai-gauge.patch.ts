import {
  findCandidates,
  scoreCandidates,
  selectUnique,
  verifySentinel,
  type Candidate,
} from './discovery';
import { BonsaiPatchError, type BonsaiPatch } from './types';

const patchName = 'context-bonsai-gauge';
const sentinel = '/*cb:context-bonsai-gauge:v1*/';
const identifier = String.raw`[$A-Z_a-z][$\w]*`;

const tokenUsagePatterns = [
  new RegExp(
    String.raw`function\s+(${identifier})\s*\([^)]*\)\s*\{(?=[\s\S]{0,900}\b(?:contextWindow|contextLimit|usableBudget|modelLimit)\b)(?=[\s\S]{0,900}\b(?:usedTokens|inputTokens|totalTokens)\b)[\s\S]{0,900}?\}`,
    'g'
  ),
  new RegExp(
    String.raw`(?:const|let|var)\s+(${identifier})\s*=\s*\([^)]*\)\s*=>\s*\{(?=[\s\S]{0,900}\b(?:contextWindow|contextLimit|usableBudget|modelLimit)\b)(?=[\s\S]{0,900}\b(?:usedTokens|inputTokens|totalTokens)\b)[\s\S]{0,900}?\}`,
    'g'
  ),
];

const attachmentPipelinePatterns = [
  new RegExp(
    String.raw`function\s+${identifier}\s*\(\s*(${identifier})\s*,\s*(${identifier})\s*\)\s*\{(?=[\s\S]{0,800}\.push\s*\()(?=[\s\S]{0,800}(?:todo|reminder|attachment))[\s\S]{0,800}?\}`,
    'g'
  ),
  new RegExp(
    String.raw`(?:const|let|var)\s+${identifier}\s*=\s*\(\s*(${identifier})\s*,\s*(${identifier})\s*\)\s*=>\s*\{(?=[\s\S]{0,800}\.push\s*\()(?=[\s\S]{0,800}(?:todo|reminder|attachment))[\s\S]{0,800}?\}`,
    'g'
  ),
];

const reminderRenderPatterns = [
  new RegExp(
    String.raw`switch\(\s*(${identifier})\.type\s*\)\s*\{(?=[\s\S]{0,500}case["'](?:todo[_-]?reminder|todo)["'])[\s\S]{0,500}?case["'](?:todo[_-]?reminder|todo)["']`,
    'g'
  ),
];

export const contextBonsaiGaugePatch: BonsaiPatch = {
  name: patchName,
  sentinel,
  apply(content) {
    try {
      let patched = content;

      const tokenUsage = selectTokenUsageHelper(patched);
      patched = `${patched.slice(0, tokenUsage.index)}${buildInjectedGaugeHelpers(tokenUsage.name)}${patched.slice(
        tokenUsage.index
      )}`;

      const attachment = selectAttachmentPipeline(patched);
      patched = spliceAttachmentRegistration(patched, attachment);

      const reminder = selectReminderRenderCase(patched);
      patched = spliceReminderRenderCase(patched, reminder);

      verifySentinel(patched, sentinel);
      return patched;
    } catch (error) {
      if (error instanceof BonsaiPatchError && error.patchName === patchName) throw error;
      const message = error instanceof Error ? error.message : String(error);
      throw new BonsaiPatchError(patchName, message, { cause: error });
    }
  },
};

export default contextBonsaiGaugePatch;

function selectTokenUsageHelper(content: string): Candidate & { name: string } {
  const candidates = findCandidates(content, tokenUsagePatterns);
  const scored = scoreCandidates(content, candidates, [tokenUsageScorer]);
  const selected = selectUnique(content, scored, { minScore: 15, minMargin: 10 });
  const name = extractFunctionName(selected);
  return { ...selected, name };
}

function selectAttachmentPipeline(content: string): Candidate & { attachmentsVar: string; messagesVar: string } {
  const candidates = findCandidates(content, attachmentPipelinePatterns);
  const scored = scoreCandidates(content, candidates, [attachmentPipelineScorer]);
  const selected = selectUnique(content, scored, { minScore: 15, minMargin: 10 });
  const vars = extractTwoParameters(selected, 'selected attachment pipeline did not expose attachment/message variables');
  return { ...selected, attachmentsVar: vars.first, messagesVar: vars.second };
}

function selectReminderRenderCase(content: string): Candidate & { attachmentVar: string } {
  const candidates = findCandidates(content, reminderRenderPatterns);
  const scored = scoreCandidates(content, candidates, [reminderRenderScorer]);
  const selected = selectUnique(content, scored, { minScore: 15, minMargin: 10 });
  const attachmentVar = new RegExp(String.raw`switch\(\s*(${identifier})\.type\s*\)`).exec(selected.text)?.[1];
  if (!attachmentVar) {
    throw new BonsaiPatchError(patchName, 'selected reminder render case did not expose attachment variable');
  }
  return { ...selected, attachmentVar };
}

function tokenUsageScorer(_content: string, candidate: Candidate): number {
  let score = 0;
  if (/\b(?:contextWindow|contextLimit|usableBudget|modelLimit)\b/.test(candidate.text)) score += 20;
  if (/\b(?:usedTokens|inputTokens|totalTokens)\b/.test(candidate.text)) score += 15;
  if (/\b(?:cacheReadInputTokens|cacheCreationInputTokens|outputTokens)\b/.test(candidate.text)) score += 10;
  if (/\breturn\b/.test(candidate.text)) score += 5;
  return score;
}

function attachmentPipelineScorer(_content: string, candidate: Candidate): number {
  let score = 0;
  if (/\.push\s*\(/.test(candidate.text)) score += 15;
  if (/\b(?:todo|reminder)\b/i.test(candidate.text)) score += 15;
  if (/\battachment/i.test(candidate.text)) score += 10;
  if (/\breturn\b/.test(candidate.text)) score += 5;
  return score;
}

function reminderRenderScorer(_content: string, candidate: Candidate): number {
  let score = 0;
  if (/case["'](?:todo[_-]?reminder|todo)["']/.test(candidate.text)) score += 20;
  if (/\btext\b|\bcontent\b/.test(candidate.text)) score += 10;
  if (/\breturn\b/.test(candidate.text)) score += 5;
  return score;
}

function extractFunctionName(candidate: Candidate): string {
  for (const pattern of [
    new RegExp(String.raw`function\s+(${identifier})\s*\(`),
    new RegExp(String.raw`(?:const|let|var)\s+(${identifier})\s*=`),
  ]) {
    const name = pattern.exec(candidate.text)?.[1];
    if (name) return name;
  }

  throw new BonsaiPatchError(patchName, 'selected token usage helper did not expose a function name');
}

function extractTwoParameters(candidate: Candidate, message: string): { first: string; second: string } {
  for (const pattern of [
    new RegExp(String.raw`function\s+${identifier}\s*\(\s*(${identifier})\s*,\s*(${identifier})\s*\)`),
    new RegExp(String.raw`(?:const|let|var)\s+${identifier}\s*=\s*\(\s*(${identifier})\s*,\s*(${identifier})\s*\)\s*=>`),
  ]) {
    const match = pattern.exec(candidate.text);
    if (match?.[1] && match[2]) return { first: match[1], second: match[2] };
  }

  throw new BonsaiPatchError(patchName, message);
}

function spliceAttachmentRegistration(
  content: string,
  candidate: Candidate & { attachmentsVar: string; messagesVar: string }
): string {
  const openBrace = content.indexOf('{', candidate.index);
  if (openBrace === -1 || openBrace > candidate.index + candidate.length) {
    throw new BonsaiPatchError(patchName, 'could not find attachment pipeline body');
  }

  const injection = `const __cbGauge=__cbContextBonsaiGaugeAttachment(${candidate.messagesVar});if(__cbGauge)${candidate.attachmentsVar}.push(__cbGauge);`;
  return `${content.slice(0, openBrace + 1)}${injection}${content.slice(openBrace + 1)}`;
}

function spliceReminderRenderCase(
  content: string,
  candidate: Candidate & { attachmentVar: string }
): string {
  const openBrace = content.indexOf('{', candidate.index);
  if (openBrace === -1 || openBrace > candidate.index + candidate.length) {
    throw new BonsaiPatchError(patchName, 'could not find reminder render switch body');
  }

  return `${content.slice(0, openBrace + 1)}case"context-bonsai-gauge":return ${candidate.attachmentVar}.text;${content.slice(
    openBrace + 1
  )}`;
}

function buildInjectedGaugeHelpers(tokenUsageHelperName: string): string {
  return `${sentinel}function __cbContextBonsaiExtractText(__cbValue){if(typeof __cbValue==="string")return __cbValue;if(!__cbValue)return"";if(Array.isArray(__cbValue))return __cbValue.map(__cbContextBonsaiExtractText).join("\\n");if(typeof __cbValue==="object")return __cbContextBonsaiExtractText(__cbValue.text||__cbValue.content||"");return String(__cbValue)}function __cbContextBonsaiDecodeToolResponse(__cbText){const __cbMatch=String(__cbText).match(/<context-bonsai-tool-response encoding="base64">([^<]+)<\\/context-bonsai-tool-response>/);if(!__cbMatch)return null;try{return JSON.parse(Buffer.from(__cbMatch[1],"base64").toString("utf8"))}catch{return null}}function __cbContextBonsaiHasToolResponse(__cbMessages){try{return(__cbMessages||[]).some((__cbMessage)=>{const __cbMeta=__cbContextBonsaiDecodeToolResponse(__cbContextBonsaiExtractText(__cbMessage&&(__cbMessage.message&&__cbMessage.message.content||__cbMessage.content)));return __cbMeta&&(__cbMeta.op==="prune"||__cbMeta.op==="retrieve")})}catch{return false}}function __cbContextBonsaiTokenUsage(__cbMessages){try{const __cbUsage=${tokenUsageHelperName}(__cbMessages);const __cbUsed=Number(__cbUsage&&(__cbUsage.usedTokens??__cbUsage.totalTokens??((__cbUsage.inputTokens||0)+(__cbUsage.cacheReadInputTokens||0)+(__cbUsage.cacheCreationInputTokens||0)+(__cbUsage.outputTokens||0))));const __cbLimit=Number(__cbUsage&&(__cbUsage.usableBudget??__cbUsage.contextWindow??__cbUsage.contextLimit??__cbUsage.modelLimit));if(!Number.isFinite(__cbUsed)||!Number.isFinite(__cbLimit)||__cbLimit<=0)return null;return{used:__cbUsed,limit:__cbLimit,percent:Math.round(__cbUsed/__cbLimit*100)}}catch{return null}}function __cbContextBonsaiTurnCount(__cbMessages){return Array.isArray(__cbMessages)?__cbMessages.filter((__cbMessage)=>__cbMessage&&(__cbMessage.type==="user"||__cbMessage.type==="assistant"||__cbMessage.role==="user"||__cbMessage.role==="assistant")).length:0}function __cbContextBonsaiReminder(__cbUsage,__cbTurns,__cbForced){const __cbPercent=__cbUsage.percent;let __cbGuidance;if(__cbPercent<30)__cbGuidance="Informational: context is healthy; continue working, and prune only clearly completed stale ranges.";else if(__cbPercent<=60)__cbGuidance="Prune-ready advisory: prefer older completed contiguous blocks when useful.";else if(__cbPercent<=80)__cbGuidance="Strong reminder: apply recency and drift policy, preserve protected anchors, and prune stale completed ranges soon.";else __cbGuidance="Urgent: PRUNE NOW unless active unresolved work would be cut; protect operational rules and current task context.";return"[CONTEXT GAUGE: "+__cbUsage.used+" / "+__cbUsage.limit+" tokens ("+__cbPercent+"%)] "+(__cbForced?"A context-bonsai prune/retrieve result was just observed. ":"")+__cbGuidance}function __cbContextBonsaiGaugeAttachment(__cbMessages){const __cbUsage=__cbContextBonsaiTokenUsage(__cbMessages);if(!__cbUsage)return null;const __cbTurns=__cbContextBonsaiTurnCount(__cbMessages);const __cbForced=__cbContextBonsaiHasToolResponse(__cbMessages);const __cbState=globalThis.__cbContextBonsaiGaugeState||(globalThis.__cbContextBonsaiGaugeState={lastTurn:-Infinity});const __cbTurnsSinceLast=__cbTurns-__cbState.lastTurn;if(!__cbForced&&!(__cbTurns>20&&__cbTurnsSinceLast>=5&&__cbUsage.percent>25))return null;__cbState.lastTurn=__cbTurns;return{type:"context-bonsai-gauge",text:__cbContextBonsaiReminder(__cbUsage,__cbTurns,__cbForced)}}`;
}
