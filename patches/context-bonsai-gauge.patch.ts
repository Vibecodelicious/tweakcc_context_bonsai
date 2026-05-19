import { verifySentinel, type Candidate } from './discovery';
import {
  selectAttachmentPipelineAnchor,
  selectReminderRenderAnchor,
  selectTokenUsageHelperAnchor,
} from './anchors';
import { BonsaiPatchError, type BonsaiPatch } from './types';

const patchName = 'context-bonsai-gauge';
const sentinel = '/*cb:context-bonsai-gauge:v1*/';

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
  return selectTokenUsageHelperAnchor(content);
}

function selectAttachmentPipeline(content: string): Candidate & { attachmentsVar: string; messagesVar: string } {
  return selectAttachmentPipelineAnchor(content);
}

function selectReminderRenderCase(content: string): Candidate & { attachmentVar: string } {
  return selectReminderRenderAnchor(content);
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
  return `${sentinel}function __cbContextBonsaiExtractText(__cbValue){if(typeof __cbValue==="string")return __cbValue;if(!__cbValue)return"";if(Array.isArray(__cbValue))return __cbValue.map(__cbContextBonsaiExtractText).join("\\n");if(typeof __cbValue==="object")return __cbContextBonsaiExtractText(__cbValue.text||__cbValue.content||"");return String(__cbValue)}function __cbContextBonsaiDecodeToolResponse(__cbText){const __cbMatch=String(__cbText).match(/<context-bonsai-tool-response encoding="base64">([^<]+)<\\/context-bonsai-tool-response>/);if(!__cbMatch)return null;try{return JSON.parse(Buffer.from(__cbMatch[1],"base64").toString("utf8"))}catch{return null}}function __cbContextBonsaiToolResponseIdentity(__cbMessages){try{for(let __cbIndex=(__cbMessages||[]).length-1;__cbIndex>=0;__cbIndex--){const __cbText=__cbContextBonsaiExtractText(__cbMessages[__cbIndex]&&(__cbMessages[__cbIndex].message&&__cbMessages[__cbIndex].message.content||__cbMessages[__cbIndex].content));const __cbMatch=String(__cbText).match(/<context-bonsai-tool-response encoding="base64">([^<]+)<\\/context-bonsai-tool-response>/);if(!__cbMatch)continue;const __cbMeta=__cbContextBonsaiDecodeToolResponse(__cbText);if(__cbMeta&&(__cbMeta.op==="prune"||__cbMeta.op==="retrieve"))return __cbMatch[0]}}catch{}return null}function __cbContextBonsaiTokenUsage(__cbMessages){try{const __cbUsage=${tokenUsageHelperName}(__cbMessages);const __cbUsed=Number(__cbUsage&&(__cbUsage.usedTokens??__cbUsage.totalTokens??((__cbUsage.inputTokens||0)+(__cbUsage.cacheReadInputTokens||0)+(__cbUsage.cacheCreationInputTokens||0)+(__cbUsage.outputTokens||0))));const __cbLimit=Number(__cbUsage&&(__cbUsage.usableBudget??__cbUsage.contextWindow??__cbUsage.contextLimit??__cbUsage.modelLimit));if(!Number.isFinite(__cbUsed)||!Number.isFinite(__cbLimit)||__cbLimit<=0)return null;return{used:__cbUsed,limit:__cbLimit,percent:Math.round(__cbUsed/__cbLimit*100)}}catch{return null}}function __cbContextBonsaiTurnCount(__cbMessages){return Array.isArray(__cbMessages)?__cbMessages.filter((__cbMessage)=>__cbMessage&&(__cbMessage.type==="user"||__cbMessage.type==="assistant"||__cbMessage.role==="user"||__cbMessage.role==="assistant")).length:0}function __cbContextBonsaiReminder(__cbUsage,__cbTurns,__cbForced){const __cbPercent=__cbUsage.percent;let __cbGuidance;if(__cbPercent<30)__cbGuidance="Informational: context is healthy; continue working, and prune only clearly completed stale ranges.";else if(__cbPercent<=60)__cbGuidance="Prune-ready advisory: prefer older completed contiguous blocks when useful.";else if(__cbPercent<=80)__cbGuidance="Strong reminder: apply recency and drift policy, preserve protected anchors, and prune stale completed ranges soon.";else __cbGuidance="Urgent: PRUNE NOW unless active unresolved work would be cut; protect operational rules and current task context.";return"[CONTEXT GAUGE: "+__cbUsage.used+" / "+__cbUsage.limit+" tokens ("+__cbPercent+"%)] "+(__cbForced?"A context-bonsai prune/retrieve result was just observed. ":"")+__cbGuidance}function __cbContextBonsaiGaugeAttachment(__cbMessages){const __cbUsage=__cbContextBonsaiTokenUsage(__cbMessages);if(!__cbUsage)return null;const __cbTurns=__cbContextBonsaiTurnCount(__cbMessages);const __cbState=globalThis.__cbContextBonsaiGaugeState||(globalThis.__cbContextBonsaiGaugeState={lastTurn:-Infinity});const __cbForcedIdentity=__cbContextBonsaiToolResponseIdentity(__cbMessages);const __cbForced=!!__cbForcedIdentity&&__cbForcedIdentity!==__cbState.lastToolResponseIdentity;const __cbTurnsSinceLast=__cbTurns-__cbState.lastTurn;if(!__cbForced&&!(__cbTurns>20&&__cbTurnsSinceLast>=5&&__cbUsage.percent>25))return null;__cbState.lastTurn=__cbTurns;if(__cbForced)__cbState.lastToolResponseIdentity=__cbForcedIdentity;return{type:"context-bonsai-gauge",text:__cbContextBonsaiReminder(__cbUsage,__cbTurns,__cbForced)}}`;
}
