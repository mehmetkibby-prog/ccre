import {createEventIsland444} from './event-island444.mjs';
import {createDragonBoss} from './dragon-boss.mjs';
import {ChannelDungeonSnapshot} from './channel-dungeon-snapshot.mjs';
import {compactNativePlan} from './channel-native-plan.mjs';
import {cachePreparedStatements} from './prepared-cache.mjs';
export function createChannelEvent444(database,{onFatal=()=>{}}={}){
 const tables=['monsters','monster_participants','normal_defeats','normal_reward_claims','world_drops','dragon_drop_payloads','event_island_settings444','event_island_monsters444','event_island_defeats444'];
 let snapshot=null;const getSnapshot=()=>{if(!snapshot){snapshot=new ChannelDungeonSnapshot(database.sqlite,{channel:database.channel,maxPlayers:4096,extraTables:tables});cachePreparedStatements(snapshot.workspace.sqlite);}return snapshot;};
 const reader=createEventIsland444(database.sqlite);let tail=Promise.resolve(),stopped=false;
 const calculate=async(method,args)=>{
  const snapshot=getSnapshot(),scope={},extra=new Map();extra.set('event_island_settings444',snapshot.all('SELECT * FROM event_island_settings444 WHERE id=1'));
  if(method==='award'){
   const pending=args[0],id=pending.monster_id,round=pending.spawn_round;
   const participants=snapshot.all('SELECT * FROM monster_participants WHERE monster_id=? AND spawn_round=?',id,round);scope.playerIds=participants.map(r=>r.player_id);extra.set('monster_participants',participants);
   for(const t of ['normal_defeats','normal_reward_claims','event_island_defeats444'])extra.set(t,snapshot.all(`SELECT * FROM ${t} WHERE monster_id=? AND spawn_round=?`,id,round));
   extra.set('monsters',snapshot.all('SELECT * FROM monsters WHERE id=?',id));extra.set('event_island_monsters444',snapshot.all('SELECT * FROM event_island_monsters444 WHERE id=?',id));
  }else{scope.playerId=args[0];extra.set('world_drops',snapshot.all('SELECT * FROM world_drops WHERE id=?',args[1]));extra.set('dragon_drop_payloads',snapshot.all('SELECT * FROM dragon_drop_payloads WHERE drop_id=?',args[1]));}
  scope.extend=rows=>{for(const [k,v]of extra)rows.set(k,v);};snapshot.load({runs:new Map()},scope);
  const nativeScope=await database.nativeScope(snapshot);
  const plan=snapshot.workspace.plan(),oldDragon=globalThis.__colDragonBoss;let result;
  try{globalThis.__colDragonBoss=createDragonBoss(plan);result=createEventIsland444(plan,{cacheProfiles:false})[method](...args);}finally{globalThis.__colDragonBoss=oldDragon;}
  const trace=plan.finish();if(trace){const ack=await database.remote([],null,compactNativePlan(trace),null,nativeScope);if(!ack.committed)throw Object.assign(Error('Etkinlik ödülü değişti; yeniden dene.'),{code:'native_snapshot_changed'});}return result;
 };
 const service=new Proxy(reader,{get(target,key){if(['award','collect'].includes(key))return(...args)=>{if(stopped)return Promise.reject(Error('event_stopping'));const work=tail.then(()=>calculate(key,args));tail=work.catch(e=>{if(database.failure)onFatal(e);});return work;};const value=target[key];return typeof value==='function'?value.bind(target):value;}});
 return {service,async close(){stopped=true;await tail;snapshot?.close();}};
}
