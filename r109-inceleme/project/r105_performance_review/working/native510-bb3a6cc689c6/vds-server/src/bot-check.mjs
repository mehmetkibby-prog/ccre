import {randomInt,randomBytes,createHash,timingSafeEqual} from 'node:crypto';
import {captchaPng} from './captcha-image.mjs';
export {captchaPng};
const INTERVAL=30*60_000, TTL=5*60_000;
const digest=(id,answer)=>createHash('sha256').update(id+':'+answer).digest('hex');
export function createBotCheck(db,{now=Date.now,exempt=()=>false,write}={}){
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
 return {deadline,prepare,requiredPrepared,required:id=>deadline(id)<=now(),
 challenge(owner,purpose,{fresh=false}={}){
  expireChallenges.run(now());
  const old=readChallenge.get(owner,purpose,now());
  if(old&&!fresh)return {id:old.id,image:old.image,expiresAt:old.expires_ms};
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
 }};
}
