import {setupWorldJobs} from './world-jobs-fixture.mjs';
import {put,update} from './pvp-fixture.mjs';
import {createPlayerJobHandler} from '../player-jobs.mjs';
import {nativeDailyDay} from '../generated/player-job-rules.mjs';
export const isolatedPlayerJobs=(sql,payload)=>payload.token==='isolated-no-channels'&&sql.prepare('SELECT COUNT(*) n FROM kernel511_channel_processes WHERE online=1').get().n===0;
export function bindPlayerJobs(f){f.writer.add('player_upkeep',createPlayerJobHandler({database:f.f.database,services:f.services,clock:()=>f.nowMs,assertHeld:isolatedPlayerJobs}));}
export async function setupPlayerJobs(t){const f=await setupWorldJobs(t);bindPlayerJobs(f);return f;}
export function playerJobCommand(f,job,{actor=null,entry=null}={}){const owner=f.writer.owner('world');return {epoch:owner.epoch,sequence:owner.sequence+1,key:'player-job-test:'+job+':'+(owner.sequence+1),kind:'player_upkeep',payload:{job,actor,entry,nowMs:f.nowMs,seed:'b'.repeat(64),cycle:f.sql.prepare('SELECT cycle FROM world_state WHERE id=1').get().cycle,token:'isolated-no-channels'}};}
export function seedPremium(f){
 const now=f.nowMs;update(f.sql,'players',f.id,{level:60,hp:200000,max_hp:200000,pumpkin_enabled499:1,pumpkin_until499:now-1,ration_until:now-1,has_wings:1,wings_equipped:1,wings_expires_at_ms:now-1,arena_wings_owned:1,arena_wings_equipped:1,arena_wings_expires_at_ms:now-1,weapon_skin_owned:1,weapon_skin_enabled:1,weapon_skin_expires_at_ms:now-1,teleport_skin_owned:1,teleport_skin_enabled:1,teleport_skin_expires_at_ms:now-1});
 put(f.sql,'player_items',{id:'premium-expired-costume511',player_id:f.id,kind:'costume',item_name:'Expired costume',rarity:'white',power:1,role:'avci',equipped:1,enchantments:'[]',created_at:1,expires_at_ms:now-1,premium_origin:1});
 put(f.sql,'player_items',{id:'premium-future-costume511',player_id:f.id,kind:'costume',item_name:'Future costume',rarity:'white',power:1,role:'avci',equipped:0,enchantments:'[]',created_at:1,expires_at_ms:now+10000,premium_origin:1});
 put(f.sql,'player_storage_items',{id:'storage-expired511',player_id:f.id,slot:1,kind:'costume',item_name:'Expired stored costume',created_at:1,expires_at_ms:now-1});
 put(f.sql,'player_pets',{player_id:f.id,kind:'starter',equipped:1,acquired_at:Math.floor(now/1000)-259201});
 for(const product of ['weapon_skin','teleport_skin','costume'])put(f.sql,'premium_listings',{id:'expired-listing511-'+product,seller_id:f.id,product,payload:JSON.stringify(product==='costume'?{item:{expires_at_ms:now-1}}:{expires_at_ms:now-1}),price:1,created_at:1});
}
export function seedDaily(f,{winner=true,lab=false,banned=false}={}){
 const day=nativeDailyDay(f.nowMs)-1;f.sql.prepare('UPDATE daily_monster_reward_state477 SET enabled=0,active_day=?').run(day);f.sql.exec('DELETE FROM daily_monster_rewards477;UPDATE players SET daily_monster_kills=0');
 update(f.sql,'players',f.id,{core_coins:70,daily_monster_day:day,daily_monster_kills:winner?55:0,loadlab_run_id:lab?'daily-lab-fixture':''});f.sql.prepare('UPDATE accounts SET permanently_banned=? WHERE id=(SELECT account_id FROM players WHERE id=?)').run(banned?1:0,f.id);f.sql.exec('UPDATE daily_monster_reward_state477 SET enabled=1');return day;
}
export function seedGuild(f,{until=f.nowMs+30000}={}){
 f.sql.prepare('UPDATE players SET level=MAX(level,(SELECT guild_create_level FROM economy_settings WHERE id=1)),gems=MAX(gems,(SELECT guild_create_gems FROM economy_settings WHERE id=1)) WHERE id=?').run(f.id);
 put(f.sql,'guilds',{id:'sync-guild511',name:'Sync guild',name_key:'sync guild',leader_id:f.id,created_at:1});
 const guild=f.sql.prepare('SELECT guild_id FROM guild_members WHERE player_id=?').get(f.id).guild_id;
 f.sql.prepare('INSERT OR IGNORE INTO guild_castles(guild_id,district,slot,purchased_by,purchased_at) VALUES(?,1,1,?,1)').run(guild,f.id);
 f.sql.prepare('INSERT OR REPLACE INTO guild_skills(guild_id,level,active_level,active_until) VALUES(?,3,3,?)').run(guild,until);
 return guild;
}
