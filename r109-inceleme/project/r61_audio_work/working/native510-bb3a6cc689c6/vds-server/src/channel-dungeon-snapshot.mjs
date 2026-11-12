import {forgeDropSnapshot491} from '../../lib/forge-material491.mjs';
import {isDeepStrictEqual} from 'node:util';
import {NativeWorkspace} from './channel-native-workspace.mjs';

const singleton = ['game_settings','combat_settings','dungeon_settings','dragon_settings','rank_settings','rune_settings','progression_settings','premium_shop_settings'];
const owned = ['players','player_items','player_storage_items','player_pets','player_stones','dungeon_members','dungeon_materials','dungeon_wings','solo_daily_entries','guild_members','black_loot_attempts'];
const independentOwned = new Set(['players','player_items','player_storage_items','player_pets','player_stones','dungeon_materials','dungeon_wings','solo_daily_entries','black_loot_attempts']);
const receipts = ['dungeon_crafts','solo_key_crafts','solo_entry_receipts'];
const runTables = ['dungeon_runs','dungeon_rewards','dungeon_event_claims'];
const extra = ['loadlab_entities_v1','loadlab_admissions_v1','accounts','parties','party_members','messages','guilds','guild_castles','guild_skills','starter_admin_grants','black_loot_chests'];
const quote = name => '"'+name.replaceAll('"','""')+'"';

export function ensureChannelDungeonIndexes(sqlite){
 for(const [table,sql]of [['dungeon_rewards','CREATE INDEX IF NOT EXISTS channel_dungeon_reward_owner ON dungeon_rewards(player_id,created_at DESC)'],['parties','CREATE INDEX IF NOT EXISTS channel_dungeon_party_leader ON parties(leader_id)']]){
  if(sqlite.prepare("SELECT 1 FROM sqlite_schema WHERE type='table' AND name=?").get(table))sqlite.exec(sql);
 }
}

