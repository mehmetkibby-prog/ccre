import test from 'node:test';
import assert from 'node:assert/strict';
import {setupPvp,put,update,json} from './pvp-fixture.mjs';
import {native} from './helpers.mjs';
import {readConfiguration} from '../read-configuration.mjs';
import {ResidentServices} from '../resident-services.mjs';
import {ReadWorker} from '../read-worker.mjs';
import {ChannelOwnership} from '../ownership.mjs';

const {PremiumEngine}=await native('vds-server/src/premium-engine.mjs'),{createGuildSkill}=await native('vds-server/src/guild-skill.mjs'),{createDragonBoss}=await native('vds-server/src/dragon-boss.mjs');
test('production resident configuration and timed premium/guild buffs match native SQLite rules with hot SQL forbidden',async t=>{
 const f=await setupPvp(t),{sql,id,nowMs}=f;f.reset({area:'forest'});let time=nowMs,config;
 sql.exec('BEGIN');try{config=readConfiguration(sql,{revision:1,nowMs});}finally{sql.exec('ROLLBACK');}
 put(sql,'guilds',{id:'buff-guild',name:'Buff guild',name_key:'buff guild',leader_id:id,created_at:1});
 const guildId=sql.prepare('SELECT guild_id FROM guild_members WHERE player_id=?').get(id).guild_id;
 sql.prepare('INSERT OR IGNORE INTO guild_castles(guild_id,district,slot,purchased_by,purchased_at) VALUES(?,1,1,?,1)').run(guildId,id);
 sql.prepare('INSERT OR REPLACE INTO guild_skills(guild_id,level,active_level,active_until) VALUES(?,3,3,?)').run(guildId,nowMs+4000);
 const players=new Map(),resident=new ResidentServices({config,player:id=>players.get(id),locked:id=>id==='dungeon-player',clock:()=>time});
 const premium=new PremiumEngine(sql,{now:()=>time}),guild=createGuildSkill(sql,{now:()=>time}),dragon=createDragonBoss(sql,{now:()=>time});
 const authority=new ChannelOwnership(f.f.database,{realmId:'services-native'});await authority.initialize();const peer={channel:1,incarnation:'services-native-incarnation'};await authority.registerProcess(1,peer.incarnation);const owner=await authority.admit(id,peer,{sessionId:'services-session',guard:()=>true});
 const reader=new ReadWorker(f.f.file,new Map(),{actorBundles:true});t.after(()=>reader.close());
 for(const level of [0,1,2,3]){
  sql.prepare('UPDATE guild_skills SET active_level=? WHERE guild_id=?').run(level,guildId);
  update(sql,'players',id,{ration_until:nowMs+2000,radiant_enabled:1,radiant_until:nowMs+3000,essence_until:nowMs+4000,pumpkin_enabled499:1,pumpkin_until499:nowMs+5000,arena_wings_equipped:1,arena_wings_expires_at_ms:nowMs+6000});
  const bundle=(await reader.query('kernel511_actor_bundle',[id,1,peer.incarnation,owner.epoch,level,nowMs])).rows;
  players.set(id,Object.freeze({...bundle.player}));resident.hydrate(bundle);
  for(const offset of [0,1999,2000,2999,3000,4000,4999,5000,6000,1000]){
   time=nowMs+offset;
   const expected={premium:premium.buff(id),guild:guild.bonuses(id),power:dragon.infinitePower({kind:'weapon',power:181})},prepare=sql.prepare;
   sql.prepare=()=>assert.fail('resident service accessed SQLite');
   try{assert.deepEqual(resident.globals.__colPremium.buff(id),expected.premium);assert.deepEqual(resident.globals.__colGuildSkill.bonuses(id),expected.guild);assert.equal(resident.globals.__colDragonBoss.infinitePower({kind:'weapon',power:181}),expected.power);}finally{sql.prepare=prepare;}
  }
 }
 assert.equal(resident.globals.__colDungeon.locked('dungeon-player'),true);
 assert.deepEqual(json(resident.globals.__colDungeon.settings()),config.dungeon);
 assert.deepEqual(json(resident.globals.__colProgression.snapshot()),config.progression);
 assert.throws(()=>resident.configure(config),/resident_config_revision/);
 const live=resident.globals;resident.configure({...config,revision:2});assert.equal(live,resident.globals,'rule closures retain the same globals object across settings refresh');
 resident.hydrate({player:players.get(id),guildSkill:null});assert.deepEqual(resident.globals.__colGuildSkill.bonuses(id),{attack:0,hp:0,xp:0,until:0,level:0});
 const rank=resident.globals.__colRanks.bonuses(id);resident.forget(id);const resumedRank=resident.globals.__colRanks.bonuses(id);assert.deepEqual(resumedRank,rank);assert.notEqual(resumedRank,rank,'normal actor detach evicts the rank cache');
});
