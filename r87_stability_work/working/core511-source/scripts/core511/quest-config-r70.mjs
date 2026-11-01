import {validateQuests438 as legacyValidate,defaultQuests438,QUEST_CATALOG438,QUEST_BY_ID438,questClassItem438,questEnchantments438} from '../../../native510-bb3a6cc689c6/lib/quests438.mjs';
import {enhancementLevel491} from '../../../native510-bb3a6cc689c6/lib/enhancement491.mjs';
export {defaultQuests438,QUEST_CATALOG438,QUEST_BY_ID438,questClassItem438,questEnchantments438};
import {QUEST_EVENTS438} from './quest-objectives-r70.mjs';
export {QUEST_EVENTS438};
const byId=new Map(QUEST_EVENTS438.map(e=>[e.id,e]));
export function validateQuests438(input){
 if(!input||!Array.isArray(input.quests))throw Error('Görev listesi geçersiz.');
 for(const q of input.quests){const meta=byId.get(q?.event);if(!meta||!Number.isSafeInteger(q.target)||q.target<1||q.target>meta.max)throw Error('Görev hedefi geçersiz: '+(meta?.label??'bilinmeyen tür')+'.');}
 const clean=legacyValidate({...input,quests:input.quests.map(q=>({...q,event:['kill','fish','market','evolution'].includes(q.event)?q.event:'kill'}))});
 return {...clean,quests:clean.quests.map((q,i)=>({...q,event:input.quests[i].event}))};
}
// Read existing authoritative state only. No client counters, extra kill writes,
// rewards or schema migrations. Optional feature tables may not yet exist.
export function createQuestProgressR70(db,{now=Date.now}={}){
 const statements=new Map();
 const query=(table,sql,id)=>{if(!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(table))return [];let stmt=statements.get(sql);if(!stmt){stmt=db.prepare(sql);statements.set(sql,stmt);}return stmt.all(id);};
 const one=(table,sql,id)=>Number(query(table,sql,id)[0]?.n??0);
 const gear=id=>query('player_items','SELECT kind,item_name,enchantments,equipped FROM player_items WHERE player_id=?',id);
 return (event,p)=>{
  switch(event){
   case 'level':return p.level;
   case 'rank':return p.rank_tier??0;
   case 'skill':return Math.max(p.skill_one??1,p.skill_two??1,p.skill_three??1);
   case 'gear_upgrade':return Math.max(0,...gear(p.id).map(enhancementLevel491));
   case 'gear_evolution':return Math.max(0,...gear(p.id).filter(i=>i.kind==='weapon').map(i=>{try{return Math.max(0,...JSON.parse(i.enchantments||'[]').filter(e=>e.kind==='evolution_level').map(e=>Number(e.value)||0));}catch{return 0;}}));
   case 'equipped':return new Set(gear(p.id).filter(i=>i.equipped&&['weapon','armor','helmet','shoes','necklace','earring','bracelet'].includes(i.kind)).map(i=>i.kind)).size;
   case 'pet':return query('player_pets','SELECT kind,acquired_at FROM player_pets WHERE player_id=?',p.id).some(pet=>Number(pet.acquired_at)+(pet.kind==='starter'?259200:604800)>now()/1000)?1:0;
   case 'mount':return Math.min(1,one('mount_unlocks_r49','SELECT count(*) n FROM mount_unlocks_r49 WHERE player_id=?',p.id));
   case 'guild':return Math.min(1,one('guild_members','SELECT count(*) n FROM guild_members WHERE player_id=?',p.id));
   case 'party':return one('party_members','SELECT count(*) n FROM party_members WHERE party_id=(SELECT party_id FROM party_members WHERE player_id=?)',p.id)>=2?1:0;
   case 'mist_chest':return one('adventure_chests','SELECT count(*) n FROM adventure_chests WHERE player_id=?',p.id);
   case 'gold_mist_chest':return one('adventure_chests','SELECT count(*) n FROM adventure_chests WHERE player_id=? AND gold=1',p.id);
   case 'azrail':return one('adventure_awards',"SELECT count(*) n FROM adventure_awards WHERE player_id=? AND key LIKE 'azrail:%'",p.id);
   default:return 0;
  }
 };
}
