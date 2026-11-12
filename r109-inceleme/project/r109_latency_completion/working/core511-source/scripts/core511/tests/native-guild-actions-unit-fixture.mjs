import assert from 'node:assert/strict';
import {setupPvp,update,put} from './pvp-fixture.mjs';
import {prepareModeCase} from './mode-fixture.mjs';
import {standaloneRevoke} from './native-guild-village-unit-fixture.mjs';

export async function guildActionFixture(t){
 const s=await setupPvp(t);s.reset({area:'forest'});await prepareModeCase(s,'guild_village','revoke');s.sql.prepare('DELETE FROM guild_castle_guests WHERE player_id=?').run(s.targetId);
 for(const id of [s.id,s.targetId])s.sql.prepare('INSERT INTO guild_members(player_id,guild_id,joined_at) VALUES(?,?,1) ON CONFLICT(player_id) DO UPDATE SET guild_id=excluded.guild_id').run(id,'mode-guild');
 update(s.sql,'players',s.targetId,{area:'guild_hall_mode-guild'});const template=s.sql.prepare('SELECT * FROM players WHERE id=?').get(s.targetId);put(s.sql,'players',{...template,id:'guild-offline-expired',name:'ExpiredGuest',account_id:null,last_seen:0,is_gm:0,area:'guild_hall_missing'});
 s.sql.function('strftime',{varargs:true},pattern=>{assert.equal(pattern,'%s');return String(Math.floor(s.nowMs/1000));});return {...s,...await standaloneRevoke(s.f.database,s.nowMs)};
}
export function prepareGuildAction(s,action){
 const extra='rival-extra',body={action},sql=s.sql;let actor=s.id;
 if(action==='create'){const economy=sql.prepare('SELECT guild_create_level,guild_create_gems FROM economy_settings WHERE id=1').get();update(sql,'players',extra,{level:Math.max(40,economy.guild_create_level),gems:economy.guild_create_gems+1000});actor=extra;body.name='Native Guild Test';}
 else if(action==='invite'){update(sql,'players',extra,{last_seen:Math.floor(s.nowMs/1000)});body.target=extra;}
 else if(action==='accept'||action==='decline'){sql.prepare('INSERT INTO guild_invites VALUES(?,?,?,?,?)').run('native-guild-invite','mode-guild',s.id,extra,Math.floor(s.nowMs/1000)+120);actor=extra;body.id='native-guild-invite';}
 else if(action==='permission'){body.target=s.targetId;body.enabled=true;}
 else if(action==='transfer')body.target=s.targetId;
 else if(action==='tax')body.rate=25;
 else if(action==='withdraw'){sql.prepare("UPDATE guilds SET treasury=100 WHERE id='mode-guild'").run();body.amount=10;body.requestId='11223344-5566-4778-8990-aabbccddeeff';}
 else throw Error('Unknown native guild action fixture '+action);
 return {actor,body};
}
