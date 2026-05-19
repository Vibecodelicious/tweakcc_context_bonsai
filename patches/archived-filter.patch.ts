import { findRuntimeHelpers, verifySentinel } from './discovery';
import { selectVisibilitySwitchAnchor } from './anchors';
import { BonsaiPatchError, type BonsaiPatch } from './types';

const patchName = 'archived-filter';
const sentinel = '/*cb:archived-filter:v1*/';

export const archivedFilterPatch: BonsaiPatch = {
  name: patchName,
  sentinel,
  apply(content) {
    try {
      const helpers = findRuntimeHelpers(content);
      const selected = selectVisibilitySwitchAnchor(content);
      const injected = buildInjectedFilter(selected.messageVar, helpers);
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

function buildInjectedFilter(
  messagesVar: string,
  helpers: { fsFunc: string; configDirFunc: string; sessionIdFunc: string }
): string {
  return `${sentinel}{const __cbArchivedFilterCache=globalThis.__cbArchivedFilterCache??=(Object.create(null));try{const __cbSessionId=${helpers.sessionIdFunc}();if(__cbSessionId){const __cbFs=${helpers.fsFunc}();const __cbConfigDir=${helpers.configDirFunc}();const __cbMarkerPath=String(__cbConfigDir).replace(/\\/+$/,'')+"/archived-"+__cbSessionId+".json";let __cbMtimeMs=-1;try{__cbMtimeMs=__cbFs.statSync(__cbMarkerPath).mtimeMs||0}catch{}let __cbEntry=__cbArchivedFilterCache[__cbSessionId];if(!__cbEntry||__cbEntry.mtimeMs!==__cbMtimeMs){let __cbIds=[];if(__cbMtimeMs>=0){try{const __cbRaw=__cbFs.readFileSync(__cbMarkerPath);const __cbText=Buffer.isBuffer(__cbRaw)?__cbRaw.toString("utf8"):String(__cbRaw);const __cbParsed=JSON.parse(__cbText);if(Array.isArray(__cbParsed))__cbIds=__cbParsed.filter((__cbId)=>typeof __cbId==="string")}catch{__cbIds=[]}}__cbEntry={mtimeMs:__cbMtimeMs,ids:new Set(__cbIds)};__cbArchivedFilterCache[__cbSessionId]=__cbEntry}if(__cbEntry.ids.size>0)${messagesVar}=${messagesVar}.filter((__cbMessage)=>!(__cbMessage&&typeof __cbMessage.uuid==="string"&&__cbEntry.ids.has(__cbMessage.uuid)))}}catch{}}`;
}
