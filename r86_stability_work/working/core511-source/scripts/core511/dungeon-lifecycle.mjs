import {createEmptyDungeonTick} from './dungeon-runtime.mjs';
import {demand} from './contract.mjs';
import {recordDungeonFinalization} from './dungeon-finalizations.mjs';

const emptyRooms=`SELECT r.id,r.state,r.updated_at FROM dungeon_runs r WHERE json_valid(r.state)
 AND (r.status IN ('active','portal','wipe') OR (r.status='complete' AND json_extract(r.state,'$.deadline')<=?))
 AND NOT EXISTS(SELECT 1 FROM kernel511_dungeon_finalizations f WHERE f.run_id=r.id AND f.updated_at=r.updated_at)
 AND NOT EXISTS(SELECT 1 FROM dungeon_members m WHERE m.run_id=r.id) AND json_valid(r.state)
 AND json_array_length(r.state,'$.members') BETWEEN 1 AND 25
 AND NOT EXISTS(SELECT 1 FROM json_each(r.state,'$.members') m WHERE COALESCE(json_extract(m.value,'$.left'),0)<>1)
 ORDER BY r.id LIMIT 8`;
const retiredSimulations=`SELECT s.player_id FROM kernel511_simulations s WHERE NOT EXISTS(SELECT 1 FROM dungeon_members m WHERE m.player_id=s.player_id) ORDER BY s.player_id LIMIT 100`;
export function dungeonLifecycleDue(sql,nowMs=Date.now()){return Boolean(sql.prepare(retiredSimulations).get()||sql.prepare(emptyRooms).get(nowMs));}

export function createDungeonLifecycle({services,authority}){
 const tick=createEmptyDungeonTick(services.dungeonOptions());
 return (sql,payload,context)=>{
  demand(sql.isTransaction&&context.peer.channel===0&&context.peer.role==='world'&&authority,'dungeon_lifecycle_owner');
  const finished=[],notices=[];for(const row of sql.prepare(emptyRooms).all(payload.nowMs)){const result=tick(sql,row,payload);recordDungeonFinalization(sql,row.id);finished.push(result.finished);notices.push(...result.notices);}
  const moves=[];for(const {player_id:id}of sql.prepare(retiredSimulations).all()){
   const owner=authority.owner(id,sql),simulation=authority.simulation(id,sql);demand(owner?.state==='active'&&!authority.admission(id,sql)&&simulation?.epoch===owner.epoch,'dungeon_retire_owner');authority.assertSimulated(sql,{channel:owner.channel,incarnation:owner.incarnation},id,owner.epoch);
   sql.prepare('DELETE FROM kernel511_simulations WHERE player_id=? AND epoch=?').run(id,owner.epoch);
   sql.prepare('UPDATE kernel511_channel_owners SET epoch=epoch+1,sequence=0,updated_ms=? WHERE player_id=? AND epoch=?').run(payload.nowMs,id,owner.epoch);
   moves.push({id,source:{channel:owner.channel,incarnation:owner.incarnation,epoch:owner.epoch},target:{channel:owner.channel,incarnation:owner.incarnation,epoch:owner.epoch+1},passive:true,retired:true});
  }
  return {finished,notices,at:payload.nowMs,moves};
 };
}
