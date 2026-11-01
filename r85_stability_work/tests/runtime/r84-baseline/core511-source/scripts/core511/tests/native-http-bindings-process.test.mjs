import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {nativeHttpHost} from './native-http-host-fixture.mjs';
import {guildSkillHandler} from './native-permanent-fixture.mjs';
import {configurationSnapshot} from './native-configuration-fixture.mjs';
import {combatState} from './process-fixture.mjs';

test('actual five owners use original native HTTP globals for auth, guild rejection and one durable donation',{timeout:40000},async t=>{
 const s=await nativeHttpHost(t),{f,core,host,bindings,world,supervisor,writer,faults,http}=s;await world.stopJobs();assert.equal(host.children.size,5);assert.equal(bindings.core(),core);
 const locked=await http('ticket');assert.equal(locked.status,403);assert.equal(locked.code,'launch_locked');await host.database.atomic(()=>globalThis.__colLaunch.grant(f.account.id,true));const ticket=await http('ticket');assert.equal(ticket.status,200,JSON.stringify(ticket));const route=guildSkillHandler({f,core,service:globalThis.__colGuildSkill,permanent:globalThis.__colChannelPermanent});
 const denied=await route(f.request({path:'/api/guild-skill',body:{action:'donate',amount:7,requestId:randomUUID()}}));assert.equal(denied.status,409);assert.deepEqual(await denied.json(),{error:'Loncanızın bir şatosu olmalı.'});assert.equal(core.permanent.entries.size,0);
 await globalThis.__colChannelPermanent([f.id],()=>{f.sql.prepare('INSERT INTO guilds(id,name,name_key,leader_id,created_at) VALUES(?,?,?,?,1)').run('http-guild511','Http guild','http guild',f.id);f.sql.prepare('INSERT INTO guild_members(player_id,guild_id,joined_at) VALUES(?,?,1) ON CONFLICT(player_id) DO UPDATE SET guild_id=excluded.guild_id').run(f.id,'http-guild511');f.sql.prepare('INSERT INTO guild_castles(guild_id,district,slot,purchased_by,purchased_at) VALUES(?,1,1,?,1)').run('http-guild511',f.id);f.sql.prepare("UPDATE players SET area='guild_hall_http-guild511',x=790,y=650,hp=100,essence=100 WHERE id=?").run(f.id);});
 await core.nativeConfiguration.run([],()=>globalThis.__colGuildVillage.save(true,globalThis.__colGuildVillage.settings().revision));
 const body={action:'donate',amount:7,requestId:randomUUID()},request=()=>f.request({path:'/api/guild-skill',body});const donated=await route(request());assert.equal(donated.status,200,await donated.text());const replay=await route(request());assert.equal(replay.status,200,await replay.text());assert.equal(f.sql.prepare('SELECT essence FROM players WHERE id=?').get(f.id).essence,93);assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM guild_skill_receipts WHERE player_id=? AND request_id=?').get(f.id,body.requestId).n,1);assert.equal(writer.authority.admission(f.id).channel,ticket.channel);assert.equal((await combatState(supervisor.rows.get(ticket.channel))).players.find(p=>p.id===f.id).suspended,false);
 assert.equal(globalThis.__colCore511Presence.augment(core.sessions.get(f.id).session).tokenHash,f.tokenHash);assert.equal((await http('ticket')).status,200);assert.equal(faults.length,0,faults.map(f=>f.error?.stack).join('\n'));
});

test('native HTTP Rune V2 service uses raw sole SQLite and refreshes all four actual channel views',{timeout:40000},async t=>{
 const {f,core,bindings,world,supervisor,faults}=await nativeHttpHost(t);await world.stopJobs();const service=bindings.services.__colRuneV2,before=service.settings(),config=structuredClone(before.config);config.monsters.boss.hp+=23;
 await core.nativeConfiguration.run([],()=>f.sql.prepare("UPDATE monsters SET hp=100,max_hp=300 WHERE id LIKE 'rune-v2-boss-c%'").run());
 await core.nativeConfiguration.saveRuneV2(service,config,before.revision);assert.equal(service.settings().revision,before.revision+1);
 for(const channel of [1,2,3,4]){const id='rune-v2-boss-c'+channel+'-1',row=f.sql.prepare('SELECT hp,max_hp FROM monsters WHERE id=?').get(id),snapshot=await configurationSnapshot(supervisor.rows.get(channel),id);assert.equal(row.max_hp,config.monsters.boss.hp);assert.equal(snapshot.monster.max_hp,row.max_hp);}
 assert.equal(faults.length,0,faults.map(f=>f.error?.stack).join('\n'));
});
