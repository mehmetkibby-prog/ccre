import {createRewardServices,NATIVE_MODE_SQL_BATCHES} from './generated/reward-services.mjs';
import {serviceTransactionDatabase} from './service-transaction.mjs';
import {actionRandom} from './action-writer.mjs';
import {demand} from './contract.mjs';
import {OperationRandom} from './operation-random.mjs';

// Native economy services live only in the synchronous sole-writer lane.
// One operation-scoped RNG/UUID/clock feeds the unchanged service bodies and
// their nested factories. No AsyncLocalStorage or asynchronous context leak.
export class NativeModeServices {
 constructor(sql,{globals={},clock=Date.now,fourChannels=true}={}){
  this.sql=sql;this.clock=clock;this.active=null;this.globals={...globals};const db=serviceTransactionDatabase(sql,{allowedExec:NATIVE_MODE_SQL_BATCHES}),now=()=>this.active?.nowMs??clock();
  const random=()=>{demand(this.active,'mode_random_outside_operation');return this.active.random();},uuid=()=>{demand(this.active,'mode_uuid_outside_operation');return this.active.uuid();},integer=(...args)=>{demand(this.active,'mode_random_outside_operation');return this.active.integer(...args);};
  this.database=db;this.modules=createRewardServices({globals:this.globals,now,random,uuid,integer,fourChannels});const m=this.modules,g=this.globals;
  g.__colStatus=m.status.createStatus(db);g.__colRanks=m.ranks.createRanks(db);
  g.__colDragonBoss=m.dragon.createDragonBoss(db,{now,random});g.__colQuests438=m.quests.createQuests438(db,{now,random});
  g.__colRunes=m.runes.createRunes(db);g.__colRuneV2=m.runeV2.createRuneV2(db);g.__colEventIsland444=m.events.createEventIsland444(db,{now,random});
  g.__colArenaMarket=m.arena.createArenaMarket(db,{now});g.__colBattlePass=m.battlePass.createBattlePass(db,{now});g.__colCauldron488=m.cauldron.createCauldron488(db,{now});
  g.__colEvolutionQuest=m.evolution.createEvolutionQuest(db);g.__colCommunityEvent=m.community.createCommunityEvent(db,{now:()=>Math.floor(now()/1000)});
  g.__colGuildVillage=m.guildVillage.createGuildVillage(db,{now,dungeonLocked:id=>{demand(typeof g.__colDungeon?.locked==='function','dungeon_membership_service_missing');return g.__colDungeon.locked(id);}});
 }
 run(payload,fn,random=null){
  demand(this.sql.isTransaction&&!this.active&&typeof fn==='function','mode_writer_context');
  demand(Number.isSafeInteger(payload.nowMs)&&payload.nowMs>=0&&payload.nowMs<=this.clock()+5000&&typeof payload.seed==='string'&&/^[a-f0-9]{64}$/.test(payload.seed),'mode_operation_context');
  const integers=new OperationRandom(payload.seed);this.active={nowMs:payload.nowMs,integer:(...args)=>integers.integer(...args),...actionRandom(payload.seed),...random};
  try{const value=fn(this.globals);demand(!value?.then,'async_mode_service');return value;}finally{this.active=null;}
 }
 // The trusted settings-change coordinator calls this after its atomic commit
 // and before broadcasting the new immutable configuration to channel workers.
 refresh({serviceRefreshR89=null}={}){demand(!this.active,'mode_refresh_during_operation');for(const key of ['__colStatus','__colRanks','__colDragonBoss','__colQuests438','__colRunes','__colRuneV2','__colEventIsland444','__colArenaMarket','__colBattlePass','__colCommunityEvent'])if(!serviceRefreshR89?.refresh(this,key))this.globals[key].refresh?.();}
}
