import {randomInt,randomBytes,createHash,timingSafeEqual} from 'node:crypto';
import {captchaPng} from './captcha-image.mjs';
import {renderCaptchaR106} from './captcha-renderer-r106.mjs';
export {captchaPng};
const INTERVAL=30*60_000, TTL=5*60_000;
const digest=(id,answer)=>createHash('sha256').update(id+':'+answer).digest('hex');
export function createBotCheck(db,{now=Date.now,exempt=()=>false,write,renderCaptcha=renderCaptchaR106}={}){
 db.exec(`CREATE TABLE IF NOT EXISTS bot_due(account_id TEXT PRIMARY KEY,due_ms INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS bot_challenges(id TEXT PRIMARY KEY,owner TEXT NOT NULL,purpose TEXT NOT NULL,hash TEXT NOT NULL,image TEXT NOT NULL,expires_ms INTEGER NOT NULL,attempts INTEGER NOT NULL DEFAULT 0);
 CREATE INDEX IF NOT EXISTS bot_challenge_owner ON bot_challenges(owner,purpose);
 CREATE INDEX IF NOT EXISTS bot_challenge_expiry ON bot_challenges(expires_ms);`);
 const readDue=db.prepare('SELECT due_ms FROM bot_due WHERE account_id=?');
 const initializeDue=db.prepare('INSERT OR IGNORE INTO bot_due VALUES(?,?)');
 const extendExemptDue=db.prepare('INSERT INTO bot_due VALUES(?,?) ON CONFLICT(account_id) DO UPDATE SET due_ms=excluded.due_ms WHERE bot_due.due_ms<?');
 const resetDue=db.prepare('INSERT INTO bot_due VALUES(?,?) ON CONFLICT(account_id) DO UPDATE SET due_ms=excluded.due_ms');
 const expireChallenges=db.prepare('DELETE FROM bot_challenges WHERE expires_ms<=?');
 const readChallenge=db.prepare('SELECT * FROM bot_challenges WHERE owner=? AND purpose=? AND attempts<5 AND expires_ms>? ORDER BY rowid DESC LIMIT 1');
 const removeOwnerChallenges=db.prepare('DELETE FROM bot_challenges WHERE owner=? AND purpose=?');
 const insertChallenge=db.prepare('INSERT INTO bot_challenges(id,owner,purpose,hash,image,expires_ms) VALUES(?,?,?,?,?,?)');
 const attemptChallenge=db.prepare('UPDATE bot_challenges SET attempts=attempts+1 WHERE id=? AND owner=? AND purpose=? AND expires_ms>? AND attempts<5 RETURNING hash');
 const consumeChallenge=db.prepare('DELETE FROM bot_challenges WHERE id=? RETURNING id');
 const deadline=(id,forRealtime=false)=>{
  // Read both exemption and deadline on every call: verification and leaving
  // the AFK island must take effect immediately, without an authorization cache.
  const botPvpPolicy476=exempt(id),isExempt=botPvpPolicy476===true,isSuspended=botPvpPolicy476==='pvp',current=readDue.get(id);
  if(isExempt){
   const due=now()+INTERVAL,refreshBefore=due-60000;
   if(!current||current.due_ms<refreshBefore){if(write)throw Error('bot_deadline_not_prepared');extendExemptDue.run(id,due,refreshBefore);}
   return due;
  }
  if(current)return isSuspended?(forRealtime?0:now()+INTERVAL):current.due_ms;
  // Existing owners need no writer lock. A concurrently initialized owner
  // wins over our proposed value, so retain INSERT OR IGNORE and read it back.
  if(write)throw Error('bot_deadline_not_prepared');
  initializeDue.run(id,now()+INTERVAL);
  const initialized=readDue.get(id).due_ms;return isSuspended?(forRealtime?0:now()+INTERVAL):initialized;
 };
 // Channel readers initialize/extend deadlines through the sole durable
 // writer before the synchronous authorization check. Existing deadlines
 // remain a local read; no per-request IPC or weaker captcha policy.
 const prepare=write?id=>{
  const current=readDue.get(id),policy=exempt(id),isExempt=policy===true,due=now()+INTERVAL,refreshBefore=due-60000;
  if(isExempt&&(!current||current.due_ms<refreshBefore))return write('INSERT INTO bot_due VALUES(?,?) ON CONFLICT(account_id) DO UPDATE SET due_ms=excluded.due_ms WHERE bot_due.due_ms<?',[id,due,refreshBefore]);
  if(!current)return write('INSERT OR IGNORE INTO bot_due VALUES(?,?)',[id,due]);
  return null;
 }:undefined;
 // V465: one synchronous pair of reads suffices when no preparation write is
 // needed. After any asynchronous writer wait, rerun the original check so
 // leaving AFK or passing the due time cannot reuse stale authorization.
 const requiredPrepared=write?id=>{
  const current=readDue.get(id),policy=exempt(id),isExempt=policy===true,isSuspended=policy==='pvp',at=now(),due=at+INTERVAL,refreshBefore=due-60000;
  let pending;
  if(isExempt&&(!current||current.due_ms<refreshBefore))pending=write('INSERT INTO bot_due VALUES(?,?) ON CONFLICT(account_id) DO UPDATE SET due_ms=excluded.due_ms WHERE bot_due.due_ms<?',[id,due,refreshBefore]);
  else if(!current)pending=write('INSERT OR IGNORE INTO bot_due VALUES(?,?)',[id,due]);
  else return !isExempt&&!isSuspended&&current.due_ms<=at;
  return Promise.resolve(pending).then(()=>deadline(id)<=now());
 }:undefined;
 const rendered=new WeakMap(),pending=new Map();
 const prepareChallengeR106=(owner,purpose,{fresh=false}={})=>{
  // No SQL or coordinator scope is held during drawing. Registration requests
  // remain independent even when several visitors share the same IP.
  if(typeof owner!=='string'||!owner||!['game','register'].includes(purpose))return Promise.reject(Error('captcha_prepare_scope'));
  const key=JSON.stringify([owner,purpose]);
  if(!fresh&&pending.has(key))return pending.get(key);
  const task=(async()=>{
   const id=randomBytes(24).toString('hex'),code=String(randomInt(100000,1000000));
   const png=await renderCaptcha(code),proof=Object.freeze({});
   rendered.set(proof,{owner,purpose,id,code,image:'data:image/png;base64,'+png.toString('base64')});return proof;
  })();
  if(!fresh){pending.set(key,task);void task.finally(()=>{if(pending.get(key)===task)pending.delete(key);}).catch(()=>{});}
  return task;
 };
 const publicChallenge=row=>row?{id:row.id,image:row.image,expiresAt:row.expires_ms}:null;
 const service={deadline,prepare,requiredPrepared,required:id=>deadline(id)<=now(),prepareChallengeR106,
 existingChallengeR106:(owner,purpose)=>publicChallenge(readChallenge.get(owner,purpose,now())),
 async challengeAsyncR106(owner,purpose,{fresh=false,commit}={}){
  if(typeof commit!=='function')throw Error('captcha_commit_required');
  for(let attempt=0;attempt<3;attempt++){
   const prepared=await prepareChallengeR106(owner,purpose,{fresh});
   try{return await commit(()=>service.challenge(owner,purpose,{fresh,prepared}));}
   catch(error){if(error.message!=='captcha_prepare_again')throw error;}
  }
  throw Error('captcha_prepare_again');
 },
 challenge(owner,purpose,{fresh=false,prepared}={}){
  expireChallenges.run(now());
  const old=readChallenge.get(owner,purpose,now());
  if(old&&!fresh)return {id:old.id,image:old.image,expiresAt:old.expires_ms};
  if(prepared!==undefined){
   const value=rendered.get(prepared);
   if(!value||value.owner!==owner||value.purpose!==purpose)throw Error('captcha_prepared_invalid');
   rendered.delete(prepared);
   if(old&&digest(old.id,value.code)===old.hash)throw Error('captcha_prepare_again');
   const expiresAt=now()+TTL;
   if(purpose!=='register')removeOwnerChallenges.run(owner,purpose);
   insertChallenge.run(value.id,owner,purpose,digest(value.id,value.code),value.image,expiresAt);
   return {id:value.id,image:value.image,expiresAt};
  }
  // Separate visitors behind one router must not invalidate each other's forms.
  if(purpose!=='register')removeOwnerChallenges.run(owner,purpose);
  const id=randomBytes(24).toString('hex'),answer=String(randomInt(100000,1000000));
  // A refreshed challenge must not repeat the preceding answer.
  let code=answer;while(old&&digest(old.id,code)===old.hash)code=String(randomInt(100000,1000000));
  const image='data:image/png;base64,'+captchaPng(code).toString('base64'),expiresAt=now()+TTL;
  insertChallenge.run(id,owner,purpose,digest(id,code),image,expiresAt);
  return {id,image,expiresAt};
 },verify(owner,purpose,id,answer){
  if(typeof id!=='string'||typeof answer!=='string'||answer.length>20)return false;
  const row=attemptChallenge.get(id,owner,purpose,now());
  if(!row||!/^\d{6}$/.test(answer)||!timingSafeEqual(Buffer.from(row.hash,'hex'),Buffer.from(digest(id,answer.trim()),'hex')))return false;
  const used=consumeChallenge.get(id);if(!used)return false;
  if(purpose==='game')resetDue.run(owner,now()+INTERVAL);
  return true;
 }};return service;
}
