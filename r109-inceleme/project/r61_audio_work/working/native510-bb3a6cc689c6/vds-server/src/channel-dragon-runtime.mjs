import {createDragonBoss} from './dragon-boss.mjs';
import {ChannelDungeonSnapshot} from './channel-dungeon-snapshot.mjs';
import {DRAGON_ID} from '../../lib/dragon-boss.mjs';
import {cachePreparedStatements} from './prepared-cache.mjs';
import {compactNativePlan} from './channel-native-plan.mjs';

// Dragon simulation/loot rolls execute in the requesting simulation process.
// The main receives only the original helper's guarded SQL journal. Current
// round participants are selected by the (monster_id,spawn_round) index.
export function createChannelDragon(database,{onFatal=()=>{},options={}}={}){
 const snapshot=new ChannelDungeonSnapshot(database.sqlite,{channel:database.channel,maxPlayers:4096,extraTables:[
  'monsters','monster_participants','normal_defeats','normal_reward_claims','dragon_defeat_receipts','world_drops','dragon_drop_payloads',
 ]});
 cachePreparedStatements(snapshot.workspace.sqlite);
 const reader=createDragonBoss(database.sqlite,options);let active=null,tail=Promise.resolve(),stopped=false;
 const calculate=async(method,args)=>{
  const scope={},extra=new Map();
  extra.set('monsters',snapshot.all('SELECT * FROM monsters WHERE id=?',DRAGON_ID));
  if(method==='award'){
   const round=args[0].spawn_round;
   const participants=snapshot.all('SELECT * FROM monster_participants WHERE monster_id=? AND spawn_round=?',DRAGON_ID,round);
   scope.playerIds=participants.map(p=>p.player_id);extra.set('monster_participants',participants);
   for(const table of ['normal_defeats','normal_reward_claims'])extra.set(table,snapshot.all(`SELECT * FROM ${table} WHERE monster_id=? AND spawn_round=?`,DRAGON_ID,round));
   extra.set('dragon_defeat_receipts',snapshot.all('SELECT * FROM dragon_defeat_receipts WHERE spawn_round=?',round));
  }else if(method==='collect'){
   scope.playerId=args[0];extra.set('world_drops',snapshot.all('SELECT * FROM world_drops WHERE id=?',args[1]));
   extra.set('dragon_drop_payloads',snapshot.all('SELECT * FROM dragon_drop_payloads WHERE drop_id=?',args[1]));
  }
  scope.extend=rows=>{for(const [table,data]of extra)rows.set(table,data);};
  snapshot.load({runs:new Map()},scope);
  const nativeScope=await database.nativeScope(snapshot);
  const plan=snapshot.workspace.plan();let result;
  try{active=createDragonBoss(plan,options);result=active[method](...args);}finally{active=null;}
  const trace=plan.finish();
  if(trace){
   const reply=await database.remote([],null,compactNativePlan(trace),null,nativeScope);
   if(!reply.committed)throw Object.assign(Error('Ejderha kaydı değişti; tekrar dene.'),{code:'native_snapshot_changed'});
  }
  return result;
 };
 const run=(method,args)=>{
  if(stopped)return Promise.reject(Error('dragon_stopping'));
  const work=tail.then(async()=>{
   // Timer state changes are serialized against shared attacks. Collection is
   // an independent guarded inventory transaction and does not borrow boss HP.
   if(method==='tick'){
    if(database.channel!==1)return;
    if(!database.sharedCombat)throw Error('shared_dragon_owner_missing');
    if(database.sharedCombat.proof())return calculate(method,args);
    const outcome=await database.sharedCombat.run(async()=>{
     try{return {value:await calculate(method,args)};}
     catch(error){if(database.failure)throw error;return {error};}
    });if(outcome.error)throw outcome.error;return outcome.value;
   }
   return calculate(method,args);
  });
  tail=work.catch(error=>{if(database.failure)onFatal(error);});return work;
 };
 const service=new Proxy(reader,{get(target,key){
  if(['award','collect'].includes(key))return(...args)=>run(key,args);
  if(key==='tick')return()=>run('tick',[{cleanup:false}]); // bounded cleanup remains in world-cleanup
  const current=active??target,value=current[key];return typeof value==='function'?value.bind(current):value;
 }});
 return {service,snapshot,async close(){stopped=true;await tail;snapshot.close();}};
}
