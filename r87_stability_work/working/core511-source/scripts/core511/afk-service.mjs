import {createHash,randomBytes,randomInt} from 'node:crypto';
import {createAfkSchema} from './afk-schema.mjs';
import {AFK_DEFAULT_SETTINGS,validateAfkSettings,afkEnabledByEnvironment} from './afk-settings.mjs';
import {AFK_IMAGE_TYPES,AFK_TARGET_LABELS,afkImageBytes} from './afk-images.mjs';

const hash=value=>createHash('sha256').update(value).digest('hex');
const validId=value=>typeof value==='string'&&value.length>0&&value.length<=256;
const validIdentity=i=>i&&validId(i.actor)&&validId(i.account)&&validId(i.session);
const object=v=>v&&typeof v==='object'&&!Array.isArray(v);
const number=(v,fallback=0,min=0,max=Number.MAX_SAFE_INTEGER)=>typeof v==='number'&&Number.isFinite(v)?Math.max(min,Math.min(max,v)):fallback;
const integer=(v,fallback=0,min=0,max=Number.MAX_SAFE_INTEGER)=>Math.floor(number(v,fallback,min,max));
const plain=value=>String(value??'').slice(0,160);
const json=(value,fallback)=>{try{return JSON.parse(value);}catch{return fallback;}};
const reply=(status,message,extra={})=>({status,body:{ok:status<400,...(message?{message}:{}),...extra}});
const dateValue=(value,fallback)=>{if(value==null||value==='')return fallback;const n=typeof value==='number'?value:/^\d+$/.test(value)?Number(value):Date.parse(value);return Number.isFinite(n)&&n>=0?n:fallback;};
const truth=value=>value===true||value==='true'||value==='1'||value===1;
export const AFK_WRONG_LOCK_MS=120000;
const wrongDeadline=lock=>lock?.locked===1&&lock.reason==='wrong_limit'?lock.created_ms+AFK_WRONG_LOCK_MS:0;
const disabledState=()=>({enabled:false,exempt:false,locked:false,blocked:false,blockedUntil:0,blockedRemainingSeconds:0,pending:false,force:false,challenge:null,revision:0,resetRevision:0,serverTime:Date.now()});

