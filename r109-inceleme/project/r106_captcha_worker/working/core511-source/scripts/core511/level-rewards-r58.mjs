import {balanceFactor487 as nativeFactor,balanceXpSql487 as nativeXp,balanceArea487} from '../../../native510-bb3a6cc689c6/lib/level-balance487.mjs';
import {isMistArea} from './adventure-maps.mjs';
import {gameplayR58} from './r58-gameplay-options.mjs';
export const levelExemptAreaR58=area=>area==='sinsi'||area==='mist'||isMistArea(area);
export const levelExemptEnabledR58=area=>gameplayR58.mistLevelRewards&&levelExemptAreaR58(area);
export function balanceFactor487(config,area,level,kind='item'){
 return gameplayR58.mistLevelRewards&&levelExemptAreaR58(area)?1:nativeFactor(config,area,level,kind);
}
export function balanceXpSql487(settings,subject,monsterId){
 const area=subject?.monster_area??subject?.area??balanceArea487(subject??{id:monsterId});
 return gameplayR58.mistLevelRewards&&levelExemptAreaR58(area)?'1':nativeXp(settings,subject,monsterId);
}
