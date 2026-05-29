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
  return `${sentinel}{/*marker-read-per-provider-rewrite................................................................................................................................................................................................................................................................................................................................................................................................................................................................*/try{const __cbSessionId=${helpers.sessionIdFunc}();if(__cbSessionId){const __cbFs=${helpers.fsFunc}();const __cbConfigDir=${helpers.configDirFunc}();const __cbMarkerPath=String(__cbConfigDir).replace(/\\/+$/,'')+"/archived-"+__cbSessionId+".json";let __cbIds=[];try{const __cbRaw=__cbFs.readFileSync(__cbMarkerPath, "utf8");const __cbText=Buffer.isBuffer(__cbRaw)?__cbRaw.toString("utf8"):String(__cbRaw);const __cbParsed=JSON.parse(__cbText);if(Array.isArray(__cbParsed))__cbIds=__cbParsed.filter((__cbId)=>typeof __cbId==="string")}catch{__cbIds=[]}const __cbArchivedIds=new Set(__cbIds);if(__cbArchivedIds.size>0)${messagesVar}=${messagesVar}.filter((__cbMessage)=>!(__cbMessage&&typeof __cbMessage.uuid==="string"&&__cbArchivedIds.has(__cbMessage.uuid)))}}catch{}}`;
}
