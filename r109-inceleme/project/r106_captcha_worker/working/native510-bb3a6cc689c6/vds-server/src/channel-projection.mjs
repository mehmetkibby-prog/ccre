import {WorldLoop} from './world-loop.mjs';
import {WorldPush} from './world-push.mjs';

// Acknowledgements contain changed keys, never a rebuilt world. This adapter
// refreshes just those keys in the channel's local read-only connection. The
// memory overlay remains authoritative for its next uncommitted generation.
export function attachChannelProjection(database,{send,now=Date.now}={}) {
 const world=new WorldLoop(database.sqlite,{positions:database.positions,combat:database.combat,channel:database.channel,now});
 const push=new WorldPush(database,{positions:database.positions,combat:database.combat,worldLoop:world,channel:database.channel,watchWrites:false,send,now});
 database.worldLoop=world;database.worldPush=push;world.worldPush=push;
 const readers=new Map(),raw=database.sqlite.positionRawPrepare??database.sqlite.prepare.bind(database.sqlite);
 const schema=new Map(raw("SELECT name FROM main.sqlite_schema WHERE type='table'").all().map(({name})=>[name,raw(`PRAGMA main.table_info("${name.replaceAll('"','""')}")`).all()]));
 const worldTables=new Set(['monsters','players','pve_engagements','game_settings','combat_settings','economy_settings','dragon_settings','dungeon_settings']);
 const rowTables=new Set([...worldTables,'combat_events','world_state','messages']);
 for(const table of rowTables){
  const info=schema.get(table);if(!info?.length)continue;
  const key=info.some(c=>c.name==='id')?'id':info.some(c=>c.name==='player_id')?'player_id':info[0].name;
  // The schema is trusted; notification payloads cannot choose identifiers.
  readers.set(table,raw(`SELECT * FROM main."${table}" WHERE "${key}"=?`));
 }
 const before=database.onCommitted;
 database.onCommitted=(changes,committedRows)=>{
  before?.(changes,committedRows);
  if(changes?.some(c=>['game_settings','combat_settings','economy_settings','premium_shop_settings'].includes(c.table)))database.invalidateSettings?.();
  for(const change of changes??[]){
   if(change.table==='progression_settings')globalThis.__colProgression?.refresh();
   if(change.table==='quest_settings438')globalThis.__colQuests438?.refresh();if(change.table==='battle_pass_settings')globalThis.__colBattlePass?.refresh();if(change.table==='status_settings')globalThis.__colStatus?.refresh();if(change.table==='event_island_settings444'||change.table==='event_island_monsters444')globalThis.__colEventIsland444?.refresh();if(change.table==='rune_settings')globalThis.__colRunes?.refresh();if(change.table==='rune_v2_settings')globalThis.__colRuneV2?.refresh();if(change.table==='arena_market_settings')globalThis.__colArenaMarket?.refresh();
   if(!schema.has(change.table))throw Error('unknown_committed_table');
   const id=change.id??change.keys[0],reader=readers.get(change.table);
   const cacheKey=change.table+'\u001e'+change.keys.join('\u001f');
   // Preserve the reader allowlist and distinguish a cached deletion from a
   // cache miss. Direct transfer/admission notifications have no ACK cache.
   const cached=reader&&change.keys.length===1&&change.keys[0]===id&&committedRows?.has(cacheKey);
   const row=cached?committedRows.get(cacheKey):reader?.get(id)??null;
   if(worldTables.has(change.table))world.changed(change.table,id,row);
   push.committed({...change,id,row});
  }
 };
 // Resident channels have no WorldReadPool cursor. Keep its bounded cache
 // expiry cadence here; otherwise clean combat/event records never retire.
 world.register('channel_projection_expiry',100,()=>database.combat.projections.expire());
 world.register('world_push_tick',100,()=>push.tick());
 return {world,push,start(){world.start();},async close(){world.stop();push.stop();await Promise.all([...world.jobs.values()].map(j=>j.running).filter(Boolean));}};
}
