import {randomUUID} from 'node:crypto';
import {demand} from './contract.mjs';

// Parent-only, after ingress and native scheduled jobs have stopped. Keep all
// owners alive through every accepted shared/party operation and final fsync.
// No actor data is copied or reset here; snapshots prove the CURRENT DB point.
export async function drainProcesses(supervisor){
 const c=supervisor.core,world=c.sharedWorld,token=randomUUID(),cycle=c.writer.worldState.current.world.cycle,rows=[...supervisor.rows.values()];
 demand(rows.every(row=>row.state==='running'&&!row.exited),'shutdown_owner_unavailable');
 const channels=rows.map(row=>({row,...c.process(row.peer)}));
 await Promise.all(channels.map(async entry=>{entry.ack=await entry.control.request('prepare_stop',{token,cycle});}));
 if(world){await world.combat.idle();const owner=world.row;demand(owner?.state==='running'&&!owner.exited,'shutdown_world_unavailable');
  const ack=await owner.control.request('quiesce_process',{});demand(ack?.drained===true&&world.row===owner&&!owner.exited&&c.writer.system.owner('world').sequence===ack.sequence,'shutdown_world_drain_mismatch');
 }
 // A guild terminal return can change frozen channel membership. Read its
 // final owner/epoch/sequence only AFTER all shared handoffs and world drain.
 await Promise.all(channels.map(async entry=>{entry.ack=await entry.control.request('global_snapshot',{token});}));
 const sql=c.database.sqlite;
 for(const {row,peer,ack}of channels){
  demand(ack.token===token&&ack.cycle===cycle&&ack.channel===peer.channel&&ack.incarnation===peer.incarnation&&!row.exited&&c.process(peer).online,'shutdown_channel_drain_mismatch');
  const expected=sql.prepare(`SELECT o.player_id AS id,o.epoch,o.sequence FROM kernel511_channel_owners o WHERE o.channel=? AND o.incarnation=? AND o.state='active' AND (EXISTS(SELECT 1 FROM kernel511_admissions a WHERE a.player_id=o.player_id AND a.epoch=o.epoch) OR EXISTS(SELECT 1 FROM kernel511_simulations s WHERE s.player_id=o.player_id AND s.epoch=o.epoch)) ORDER BY o.player_id`).all(peer.channel,peer.incarnation),actual=[...ack.actors].sort((a,b)=>a.id===b.id?0:a.id<b.id?-1:1);
  demand(expected.length===actual.length&&expected.every((p,i)=>p.id===actual[i].id&&p.epoch===actual[i].epoch&&p.sequence===actual[i].sequence),'shutdown_actor_drain_mismatch');
  demand(c.writer.system.owner('channel:'+peer.channel)?.sequence===ack.systemSequence,'shutdown_system_drain_mismatch');
 }
 await Promise.all(channels.map(async({row,peer,control})=>{const ack=await control.request('quiesce_process',{token});demand(ack?.drained===true&&ack.token===token&&!row.exited&&c.process(peer).online,'shutdown_stop_ack');row.drained=token;}));
 return {drained:true,token,cycle,channels:channels.map(({peer,ack})=>({channel:peer.channel,incarnation:peer.incarnation,actors:ack.actors.length,systemSequence:ack.systemSequence}))};
}
