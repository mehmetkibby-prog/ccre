import {pveEntries489} from './generated/aggro-rules.mjs';
import {r35Options} from './r35-options.mjs';
export function sharedEngagement(row,monster){
 // Unknown monsters are sent conservatively, including a just-removed shared
 // spawn. Never leave a stale shared reverse-index entry behind.
 return pveEntries489(row).some(entry=>{const m=monster(entry.monster_id);return !m||m.channel===0;});
}
export function shouldSyncEngagement(previous,epoch,engagement,monster){
 if(!previous||previous.epoch!==epoch)return true;
 if(previous.engagement===engagement)return false;
 return !r35Options.engagementSync||sharedEngagement(engagement,monster)||sharedEngagement(previous.engagement,monster);
}
