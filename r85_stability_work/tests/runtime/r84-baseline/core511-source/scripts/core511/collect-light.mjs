import {r37Options} from './r37-options.mjs';
import {prepareCached477} from './writer-statements.mjs';
import {demand} from './contract.mjs';
export const collectMetrics={};
export function collectTime(name,ms){const r=collectMetrics[name]??={count:0,totalMs:0,maxMs:0};r.count++;r.totalMs+=ms;r.maxMs=Math.max(r.maxMs,ms);}
export class CollectWriteAudit {
 initialize(sql){
  if(!r37Options.collectLight)return;this.sql=sql;
  sql.exec('CREATE TEMP TABLE kernel511_collect_guard(enabled INTEGER,actor TEXT,target TEXT,safe INTEGER);INSERT INTO kernel511_collect_guard VALUES(0,NULL,NULL,1)');
  for(const table of ['world_drops','player_items'])for(const [event,refs]of [['INSERT',['NEW']],['UPDATE',['OLD','NEW']],['DELETE',['OLD']]]){
   const invalid=refs.map(ref=>table==='world_drops'?`${ref}.id!=(SELECT target FROM kernel511_collect_guard) OR ${ref}.owner_id!=(SELECT actor FROM kernel511_collect_guard)`:`${ref}.player_id!=(SELECT actor FROM kernel511_collect_guard) OR ${ref}.equipped!=0`).join(' OR ');
   sql.exec(`CREATE TEMP TRIGGER kernel511_collect_${table}_${event} ${event==='DELETE'?'BEFORE':'AFTER'} ${event} ON main.${table} WHEN (SELECT enabled FROM kernel511_collect_guard)=1 AND (${invalid}) BEGIN UPDATE kernel511_collect_guard SET safe=0;END;`);
  }
 }
 run(sql,payload,work){
  demand(sql===this.sql&&sql.isTransaction,'collect_audit_transaction');
  prepareCached477(sql,'UPDATE temp.kernel511_collect_guard SET enabled=1,actor=?,target=?,safe=1').run(payload.localScope.owner,payload.input.targetId);
  try{const result=work(),safe=prepareCached477(sql,'SELECT safe FROM temp.kernel511_collect_guard').get().safe===1;return {result,safe};}
  finally{sql.exec('UPDATE temp.kernel511_collect_guard SET enabled=0,actor=NULL,target=NULL');}
 }
}
// Same ordering/columns as native readColdWorld's inventory. Equipped rows
// cannot change on this fast path; unfamiliar side effects use full refresh.
export const COLLECT_INVENTORY_SQL="SELECT id, player_id, kind, item_name, rarity, power, role, enchantments, equipped, created_at, expires_at_ms, sale_locked499 FROM player_items WHERE player_id = ? ORDER BY equipped DESC, CASE rarity WHEN 'emerald' THEN 7 WHEN 'infinite' THEN 6 WHEN 'unique' THEN 5 WHEN 'purple' THEN 4 WHEN 'red' THEN 3 WHEN 'orange' THEN 2 WHEN 'blue' THEN 1 ELSE 0 END DESC, created_at DESC";
const tables=new Set(['players','player_items','world_drops','guild_essence_rewards','auth_rate_limits']);
const fields=new Set(['essence','essence_bonus_remainder','pearls','stone_dust','gems','potions','last_seen']);
export function collectLightResult(sql,payload,result){
 if(!r37Options.collectLight||payload.localScope?.kind!=='collect'||payload.input?.action!=='collect'||result.result?.status!==200||result.result?.body?.ok!==true||result.drop||!result.sharedRefresh||result.sharedRefresh.all||result.sharedRefresh.tables.some(t=>!tables.has(t)))return result;
 const actor=payload.localScope.owner;
 const inventory=result.sharedRefresh.tables.includes('player_items')?prepareCached477(sql,COLLECT_INVENTORY_SQL).all(actor):null;
 return {...result,collectLight:{version:1,actor,target:payload.input.targetId,inventory}};
}
export function applyCollectLight(runtime,result,context){
 if(!r37Options.collectLight||context?.input?.action!=='collect'||result.collectLight?.version!==1||result.collectLight.actor!==context.id||result.collectLight.target!==context.input.targetId)return false;
 const c=runtime.channel,meta=result.collectLight,players=result.players.filter(p=>c.owners.has(p.id));
 for(const row of players){
  const previous=c.view.player(row.id),sub=runtime.world.subscribers.get(row.id);
  if(!previous||!sub||previous.hp<=0||row.hp<=0||row.arena_match_id||runtime.dungeon.locked(row.id)||!['forest','frozen','ancient','sanctum','black'].includes(row.area)||Object.keys(row).some(key=>!fields.has(key)&&(!Object.hasOwn(previous,key)||!Object.is(previous[key],row[key]))))return false;
 }
 // Validate every recipient before changing any resident state.
 for(const row of players){
  const owner=c.owners.get(row.id),actor=c.kernel.players.get(row.id);demand(actor?.barrier&&actor.epoch===owner.epoch&&c.lanes.busy(['player:'+row.id]),'collect_light_not_fenced');c.state.assertOwner(row.id,owner.epoch);
 }
 for(const row of players){
  c.view.setPlayer(c.presence.merge(row,c.owners.get(row.id).epoch));
  const sub=runtime.world.subscribers.get(row.id),owner={...sub.ownerRow};for(const key of fields)if(Object.hasOwn(owner,key))owner[key]=row[key];
  sub.ownerRow=owner;sub.data={...sub.data,players:sub.data.players.map(p=>p.id===row.id?owner:p)};
  if(row.id===meta.actor){sub.data.drops=sub.data.drops.filter(d=>d.id!==meta.target);if(meta.inventory)sub.data.inventory=meta.inventory;}
  sub.cache=null;sub.privateOwnerCache=null;sub.revision++;
  // Cached full-bundle parts no longer describe this image; next ordinary
  // read must send a full bundle, never combine an old inventory digest.
  runtime.slimReload.forget(row.id);
 }
 return true;
}
