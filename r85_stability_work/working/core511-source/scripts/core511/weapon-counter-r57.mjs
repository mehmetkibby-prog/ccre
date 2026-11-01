import {weaponCounterR57} from './r57-options.mjs';
import {COLLECT_INVENTORY_SQL} from './collect-light.mjs';
import {prepareCached477} from './writer-statements.mjs';
import {createAttackWriterRules} from './generated/attack-writer-rules.mjs';
import {nativeAtomicStatements} from './retaliation-writer.mjs';
import {readHeartbeatState} from './heartbeat-writer.mjs';
const counterRules=createAttackWriterRules({globals:{}});
const keys=['id','player_id','kind','item_name','rarity','power','role','enchantments','equipped','created_at','expires_at_ms','sale_locked499'];
const validItem=(i,id)=>i&&Object.keys(i).length===keys.length&&keys.every(k=>Object.hasOwn(i,k))&&i.player_id===id&&typeof i.id==='string'&&typeof i.enchantments==='string'&&i.enchantments.length<=16384;
function enchants(text){
 try{const a=JSON.parse(text);if(!Array.isArray(a)||a.length>64)return null;const counters=a.filter(e=>e?.kind==='evolution_kills');if(counters.length>1||counters.some(e=>Object.keys(e).sort().join(',')!=='kind,value'||!Number.isSafeInteger(e.value)||e.value<0||e.value>1000000000))return null;
 return {other:JSON.stringify(a.filter(e=>e?.kind!=='evolution_kills')),kills:counters[0]?.value??0};}catch{return null;}
}
// This counter unlocks manual evolution; it grants no stat by itself. Every
// other inventory cell and enchantment must be identical. Level, HP, scope,
// ownership, portal and all other table changes retain their existing guards.
export function counterOnlyInventoryR57(before,after,id,kills){
 if(!Array.isArray(before)||!Array.isArray(after)||before.length!==after.length||after.length>512||!Number.isSafeInteger(kills)||kills<1||kills>1024||!before.every(i=>validItem(i,id))||!after.every(i=>validItem(i,id))||new Set(before.map(i=>i.id)).size!==before.length||new Set(after.map(i=>i.id)).size!==after.length)return false;
 const prior=new Map(before.map(i=>[i.id,i]));
 return after.every(row=>{const old=prior.get(row.id);if(!old||keys.some(k=>k!=='enchantments'&&!Object.is(old[k],row[k])))return false;if(old.enchantments===row.enchantments)return true;if(row.kind!=='weapon'||row.equipped!==1)return false;const a=enchants(old.enchantments),b=enchants(row.enchantments);return a&&b&&a.other===b.other&&b.kills>=a.kills&&b.kills<=Math.min(1000000000,a.kills+kills);});
}
export function captureWeaponCountersR57(sql,result,ids,now){
 if(!weaponCounterR57||!sql.isTransaction)return null;
 const kills=[result.result,...(result.batchResultsR57??[]).map(r=>r.result)].reduce((n,r)=>n+(r?.body?.hits?.filter(h=>h.killed).length??0),0);if(!kills||kills>1024)return null;
 try{
  // The receiver proves byte-exact inventory equality except the equipped
  // weapon's non-stat kill counter, and the actor-section proof rejects every
  // unrelated table/column change. Only this native derived column changes.
  // Read it through the original SQL, including +5 enchant normalization;
  // armor, pets, wings, ranking and arena projections need no second reads.
  const items=ids.map(id=>({id,inventory:prepareCached477(sql,COLLECT_INVENTORY_SQL+' LIMIT 513').all(id),weaponEnchantmentR57:counterRules.hydrateAttack(nativeAtomicStatements(sql),id,'').player.equipped_weapon_enchantments,heartbeatStateR57:readHeartbeatState(sql,id),atR57:now}));
  if(items.some(e=>e.inventory.length>512)||Buffer.byteLength(JSON.stringify(items))>128*1024)return null;
  return {kills,items};
 }catch{return null;}
}
export function prepareWeaponCountersR57(runtime,meta){
 if(!weaponCounterR57||!Array.isArray(meta.items)||meta.items.length!==meta.cold.length||new Set(meta.items.map(e=>e.id)).size!==meta.items.length)return null;
 const c=runtime.channel,plans=[];
 for(const entry of meta.items){
  if(!meta.cold.includes(entry.id))return null;if(!c.owners.has(entry.id))continue;
  const sub=runtime.world.subscribers.get(entry.id),frame=c.frames.entries.get(entry.id);let b=entry.combat;
  if(!sub||!frame?.valid||!counterOnlyInventoryR57(sub.data.inventory,entry.inventory,entry.id,meta.kills))return null;
  if(!b){
   const value=entry.weaponEnchantmentR57,state=entry.heartbeatStateR57;
   if(typeof value!=='string'||value.length>32768||!Number.isSafeInteger(entry.atR57)||entry.atR57<0||!state||Object.keys(state).sort().join(',')!=='gearDue,queue'||typeof state.gearDue!=='boolean'||state.queue!==null&&typeof state.queue!=='object'||!Object.hasOwn(frame.actorFrame??{},'equipped_weapon_enchantments')||!Object.hasOwn(frame.targetFrame??{},'equipped_weapon_enchantments'))return null;
   b={...frame,at:entry.atR57,actorFrame:{...frame.actorFrame,equipped_weapon_enchantments:value},targetFrame:{...frame.targetFrame,equipped_weapon_enchantments:value},heartbeatState:state};
  }
  if(b?.actor!==entry.id||b.actorFrame?.id!==entry.id||b.targetFrame?.id!==entry.id||b.retaliationPlayer?.id!==entry.id||!Array.isArray(b.armorItems)||!Array.isArray(b.pets))return null;
  plans.push({sub,entry,combat:b});
 }
 return ()=>{for(const {sub,entry,combat}of plans){c.frames.hydrate({...combat,revision:++c.revision});sub.data={...sub.data,inventory:entry.inventory};sub.cache=null;sub.privateOwnerCache=null;sub.revision++;runtime.slimReload.forget(entry.id);}};
}
