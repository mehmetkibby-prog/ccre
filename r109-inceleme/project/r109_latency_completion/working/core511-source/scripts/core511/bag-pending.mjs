import {r40Options} from './r40-options.mjs';
import {prepareServerStatement} from './server-statements.mjs';
import {demand} from './contract.mjs';
import {bagPendingBounded,BAG_PENDING_LIMIT} from './bag-pending-policy.mjs';

const installed=new WeakSet(),resetInstalled=new WeakSet(),existing=new WeakMap();
const columns='id,player_id,kind,item_name,rarity,power,role,enchantments,equipped,created_at,expires_at_ms,premium_origin,sale_locked499';
// Keep reset invalidation active for already queued rows even with cap disabled.
export function installPendingReset(sql){if(resetInstalled.has(sql)||!hasPending(sql))return;sql.exec(`CREATE TEMP TRIGGER kernel511_bag_admin_reset AFTER INSERT ON main.admin_audit_events WHEN NEW.action='reset_player' AND json_valid(NEW.detail_json) AND EXISTS(SELECT 1 FROM players WHERE id=json_extract(NEW.detail_json,'$.playerId')) BEGIN
 INSERT INTO kernel511_bag_generations(player_id,generation) VALUES(json_extract(NEW.detail_json,'$.playerId'),1) ON CONFLICT(player_id) DO UPDATE SET generation=generation+1;END;`);resetInstalled.add(sql);}