// Tek sahipli ana süreçte çalışır. Hiçbir oyun/ödül tablosuna yazmaz. Her vuruş
// state() yalnız bellek okur. Üst katman deferCommit ile WAL fsync sonrasında
// commit() çağırır; böylece kanal yayını ve kilit önbelleği diskin önüne geçmez.
export class AfkService {
 constructor({sql,now=Date.now,enabled=afkEnabledByEnvironment(),icons=afkImageBytes,onChange=()=>{},deferCommit=false}={}){
  Object.assign(this,{sql,now,masterEnabled:enabled!==false,icons,onChange,deferCommit});
  this.statements=new Map();this.cache=new Map();this.questions=new Map();this.identities=new Map();this.contexts=new Map();this.rate=new Map();this.imageRate=new Map();this.imageCache=new Map();this.staged=new Map();this.stagedIdentity=new Map();this.stagedSettings=null;this.config={...AFK_DEFAULT_SETTINGS};this.settingsRevision=0;
  if(!this.masterEnabled){this.config.enabled=false;return;}
  sql.function('afk_text_fold',{deterministic:true},value=>String(value??'').normalize('NFKC').toLocaleLowerCase('tr-TR'));
  createAfkSchema(sql);
  const saved=this.q('SELECT value,revision FROM afk_settings WHERE id=1').get();
  if(saved){const checked=validateAfkSettings(json(saved.value,{}));if(checked.ok)this.config=checked.value;this.settingsRevision=saved.revision;}
  else this.q('INSERT INTO afk_settings(id,value,revision,updated_ms) VALUES(1,?,0,?)').run(JSON.stringify(this.config),this.now());
  const locks=new Map(this.q('SELECT * FROM afk_locks').all().map(r=>[r.player_id,r]));
  const questions=new Map(this.q("SELECT * FROM afk_challenges WHERE result='pending'").all().map(r=>[r.player_id,r]));this.questions=questions;
  for(const profile of this.q('SELECT * FROM afk_profiles').all())this.cache.set(profile.player_id,{profile,lock:locks.get(profile.player_id),question:questions.get(profile.player_id)});
 }
 q(sql){if(!this.statements.has(sql))this.statements.set(sql,this.sql.prepare(sql));return this.statements.get(sql);}
 settings(){return {...this.config,enabled:this.masterEnabled&&this.config.enabled,revision:this.settingsRevision};}
 active(){return this.masterEnabled&&this.config.enabled;}
 transaction(fn){
  const outer=Boolean(this.sql.isTransaction),oldStage=new Map(this.staged),oldIdentity=new Map(this.stagedIdentity),oldSettings=this.stagedSettings;
  this.sql.exec(outer?'SAVEPOINT afk_r32':'BEGIN IMMEDIATE');
  try{const result=fn();this.sql.exec(outer?'RELEASE afk_r32':'COMMIT');if(!this.deferCommit)this.commit();return result;}
  catch(error){try{this.sql.exec(outer?'ROLLBACK TO afk_r32; RELEASE afk_r32':'ROLLBACK');}catch{}this.staged=oldStage;this.stagedIdentity=oldIdentity;this.stagedSettings=oldSettings;throw error;}
 }
 commit(){
  const settingsChanged=this.stagedSettings;
  if(settingsChanged){this.config=settingsChanged.value;this.settingsRevision=settingsChanged.revision;this.stagedSettings=null;}
  for(const [actor,identity]of this.stagedIdentity){if(identity)this.identities.set(actor,identity);else this.identities.delete(actor);}this.stagedIdentity.clear();
  const actors=[...this.staged.keys()];for(const [actor,snapshot]of this.staged){if(this.imageCache.get(actor)?.nonce!==snapshot.question?.nonce)this.imageCache.delete(actor);this.cache.set(actor,snapshot);if(snapshot.question)this.questions.set(actor,snapshot.question);else this.questions.delete(actor);}this.staged.clear();
  if(settingsChanged)this.onChange({settings:this.settings()});
  for(const actor of actors)this.onChange({actor,state:this.state(this.identities.get(actor)??{actor})});
 }
 discard(){this.staged.clear();this.stagedIdentity.clear();this.stagedSettings=null;}
 snapshot(actor){return {profile:this.q('SELECT * FROM afk_profiles WHERE player_id=?').get(actor),lock:this.q('SELECT * FROM afk_locks WHERE player_id=?').get(actor),question:this.q("SELECT * FROM afk_challenges WHERE player_id=? AND result='pending'").get(actor)};}
 stage(actor){const snapshot=this.snapshot(actor);this.staged.set(actor,snapshot);return snapshot;}
 effectiveSettings(){return this.stagedSettings?{...this.stagedSettings.value,revision:this.stagedSettings.revision}:this.settings();}
 publicState(identity,snapshot=this.cache.get(identity?.actor),settings=this.settings()){
  if(!this.masterEnabled)return {...disabledState(),serverTime:this.now()};
  const exempt=Boolean(this.contexts.get(identity?.actor)?.exempt),profile=snapshot?.profile,q=snapshot?.question,enabled=Boolean(settings.enabled);
  const visible=enabled&&!exempt&&q&&validIdentity(identity)&&q.account_id===identity.account&&q.session_hash===hash(identity.session);
  const blockedUntil=enabled&&!exempt?wrongDeadline(snapshot?.lock):0;
  return {enabled,exempt,locked:enabled&&!exempt&&snapshot?.lock?.locked===1,blocked:Boolean(visible||blockedUntil),blockedUntil,blockedRemainingSeconds:Math.max(0,Math.ceil((blockedUntil-this.now())/1000)),pending:enabled&&!exempt&&Boolean(profile?.pending),force:enabled&&!exempt&&Boolean(profile?.pending),revision:profile?.revision??0,resetRevision:profile?.reset_revision??0,serverTime:this.now(),settings,
   challenge:visible?{nonce:q.nonce,prompt:'Doğrulama: aşağıdaki resimlerden '+AFK_TARGET_LABELS[q.target]+' seç.',deadline:q.deadline_ms,images:[1,2,3,4].map(slot=>'/afk/'+q.nonce+'/'+slot),attempt:q.attempt+1,maxAttempts:q.max_attempts}:null};
 }
 state(identity,context){if(context)this.context(identity,context);return this.publicState(identity);}
 result(identity,status=200,message){return reply(status,message,{afkCheck:this.publicState(identity,this.staged.get(identity.actor)??this.cache.get(identity.actor),this.effectiveSettings())});}
 ensureProfile(identity){this.q(`INSERT INTO afk_profiles(player_id,account_id,player_name,account_name,channel,map,last_seen_ms) VALUES(?,?,?,?,?,?,?) ON CONFLICT(player_id) DO UPDATE SET account_id=excluded.account_id,player_name=excluded.player_name,account_name=excluded.account_name,channel=excluded.channel,map=excluded.map,last_seen_ms=excluded.last_seen_ms`).run(identity.actor,identity.account,plain(identity.playerName||identity.actor),plain(identity.accountName||identity.account),integer(identity.channel,0,0,4),plain(identity.map??this.cache.get(identity.actor)?.profile?.map),this.now());}
 bump(actor,reset=false){this.q(`UPDATE afk_profiles SET revision=revision+1,last_seen_ms=?,reset_revision=reset_revision+? WHERE player_id=?`).run(this.now(),reset?1:0,actor);}
 attach(identity,context={}){
  if(!this.masterEnabled)return this.state(identity);if(!validIdentity(identity))return disabledState();
  const previous=this.identities.get(identity.actor);this.contexts.set(identity.actor,{eligible:context.eligible===true,exempt:context.exempt===true});
  if(previous?.session===identity.session&&previous?.account===identity.account){this.identities.set(identity.actor,{...identity});return this.state(identity);}
  return this.transaction(()=>{
   this.ensureProfile(identity);this.stagedIdentity.set(identity.actor,{...identity});const sessionHash=hash(identity.session),now=this.now();
   this.q('UPDATE afk_sessions SET ended_ms=? WHERE player_id=? AND ended_ms=0 AND session_hash<>?').run(now,identity.actor,sessionHash);
   if(!this.q('SELECT id FROM afk_sessions WHERE player_id=? AND session_hash=? AND ended_ms=0').get(identity.actor,sessionHash))this.q('INSERT INTO afk_sessions(player_id,account_id,session_hash,started_ms,channel) VALUES(?,?,?,?,?)').run(identity.actor,identity.account,sessionHash,now,integer(identity.channel,0,0,4));
   const old=this.snapshot(identity.actor).question;
   if(old){
    if(context.exempt||!this.config.enabled)this.finish(old,'cancelled');
    else if(old.deadline_ms<=now)this.fail(old,'unanswered');
    else if(old.session_hash!==sessionHash){this.finish(old,'rebound');this.createQuestion(identity,{...old,reason:'reconnect',previousTarget:old.target});}
   }
   this.bump(identity.actor);this.stage(identity.actor);return this.publicState(identity,this.staged.get(identity.actor));
  });
 }
 defer(identity,context={}){return this.context(identity,context);}
 context(identity,context={}){if(!this.masterEnabled)return this.state(identity);const previous=this.contexts.get(identity.actor)??{eligible:false,exempt:false};this.contexts.set(identity.actor,{eligible:typeof context.eligible==='boolean'?context.eligible:previous.eligible,exempt:typeof context.exempt==='boolean'?context.exempt:previous.exempt});return this.state(identity);}
 detach(identity){
  if(!this.masterEnabled||!validIdentity(identity))return;const active=this.identities.get(identity.actor);if(active&&active.session!==identity.session)return;
  return this.transaction(()=>{this.q('UPDATE afk_sessions SET ended_ms=? WHERE player_id=? AND session_hash=? AND ended_ms=0').run(this.now(),identity.actor,hash(identity.session));this.stagedIdentity.set(identity.actor,null);this.stage(identity.actor);});
 }
 finish(question,result){const now=this.now();this.q("UPDATE afk_challenges SET result=?,answered_ms=?,answer_ms=? WHERE nonce=? AND result='pending'").run(result,now,Math.max(0,now-question.created_ms),question.nonce);this.imageRate.delete(question.nonce);}
 lock(actor,reason){const now=this.now();this.q(`INSERT INTO afk_locks(player_id,locked,reason,created_ms,updated_ms) VALUES(?,1,?,?,?) ON CONFLICT(player_id) DO UPDATE SET locked=1,reason=excluded.reason,created_ms=excluded.created_ms,updated_ms=excluded.updated_ms,cleared_ms=0`).run(actor,reason,now,now);}
 unlock(actor){const now=this.now();this.q('UPDATE afk_locks SET locked=0,updated_ms=?,cleared_ms=? WHERE player_id=?').run(now,now,actor);}
 releaseWrongLock(actor){
  this.unlock(actor);this.q("UPDATE afk_profiles SET score=0,continuous_ms=0,reasons='[]',pending=0 WHERE player_id=?").run(actor);this.bump(actor,true);this.stage(actor);
 }
 fail(question,result){this.finish(question,result);this.lock(question.player_id,result);this.q('UPDATE afk_profiles SET pending=0 WHERE player_id=?').run(question.player_id);this.bump(question.player_id);this.stage(question.player_id);}
 createQuestion(identity,{attempt=0,max_attempts=this.config.wrongLimit,deadline_ms=this.now()+Math.round(this.config.responseMinutes*60000),root_nonce='',reason='threshold',previousTarget=null}={}){
  previousTarget??=this.q('SELECT target FROM afk_challenges WHERE player_id=? ORDER BY created_ms DESC,rowid DESC LIMIT 1').get(identity.actor)?.target??null;
  const targets=AFK_IMAGE_TYPES.filter(t=>t!==previousTarget),target=targets[randomInt(targets.length)],others=AFK_IMAGE_TYPES.filter(t=>t!==target);
  for(let i=others.length-1;i>0;i--){const j=randomInt(i+1);[others[i],others[j]]=[others[j],others[i]];}
  const choices=[target,...others.slice(0,3)];for(let i=choices.length-1;i>0;i--){const j=randomInt(i+1);[choices[i],choices[j]]=[choices[j],choices[i]];}
  const nonce=randomBytes(24).toString('base64url'),now=this.now();
  this.q(`INSERT INTO afk_challenges(nonce,root_nonce,player_id,account_id,session_hash,target,choices,answer_slot,created_ms,deadline_ms,attempt,max_attempts,reason,result) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,'pending')`).run(nonce,root_nonce||nonce,identity.actor,identity.account,hash(identity.session),target,JSON.stringify(choices),choices.indexOf(target)+1,now,deadline_ms,attempt,max_attempts,plain(reason));
  this.q('UPDATE afk_profiles SET pending=0 WHERE player_id=?').run(identity.actor);this.bump(identity.actor);return nonce;
 }
 permitted(identity,options){this.context(identity,options);return this.contexts.get(identity.actor)??{};}
 issue(identity,options={}){
  if(!this.active())return this.result(identity);if(!validIdentity(identity))return reply(403,'Oturum doğrulanamadı.');
  const context=this.permitted(identity,options);if(context.exempt)return this.result(identity);
  return this.transaction(()=>{
   this.ensureProfile(identity);const snapshot=this.snapshot(identity.actor),blockedUntil=wrongDeadline(snapshot.lock);let current=snapshot.question;
   if(blockedUntil){if(blockedUntil<=this.now()){this.releaseWrongLock(identity.actor);return this.result(identity,200,'Bekleme süresi doldu. Oyuna devam edebilirsin.');}this.stage(identity.actor);return this.result(identity,409,'Hareket ve saldırı 2 dakika süreyle kilitli. Kalan sürenin dolmasını bekle.');}
   if(current&&current.deadline_ms<=this.now()){this.fail(current,'unanswered');return this.result(identity,409,'Doğrulama süresi doldu. Yeniden doğrulama yapabilirsin.');}
   if(current){this.stage(identity.actor);return this.result(identity);}
   if(!context.eligible){this.q('UPDATE afk_profiles SET pending=1 WHERE player_id=?').run(identity.actor);this.bump(identity.actor);this.stage(identity.actor);return this.result(identity,200,'Doğrulama normal kasma alanına dönünce gösterilecek.');}
   if(this.snapshot(identity.actor).lock?.locked===1&&!options.recovery&&!this.snapshot(identity.actor).profile?.pending){this.stage(identity.actor);return this.result(identity,409,'Doğrulama gerekli — ekrandaki soruyu cevapla.');}
   this.createQuestion(identity,{reason:options.reason||'threshold'});this.stage(identity.actor);return this.result(identity);
  });
 }
 rateAllowed(identity){const key=identity.actor,now=this.now(),old=this.rate.get(key);if(old!=null&&now-old<750)return false;this.rate.set(key,now);if(this.rate.size>10000)for(const [id,at]of this.rate)if(now-at>60000)this.rate.delete(id);return true;}
 answer(identity,input){
  if(!this.active())return this.result(identity);if(!validIdentity(identity))return reply(403,'Oturum doğrulanamadı.');
  if(!object(input)||typeof input.nonce!=='string'||!/^[A-Za-z0-9_-]{32}$/.test(input.nonce)||!Number.isInteger(input.choice)||input.choice<1||input.choice>4)return this.result(identity,400,'Doğrulama cevabı geçersiz.');
  if(!this.rateAllowed(identity))return this.result(identity,429,'Yeni denemeden önce kısa bir süre bekle.');
  return this.transaction(()=>{
   const q=this.q('SELECT * FROM afk_challenges WHERE nonce=?').get(input.nonce);
   if(!q||q.player_id!==identity.actor||q.account_id!==identity.account||q.session_hash!==hash(identity.session)||q.result!=='pending')return this.result(identity,409,'Doğrulama yenilendi veya bu oturuma ait değil.');
   if(q.deadline_ms<=this.now()){this.fail(q,'unanswered');return this.result(identity,409,'Doğrulama süresi doldu. Yeniden doğrulama yapabilirsin.');}
   if(input.choice===q.answer_slot){
    this.finish(q,'correct');this.unlock(identity.actor);this.q('UPDATE afk_profiles SET score=0,continuous_ms=0,reasons=\'[]\',pending=0 WHERE player_id=?').run(identity.actor);this.bump(identity.actor,true);this.stage(identity.actor);return this.result(identity,200,'Doğrulama tamamlandı. Oyuna devam edebilirsin.');
   }
   this.finish(q,'wrong');
   if(q.attempt+1>=q.max_attempts){this.lock(identity.actor,'wrong_limit');this.q('UPDATE afk_profiles SET pending=0 WHERE player_id=?').run(identity.actor);this.bump(identity.actor,true);this.stage(identity.actor);return this.result(identity,200,'Yanlış cevap sınırına ulaştın. Hareket ve saldırı 2 dakika kilitlendi.');}
   this.createQuestion(identity,{attempt:q.attempt+1,max_attempts:q.max_attempts,deadline_ms:q.deadline_ms,root_nonce:q.root_nonce,reason:q.reason,previousTarget:q.target});this.stage(identity.actor);return this.result(identity,200,'Yanlış seçim. Yeni soruyu cevapla.');
  });
 }
 recover(identity,options={}){if(!this.active())return this.result(identity);if(!validIdentity(identity))return reply(403,'Oturum doğrulanamadı.');if(!this.rateAllowed(identity))return this.result(identity,429,'Yeni denemeden önce kısa bir süre bekle.');return this.issue(identity,{...options,recovery:true,reason:'recovery'});}
 expire(limit=100){
  if(!this.active())return [];
  const count=integer(limit,100,1,100),rows=this.q("SELECT * FROM afk_challenges WHERE result='pending' AND deadline_ms<=? ORDER BY deadline_ms LIMIT ?").all(this.now(),count),locks=this.q("SELECT player_id FROM afk_locks WHERE locked=1 AND reason='wrong_limit' AND created_ms<=? ORDER BY created_ms LIMIT ?").all(this.now()-AFK_WRONG_LOCK_MS,count);if(!rows.length&&!locks.length)return [];
  return this.transaction(()=>{for(const q of rows){if(this.contexts.get(q.player_id)?.exempt){this.finish(q,'cancelled');this.bump(q.player_id);this.stage(q.player_id);}else this.fail(q,'unanswered');}for(const lock of locks)this.releaseWrongLock(lock.player_id);return [...new Set([...rows,...locks].map(row=>row.player_id))];});
 }
 recordSummary(identity,input){
  if(!this.active()||!validIdentity(identity)||!object(input)||this.contexts.get(identity.actor)?.exempt)return false;
  const now=this.now(),profile=this.cache.get(identity.actor)?.profile;
  if(profile&&(now-profile.last_summary_ms<300000||integer(input.resetRevision)<profile.reset_revision))return false;
  const inputs=integer(input.inputs),kills=integer(input.kills);if(!inputs&&!kills)return false;
  const to=integer(input.toMs??input.at,now,0,now),from=integer(input.fromMs,Math.max(0,to-300000),0,to),score=number(input.score,0,0,100),reasons=JSON.stringify(Array.isArray(input.reasons)?input.reasons.slice(0,12).map(plain):[]);
  return this.transaction(()=>{
   const existing=this.q('SELECT last_summary_ms,reset_revision FROM afk_profiles WHERE player_id=?').get(identity.actor);if(existing&&(now-existing.last_summary_ms<300000||integer(input.resetRevision)<existing.reset_revision))return false;
   this.ensureProfile(identity);
   this.q('INSERT OR IGNORE INTO afk_activity(player_id,at_ms,from_ms,to_ms,channel,map,continuous_ms,score,reasons,kills,xp,inputs,mean_ms,stddev_ms,cv,radius,hourly_kills,inputs_per_minute) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(identity.actor,now,from,to,integer(input.channel,integer(identity.channel),0,4),plain(input.map||identity.map),integer(input.continuousMs),score,reasons,kills,integer(input.xp),inputs,number(input.meanMs),number(input.stddevMs),number(input.cv),number(input.radius),number(input.hourlyKills??input.killsPerHour),number(input.inputsPerMinute));
   this.q('UPDATE afk_profiles SET score=?,reasons=?,continuous_ms=?,channel=?,map=?,last_summary_ms=? WHERE player_id=?').run(score,reasons,integer(input.continuousMs),integer(input.channel,integer(identity.channel),0,4),plain(input.map||identity.map),now,identity.actor);this.bump(identity.actor);this.stage(identity.actor);return true;
  });
 }
 image(identity,nonce,slot){
  const no=()=>({status:404,headers:{'Cache-Control':'no-store','Content-Type':'text/plain; charset=utf-8'},body:'Görsel bulunamadı.'});
  if(!this.active()||!validIdentity(identity)||typeof nonce!=='string'||!/^[A-Za-z0-9_-]{32}$/.test(nonce)||!Number.isInteger(Number(slot))||Number(slot)<1||Number(slot)>4)return no();
  const q=this.cache.get(identity.actor)?.question;if(!q||q.nonce!==nonce||q.result!=='pending'||q.deadline_ms<=this.now()||q.account_id!==identity.account||q.session_hash!==hash(identity.session)||this.contexts.get(identity.actor)?.exempt)return no();
  const loads=this.imageRate.get(nonce)??0;if(loads>=64)return {status:429,headers:{'Cache-Control':'no-store'},body:'Görsel isteği sınırı.'};this.imageRate.set(nonce,loads+1);
  let images=this.imageCache.get(identity.actor);
  if(images?.nonce!==nonce){const bodies=json(q.choices,[]).map(type=>this.icons(type));if(bodies.length!==4||bodies.some(body=>!body))return no();images={nonce,bodies};this.imageCache.set(identity.actor,images);}
  const body=images.bodies[Number(slot)-1];
  return {status:200,headers:{'Content-Type':'image/png','Content-Encoding':'identity','Content-Length':String(body.length),'Cache-Control':'private, no-store, max-age=0','Pragma':'no-cache','X-Content-Type-Options':'nosniff','Cross-Origin-Resource-Policy':'same-origin','Referrer-Policy':'no-referrer'},body};
 }
 ensureAdminPlayer(actor){
  if(!validId(actor))return false;
  const player=this.q('SELECT p.id,p.name,p.account_id,p.channel,p.area,a.username FROM players p LEFT JOIN accounts a ON a.id=p.account_id WHERE p.id=?').get(actor);
  if(!player||!validId(player.account_id))return false;
  this.ensureProfile({actor:player.id,account:player.account_id,playerName:player.name,accountName:player.username,channel:player.channel,map:player.area});return true;
 }
 audit(admin,actor,action,detail={}){this.q('INSERT INTO afk_admin_log(player_id,admin_id,admin_name,at_ms,action,detail) VALUES(?,?,?,?,?,?)').run(actor,admin.id,plain(admin.name||admin.id),this.now(),action,JSON.stringify(detail));}
 adminAction(admin,input){
  if(!this.masterEnabled)return reply(409,'AFK sistemi sunucu anahtarıyla kapalı.');
  if(!validId(admin?.id))return reply(403,'Yönetici yetkisi gerekli.');
  const actor=input?.actor??input?.playerId,action=input?.action;
  if(!validId(actor)||!['force','unlock','clean','watch'].includes(action))return reply(400,'Yönetici işlemi geçersiz.');
  return this.transaction(()=>{
   if(!this.ensureAdminPlayer(actor))return reply(404,'Oyuncu bulunamadı.');
   if(action==='force')this.q('UPDATE afk_profiles SET pending=1,watch=1,clean_ms=0 WHERE player_id=?').run(actor);
   if(action==='watch')this.q('UPDATE afk_profiles SET watch=1,clean_ms=0 WHERE player_id=?').run(actor);
   if(action==='clean'){this.unlock(actor);this.q("UPDATE afk_profiles SET watch=0,score=0,reasons='[]',continuous_ms=0,pending=0,clean_ms=? WHERE player_id=?").run(this.now(),actor);const question=this.snapshot(actor).question;if(question)this.finish(question,'cancelled');}
   if(action==='unlock'){
    this.unlock(actor);const question=this.snapshot(actor).question;if(question)this.finish(question,'cancelled');
    this.q("UPDATE afk_profiles SET score=0,reasons='[]',continuous_ms=0,pending=0 WHERE player_id=?").run(actor);
   }
   this.bump(actor,action==='clean'||action==='unlock');this.audit(admin,actor,action);this.stage(actor);
   const identity=this.identities.get(actor)??{actor};return reply(200,'İşlem kaydedildi.',{afkCheck:this.publicState(identity,this.staged.get(actor)),playerId:actor});
  });
 }
 updateSettings(admin,patch){
  if(!this.masterEnabled)return reply(409,'CORE511_AFK_CHECK=0 sunucu anahtarını panelden değiştiremezsin.');
  if(!validId(admin?.id))return reply(403,'Yönetici yetkisi gerekli.');
  const checked=validateAfkSettings(patch,this.config);if(!checked.ok)return reply(400,checked.message);
  return this.transaction(()=>{
   const revision=this.settingsRevision+1;this.q('UPDATE afk_settings SET value=?,revision=?,updated_ms=? WHERE id=1').run(JSON.stringify(checked.value),revision,this.now());this.audit(admin,'','settings',{before:this.config,after:checked.value});
   this.stagedSettings={value:checked.value,revision};
   if(!checked.value.enabled){for(const q of this.q("SELECT * FROM afk_challenges WHERE result='pending'").all()){this.finish(q,'cancelled');this.bump(q.player_id);this.stage(q.player_id);}}
   return reply(200,'Ayarlar kaydedildi.',{settings:{...checked.value,revision}});
  });
 }
 playerView(row){
  return {playerId:row.player_id,playerName:row.player_name,accountId:row.account_id,accountName:row.account_name,status:row.locked?'locked':row.watch||row.pending||row.failed||row.score>=this.config.scoreThreshold?'watch':'clean',score:row.score,reasons:json(row.reasons,[]),channel:row.channel,map:row.map,continuousMs:row.continuous_ms,sent:row.sent??0,passed:row.passed??0,unanswered:row.unanswered??0,wrong:row.wrong??0,lastQuestionAt:row.last_question_at??0,lastResult:row.last_result??'',meanAnswerMs:row.mean_answer_ms??0,lastSeenAt:row.last_seen_ms,watch:Boolean(row.watch),pending:Boolean(row.pending),online:Boolean(row.online)};
 }
 listRows({from,to,search='',actor=null}){
  // Yalnız yönetici soğuk yolu: yerel oyuncu tablosu salt okunur; hiçbir IP/e-posta döndürülmez.
  return this.q(`WITH base AS (
   SELECT p.id AS player_id,p.account_id,p.name AS player_name,COALESCE(a.username,'') AS account_name,
    COALESCE(f.score,0) AS score,COALESCE(f.reasons,'[]') AS reasons,p.channel AS channel,p.area AS map,
    COALESCE(f.continuous_ms,0) AS continuous_ms,COALESCE(f.watch,0) AS watch,COALESCE(f.pending,0) AS pending,COALESCE(f.clean_ms,0) AS clean_ms,COALESCE(f.reset_revision,0) AS reset_revision,COALESCE(f.last_seen_ms,0) AS last_seen_ms,COALESCE(l.locked,0) AS locked
   FROM players p LEFT JOIN accounts a ON a.id=p.account_id LEFT JOIN afk_profiles f ON f.player_id=p.id LEFT JOIN afk_locks l ON l.player_id=p.id
   WHERE (? IS NULL OR p.id=?) AND (?='' OR instr(afk_text_fold(p.name),afk_text_fold(?))>0 OR instr(afk_text_fold(COALESCE(a.username,'')),afk_text_fold(?))>0)
  ), history AS (
   SELECT c.player_id,COUNT(*) AS sent,SUM(c.result='correct') AS passed,SUM(c.result='unanswered') AS unanswered,SUM(c.result='wrong') AS wrong,
    SUM(c.result='unanswered' OR (c.result='wrong' AND c.attempt+1>=c.max_attempts)) AS failed,
    MAX(c.created_ms) AS last_question_at,AVG(CASE WHEN c.result IN ('correct','wrong') THEN c.answer_ms END) AS mean_answer_ms
   FROM afk_challenges c JOIN base b ON b.player_id=c.player_id WHERE c.created_ms>=? AND c.created_ms<=? AND c.created_ms>=b.clean_ms AND c.result<>'rebound' GROUP BY c.player_id
  ) SELECT b.*,COALESCE(h.sent,0) AS sent,COALESCE(h.passed,0) AS passed,COALESCE(h.unanswered,0) AS unanswered,COALESCE(h.wrong,0) AS wrong,COALESCE(h.failed,0) AS failed,
    COALESCE(h.last_question_at,0) AS last_question_at,COALESCE(h.mean_answer_ms,0) AS mean_answer_ms,
    COALESCE((SELECT result FROM afk_challenges c WHERE c.player_id=b.player_id AND c.created_ms>=? AND c.created_ms<=? AND c.created_ms>=b.clean_ms ORDER BY c.created_ms DESC,rowid DESC LIMIT 1),'') AS last_result
   FROM base b LEFT JOIN history h ON h.player_id=b.player_id ORDER BY b.score DESC,b.locked DESC,b.last_seen_ms DESC,b.player_id`).all(actor,actor,search,search,search,from,to,from,to);
 }
 overlayLive(rows,liveRows=[]){
  const liveById=new Map((Array.isArray(liveRows)?liveRows:[]).filter(object).map(row=>[row.actor,row])),now=this.now();
  for(const row of rows){
   const live=liveById.get(row.player_id);if(!live||integer(live.resetRevision)<row.reset_revision)continue;
   const measured=live.enabled!==false&&!live.exempt;
   row.score=measured?number(live.score,0,0,100):0;row.reasons=JSON.stringify(measured&&Array.isArray(live.reasons)?live.reasons.slice(0,12).map(plain):[]);
   row.continuous_ms=measured?integer(live.continuousMs):0;row.channel=integer(live.channel,row.channel,0,4);row.map=typeof live.map==='string'?plain(live.map):row.map;row.last_seen_ms=now;row.online=true;
   // Geç yayınlanan eski bir "açık" değeri kalıcı kilidi düşüremez.
   if(live.locked===true)row.locked=1;
  }
  return rows;
 }
 adminList(filters={},liveRows=[]){
  if(!this.masterEnabled)return {ok:true,players:[],total:0,hasMore:false,settings:this.settings(),disabled:true};
  const now=this.now(),from=dateValue(filters.from,now-7*86400000),to=dateValue(filters.to,now),search=plain(filters.search).trim(),minScore=filters.minScore==null||filters.minScore===''?null:Number(filters.minScore),offset=integer(Number(filters.offset),0,0,1000000),limit=integer(Number(filters.limit),100,1,200);
  let rows=this.overlayLive(this.listRows({from,to,search}),liveRows);
  rows=rows.filter(r=>r.locked||r.watch||r.pending||r.failed||r.score>=this.config.scoreThreshold&&r.last_seen_ms>=from&&r.last_seen_ms<=to);
  if(truth(filters.locked))rows=rows.filter(r=>r.locked);if(truth(filters.unanswered))rows=rows.filter(r=>r.unanswered>0);if(Number.isFinite(minScore))rows=rows.filter(r=>r.score>minScore);
  rows.sort((a,b)=>b.score-a.score||b.locked-a.locked||a.player_name.localeCompare(b.player_name,'tr')||a.player_id.localeCompare(b.player_id));
  return {ok:true,players:rows.slice(offset,offset+limit).map(row=>this.playerView(row)),total:rows.length,hasMore:rows.length>offset+limit,settings:this.settings()};
 }
 adminDetail(actor,filters={},liveRows=[]){
  if(!this.masterEnabled)return {ok:false,message:'AFK sistemi sunucu anahtarıyla kapalı.'};if(!validId(actor))return {ok:false,message:'Oyuncu geçersiz.'};
  const now=this.now(),from=dateValue(filters.from,now-7*86400000),to=dateValue(filters.to,now),row=this.overlayLive(this.listRows({from,to,actor}),liveRows)[0];if(!row)return {ok:false,message:'Oyuncu bulunamadı.'};
  const timeline=this.q('SELECT * FROM afk_activity WHERE player_id=? AND at_ms>=? AND at_ms<=? ORDER BY at_ms DESC LIMIT 10000').all(actor,from,to).reverse().map(r=>({at:r.at_ms,fromMs:r.from_ms,toMs:r.to_ms,map:r.map,channel:r.channel,kills:r.kills,xp:r.xp,inputs:r.inputs,cv:r.cv,radius:r.radius,score:r.score,continuousMs:r.continuous_ms,meanMs:r.mean_ms,stddevMs:r.stddev_ms,hourlyKills:r.hourly_kills,inputsPerMinute:r.inputs_per_minute,reasons:json(r.reasons,[])}));
  const challenges=this.q('SELECT created_ms,target,result,answered_ms,answer_ms,attempt FROM afk_challenges WHERE player_id=? AND created_ms>=? AND created_ms<=? ORDER BY created_ms DESC,rowid DESC LIMIT 1000').all(actor,from,to).map(r=>({at:r.created_ms,target:r.target,result:r.result,answeredAt:r.answered_ms,answerMs:r.answer_ms,attempt:r.attempt+1}));
  const sessions=this.q('SELECT started_ms,ended_ms,channel FROM afk_sessions WHERE player_id=? AND started_ms<=? AND (ended_ms=0 OR ended_ms>=?) ORDER BY started_ms DESC LIMIT 1000').all(actor,to,from).map(r=>({startedAt:r.started_ms,endedAt:r.ended_ms,durationMs:Math.max(0,(r.ended_ms||now)-r.started_ms),channel:r.channel}));
  const adminLog=this.q('SELECT admin_id,admin_name,at_ms,action,detail FROM afk_admin_log WHERE player_id=? ORDER BY at_ms DESC,id DESC LIMIT 1000').all(actor).map(r=>({at:r.at_ms,adminId:r.admin_id,adminName:r.admin_name,action:r.action,detail:json(r.detail,{})}));
  return {ok:true,player:this.playerView(row),timeline,challenges,sessions,adminLog,settings:this.settings()};
 }
 read(query={},admin={},{liveRows=[]}={}){
  if(!validId(admin.adminId??admin.id))return {ok:false,message:'Yönetici yetkisi gerekli.'};
  if(query.action==='settings')return {ok:true,settings:this.settings()};if(query.action==='detail')return this.adminDetail(query.playerId??query.actor,query,liveRows);if(!query.action||query.action==='list')return this.adminList(query,liveRows);return {ok:false,message:'İşlem geçersiz.'};
 }
 mutateTrusted(payload,admin){return payload?.action==='settings'?this.updateSettings(admin,payload.settings):this.adminAction(admin,payload);}
 async mutate(payload,authorization={}){
  const id=authorization.adminId??authorization.id;if(!validId(id)||typeof authorization.reauthorize!=='function')return reply(403,'Yönetici yetkisi yeniden doğrulanmalı.');
  const current=await authorization.reauthorize();if(current!==id)return reply(403,'Yönetici oturumu değişti.');
  return this.mutateTrusted(payload,{id,name:authorization.adminName??authorization.name});
 }
 nextDeadline(){if(!this.active())return Infinity;let deadline=Infinity;for(const question of this.questions.values())deadline=Math.min(deadline,question.deadline_ms);for(const snapshot of this.cache.values()){const blockedUntil=wrongDeadline(snapshot.lock);if(blockedUntil)deadline=Math.min(deadline,blockedUntil);}return deadline;}
 hasExpired(now=this.now()){return this.nextDeadline()<=now;}
 purge(limit=100){
  if(!this.active())return {activity:0,challenges:0,sessions:0};const cutoff=this.now()-this.config.retentionDays*86400000,n=integer(limit,100,1,100);
  return this.transaction(()=>({activity:this.q('DELETE FROM afk_activity WHERE id IN (SELECT id FROM afk_activity WHERE at_ms<? ORDER BY at_ms LIMIT ?)').run(cutoff,n).changes,challenges:this.q("DELETE FROM afk_challenges WHERE nonce IN (SELECT nonce FROM afk_challenges WHERE result<>'pending' AND created_ms<? ORDER BY created_ms LIMIT ?)").run(cutoff,n).changes,sessions:this.q('DELETE FROM afk_sessions WHERE id IN (SELECT id FROM afk_sessions WHERE ended_ms>0 AND ended_ms<? ORDER BY ended_ms LIMIT ?)').run(cutoff,n).changes}));
 }
}
