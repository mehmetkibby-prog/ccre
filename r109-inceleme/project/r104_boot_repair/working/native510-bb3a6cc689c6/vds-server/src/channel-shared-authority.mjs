import {randomUUID,createHmac,timingSafeEqual} from 'node:crypto';
import {channelError,jsonBytes,channelNumber,opaqueId} from './channel-protocol.mjs';

// Runs in the shared simulation owner, never in the durable writer. A lease
// cannot time out into a second owner: its source must finish, or the supervisor
// must first fence that source's durable write incarnation.
export class SharedCombatAuthority {
 constructor({incarnation,secret,load,recover,maxPending=128}){
  opaqueId(incarnation);if(typeof secret!=='string'||secret.length<32)throw Error('Shared authority secret required');
  this.incarnation=incarnation;this.secret=secret;this.load=load;this.recover=recover;this.maxPending=maxPending;
  this.active=null;this.queue=[];this.requests=new Map();this.fenced=new Set();this.version=0;this.closed=false;
 }
 acquire(peer,id){
  channelNumber(peer.channel);opaqueId(peer.incarnation);opaqueId(id);
  const key=peer.channel+':'+peer.incarnation+':'+id;
  if(this.closed||this.fenced.has(peer.incarnation))return Promise.reject(channelError('shared_source_fenced'));
  if(this.requests.has(key))return this.requests.get(key).promise;
  if(this.requests.size>=this.maxPending)return Promise.reject(channelError('shared_backpressure'));
  let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});
  const request={peer:{...peer},id,key,promise,resolve,reject};this.requests.set(key,request);this.queue.push(request);void this.advance();return promise;
 }
 async advance(){
  if(this.active||this.closed||this.recovering)return;
  const next=this.queue.shift();if(!next)return;
  // Reserve before the asynchronous checkpoint barrier; no second acquire
  // may seed a snapshot while the first seed is in flight.
  this.active=next;
  try{
   const snapshot=await this.load();
   if(this.active!==next||this.fenced.has(next.peer.incarnation))throw channelError('shared_source_fenced');
   const claims={ownerIncarnation:this.incarnation,channel:next.peer.channel,incarnation:next.peer.incarnation,id:next.id,nonce:randomUUID(),version:this.version};
   next.proof=signSharedLease(this.secret,claims);next.resolve({proof:next.proof,snapshot});
  }catch(error){next.reject(error);if(this.active===next)this.active=null;this.requests.delete(next.key);void this.advance();}
 }
 async finish(peer,{proof,value},publish,afterPublish=()=>{}){
  const claims=verifySharedLease(this.secret,proof),active=this.active;
  if(!active||claims.ownerIncarnation!==this.incarnation||peer.incarnation!==claims.incarnation||peer.channel!==claims.channel||active.proof!==proof)throw channelError('shared_lease_fenced');
  if(active.finishing)throw channelError('shared_finish_pending');
  active.finishing=true;
  // Validation/publication must be atomic in this process. An asynchronous
  // publish could expose half a returned shared state to another snapshot.
  try{const result=publish(value);if(result&&typeof result.then==='function')throw Error('Shared publish must be synchronous');}
  catch(error){active.finishing=false;throw error;}
  await afterPublish(this.version+1);
  this.version++;this.active=null;this.requests.delete(active.key);void this.advance();return {ok:true,version:this.version};
 }
 async fence(peer){
  // Called ONLY from the authenticated supervisor pipe after disconnectProcess
  // has committed. A peer socket timeout alone is not permission to steal HP.
  this.fenced.add(peer.incarnation);
  for(const entry of this.queue.filter(q=>q.peer.incarnation===peer.incarnation)){entry.reject(channelError('shared_source_fenced'));this.requests.delete(entry.key);}
  this.queue=this.queue.filter(q=>q.peer.incarnation!==peer.incarnation);
  const active=this.active;
  if(active?.peer.incarnation===peer.incarnation){
   // A lost kill ACK may already be durable. Reload affected keys before a new
   // lease, preserving the old owner's unrelated pending work in the adapter.
   this.recovering=true;
   try{await this.recover();active.reject(channelError('shared_source_fenced'));this.requests.delete(active.key);if(this.active===active)this.active=null;this.version++;}
   catch(error){this.closed=true;for(const pending of this.requests.values())pending.reject(error);throw error;}
   finally{this.recovering=false;}
   void this.advance();
  }
  return {ok:true};
 }
 close(){this.closed=true;for(const e of this.requests.values())e.reject(channelError('shared_authority_closed'));this.requests.clear();this.queue=[];}
}
export function signSharedLease(secret,claims){const body=Buffer.from(jsonBytes(claims,4096)).toString('base64url');return body+'.'+createHmac('sha256',secret).update(body).digest('base64url');}
export function verifySharedLease(secret,proof){
 if(typeof proof!=='string'||proof.length>8192)throw channelError('invalid_shared_lease');
 const [body,signature,extra]=proof.split('.');if(extra||!body||!signature)throw channelError('invalid_shared_lease');
 const expected=createHmac('sha256',secret).update(body).digest(),actual=Buffer.from(signature,'base64url');
 if(actual.length!==expected.length||!timingSafeEqual(actual,expected))throw channelError('invalid_shared_lease');
 let claims;try{claims=JSON.parse(Buffer.from(body,'base64url'));channelNumber(claims.channel);opaqueId(claims.incarnation);opaqueId(claims.ownerIncarnation);opaqueId(claims.id);opaqueId(claims.nonce);if(!Number.isSafeInteger(claims.version)||claims.version<0)throw Error();}catch{throw channelError('invalid_shared_lease');}
 return claims;
}
