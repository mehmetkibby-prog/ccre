import {WORLD_CLEANUP_TABLES} from './generated/world-cleanup-rules.mjs';
import {demand} from './contract.mjs';
export const CLEANUP_BATCH_SIZE=32,CLEANUP_MAX_BATCHES=128;
export const CLEANUP_ORDER=Object.freeze(['dragon_drop_payloads',...WORLD_CLEANUP_TABLES.map(r=>r[0])]);
const mutable=new Set(['monster_participants','boss_participants','fishing_sessions','arena_queue']);
export function cleanupEntry(table){
 if(table==='dragon_drop_payloads')return [table,'rowid',0,'NOT EXISTS(SELECT 1 FROM world_drops d WHERE d.id=dragon_drop_payloads.drop_id)',false];
 const entry=WORLD_CLEANUP_TABLES.find(r=>r[0]===table);demand(entry,'cleanup_table');
 // C4 uses the same native protection predicate; extend only its two fixed
 // boss identifier families, not the reward-completion or live-life gates.
 return entry[3]?[...entry.slice(0,3),entry[3].replaceAll("'stone-boss-black-c3'","'stone-boss-black-c3','stone-boss-black-c4'").replaceAll("'rune-v2-boss-c3-1'","'rune-v2-boss-c3-1','rune-v2-boss-c4-1'"),...entry.slice(4)]:entry;
}
function fields(sql,table,column){const keys=sql.prepare('PRAGMA table_info('+table+')').all().filter(r=>r.pk).sort((a,b)=>a.pk-b.pk).map(r=>r.name),contribution=table==='monster_participants'?['monster_id','spawn_round','player_id']:table==='boss_participants'?['boss_round','player_id']:[];return [...new Set([...keys,...contribution,...(column==='rowid'?[]:[column])])];}
const selection=(column,names)=>'rowid AS rid,'+column+' AS stamp'+(names.length?','+names.join(','):'');
// The bounded time-index scan runs before protection predicates, as in V510.
// Reads use a single WAL snapshot and do not hold the sole writer's event loop.
export function readCleanupBatch(sql,{table,cursor=null,nowMs}){
 const [,,age,guard,ms]=cleanupEntry(table),column=cleanupEntry(table)[1];demand(Number.isSafeInteger(nowMs)&&nowMs>0,'cleanup_clock');
 if(table==='dragon_drop_payloads'&&!sql.prepare("SELECT 1 FROM sqlite_schema WHERE name='dragon_drop_payloads'").get())return {table,nowMs,count:0,rows:[],resources:[],cursor:null};
 const names=fields(sql,table,column),cutoff=(ms?nowMs:Math.floor(nowMs/1000))-age;sql.exec('BEGIN');
 try{
  // Native timestamps can be SQLite REAL values (for example ms / 1000).
  // Preserve their exact value for ordering/CAS; only the rowid is an integer.
  const start=cursor??[-Number.MAX_SAFE_INTEGER,0];demand(Array.isArray(start)&&start.length===2&&Number.isFinite(start[0])&&Number.isSafeInteger(start[1]),'cleanup_cursor');
  const rows=table==='dragon_drop_payloads'?sql.prepare('SELECT '+selection(column,names)+' FROM '+table+' WHERE rowid>? ORDER BY rowid LIMIT ?').all(start[1],CLEANUP_BATCH_SIZE):sql.prepare('SELECT '+selection(column,names)+' FROM main.'+table+' WHERE '+column+'<? AND ('+column+',rowid)>(?,?) ORDER BY '+column+',rowid LIMIT ?').all(cutoff,...start,CLEANUP_BATCH_SIZE);
  const eligible=guard&&rows.length?new Set(sql.prepare('SELECT rowid AS rid FROM '+table+' WHERE rowid IN ('+rows.map(()=>'?').join(',')+') AND '+guard).all(...rows.map(r=>r.rid)).map(r=>r.rid)):new Set(rows.map(r=>r.rid));
  const selected=rows.filter(r=>eligible.has(r.rid)).map(row=>({...row})),resources=new Set();
  if(mutable.has(table))for(const row of selected){if(row.player_id)resources.add('player:'+row.player_id);if(row.monster_id)resources.add('monster:'+row.monster_id);if(table==='boss_participants')for(const monster of sql.prepare('SELECT id FROM monsters WHERE is_boss=1 AND spawn_round=?').all(row.boss_round))resources.add('monster:'+monster.id);}
  const last=rows.at(-1),result={table,nowMs,count:rows.length,cutoff,names,rows:selected,resources:[...resources].sort(),cursor:rows.length===CLEANUP_BATCH_SIZE?[last.stamp,last.rid]:null};sql.exec('COMMIT');return result;
 }catch(error){sql.exec('ROLLBACK');throw error;}
}
export function createCleanupHandler({assertHeld,clock=Date.now}){
 demand(typeof assertHeld==='function','cleanup_fence_required');
 return (sql,payload,context)=>{
  demand(sql.isTransaction&&context.peer.channel===0&&context.peer.role==='world'&&assertHeld(sql,payload,context)===true,'cleanup_owner_fenced');
  const plan=payload.plan,[table,column,age,guard,ms]=cleanupEntry(plan.table);demand(Number.isSafeInteger(plan.nowMs)&&plan.nowMs>0&&plan.nowMs<=clock()+5000&&Array.isArray(plan.rows)&&plan.rows.length<=CLEANUP_BATCH_SIZE,'cleanup_payload');
  const names=fields(sql,table,column),cutoff=(ms?plan.nowMs:Math.floor(plan.nowMs/1000))-age;demand(JSON.stringify(names)===JSON.stringify(plan.names)&&cutoff===plan.cutoff,'cleanup_plan_changed');
  const read=sql.prepare('SELECT '+selection(column,names)+' FROM '+table+' WHERE rowid=?'),ids=[];
  for(const row of plan.rows){demand(Number.isSafeInteger(row.rid)&&Number.isFinite(row.stamp),'cleanup_row');const current=read.get(row.rid);if(current&&Object.keys(current).every(k=>Object.is(current[k],row[k])))ids.push(row.rid);}
  const rows=ids.length?sql.prepare('DELETE FROM '+table+' WHERE rowid IN ('+ids.map(()=>'?').join(',')+')'+(table==='dragon_drop_payloads'?'':' AND '+column+'<?')+(guard?' AND '+guard:'')+' RETURNING '+selection(column,names)).all(...ids,...(table==='dragon_drop_payloads'?[]:[cutoff])):[];
  return {table,rows};
 };
}
