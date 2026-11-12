import {createRewardServices} from './generated/reward-services.mjs';
import {serviceTransactionDatabase} from './service-transaction.mjs';
import {attackRandom} from './attack-writer.mjs';
import {demand} from './contract.mjs';

export function createQuestWriterHandler({assertOwnership,assertResources,globalsFor,clock=Date.now}){
 for(const fn of [assertOwnership,assertResources,globalsFor])demand(typeof fn==='function','quest_writer_dependencies');
 return (sql,payload,context)=>{
  demand(sql.isTransaction&&assertOwnership(sql,context.peer,context.actor,context.epoch)===true&&assertResources(sql,payload,context)===true,'quest_owner_fenced');
  demand(Number.isSafeInteger(payload.nowMs)&&payload.nowMs>=0&&payload.nowMs<=clock()+5000,'quest_invalid_time');
  const globals=globalsFor(sql,context.actor),services=createRewardServices({globals,...attackRandom(payload.seed),now:()=>payload.nowMs}),quests=services.quests.createQuests438(serviceTransactionDatabase(sql),{...attackRandom(payload.seed),now:()=>payload.nowMs});
  const result=quests.command(context.actor,payload.input);demand(!result?.then,'async_quest_writer');
  return {result,player:sql.prepare('SELECT * FROM players WHERE id=?').get(context.actor),items:sql.prepare('SELECT * FROM player_items WHERE player_id=? ORDER BY id').all(context.actor),quests:quests.read(context.actor)};
 };
}
