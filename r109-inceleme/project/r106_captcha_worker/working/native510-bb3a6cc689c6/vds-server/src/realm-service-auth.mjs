import {createHmac,createHash,randomBytes,timingSafeEqual} from 'node:crypto';

const idPattern=/^[a-z][a-z0-9-]{0,31}$/;
const paths=new Set(['/internal/realm-entry/redeem','/internal/security/check','/internal/realm-health','/internal/admin','/internal/maintenance','/internal/maintenance/status','/internal/launch/status']);
const MAX_BODY_BYTES=16384,WINDOW_MS=30000;
function keyBytes(key){
  if(!Buffer.isBuffer(key)||key.length!==32)throw new Error('A dedicated 32-byte realm service key is required');
  return key;
}
function signedInput(realmId,pathname,body,timestamp,nonce){
  return ['COL-REALM-SERVICE-V1',realmId,'POST',pathname,String(timestamp),nonce,createHash('sha256').update(body).digest('hex')].join('\n');
}
export function signRealmServiceRequest({key,realmId,pathname,body,now=Date.now()}){
  keyBytes(key);
  if(!idPattern.test(realmId)||!paths.has(pathname)||typeof body!=='string'||Buffer.byteLength(body)>MAX_BODY_BYTES||!Number.isSafeInteger(now))throw new Error('Invalid realm service request');
  const nonce=randomBytes(16).toString('base64url');
  return {'x-col-realm':realmId,'x-col-realm-at':String(now),'x-col-realm-nonce':nonce,
    'x-col-realm-signature':createHmac('sha256',key).update(signedInput(realmId,pathname,body,now,nonce)).digest('hex')};
}

export class RealmServiceVerifier {
  constructor(keys,{now=Date.now,maxNoncesPerRealm=1024}={}){
    if(!(keys instanceof Map)||!keys.size||keys.size>32)throw new Error('Known realm keys required');
    if(!Number.isSafeInteger(maxNoncesPerRealm)||maxNoncesPerRealm<1||maxNoncesPerRealm>8192)throw new Error('Invalid nonce bound');
    this.realms=new Map();this.now=now;this.maxNoncesPerRealm=maxNoncesPerRealm;
    const usedKeys=new Set();
    for(const [realmId,key]of keys){
      if(!idPattern.test(realmId))throw new Error('Invalid realm identity');keyBytes(key);
      const fingerprint=createHash('sha256').update(key).digest('hex');
      if(usedKeys.has(fingerprint))throw new Error('Realm service keys must not be shared');usedKeys.add(fingerprint);
      this.realms.set(realmId,{key:Buffer.from(key),nonces:new Map(),cursor:null});
    }
  }
  verify({method,pathname,headers,body}){
    if(method!=='POST'||!paths.has(pathname)||typeof body!=='string'||Buffer.byteLength(body)>MAX_BODY_BYTES)return null;
    const get=name=>headers instanceof Headers?headers.get(name):headers?.[name];
    const realmId=get('x-col-realm'),state=this.realms.get(realmId);
    const timestampText=get('x-col-realm-at'),nonce=get('x-col-realm-nonce'),signature=get('x-col-realm-signature');
    if(!state||typeof timestampText!=='string'||!/^\d{1,16}$/.test(timestampText)||typeof nonce!=='string'||!/^[-_A-Za-z0-9]{22}$/.test(nonce)||typeof signature!=='string'||!/^[a-f0-9]{64}$/.test(signature))return null;
    const timestamp=Number(timestampText),now=this.now();
    if(!Number.isSafeInteger(timestamp)||Math.abs(now-timestamp)>WINDOW_MS)return null;
    const expected=createHmac('sha256',state.key).update(signedInput(realmId,pathname,body,timestamp,nonce)).digest();
    if(!timingSafeEqual(expected,Buffer.from(signature,'hex')))return null;
    // Each realm has an independent bounded replay cache; one realm cannot
    // evict another's valid nonces or consume its capacity. Scan a small slice.
    state.cursor??=state.nonces.entries();
    for(let i=0;i<64;i++){
      const item=state.cursor.next();
      if(item.done){state.cursor=null;break;}
      if(item.value[1]<now)state.nonces.delete(item.value[0]);
    }
    const previous=state.nonces.get(nonce);
    if(previous!==undefined&&previous>=now)return null;
    if(previous!==undefined)state.nonces.delete(nonce);
    if(state.nonces.size>=this.maxNoncesPerRealm)return null;
    state.nonces.set(nonce,timestamp+WINDOW_MS);
    return {realmId};
  }
}