// Snapshot only this channel's active rooms and the command's party. Historical
// participation is NEVER read. Idempotency receipts are fetched by their full
// primary key; a million old rewards/crafts do not enlarge this workspace.
export class ChannelDungeonSnapshot {
 constructor(source,{channel,maxPlayers=90,extraTables=[]}={}){
  this.source=source;this.channel=channel;this.maxPlayers=maxPlayers;
  const available=new Set(source.prepare("SELECT name FROM main.sqlite_schema WHERE type='table'").all().map(r=>r.name));
  this.tables=[...new Set([...singleton,...owned,...receipts,...runTables,...extra,...extraTables])].filter(t=>available.has(t));
  this.workspace=new NativeWorkspace(source,this.tables);this.reads=0;this.rows=0;
 }
 all(sql,...params){this.reads++;return this.source.prepare(sql).all(...params);}
 load(engine,{playerId,requestId,playerIds=[],extend}={}){
  const ids=new Set(playerIds),runs=new Set(),parties=new Set();
  for(const run of engine.runs.values()){
   runs.add(run.id);if(run.partyId&&!run.partyId.startsWith('solo:'))parties.add(run.partyId);
   for(const member of run.members)ids.add(member.id);
  }
  if(playerId){
   ids.add(playerId);
   for(const p of this.all('SELECT id FROM parties WHERE leader_id=?',playerId))parties.add(p.id);
   for(const p of this.all('SELECT party_id FROM party_members WHERE player_id=?',playerId))parties.add(p.party_id);
  }
  const rows=new Map(this.tables.map(t=>[t,[]]));
  const select=(table,key,values)=>{
   if(!rows.has(table)||!values.size)return [];
   // Stable single-key statements are cached by the source adapter; no
   // dynamically sized IN list or complete history scan on command/tick.
   return [...values].flatMap(value=>this.all(`SELECT * FROM ${quote(table)} WHERE ${quote(key)}=?`,value));
  };
  rows.set('parties',select('parties','id',parties));
  rows.set('party_members',select('party_members','party_id',parties));
  for(const m of rows.get('party_members'))ids.add(m.player_id);
  if(ids.size>this.maxPlayers)throw Error('dungeon_snapshot_scope_overflow');
  for(const table of singleton)if(rows.has(table))rows.set(table,this.all(`SELECT * FROM ${quote(table)} WHERE id=1`));
  for(const table of owned)if(rows.has(table))rows.set(table,select(table,table==='players'?'id':'player_id',ids));
  if(rows.has('accounts'))rows.set('accounts',select('accounts','id',new Set(rows.get('players').map(p=>p.account_id))));
  // Material eligibility is replayed against the durable writer. Copy exact
  // scoped marker rows only while this drop is enabled; no per-hit lookup.
  if(forgeDropSnapshot491(rows.get('game_settings')?.[0])){
   const accounts491=new Set((rows.get('players')??[]).map(p=>p.account_id));
   if(rows.has('loadlab_entities_v1')){
    const markers491=[...select('loadlab_entities_v1','id',ids),...select('loadlab_entities_v1','account_id',accounts491)];
    rows.set('loadlab_entities_v1',[...new Map(markers491.map(row=>[row.id,row])).values()]);
   }
   if(rows.has('loadlab_admissions_v1'))rows.set('loadlab_admissions_v1',select('loadlab_admissions_v1','account_id',accounts491));
  }
  if(rows.has('black_loot_chests'))rows.set('black_loot_chests',select('black_loot_chests','id',new Set((rows.get('black_loot_attempts')??[]).map(r=>r.chest_id))));
  // Do not admit a cross-channel party by copying its player rows. The original
  // engine still checks the full party, but only the owning channel may mutate it.
  this.playerIds=[...ids];this.scopePlayerIds=new Set(ids);
  // Include missing participant IDs too: a reward claim may refer to a deleted
  // participant, while the original reward helper skips its missing player row.
  const scopedPlayers=new Map(rows.get('players').map(p=>[p.id,p.channel]));
  this.scopePlayers=this.playerIds.map(playerId=>({playerId,channel:scopedPlayers.get(playerId)??null}));
  this.localPlayerIds=rows.get('players').filter(p=>p.channel===this.channel).map(p=>p.id);
  for(const row of rows.get('dungeon_members')??[])runs.add(row.run_id);
  for(const table of runTables)if(rows.has(table))rows.set(table,select(table,table==='dungeon_runs'?'id':'run_id',runs));
  if(rows.has('dungeon_rewards')){
   const rewards=rows.get('dungeon_rewards'),keys=new Set(rewards.map(r=>r.run_id+'\u001e'+r.player_id));
   for(const id of ids)for(const r of this.all('SELECT * FROM dungeon_rewards WHERE player_id=? ORDER BY created_at DESC LIMIT 1',id))if(!keys.has(r.run_id+'\u001e'+r.player_id))rewards.push(r);
  }
  for(const table of receipts)if(rows.has(table)&&playerId&&typeof requestId==='string')rows.set(table,this.all(`SELECT * FROM ${quote(table)} WHERE player_id=? AND request_id=?`,playerId,requestId));
  const guilds=new Set((rows.get('guild_members')??[]).map(m=>m.guild_id));
  if(rows.has('guilds'))rows.set('guilds',select('guilds','id',guilds));
  if(rows.has('guild_castles'))rows.set('guild_castles',select('guild_castles','guild_id',guilds));
  if(rows.has('guild_skills'))rows.set('guild_skills',select('guild_skills','guild_id',guilds));
  // The announcement SQL needs the largest active expiry plus the per-run
  // uniqueness receipt, not all chat messages.
  if(rows.has('messages')){
   const messages=this.all('SELECT * FROM messages WHERE announcement_expires_at_ms>0 ORDER BY announcement_expires_at_ms DESC LIMIT 1');
   const seen=new Set(messages.map(m=>m.id));
   for(const run of engine.runs.values())for(const m of this.all('SELECT * FROM messages WHERE player_id=? AND announcement_request_id=?',run.leaderId,'dungeon:'+run.id))if(!seen.has(m.id)){messages.push(m);seen.add(m.id);}
   rows.set('messages',messages);
  }
  extend?.(rows);
  this.loadedRunIds=new Set((rows.get('dungeon_runs')??[]).map(r=>r.id));
  this.rows=[...rows.values()].reduce((n,r)=>n+r.length,0);
  this.workspace.refresh(rows);return this.workspace;
 }
 ignoresChange(change){
  // Only independent owner tables qualify. Party/guild/settings/messages and
  // missing owner metadata remain conservative, including foreign party rows.
  if(!this.scopePlayerIds||!independentOwned.has(change.table))return false;
  const owner=change.owner??(change.table==='players'?(change.keys?.[0]??change.id):null);
  return typeof owner==='string'&&!this.scopePlayerIds.has(owner);
 }
 // Own checkpoint writes already changed the private plan's SQLite rows.
 // Verify against the durable source by exact key before reusing them. A
 // different or deleted row forces the original complete snapshot path.
 reconcileRunRows(ids){
  for(const id of ids){
   const local=this.workspace.sqlite.prepare('SELECT * FROM dungeon_runs WHERE id=?').get(id);
   if(!local)continue; // An unrelated historical room is outside this scope.
   const current=this.all('SELECT * FROM dungeon_runs WHERE id=?',id)[0];
   if(!isDeepStrictEqual(local,current))return false;
  }
  return true;
 }
 scopeFor(engine,runIds){
  if(!runIds?.length)return this;
  const ids=new Set();
  for(const id of runIds){const run=engine.runs.get(id);if(!run)return this;for(const member of run.members)ids.add(member.id);}
  return {localPlayerIds:this.localPlayerIds.filter(id=>ids.has(id)),scopePlayers:this.scopePlayers.filter(p=>ids.has(p.playerId))};
 }
 close(){this.workspace.close();}
}
