import {demand} from './contract.mjs';
import {createNativeGameplayRates,gameplayRateResponse} from './gameplay-rate.mjs';
import {NATIVE_MODE_RATE} from './generated/mode-policy.mjs';
import {nativeGuildEjections} from './generated/guild-ejection-rules.mjs';
import {nativeAtomicStatements} from './retaliation-writer.mjs';
import {isBagFull,bagFullBody} from './bag-limit.mjs';

export const NATIVE_SERVICE_ACTIONS=Object.freeze({
 rune:['rune_claim','rune_craft','rune_upgrade','rune_equip','rune_unequip'],
 arena_market:['arena_market_buy','arena_market_wings','arena_market_exp'],
 battle_pass:['battle_pass_buy','battle_pass_claim'],
 quest:['quest_claim','quest_tutorial'],
 guild_village:['village','hall','buy','donate','upgrade','invite','revoke'],
 cauldron:[],community_claim:[]
});

// Main-process handler only. Account identity comes from the owned DB row;
// the socket payload never chooses an account or a service method. Native
// receipt checks, inventory caps, guards and transaction bodies are retained.
export function createModeWriterHandler({services,assertOwnership,assertResources,gameplayRates=null}){
 demand(services&&typeof services.run==='function'&&typeof assertOwnership==='function'&&typeof assertResources==='function','mode_writer_dependencies');
 const rates=gameplayRates??createNativeGameplayRates(services.sql,{globals:services.globals,clock:services.clock});
 return (sql,payload,context)=>{
  demand(sql===services.sql&&sql.isTransaction&&assertOwnership(sql,context.peer,context.actor,context.epoch)===true&&assertResources(sql,payload,context)===true,'mode_owner_fenced');
  const {kind,input}=payload;
  demand(Object.hasOwn(NATIVE_SERVICE_ACTIONS,kind)&&input&&typeof input==='object'&&!Array.isArray(input),'mode_command_kind');
  const actions=NATIVE_SERVICE_ACTIONS[kind];demand(!actions.length||actions.includes(input.action),'mode_command_action');
  const actor=sql.prepare('SELECT id,account_id FROM players WHERE id=?').get(context.actor);demand(actor,'mode_actor_missing');
  const policy=NATIVE_MODE_RATE[kind];demand(policy,'mode_rate_policy');
  if(policy.scope){
   try{rates.enforce(sql,policy.scope,actor.account_id,policy.options);}
   catch(error){const response=gameplayRateResponse(error);if(!response)throw error;return {result:response.body,status:response.status,headers:response.headers,players:[sql.prepare('SELECT * FROM players WHERE id=?').get(actor.id)],events:[]};}
  }
  const events=[];let ejections=[];
  const result=services.run(payload,g=>{
   sql.exec('SAVEPOINT kernel511_native_mode');
   try{const value=execute(g);sql.exec('RELEASE kernel511_native_mode');return value;}
   catch(error){sql.exec('ROLLBACK TO kernel511_native_mode;RELEASE kernel511_native_mode');events.length=0;ejections=[];if(isBagFull(error))return bagFullBody();if(error?.constructor!==Error||error.code)throw error;return {ok:false,code:'mode_rule_rejected',error:error.message};}
  });
  function execute(g){
   if(kind==='cauldron')return g.__colCauldron488.command(actor.account_id,actor.id,input);
   if(kind==='community_claim')return g.__colCommunityEvent.claim(actor.account_id,actor.id,input.eventId,input.stage);
   if(kind==='guild_village'){
    const value=g.__colGuildVillage.act(actor.id,input);
    if(input.action==='revoke'){ejections=g.__colGuildVillage.repairAll();nativeGuildEjections(ejections,{db:()=>nativeAtomicStatements(sql),publishRealtimeRoomEvent:(...args)=>{events.push(args);},now:()=>payload.nowMs});}
    return value;
   }
   const key={rune:'__colRunes',arena_market:'__colArenaMarket',battle_pass:'__colBattlePass',quest:'__colQuests438'}[kind];
   return g[key].command(actor.id,input);
  }
  return {result,players:[...new Set([actor.id,...ejections.map(e=>e.playerId)])].map(id=>sql.prepare('SELECT * FROM players WHERE id=?').get(id)),events};
 };
}
