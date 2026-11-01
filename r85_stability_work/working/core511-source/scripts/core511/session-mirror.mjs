import {demand} from './contract.mjs';

// Only the trusted main-process control stream may install these snapshots.
// They carry the original security gate's absolute expiry, never a TTL renewed
// by a pong. Channel ticks/inputs only consult Maps and the local clock.
export class SessionMirror {
 constructor({peer,owner,player,guildAccess=null,maintenance=null,clock=Date.now,revoke=()=>{},botChallenge=null}){Object.assign(this,{peer,owner,player,guildAccess,maintenance,clock,revoke,botChallenge});this.entries=new Map();this.revisions=new Map();}
 update(snapshot){
  const {actor,account,session,epoch,revision}=snapshot;
  demand(typeof actor==='string'&&typeof account==='string'&&typeof session==='string'&&Number.isSafeInteger(epoch)&&epoch>0&&Number.isSafeInteger(revision)&&revision>0,'session_mirror_identity');
  demand(snapshot.channel===this.peer.channel&&snapshot.incarnation===this.peer.incarnation,'session_mirror_channel');
  const old=this.revisions.get(actor)??0;demand(revision>old,'session_mirror_stale');
  for(const key of ['securityVersion','accountVersion','sessionExpiresMs','securityValidUntil','botDueMs'])demand(Number.isSafeInteger(snapshot[key])&&snapshot[key]>=0,'session_mirror_deadline');
  for(const key of ['blocked','canPlay','maintenanceAllowed','realmOpen'])demand(typeof snapshot[key]==='boolean','session_mirror_policy');
  demand(snapshot.guildDeadlineMs===null||Number.isSafeInteger(snapshot.guildDeadlineMs),'session_mirror_guild');
  this.revisions.set(actor,revision);this.entries.set(actor,Object.freeze({...snapshot}));
  this.observe({actor,account,session,epoch,securityVersion:snapshot.securityVersion});
 }
 check(identity){
  const e=this.entries.get(identity.actor),owner=this.owner(identity.actor),now=this.clock();
  if(!e||!owner||owner.passive===1||owner.epoch!==identity.epoch||e.epoch!==identity.epoch||e.account!==identity.account||e.session!==identity.session||owner.channel!==this.peer.channel||owner.incarnation!==this.peer.incarnation)return {status:401,code:'session_epoch_fenced'};
  if(e.blocked||e.securityVersion!==identity.securityVersion||e.accountVersion!==identity.securityVersion)return {status:423,code:'account_suspended'};
  if(now>=e.sessionExpiresMs||now>=e.securityValidUntil)return {status:401,code:'security_verification_required'};
  if(!e.realmOpen)return {status:503,code:'realm_closed'};
  if(!e.maintenanceAllowed||!e.canPlay||this.maintenance&&!this.maintenance.allows(e.account))return {status:403,code:'game_maintenance'};
  const player=this.player(identity.actor);if(!player)return {status:409,code:'player_unavailable'};
  // This is exactly the native AFK-only exemption. Leaving the island uses
  // the original absolute due time; pings can never extend a captcha deadline.
  if(player.area!=='afk'&&now>=e.botDueMs)return {status:403,code:'bot_check_required'};
  if(player.area.startsWith('guild_')){
   // Inventory/area reloads carry the original service's absolute deadline.
   // A hall grant cannot follow the player to a different hall, nor expire
   // their later public-village access. Pongs never extend this snapshot.
   const access=this.guildAccess?.(identity.actor);
   if(this.guildAccess&&access?.area!==player.area)return {status:409,code:'guild_access_expired'};
   const deadline=this.guildAccess?access.deadlineMs:e.guildDeadlineMs;
   if(deadline!==null&&now>=deadline)return {status:409,code:'guild_access_expired'};
  }
  return true;
 }
 observe(identity){
  const result=this.check(identity),entry=this.entries.get(identity.actor);
  if(this.botChallenge&&(result===true||result?.code==='bot_check_required'))this.botChallenge({actor:identity.actor,epoch:identity.epoch,revision:entry.revision,required:result!==true});
  else if(result!==true)this.revoke({actor:identity.actor});
  return result;
 }
 sweep(){for(const e of this.entries.values())this.observe(e);}
 retire(actor,revision){demand(Number.isSafeInteger(revision)&&revision>(this.revisions.get(actor)??0),'session_mirror_stale');this.revisions.set(actor,revision);this.entries.delete(actor);this.revoke({actor});}
}

// Admission/refresh is a cold path after native requireGameSession/CSRF and
// ownership checks. It never interprets a client-provided ban, due time or GM
// flag. All values are taken from the existing authenticated native services.
export function readSessionMirror({sql,session,owner,revision,realm,bot,launch,guild,clock=Date.now}){
 const player=sql.prepare('SELECT id,account_id,area,channel FROM players WHERE id=?').get(session.player.id);
 const account=sql.prepare('SELECT security_version,permanently_banned,suspended_until_ms FROM accounts WHERE id=?').get(session.account.id);
 demand(player&&account&&player.account_id===session.account.id&&owner.player_id===player.id&&owner.channel===player.channel,'session_mirror_scope');
 const central=realm?.security?.entries.get(session.account.id),now=clock(),securityValidUntil=realm?.role==='game'?central?.validUntil:Math.min(session.expiresAt*1000,now+30000);
 demand(Number.isSafeInteger(securityValidUntil),'session_mirror_security_missing');
 const canPlay=realm?.role==='game'?realm.security.allows(session.account.id,session.securityVersion):launch.status(session.account.id).canPlay;
 const due=bot.deadline(session.account.id),guildDeadline=player.area.startsWith('guild_')?guild.deadline(player.id,player.area):Infinity;
 // Store actual persisted due, not the AFK helper's moving display deadline.
 const botDue=sql.prepare('SELECT due_ms FROM bot_due WHERE account_id=?').get(session.account.id)?.due_ms;demand(Number.isSafeInteger(botDue)&&Number.isFinite(due),'session_mirror_bot_unprepared');
 return {actor:player.id,account:session.account.id,session:session.tokenHash,epoch:owner.epoch,revision,channel:owner.channel,incarnation:owner.incarnation,securityVersion:session.securityVersion,accountVersion:account.security_version,sessionExpiresMs:session.expiresAt*1000,securityValidUntil,botDueMs:botDue,blocked:Boolean(account.permanently_banned||account.suspended_until_ms>now||central?.blocked),canPlay:Boolean(canPlay),maintenanceAllowed:realm?.maintenance?realm.maintenance.allows(session.account.id):true,realmOpen:realm?.role==='game'?realm.realm.status==='open'&&realm.policy?.status==='open':true,guildDeadlineMs:Number.isFinite(guildDeadline)?guildDeadline:null};
}
