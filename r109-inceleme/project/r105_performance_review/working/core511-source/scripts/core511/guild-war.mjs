import {residentCapacityR59} from './castle-capacity-r59.mjs';
import {GUILD_WAR_TIMEOUT_SQL,GUILD_WAR_DUE_SQL,GUILD_WAR_FINISH_SQL} from './generated/guild-war-rules.mjs';
import {demand} from './contract.mjs';

export function ensureGuildWarReturns(sql){sql.exec(GUILD_WAR_FINISH_SQL);}
export function guildWarDue(sql,nowMs){demand(Number.isSafeInteger(nowMs)&&nowMs>=0,'guild_clock_time');return Boolean(sql.prepare(GUILD_WAR_DUE_SQL).get(nowMs));}

// Called inside the sole world transaction AFTER every resident has drained.
// A native trigger may return active players to another public channel. Their
// ownership/admission epoch changes in the same COMMIT as the native result.
export function finishGuildWars(sql,nowMs,{authority}={}){
 demand(sql.isTransaction,'guild_clock_requires_atomic');
 const before=captureReturnOwners(sql),result=sql.prepare(GUILD_WAR_TIMEOUT_SQL).run(nowMs,nowMs,nowMs);return {finished:Number(result.changes),moves:reconcileReturnOwners(sql,before,nowMs,{authority})};
}
export function captureReturnOwners(sql){demand(sql.isTransaction,'return_snapshot_requires_atomic');return sql.prepare(`SELECT o.*,p.last_seen,a.session_id,s.run_id FROM kernel511_channel_owners o JOIN players p ON p.id=o.player_id LEFT JOIN kernel511_admissions a ON a.player_id=o.player_id LEFT JOIN kernel511_simulations s ON s.player_id=o.player_id WHERE a.player_id IS NOT NULL OR s.player_id IS NOT NULL`).all();}
// The native receipt belongs to the old epoch. Its final source sequence
// update must not leak into an ownership epoch created by the same command.
// This guarded correction is inside the SAME transaction, before COMMIT.
export function finalizeReturnSequence(sql,moves,request,peer){
 demand(sql.isTransaction&&Array.isArray(moves),'return_command_requires_atomic');const move=moves.find(m=>m.id===request.playerId);if(!move)return;
 demand(move.source.epoch===request.epoch&&move.source.channel===peer.channel&&move.source.incarnation===peer.incarnation&&move.target.epoch===request.epoch+1,'return_command_source_fenced');
 const result=sql.prepare('UPDATE kernel511_channel_owners SET sequence=0 WHERE player_id=? AND epoch=? AND channel=? AND incarnation=? AND sequence=?').run(move.id,move.target.epoch,move.target.channel,move.target.incarnation,request.sequence);demand(Number(result.changes)===1,'return_command_target_fenced');
}
export function reconcileReturnOwners(sql,before,nowMs,{authority}){
 demand(sql.isTransaction,'return_reconcile_requires_atomic');const moves=[];
 for(const old of before){
  const player=sql.prepare('SELECT channel,last_seen FROM players WHERE id=?').get(old.player_id),retired=Boolean(old.session_id&&player.last_seen===0&&old.last_seen!==0);
  if(player.channel===old.channel&&!retired)continue;
  demand(authority&&old.state==='active'&&[1,2,3,4].includes(player.channel),'guild_return_owner');
  const target=sql.prepare('SELECT * FROM kernel511_channel_processes WHERE channel=?').get(player.channel);demand(target?.online===1,'guild_return_target_offline');
  authority.assertSimulated(sql,{channel:old.channel,incarnation:old.incarnation},old.player_id,old.epoch);
  sql.prepare("UPDATE kernel511_channel_owners SET channel=?,epoch=epoch+1,incarnation=?,sequence=0,updated_ms=? WHERE player_id=?").run(player.channel,target.incarnation,nowMs,old.player_id);
  if(retired)sql.prepare('DELETE FROM kernel511_admissions WHERE player_id=?').run(old.player_id);
  else sql.prepare('UPDATE kernel511_admissions SET channel=?,epoch=? WHERE player_id=?').run(player.channel,old.epoch+1,old.player_id);
  sql.prepare('UPDATE kernel511_simulations SET channel=?,epoch=? WHERE player_id=?').run(player.channel,old.epoch+1,old.player_id);
  moves.push({id:old.player_id,source:{channel:old.channel,incarnation:old.incarnation,epoch:old.epoch},target:{channel:player.channel,incarnation:target.incarnation,epoch:old.epoch+1},passive:!old.session_id,retired});
 }
 const counts=sql.prepare('SELECT channel,COUNT(*) n FROM kernel511_admissions GROUP BY channel').all();demand(counts.every(r=>r.n<=residentCapacityR59(r.channel)),'guild_return_capacity');
 return moves;
}
