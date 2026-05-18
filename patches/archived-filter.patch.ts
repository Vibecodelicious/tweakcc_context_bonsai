import {
  findCandidates,
  findRuntimeHelpers,
  scoreCandidates,
  selectUnique,
  verifySentinel,
  type Candidate,
} from './discovery';
import { BonsaiPatchError, type BonsaiPatch } from './types';

const patchName = 'archived-filter';
const sentinel = '/*cb:archived-filter:v1*/';
const identifier = String.raw`[$A-Z_a-z][$\w]*`;
const visibilitySwitchPatterns = [
  new RegExp(String.raw`switch\((${identifier})\.type\)\{[^}]+\}`, 'g'),
];

export const archivedFilterPatch: BonsaiPatch = {
  name: patchName,
  sentinel,
  apply(content) {
    try {
      const helpers = findRuntimeHelpers(content);
      const candidates = findCandidates(content, visibilitySwitchPatterns);
      const scored = scoreCandidates(content, candidates, [visibilitySwitchScorer]);
      const selected = selectUnique(content, scored, { minScore: 20, minMargin: 10 });
      const messageVar = extractMessageVariable(selected);
      const injected = buildInjectedFilter(messageVar, helpers);
      const patched = `${content.slice(0, selected.index)}${injected}${content.slice(selected.index)}`;

      verifySentinel(patched, sentinel);
      return patched;
    } catch (error) {
      if (error instanceof BonsaiPatchError && error.patchName === patchName) throw error;
      const message = error instanceof Error ? error.message : String(error);
      throw new BonsaiPatchError(patchName, message, { cause: error });
    }
  },
};

export default archivedFilterPatch;

function visibilitySwitchScorer(_content: string, candidate: Candidate): number {
  let score = 0;
  if (candidate.text.includes('case"user"')) score += 15;
  if (candidate.text.includes('case"assistant"')) score += 15;
  if (candidate.text.includes('message')) score += 5;
  if (candidate.text.includes('content')) score += 5;
  if (candidate.text.includes('tool_use')) score += 3;
  return score;
}

function extractMessageVariable(candidate: Candidate): string {
  const match = new RegExp(String.raw`switch\((${identifier})\.type\)`).exec(candidate.text);
  const variable = match?.[1];
  if (!variable) {
    throw new BonsaiPatchError(patchName, 'selected visibility switch did not expose a message variable');
  }
  return variable;
}

function buildInjectedFilter(
  messageVar: string,
  helpers: { fsFunc: string; configDirFunc: string; sessionIdFunc: string }
): string {
  return `${sentinel}{const __cbArchivedFilterCache=globalThis.__cbArchivedFilterCache??=(Object.create(null));try{const __cbMessage=${messageVar};const __cbUuid=__cbMessage&&__cbMessage.uuid;if(__cbUuid){const __cbSessionId=${helpers.sessionIdFunc}();if(__cbSessionId){const __cbFs=${helpers.fsFunc}();const __cbConfigDir=${helpers.configDirFunc}();const __cbMarkerPath=String(__cbConfigDir).replace(/\\/+$/,'')+"/archived-"+__cbSessionId+".json";let __cbMtimeMs=-1;try{__cbMtimeMs=__cbFs.statSync(__cbMarkerPath).mtimeMs||0}catch{}let __cbEntry=__cbArchivedFilterCache[__cbSessionId];if(!__cbEntry||__cbEntry.mtimeMs!==__cbMtimeMs){let __cbIds=[];if(__cbMtimeMs>=0){try{const __cbRaw=__cbFs.readFileSync(__cbMarkerPath);const __cbText=Buffer.isBuffer(__cbRaw)?__cbRaw.toString("utf8"):String(__cbRaw);const __cbParsed=JSON.parse(__cbText);if(Array.isArray(__cbParsed))__cbIds=__cbParsed.filter((__cbId)=>typeof __cbId==="string")}catch{__cbIds=[]}}__cbEntry={mtimeMs:__cbMtimeMs,ids:new Set(__cbIds)};__cbArchivedFilterCache[__cbSessionId]=__cbEntry}if(__cbEntry.ids.has(__cbUuid))return false}}}catch{}}`;
}
