import {KeyObject,createPrivateKey,createPublicKey,randomBytes,sign,verify} from 'node:crypto';
import {demand,validChannel,PROTOCOL} from './contract.mjs';
const b64=value=>Buffer.from(value).toString('base64url');
function p256Key(value,type){
 const key=value instanceof KeyObject?value:type==='private'?createPrivateKey(value):createPublicKey(value);
 demand(key.type===type&&key.asymmetricKeyType==='ec'&&key.asymmetricKeyDetails?.namedCurve==='prime256v1','ticket_key_must_be_p256');return key;
}
function validate(claims,now){
 demand(claims&&claims.v===PROTOCOL&&validChannel(claims.channel),'ticket_protocol');
 for(const key of ['realm','boot','actor','account','session'])demand(typeof claims[key]==='string'&&/^[A-Za-z0-9:_-]{1,160}$/.test(claims[key]),'ticket_identity');
 demand(typeof claims.nonce==='string'&&/^[A-Za-z0-9_-]{32}$/.test(claims.nonce),'ticket_nonce');
 demand(Number.isSafeInteger(claims.epoch)&&claims.epoch>0&&Number.isSafeInteger(claims.securityVersion)&&claims.securityVersion>=0,'ticket_epoch');
 demand(Number.isSafeInteger(claims.issued)&&claims.issued<=now+1000&&Number.isSafeInteger(claims.expires)&&claims.expires>now&&claims.expires-claims.issued<=4000,'ticket_expired');
 demand(typeof claims.origin==='string'&&claims.origin.length<=256,'ticket_origin');
}
export function issueTicket(privateKey,identity,{now=Date.now()}={}){
 privateKey=p256Key(privateKey,'private');
 const claims={...identity,v:PROTOCOL,issued:now,expires:now+4000,nonce:randomBytes(24).toString('base64url')};validate(claims,now);
 const body=b64(JSON.stringify(claims));demand(body.length<=3072,'ticket_size');
 const signature=sign('sha256',Buffer.from(body),{key:privateKey,dsaEncoding:'ieee-p1363'});
 demand(signature.length===64,'ticket_key_must_be_p256');return body+'.'+b64(signature);
}
export class TicketConsumer {
 constructor({publicKey,realm,channel,boot,origins,assertOwner,now=Date.now,maxNonces=4096}){
  demand(validChannel(channel)&&origins instanceof Set&&origins.size>0&&typeof assertOwner==='function','ticket_consumer_config');
  Object.assign(this,{publicKey:p256Key(publicKey,'public'),realm,channel,boot,origins,assertOwner,now,maxNonces});this.consumed=new Map();
 }
 consume(token,origin){
  demand(this.origins.has(origin),'origin_rejected');demand(typeof token==='string'&&token.length<=4096,'ticket_size');
  const parts=token.split('.');demand(parts.length===2&&parts.every(p=>/^[A-Za-z0-9_-]+$/.test(p)),'ticket_encoding');
  const signature=Buffer.from(parts[1],'base64url');demand(signature.length===64&&verify('sha256',Buffer.from(parts[0]),{key:this.publicKey,dsaEncoding:'ieee-p1363'},signature),'ticket_signature');
  const claims=JSON.parse(Buffer.from(parts[0],'base64url').toString());const now=this.now();validate(claims,now);
  demand(claims.realm===this.realm&&claims.channel===this.channel&&claims.boot===this.boot&&claims.origin===origin,'ticket_scope');
  // Ownership, account security version, session revocation and test scope are
  // checked from the coordinator's current admission mirror, not caller fields.
  demand(this.assertOwner(claims)===true,'ticket_owner_revoked');
  for(const [nonce,expires]of this.consumed)if(expires<=now)this.consumed.delete(nonce);
  demand(!this.consumed.has(claims.nonce),'ticket_already_used');demand(this.consumed.size<this.maxNonces,'ticket_budget');
  this.consumed.set(claims.nonce,claims.expires);return Object.freeze(claims);
 }
}
