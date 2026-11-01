import {residentCapacityR59,channelAdmissionR59,castleResumeR59} from './castle-capacity-r59.mjs';
import {demand} from './contract.mjs';
import {presenceStaleSkip} from './r47-options.mjs';

// Authenticated WS pong/input updates only memory. They neither call the
// writer nor execute SQL. The service batches these stamps on its existing
// trusted IPC connection. Client payloads cannot supply a timestamp or epoch.
export class ResidentPresence {
 constructor({owner,player,setPlayer,clock=Date.now,onSeen=()=>{}}){Object.assign(this,{owner,player,setPlayer,clock,onSeen});this.rows=new Map();this.serial=0;}
 seen(identity){
  const owner=this.owner(identity.actor);demand(owner&&owner.epoch===identity.epoch&&owner.passive!==1,'presence_owner_fenced');
  const previous=this.rows.get(identity.actor),at=Math.max(previous?.at??0,this.clock());
  const row={actor:identity.actor,epoch:owner.epoch,at,version:++this.serial};this.rows.set(row.actor,row);
  if(presenceStaleSkip&&typeof identity.session==='string')row.session=identity.session;
  const p=this.player(row.actor),seconds=Math.floor(at/1000);if(p&&p.last_seen<seconds)this.setPlayer({...p,last_seen:seconds});
  this.onSeen(row.actor,at);return row;
 }
 merge(player,epoch){const row=this.rows.get(player.id);return row?.epoch===epoch&&Math.floor(row.at/1000)>player.last_seen?{...player,last_seen:Math.floor(row.at/1000)}:player;}
 batch(){return [...this.rows.values()].map(({actor,epoch,at,version,session})=>({actor,epoch,at,version,...(presenceStaleSkip&&typeof session==='string'?{session}:{})}));}
 forget(id){this.rows.delete(id);}
}

// Main process mirror. SQL materialization happens only inside an ALREADY
// REQUIRED game transaction, before original native online-eligibility SQL.
// No heartbeat transaction/receipt is created. Failed COMMIT retains dirty
// stamps; an old ACK cannot retire a newer ping or ownership incarnation.
export class WriterPresence {
 constructor(authority,{clock=Date.now}={}){Object.assign(this,{authority,clock});this.rows=new Map();this.serial=0;this.statement=null;}
 receive(peer,rows){
  demand(Array.isArray(rows)&&rows.length<=residentCapacityR59(peer.channel),'presence_batch_size');
  const accepted=[];
  for(const row of rows){
   demand(row&&typeof row.actor==='string'&&Number.isSafeInteger(row.epoch)&&Number.isSafeInteger(row.at)&&row.at>=0&&row.at<=this.clock()+5000,'presence_stamp');
   // This lookup is supplied by the supervisor's committed ownership mirror;
   // never consult SQLite on the heartbeat path.
   const owner=this.authority.presenceOwner(row.actor);
   demand(owner&&owner.epoch===row.epoch&&owner.channel===peer.channel&&owner.incarnation===peer.incarnation&&owner.admitted===true,'presence_owner_fenced');
   const old=this.rows.get(row.actor);if(old&&old.epoch===row.epoch&&old.incarnation===peer.incarnation&&old.at>=row.at)continue;
   accepted.push({...row,channel:peer.channel,incarnation:peer.incarnation,version:++this.serial});
  }
  for(const row of accepted)this.rows.set(row.actor,row);
 }
 materialize(sql){
  demand(sql.isTransaction,'presence_requires_game_transaction');
  // The committed-owner mirror advances only after WAL fsync. An unrelated
  // transaction can run while a transfer COMMIT is already visible in SQL
  // and its mirror still names the old active epoch. Never let that optional
  // liveness stamp mutate the new owner or abort another player's command.
  // Match the CURRENT owner, admission and live process inside this transaction.
  // Actual command/epoch assertions elsewhere remain unchanged and fail closed.
  this.statement??=sql.prepare(`UPDATE players SET last_seen=MAX(last_seen,?) WHERE id=? AND EXISTS(
   SELECT 1 FROM kernel511_channel_owners o
   JOIN kernel511_admissions a ON a.player_id=o.player_id AND a.channel=o.channel AND a.epoch=o.epoch
   JOIN kernel511_channel_processes p ON p.channel=o.channel AND p.incarnation=o.incarnation AND p.online=1
   WHERE o.player_id=players.id AND o.state='active' AND o.channel=? AND o.incarnation=? AND o.epoch=?)`);
  const written=[];
  for(const row of this.rows.values()){
   const owner=this.authority.presenceOwner(row.actor);
   if(!owner||!owner.admitted||owner.epoch!==row.epoch||owner.channel!==row.channel||owner.incarnation!==row.incarnation)continue;
   if(!this.statement.run(Math.floor(row.at/1000),row.actor,row.channel,row.incarnation,row.epoch).changes)continue;
   this.authority.assertAdmitted(sql,{channel:row.channel,incarnation:row.incarnation},row.actor,row.epoch);written.push(row);
  }
  return written;
 }
 acknowledged(written){for(const row of written)if(this.rows.get(row.actor)===row)this.rows.delete(row.actor);}
 forget(id){this.rows.delete(id);}
}

// last_seen is authenticated liveness, not a gear/HP/position revision. The
// writer may have received a newer pong than an immutable combat frame. All
// other frame columns retain the original exact comparison and native guards.
export function stablePresenceFrame(row){if(!row)return row;const {last_seen,...stable}=row;return stable;}
