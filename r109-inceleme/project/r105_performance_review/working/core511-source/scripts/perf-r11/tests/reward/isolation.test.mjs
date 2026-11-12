import test from 'node:test';import assert from 'node:assert/strict';import path from 'node:path';import {setup} from './setup.mjs';import {builders} from './builders.mjs';
if (process.env.COL_REWARD_OVERLAY) throw Error('Unsigned reward overlays are forbidden');
for(const variant of ['stale_round','foreign_target_run','real_participant','real_party','stale_epoch'])test('bulk isolation atomic reject '+variant,async()=>{
 const {h,db,targets,now,actor}=await setup({bot:true,count:3});try{const ch=h.channels.get(1),build=await builders(h,{bot:true,targets,now,selectedIndex:2});
 if(variant==='stale_round')db.prepare('UPDATE monsters SET spawn_round=2 WHERE id=?').run(targets[1].id);
 if(variant==='foreign_target_run')db.prepare("UPDATE monsters SET loadlab_run_id='different-run' WHERE id=?").run(targets[1].id);
 if(variant==='real_participant')db.prepare('INSERT INTO monster_participants(monster_id,spawn_round,player_id,created_at) VALUES(?,1,?,?)').run(targets[1].id,'real-1',now);
 if(variant==='real_party'){db.prepare("INSERT INTO parties(id,leader_id,created_at) VALUES('mixed',?,?)").run(actor,now);for(const id of [actor,'real-1'])db.prepare("INSERT INTO party_members(player_id,party_id,joined_at) VALUES(?,'mixed',?)").run(id,now);}
 if(variant==='stale_epoch')db.prepare('UPDATE channel_owners SET epoch=epoch+1 WHERE player_id=?').run(actor);
 const tables=['players','monsters','monster_participants','normal_defeats','monster_xp_claims','normal_reward_claims','world_drops'];const before=Object.fromEntries(tables.map(table=>[table,db.prepare('SELECT * FROM '+table+' ORDER BY 1').all()]));
 const statements=build.plans.flatMap(p=>p.hitStatements).map(f=>{const s=ch.prepare(f.sql).bind(...f.params);if(f.loadlabReward)s.loadlabReward=f.loadlabReward;return s;});
 await assert.rejects(ch.runPlayer(actor,()=>ch.guardedBatch(ch.prepare('SELECT id FROM players WHERE id=?').bind(actor),statements)));
 for(const table of tables)assert.deepEqual(db.prepare('SELECT * FROM '+table+' ORDER BY 1').all(),before[table],'atomic rollback '+table);
 }finally{await h.close();}
});
