import { verifySentinel } from './discovery';
import { selectVisibilitySwitchAnchor } from './anchors';
import { BonsaiPatchError, type BonsaiPatch } from './types';

const patchName = 'archived-filter';
const sentinel = '/*cb:archived-filter:v1*/';

export const archivedFilterPatch: BonsaiPatch = {
  name: patchName,
  sentinel,
  apply(content) {
    try {
      const selected = selectVisibilitySwitchAnchor(content);
      const injected = buildInjectedFilter(selected.messageVar);
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

function buildInjectedFilter(messagesVar: string): string {
  return `${sentinel}{try{const __cbRanges=new Map;for(let __cbI=0;__cbI<${messagesVar}.length;__cbI+=1){const __cbMessage=${messagesVar}[__cbI];if(__cbMessage&&__cbMessage.archived===!0&&typeof __cbMessage.archivedBy==="string"&&__cbMessage.archivedBy.length>0){const __cbRange=__cbRanges.get(__cbMessage.archivedBy);if(__cbRange){__cbRange[1]=__cbI;}else __cbRanges.set(__cbMessage.archivedBy,[__cbI,__cbI]);}}let __cbSpans=Array.from(__cbRanges.values());__cbSpans=__cbSpans.sort((__cbA,__cbB)=>__cbA[0]-__cbB[0]||__cbA[1]-__cbB[1]);const __cbMerged=[];for(let __cbS=0;__cbS<__cbSpans.length;__cbS+=1){const __cbSpan=__cbSpans[__cbS];const __cbLast=__cbMerged[__cbMerged.length-1];if(__cbLast&&__cbSpan[0]<=__cbLast[1]+1){__cbLast[1]=Math.max(__cbLast[1],__cbSpan[1]);}else{__cbMerged.push(__cbSpan);}}const __cbFiltered=[];for(let __cbJ=0,__cbK=0;__cbJ<${messagesVar}.length;__cbJ+=1){let __cbExcluded=!1;while(__cbK<__cbMerged.length&&__cbJ>__cbMerged[__cbK][1]){__cbK+=1;}if(__cbK<__cbMerged.length){const __cbSpan=__cbMerged[__cbK];if(__cbJ>=__cbSpan[0]&&__cbJ<=__cbSpan[1]){__cbExcluded=!0;}}if(!__cbExcluded){__cbFiltered.push(${messagesVar}[__cbJ]);}}let __cbChanged=!0;while(__cbChanged){__cbChanged=!1;const __cbNext=[];for(let __cbI2=0;__cbI2<__cbFiltered.length;__cbI2+=1){const __cbMessage=__cbFiltered[__cbI2];if(__cbMessage&&__cbMessage.type==="api_system"&&__cbFiltered[__cbI2+1]&&__cbFiltered[__cbI2+1].type!=="assistant"){__cbChanged=!0;continue;}__cbNext.push(__cbMessage);}if(__cbChanged){__cbFiltered.length=0;Array.prototype.push.apply(__cbFiltered,__cbNext);} }${messagesVar}=__cbFiltered;}catch{}}`;
}
