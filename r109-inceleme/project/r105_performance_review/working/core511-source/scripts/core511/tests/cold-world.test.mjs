import test from 'node:test';
import assert from 'node:assert/strict';
import {setupPvp,put,update} from './pvp-fixture.mjs';
import {ChannelOwnership} from '../ownership.mjs';
import {ReadWorker} from '../read-worker.mjs';

test('owned cold world and all four boot snapshots run in the read-only worker with native private/public projections',async t=>{
 const f=await setupPvp(t),{sql,id,nowMs,targetId}=f;f.reset({area:'forest'});
 const database=f.f.database,authority=new ChannelOwnership(database,{realmId:'cold-read-native'});await authority.initialize();
 for(const channel of [1,2,3,4])await authority.registerProcess(channel,'boot-'+channel);
 const peer={channel:1,incarnation:'boot-1'},owner=await authority.admit(id,peer,{sessionId:'cold-read-session',guard:()=>true});
 update(sql,'players',targetId,{is_gm:1,gm_invisible:1});
 put(sql,'player_items',{id:'private-item-511',player_id:id,kind:'weapon',item_name:'Private test sword',rarity:'white',power:10,role:'avci',enchantments:'[]',equipped:0,created_at:1});
 const worker=new ReadWorker(f.f.file,new Map(),{actorBundles:true});t.after(()=>worker.close());
 const access={account:sql.prepare('SELECT account_id FROM players WHERE id=?').get(id).account_id,chatAfterId:0,starterReward:{claimed:true,fixtureReceipt:'already-committed'}};
 const params=[id,1,peer.incarnation,owner.epoch,1,nowMs,access];
 // Simultaneous requests cannot interleave async native friend reads between
 // BEGIN/COMMIT and accidentally share a different actor's transaction.
 const [first,second,...boots]=await Promise.all([worker.query('kernel511_actor_world',params),worker.query('kernel511_actor_world',params),...[1,2,3,4].map(ch=>worker.query('kernel511_channel_boot',[ch,'boot-'+ch,1,nowMs]))]);
 assert.deepEqual(first.rows,second.rows);const bundle=first.rows,data=bundle.projection.data;
 assert.equal(data.channel,1);assert.equal(data.area,'forest');assert(data.players.some(p=>p.id===id));assert(!data.players.some(p=>p.id===targetId));
 assert.equal(data.inventory.find(i=>i.id==='private-item-511').item_name,'Private test sword');assert.deepEqual(data.starterReward,access.starterReward);assert.equal(data.ownerOnly,false);assert.equal(data.partial,false);
 for(const p of data.players){assert.equal(p.account_id,undefined);assert.equal(p.password_hash,undefined);if(p.id!==id)assert.equal(p.rank?.unlocked,undefined);}
 assert(Array.isArray(bundle.projection.friends));assert(Array.isArray(data.friendRequests.incoming));assert(Array.isArray(data.combatEvents));assert.equal(data.snapshotAtMs,nowMs);
 for(let i=0;i<boots.length;i++){const boot=boots[i].rows;assert(boot.monsters.every(m=>m.channel===0||m.channel===i+1));assert.equal(boot.config.revision,1);assert.equal(boot.world.cycle,bundle.world.cycle);}
 await assert.rejects(worker.query('kernel511_actor_world',[...params.slice(0,6),{...access,account:'different-account'}]),{code:'actor_world_owner_fenced'});
 await assert.rejects(worker.query('kernel511_actor_world',[id,2,'boot-2',owner.epoch,1,nowMs,access]),{code:'actor_bundle_owner_fenced'});
 assert.equal((await worker.query('kernel511_actor_world',params)).rows.player.id,id,'failed reads roll back before the next request');
});
