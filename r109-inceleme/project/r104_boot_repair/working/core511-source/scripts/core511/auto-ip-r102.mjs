import {isIP} from 'node:net';
import {createHmac,randomBytes,randomUUID} from 'node:crypto';

export const AUTO_IP_PATH_R102='/internal/auto-ip';
export const AUTO_IP_TTL_R102=30000;
export const autoIpUnavailableR102=()=>({ok:false,status:503,code:'auto_ip_unavailable_r102',error:'Oto atak kontrolü şu anda hazır değil. Birkaç saniye sonra yeniden dene.'});
const busy=()=>({ok:false,status:409,code:'auto_ip_busy_r102',error:'Bu IP adresinde başka bir oto atak açık. Önce onu durdurmalısın.'});
const validId=s=>typeof s==='string'&&s.length>0&&s.length<=160&&!/[\x00-\x1f]/.test(s);
export function canonicalAutoIpR102(value){
 if(typeof value!=='string'||value.length>64||value.includes('%'))return null;
 const family=isIP(value);if(family===4)return '4:'+value;if(family!==6)return null;
 const host=new URL('http://['+value+']/').hostname.slice(1,-1).toLowerCase();
 const mapped=/^::ffff:([a-f0-9]{1,4}):([a-f0-9]{1,4})$/.exec(host);
 if(mapped){const n=parseInt(mapped[1],16),m=parseInt(mapped[2],16);return '4:'+[(n>>>8)&255,n&255,(m>>>8)&255,m&255].join('.');}
 return '6:'+host;
}

// Accounts is the single authority for BOTH realms and every channel. Leases
// are transient, not a new player-data table. After authority restart, wait out
// the maximum former lease before admitting anyone; a restart cannot double it.
export class AutoIpAuthorityR102{
 constructor({now=Date.now,maxEntries=8192}={}){this.now=now;this.readyAt=now()+AUTO_IP_TTL_R102;this.rows=new Map();this.maxEntries=maxEntries;this.salt=randomBytes(32);this.cursor=null;}
 handle(realmId,data){
  const now=this.now(),{action,accountId,playerId,mode}=data??{};
  if(!['r1','r2'].includes(realmId)||!validId(accountId)||!validId(playerId)||!['world','island'].includes(mode)||!['claim','release'].includes(action))return autoIpUnavailableR102();
  const owner=JSON.stringify([realmId,accountId,playerId,mode]);
  this.cursor??=this.rows.entries();for(let i=0;i<64;i++){const e=this.cursor.next();if(e.done){this.cursor=null;break;}if(e.value[1].expiresAt<=now)this.rows.delete(e.value[0]);}
  if(action==='release'){
   const old=this.rows.get(data.key);
   if(old?.owner===owner&&old.token===data.token)this.rows.delete(data.key);
   return {ok:true};
  }
  const ip=canonicalAutoIpR102(data.ip);if(!ip||now<this.readyAt)return autoIpUnavailableR102();
  const key=createHmac('sha256',this.salt).update(ip).digest('hex'),old=this.rows.get(key);
  if(old&&old.expiresAt>now&&old.owner!==owner)return busy();
  if(!old&&this.rows.size>=this.maxEntries)return autoIpUnavailableR102();
  const token=randomUUID(),expiresAt=now+AUTO_IP_TTL_R102;this.rows.set(key,{owner,token,expiresAt});
  return {ok:true,key,token,expiresAt,realmId,accountId,playerId,mode};
 }
}

// Each game process calls the signed accounts boundary. Browser-provided IPs,
// owner IDs, durations and grants are never forwarded here.
export class AutoIpClientR102{
 constructor(core){this.core=core;this.last=new Map();}
 async prepare({playerId,accountId,securityVersion,mode,action,ip}){
  const key=playerId+':'+mode;
  if(action==='stop')return {...(this.last.get(key)??{}),stop:true,playerId,accountId,mode};
  if(!canonicalAutoIpR102(ip))return autoIpUnavailableR102();
  try{
   const r=await this.core.realm.call(AUTO_IP_PATH_R102,{action:'claim',accountId,playerId,securityVersion,mode,ip});
   if(!r?.ok)return r?.code==='auto_ip_busy_r102'?busy():autoIpUnavailableR102();
   if(r.realmId!==this.core.realmId||r.playerId!==playerId||r.accountId!==accountId||r.mode!==mode||!Number.isSafeInteger(r.expiresAt)||r.expiresAt>Date.now()+AUTO_IP_TTL_R102+1000||r.expiresAt<=Date.now()+17000)return autoIpUnavailableR102();
   for(const[k,v]of this.last)if(v.expiresAt<=Date.now())this.last.delete(k);
   this.last.set(key,r);return r;
  }catch{return autoIpUnavailableR102();}
 }
 async socket(peer,input){
  const c=this.core,s=c.sessions.get(input.actor),id=s?.identity,lease=c.budget.leases.get(input.lease);
  if(!id||id.channel!==peer.channel||id.boot!==peer.incarnation||!c.securityCurrent(id.actor,id.epoch)||!lease?.active||lease.boot!==peer.incarnation)return autoIpUnavailableR102();
  if(!['auto_start_r102','auto_tick_r102','auto_stop_r102'].includes(input.action))return autoIpUnavailableR102();
  return this.prepare({playerId:id.actor,accountId:id.account,securityVersion:s.security.securityVersion,mode:'world',action:input.action==='auto_stop_r102'?'stop':'claim',ip:lease.ip});
 }
 async complete(grant){
  if(!grant?.ok||!grant.token)return;
  const sql=this.core.database.sqlite;
  const active=grant.mode==='world'?sql.prepare('SELECT 1 FROM content_auto_r102 WHERE account_id=? AND active_player=? AND lease_until_ms>?').get(grant.accountId,grant.playerId,Date.now()):sql.prepare('SELECT 1 FROM afk_hunt_state WHERE player_id=? AND active=1 AND tick_at_ms>?').get(grant.playerId,Date.now()-15000);
  if(active)return;
  // A delayed stop cannot release a newer renewal; accounts checks the exact
  // generation token. On ambiguous failures leave the short lease to expire.
  try{await this.core.realm.call(AUTO_IP_PATH_R102,{action:'release',accountId:grant.accountId,playerId:grant.playerId,mode:grant.mode,key:grant.key,token:grant.token});}catch{}
  const key=grant.playerId+':'+grant.mode;if(this.last.get(key)?.token===grant.token)this.last.delete(key);
 }
}

export function requireAutoIpGrantR102(grant,{playerId,accountId,mode='world',now=Date.now(),duration=12000}){
 if(!grant?.ok||grant.playerId!==playerId||grant.accountId!==accountId||grant.mode!==mode||!Number.isSafeInteger(grant.expiresAt)||grant.expiresAt<now+duration+1000){
  const r=grant?.code==='auto_ip_busy_r102'?busy():autoIpUnavailableR102();
  throw Object.assign(Error(r.error),{status:r.status,gameCode:r.code,contentRuleR102:true});
 }
}
