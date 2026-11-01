import {isMistArea,adventureMonsterId} from './adventure-maps.mjs';
import {MIST_CATALOG} from './mist-config.mjs';
import {gameplayR58} from './r58-gameplay-options.mjs';
import {prepareServerStatement} from './server-statements.mjs';
const catalog=new Map(MIST_CATALOG.map(item=>[item.id,item]));
// Cold, authenticated loot dialog read. Never adds work to a combat tick.
export function mistPreviewR58(sql,service,playerId,url){
 if(!gameplayR58.mistLevelRewards)return null;
 const id=url.searchParams.get('monster');if(!adventureMonsterId(id))return null;
 const target=prepareServerStatement(sql,'SELECT m.id,m.name,m.area FROM monsters m JOIN players p ON p.id=? AND p.area=m.area AND p.channel=m.channel WHERE m.id=?').get(playerId,id);
 if(!target||!isMistArea(target.area))return null;
 const stored=service?.profile(id);if(!stored||stored.feature!=='mist')return null;
 const outcomes=(stored.drops??[]).map((rule,index)=>{
  const item=catalog.get(rule.itemId);if(!item)return null;
  return {id:'mist:'+index,name:item.name??item.label??item.id,itemType:item.type,kind:item.kind,rarity:item.rarity??null,baseChancePpm:Math.round(rule.chance*10000),chancePpm:Math.round(rule.chance*10000),minAmount:rule.min,maxAmount:rule.max};
 }).filter(Boolean);
 return {sourceKey:'adventure.catalog',label:target.name,revision:stored.xpRevision??31,hasCharm:false,rewardSnapshot:false,purpleChancePpm:0,forestReductionPercent:0,xp:stored.xp,groups:[{id:'mist-drops',label:'Sis Yarığı',rolls:1,outcomes}]};
}
