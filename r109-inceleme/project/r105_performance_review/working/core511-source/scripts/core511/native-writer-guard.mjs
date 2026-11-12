import {prepareServerStatement} from './server-statements.mjs';
import {demand} from './contract.mjs';

// Native HTTP authenticates the account/Origin/CSRF/instance/realm; the channel
// SessionMirror checks native absolute permissions before accepting each input.
// This final writer guard binds that trusted stream to CURRENT ownership and
// the main process's verified identity. It never accepts identity from payload.
// A later expiry/revoke cannot discard an already accepted checkpoint or hit
// while the original owner is draining. No deadline is extended here.
export function createNativeWriterGuard(getCore){
 demand(typeof getCore==='function','native_writer_core_provider');
 return (sql,payload,context,kind)=>{
  const c=getCore();demand(c&&!c.closed&&c.database.sqlite===sql&&sql.isTransaction&&context.realm===c.realmId&&(context.peer.realm??c.realmId)===c.realmId,'native_writer_host_binding');
  const a=c.authority,definition=a.operations[kind];demand(definition,'native_writer_operation');
  const owner=(definition.allowSimulation?a.assertSimulated:a.assertAdmitted).call(a,sql,context.peer,context.actor,context.epoch,{allowDraining:definition.duringDrain===true});
  const player=prepareServerStatement(sql,'SELECT id,account_id,channel FROM players WHERE id=?').get(context.actor),admission=a.admission(context.actor,sql);
  demand(player?.id===context.actor&&player.channel===owner.channel,'native_writer_player_binding');
  if(admission){
   const s=c.sessions.get(context.actor),i=s?.identity,session=s?.session,security=s?.security;
   demand(i&&session&&security&&i.realm===c.realmId&&i.actor===context.actor&&i.account===player.account_id&&i.channel===owner.channel&&i.boot===owner.incarnation&&i.epoch===owner.epoch&&i.session===admission.session_id,'native_writer_session_binding');
   demand(session.player?.id===i.actor&&session.account?.id===i.account&&session.tokenHash===i.session&&session.securityVersion===i.securityVersion&&security.actor===i.actor&&security.account===i.account&&security.session===i.session&&security.securityVersion===i.securityVersion&&security.epoch===i.epoch&&security.channel===i.channel&&security.incarnation===i.boot,'native_writer_verified_identity');
  }else{
   const simulation=a.simulation(context.actor,sql);
   demand(simulation&&['actor_checkpoint','combat_checkpoint','dungeon'].includes(kind),'native_writer_passive_operation');
   if(kind==='dungeon')demand(['tick','checkpoint'].includes(payload.operation?.kind)&&payload.operation.runId===simulation.run_id,'native_writer_passive_input');
  }
  return true;
 };
}