export function installBagPending(sql,{predicate,full}){
 if(!r40Options.bagLimit||installed.has(sql))return;
 sql.exec(`CREATE TABLE IF NOT EXISTS kernel511_bag_pending(id TEXT PRIMARY KEY,player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,kind TEXT NOT NULL,item_name TEXT NOT NULL,rarity TEXT NOT NULL,power INTEGER NOT NULL,role TEXT NOT NULL,enchantments TEXT NOT NULL,equipped INTEGER NOT NULL DEFAULT 0 CHECK(equipped=0),created_at INTEGER NOT NULL,expires_at_ms INTEGER NOT NULL DEFAULT 0,premium_origin INTEGER NOT NULL DEFAULT 0,sale_locked499 INTEGER NOT NULL DEFAULT 0,source_cycle INTEGER NOT NULL,source_generation INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS kernel511_bag_generations(player_id TEXT PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,generation INTEGER NOT NULL);
 CREATE INDEX IF NOT EXISTS kernel511_bag_pending_owner ON kernel511_bag_pending(player_id,source_cycle,source_generation,created_at,id);
 CREATE TEMP TABLE kernel511_bag_context(defer_actor TEXT);
 INSERT INTO kernel511_bag_context VALUES(NULL);
 CREATE TEMP TABLE kernel511_bag_delivery_actors(player_id TEXT PRIMARY KEY);
 CREATE TEMP TABLE kernel511_bag_trade_transfers(item_id TEXT PRIMARY KEY,source TEXT NOT NULL,target TEXT NOT NULL);`);
 existing.set(sql,true);installPendingReset(sql);
 const deferred=columns.split(',').map(c=>'NEW.'+c).join(',');
 // Only the trusted automatic-adventure grant scope enables this trigger.
 // The native INSERT supplies the original UUID and all rolled properties.
 // Once the bounded queue is full, the existing trusted-grant exemption
 // preserves earned native rewards in the bag. Manual acquisitions stay capped.
 const capacity=bagPendingBounded?` AND NOT EXISTS(SELECT 1 FROM kernel511_bag_pending INDEXED BY kernel511_bag_pending_owner WHERE player_id=NEW.player_id AND source_cycle=(SELECT cycle FROM world_state WHERE id=1) AND source_generation=COALESCE((SELECT generation FROM kernel511_bag_generations WHERE player_id=NEW.player_id),0) LIMIT 1 OFFSET ${BAG_PENDING_LIMIT-1})`:'';
 sql.exec(`CREATE TEMP TRIGGER kernel511_bag_defer BEFORE INSERT ON main.player_items WHEN NEW.player_id=(SELECT defer_actor FROM kernel511_bag_context) AND ${predicate.replace(/\b(equipped|kind)\b/g,'NEW.$1')} AND ${full}${capacity} BEGIN
 INSERT INTO kernel511_bag_pending(${columns},source_cycle,source_generation) VALUES(${deferred},(SELECT cycle FROM world_state WHERE id=1),COALESCE((SELECT generation FROM kernel511_bag_generations WHERE player_id=NEW.player_id),0));SELECT RAISE(IGNORE);END;`);
 const oldBag=predicate.replace(/\b(equipped|kind)\b/g,'OLD.$1'),newBag=predicate.replace(/\b(equipped|kind)\b/g,'NEW.$1');
 const space=`NOT EXISTS(SELECT 1 FROM player_items INDEXED BY kernel511_bag_equipment_owner WHERE player_id=OLD.player_id AND ${predicate} LIMIT 1 OFFSET 34)`;
 for(const [event,condition]of [['DELETE',oldBag],['UPDATE OF equipped',`(${oldBag}) AND NOT (${newBag})`]]){
  const name=event.startsWith('DELETE')?'delete':'equip';
  sql.exec(`CREATE TEMP TRIGGER kernel511_bag_deliver_${name} AFTER ${event} ON main.player_items WHEN (${condition}) AND EXISTS(SELECT 1 FROM kernel511_bag_delivery_actors WHERE player_id=OLD.player_id) AND ${space} BEGIN
 INSERT INTO player_items(${columns}) SELECT ${columns} FROM kernel511_bag_pending WHERE player_id=OLD.player_id AND source_cycle=(SELECT cycle FROM world_state WHERE id=1) AND source_generation=COALESCE((SELECT generation FROM kernel511_bag_generations WHERE player_id=OLD.player_id),0) ORDER BY created_at,id LIMIT 1;
 DELETE FROM kernel511_bag_pending WHERE id=(SELECT p.id FROM kernel511_bag_pending p JOIN player_items i ON i.id=p.id AND i.player_id=p.player_id WHERE p.player_id=OLD.player_id AND p.source_cycle=(SELECT cycle FROM world_state WHERE id=1) AND p.source_generation=COALESCE((SELECT generation FROM kernel511_bag_generations WHERE player_id=OLD.player_id),0) ORDER BY p.created_at,p.id LIMIT 1);END;`);
 }
 // A successful native gear deposit inserts its storage row after removing
 // the carried item, before its own COMMIT. Deliver in that same transaction;
 // failed deposits and receipt replays never execute this trigger.
 if(bagPendingBounded&&sql.prepare("SELECT 1 FROM sqlite_schema WHERE type='table' AND name='player_storage_items'").get())sql.exec(`CREATE TEMP TRIGGER kernel511_bag_deliver_storage AFTER INSERT ON main.player_storage_items WHEN NEW.storage_type='gear' AND ${space.replaceAll('OLD.','NEW.')} BEGIN
 INSERT INTO player_items(${columns}) SELECT ${columns} FROM kernel511_bag_pending WHERE player_id=NEW.player_id AND source_cycle=(SELECT cycle FROM world_state WHERE id=1) AND source_generation=COALESCE((SELECT generation FROM kernel511_bag_generations WHERE player_id=NEW.player_id),0) ORDER BY created_at,id LIMIT 1;
 DELETE FROM kernel511_bag_pending WHERE id=(SELECT p.id FROM kernel511_bag_pending p JOIN player_items i ON i.id=p.id AND i.player_id=p.player_id WHERE p.player_id=NEW.player_id AND p.source_cycle=(SELECT cycle FROM world_state WHERE id=1) AND p.source_generation=COALESCE((SELECT generation FROM kernel511_bag_generations WHERE player_id=NEW.player_id),0) ORDER BY p.created_at,p.id LIMIT 1);END;`);
 installed.add(sql);
}
export function deferAutomaticBagItems(sql,actor,work){
 if(!r40Options.bagLimit)return work();
 demand(installed.has(sql)&&sql.isTransaction,'bag_pending_grant_context');
 const previous=prepareServerStatement(sql,'SELECT defer_actor FROM temp.kernel511_bag_context').get().defer_actor;
 demand(previous===null,'bag_pending_grant_overlap');prepareServerStatement(sql,'UPDATE temp.kernel511_bag_context SET defer_actor=?').run(actor);
 try{return work();}finally{sql.exec('UPDATE temp.kernel511_bag_context SET defer_actor=NULL');}
}
export function bagSpaceOperation(sql,actor,input,work){
 if(!r40Options.bagLimit||!['sell_item','equip'].includes(input?.action))return work();
 demand(installed.has(sql),'bag_pending_delivery_context');prepareServerStatement(sql,'INSERT INTO temp.kernel511_bag_delivery_actors VALUES(?)').run(actor);
 const done=()=>prepareServerStatement(sql,'DELETE FROM temp.kernel511_bag_delivery_actors WHERE player_id=?').run(actor);
 try{const result=work();if(result?.then)return result.finally(done);done();return result;}catch(error){done();throw error;}
}
// A disabled flag never creates bag schema or guards. Existing deferred rewards
// remain claimable on admission in bounded batches under R39's unlimited bag.
function hasPending(sql){if(installed.has(sql))return true;if(!existing.has(sql))existing.set(sql,!!sql.prepare("SELECT 1 FROM sqlite_schema WHERE type='table' AND name='kernel511_bag_pending'").get());return existing.get(sql);}
function actorHasPending(sql,actor){return hasPending(sql)&&!!prepareServerStatement(sql,'SELECT 1 FROM kernel511_bag_pending INDEXED BY kernel511_bag_pending_owner WHERE player_id=? LIMIT 1').get(actor);}
export function pendingBagStatus(sql,actor){
 if(!bagPendingBounded)return null;
 if(!hasPending(sql))return {count:0,limit:BAG_PENDING_LIMIT,full:false,hasMore:false,overflow:false};
 const rows=prepareServerStatement(sql,'SELECT id FROM kernel511_bag_pending INDEXED BY kernel511_bag_pending_owner WHERE player_id=? AND source_cycle=(SELECT cycle FROM world_state WHERE id=1) AND source_generation=COALESCE((SELECT generation FROM kernel511_bag_generations WHERE player_id=?),0) ORDER BY created_at,id LIMIT ?').all(actor,actor,BAG_PENDING_LIMIT+1);
 const overflow=!!prepareServerStatement(sql,"SELECT 1 FROM player_items INDEXED BY kernel511_bag_equipment_owner WHERE player_id=? AND equipped=0 AND kind IN ('weapon','armor','helmet','shoes','necklace','earring','bracelet','belt') LIMIT 1 OFFSET 35").get(actor);
 return {count:Math.min(BAG_PENDING_LIMIT,rows.length),limit:BAG_PENDING_LIMIT,full:rows.length>=BAG_PENDING_LIMIT,hasMore:rows.length>BAG_PENDING_LIMIT,overflow};
}
export function deliverPendingBag(sql,actor){
 if(!hasPending(sql))return 0;
 demand(sql.isTransaction,'bag_pending_admission_context');
 if(bagPendingBounded&&!actorHasPending(sql,actor))return 0;
 const cycle=prepareServerStatement(sql,'SELECT cycle FROM world_state WHERE id=1').get().cycle,generation=prepareServerStatement(sql,'SELECT generation FROM kernel511_bag_generations WHERE player_id=?').get(actor)?.generation??0;
 // Resets invalidate old epochs without an unbounded reset-time DELETE. Cold
 // admission removes at most 35 stale rows with indexed epoch ranges.
 let cleanup=35;for(const [clause,values]of [['source_cycle<?',[cycle]],['source_cycle=? AND source_generation<?',[cycle,generation]]]){if(!cleanup)break;cleanup-=prepareServerStatement(sql,`DELETE FROM kernel511_bag_pending WHERE id IN (SELECT id FROM kernel511_bag_pending WHERE player_id=? AND ${clause} LIMIT ?)`).run(actor,...values,cleanup).changes;}
 const pending=prepareServerStatement(sql,`SELECT ${columns} FROM kernel511_bag_pending WHERE player_id=? AND source_cycle=? AND source_generation=? ORDER BY created_at,id LIMIT 35`).all(actor,cycle,generation);
 if(!pending.length)return 0;
 const count=r40Options.bagLimit?prepareServerStatement(sql,"SELECT count(*) n FROM (SELECT 1 FROM player_items INDEXED BY kernel511_bag_equipment_owner WHERE player_id=? AND equipped=0 AND kind IN ('weapon','armor','helmet','shoes','necklace','earring','bracelet','belt') LIMIT 35)").get(actor).n:0;
 const insert=prepareServerStatement(sql,`INSERT INTO player_items(${columns}) VALUES(${columns.split(',').map(()=>'?').join(',')})`),remove=prepareServerStatement(sql,'DELETE FROM kernel511_bag_pending WHERE id=? AND player_id=?');let delivered=0;
 for(const row of pending.slice(0,35-count)){insert.run(...columns.split(',').map(c=>row[c]));remove.run(row.id,actor);delivered++;}return delivered;
}
// Native transfer validates both immutable offers again. Permit its temporary
// first-side overflow only for the exact stored rows and a proven final cap.
export function bagTradeOperation(sql,actor,input,work){
 if(!r40Options.bagLimit||input?.action!=='confirm')return work();
 const row=prepareServerStatement(sql,"SELECT * FROM player_trades WHERE id=? AND (a=? OR b=?) AND status='open'").get(String(input.id??''),actor,actor);
 if(!row||row.revision!==input.revision||row[actor===row.a?'a_confirm':'b_confirm']||!row[actor===row.a?'b_confirm':'a_confirm'])return work();
 let offers;try{offers=[JSON.parse(row.a_offer),JSON.parse(row.b_offer)];}catch{return work();}
 if(offers.some(o=>!Array.isArray(o?.items)||o.items.length>12||new Set(o.items.map(i=>i?.id)).size!==o.items.length))return work();
 const pairs=[[row.a,row.b,offers[0]],[row.b,row.a,offers[1]]],moves=[],counts=[];
 for(const [from,to,offer]of pairs){let outgoing=0;for(const item of offer.items){const gear=prepareServerStatement(sql,'SELECT kind FROM player_items WHERE id=? AND player_id=? AND equipped=0 AND sale_locked499=0').get(item?.id,from);if(!gear)return work();if(['weapon','armor','helmet','shoes','necklace','earring','bracelet','belt'].includes(gear.kind)){moves.push({id:item.id,from,to});outgoing++;}}counts.push({actor:from,outgoing,count:prepareServerStatement(sql,"SELECT count(*) n FROM (SELECT 1 FROM player_items INDEXED BY kernel511_bag_equipment_owner WHERE player_id=? AND equipped=0 AND kind IN ('weapon','armor','helmet','shoes','necklace','earring','bracelet','belt') LIMIT 36)").get(from).n});}
 if(counts.some((r,i)=>counts[1-i].outgoing>0&&(r.count>35||r.count-r.outgoing+counts[1-i].outgoing>35)))return work();
 const add=prepareServerStatement(sql,'INSERT INTO temp.kernel511_bag_trade_transfers VALUES(?,?,?)');for(const move of moves)add.run(move.id,move.from,move.to);
 const done=()=>sql.exec('DELETE FROM temp.kernel511_bag_trade_transfers');
 try{const result=work();if(result?.then)return result.finally(done);done();return result;}catch(error){done();throw error;}
}
