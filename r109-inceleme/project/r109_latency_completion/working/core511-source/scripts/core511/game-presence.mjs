import {demand} from './contract.mjs';

// Cold HTTP authorization can reuse an authenticated live WS presence while
// still doing the ORIGINAL session/account/CSRF/realm/bot checks. It cannot
// resurrect a deleted/replaced game_presence row or a retired owner epoch.
export class GamePresenceBridge {
 constructor({owner,security,clock=Date.now,leaseMs=40000}){demand(typeof owner==='function'&&typeof security==='function'&&leaseMs===40000,'presence_bridge_dependencies');Object.assign(this,{owner,security,clock,leaseMs});this.entries=new Map();}
 admit(session,owner){
  const presence=session.gamePresence;
  demand(session.player?.id&&session.account?.id&&owner.player_id===session.player.id&&presence?.instanceId&&presence.tokenHash===session.tokenHash&&presence.expiresAtMs>this.clock(),'presence_bridge_admission');
  const entry={actor:session.player.id,account:session.account.id,session:session.tokenHash,instanceId:presence.instanceId,chatAfterId:presence.chatAfterId,epoch:owner.epoch,channel:owner.channel,incarnation:owner.incarnation,securityVersion:session.securityVersion,connected:false,lastAt:0};
  this.entries.set(entry.actor,entry);return entry;
 }
 matches(peer,identity){
  const e=this.entries.get(identity.actor),owner=this.owner(identity.actor);
  return Boolean(e&&owner?.admitted===true&&owner.state==='active'&&owner.epoch===e.epoch&&e.epoch===identity.epoch&&e.account===identity.account&&e.session===identity.session&&owner.channel===peer.channel&&owner.incarnation===peer.incarnation&&e.channel===peer.channel&&e.incarnation===peer.incarnation);
 }
 seen(peer,identity,at=this.clock()){
  const e=this.entries.get(identity.actor),owner=this.owner(identity.actor);
  demand(e&&owner?.admitted===true&&owner.state==='active'&&owner.epoch===e.epoch&&e.epoch===identity.epoch&&e.account===identity.account&&e.session===identity.session&&owner.channel===peer.channel&&owner.incarnation===peer.incarnation&&e.channel===peer.channel&&e.incarnation===peer.incarnation,'presence_bridge_fenced');
  demand(Number.isSafeInteger(at)&&at<=this.clock()+5000,'presence_bridge_time');if(at<e.lastAt)return false;
  demand(this.security(e)===true,'presence_bridge_security');e.connected=true;e.lastAt=at;return true;
 }
 augment(session){
  const e=this.entries.get(session.player?.id),p=session.gamePresence,owner=e&&this.owner(e.actor),now=this.clock();
  if(!e||!p||e.lastAt===0||now<e.lastAt||now-e.lastAt>=this.leaseMs||session.account.id!==e.account||session.tokenHash!==e.session||session.securityVersion!==e.securityVersion||p.instanceId!==e.instanceId||p.tokenHash!==e.session||!owner?.admitted||owner.epoch!==e.epoch||owner.channel!==e.channel||owner.incarnation!==e.incarnation||owner.state!=='active'||this.security(e)!==true)return session;
  return {...session,gamePresence:{...p,expiresAtMs:Math.max(p.expiresAtMs,e.lastAt+this.leaseMs)}};
 }
 disconnect(peer,identity){const e=this.entries.get(identity.actor);if(e&&e.epoch===identity.epoch&&e.session===identity.session&&e.channel===peer.channel&&e.incarnation===peer.incarnation)e.connected=false;}
 revoke({actor,account,session}){for(const [id,e]of this.entries)if(actor===id||account===e.account||session===e.session)this.entries.delete(id);}
}
