import {randomBytes,randomUUID} from 'node:crypto';
import {launchPhase} from './launch-service.mjs';

const HOUR=3600000;
const REMINDER_LEAD=15*60000;
export const LAUNCH_EMAIL_SUBJECT='Core of Life açık beta açılışını kaçırma!';
const reminderDue=(s,time)=>!!s?.enabled&&s.mode!=='closed'&&time>=s.opens_at-REMINDER_LEAD&&time<s.ends_at;
const openingText=opensAt=>Number.isFinite(opensAt)?new Intl.DateTimeFormat('tr-TR',{timeZone:'Europe/Istanbul',day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(opensAt))+' (Türkiye saati)':'Sitedeki açılış takvimini takip et';
const escapeHtml=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const validEmail=value=>typeof value==='string'&&value.length<=254&&/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value);

export function launchEmailConfig(env){
 const key=String(env.RESEND_API_KEY||'').trim(),from=String(env.AUTH_EMAIL_FROM||'').trim();
 const sender=from.match(/^.+<([^<>]+)>$/)?.[1]??from;
 let origin;try{const u=new URL(env.AUTH_PUBLIC_ORIGIN);if(u.protocol==='https:'&&!u.username&&!u.password&&u.pathname==='/'&&!u.search&&!u.hash)origin=u.origin;}catch{}
 if(!key.startsWith('re_')||/\s/.test(key)||key.length>512||/[\r\n]/.test(from)||!validEmail(sender)||!origin)return null;
 return {key,from,origin};
}

export function buildLaunchEmail({from,origin,to,token,opensAt}){
 const unsubscribe=new URL('/api/launch-email/unsubscribe',origin);unsubscribe.searchParams.set('token',token);
 const play=origin+'/',stop=unsubscribe.toString();
 const when=openingText(opensAt);
 const text=`Core of Life açık beta açılışı\n${when}\n\nMaceraya hazır ol! Açılış saatinden itibaren mevcut hesabınla giriş yapıp PC, tablet veya telefondan indirmeden ücretsiz oynayabilirsin.\n\nBeta sonunda hesabın, seviyelerin ve eşyaların korunacak; ilerlemen sıfırlanmayacak.\n\nOyuna Git: ${play}\n\nBu tek seferlik e-posta, açılış haberini almak istediğin için gönderildi.\nE-posta iznini kaldır: ${stop}`;
 return {from,to:[to],subject:LAUNCH_EMAIL_SUBJECT,text,
  html:`<!doctype html><html lang="tr"><body style="margin:0;padding:24px 12px;background:#08130f;color:#eee7d1;font-family:Arial,sans-serif"><div style="max-width:560px;margin:auto;padding:28px 22px;border:1px solid #66794e;border-radius:14px;background:#10231a"><p style="color:#d8bc78;letter-spacing:2px;font-size:14px">CORE OF LIFE · YAŞAM ÇEKİRDEĞİ</p><h1 style="font-size:28px;line-height:1.25">Maceraya hazır ol!</h1><p style="font-size:16px;line-height:1.7">Açık beta açılışı: <strong>${escapeHtml(when)}</strong>. Açılış saatinden itibaren mevcut hesabınla Yaşam Çekirdeği'ndeki macerana katıl.</p><p style="font-size:16px;line-height:1.7">PC, tablet ve telefondan indirmeden ücretsiz oyna. Beta sonunda hesabın, seviyelerin ve eşyaların korunacak; ilerlemen sıfırlanmayacak.</p><p style="margin:28px 0"><a href="${escapeHtml(play)}" style="display:inline-block;padding:15px 28px;border-radius:8px;background:#d8bc78;color:#132219;text-decoration:none;font-weight:bold;font-size:17px">Oyuna Git</a></p><p style="font-size:14px;line-height:1.6;color:#c2cbbb">Bu tek seferlik e-posta, açılış haberini almak istediğin için gönderildi.</p><a style="color:#d8bc78;font-size:14px" href="${escapeHtml(stop)}">E-posta iznini kaldır</a></div></body></html>`,
  headers:{'List-Unsubscribe':`<${stop}>`,'List-Unsubscribe-Post':'List-Unsubscribe=One-Click'}};
}

export function ensureLaunchEmailSchema(db){
 db.exec(`CREATE TABLE IF NOT EXISTS launch_email_settings(id INTEGER PRIMARY KEY CHECK(id=1),enabled INTEGER NOT NULL DEFAULT 1,cooldown_until INTEGER NOT NULL DEFAULT 0,last_error TEXT NOT NULL DEFAULT '');
 INSERT OR IGNORE INTO launch_email_settings(id) VALUES(1);
 CREATE TABLE IF NOT EXISTS launch_email_preferences(account_id TEXT PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,subscribed INTEGER NOT NULL DEFAULT 0,consented_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,unsubscribe_token TEXT NOT NULL UNIQUE);
 CREATE TABLE IF NOT EXISTS launch_email_outbox(account_id TEXT PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,recipient TEXT NOT NULL UNIQUE,status TEXT NOT NULL DEFAULT 'pending',payload TEXT NOT NULL,idempotency_key TEXT NOT NULL UNIQUE,attempts INTEGER NOT NULL DEFAULT 0,first_attempt_at INTEGER NOT NULL DEFAULT 0,next_attempt_at INTEGER NOT NULL DEFAULT 0,lease_until INTEGER NOT NULL DEFAULT 0,accepted_at INTEGER NOT NULL DEFAULT 0,provider_id TEXT NOT NULL DEFAULT '',last_error TEXT NOT NULL DEFAULT '',uncertain INTEGER NOT NULL DEFAULT 0);
 CREATE INDEX IF NOT EXISTS idx_launch_email_queue ON launch_email_outbox(status,next_attempt_at,lease_until);`);
}

// One persistent campaign. Neither schedule edits nor process restarts erase receipts.
export function createLaunchEmailService(db,{env=process.env,now=Date.now,fetchImpl=fetch}={}){
 let busy=false;
 const settings=()=>db.prepare('SELECT * FROM launch_settings WHERE id=1').get();
 const control=()=>db.prepare('SELECT * FROM launch_email_settings WHERE id=1').get();
 const canSubscribe=()=>{const s=settings(),time=now();return !!s?.enabled&&s.mode!=='maintenance'&&(s.mode==='closed'||(time<s.opens_at&&launchPhase(s,time)!=='open'));};
 const preference=id=>({available:canSubscribe(),subscribed:!!(id&&db.prepare('SELECT subscribed FROM launch_email_preferences WHERE account_id=?').get(id)?.subscribed)});
 function subscribe(id,enabled){
  if(!db.prepare('SELECT 1 FROM accounts WHERE id=?').get(id))throw new Error('Hesap bulunamadı.');
  if(enabled&&!canSubscribe())throw new Error('Açılış e-postası için kayıt süresi sona erdi.');
  db.prepare(`INSERT INTO launch_email_preferences VALUES(?,?,?,?,?) ON CONFLICT(account_id) DO UPDATE SET subscribed=excluded.subscribed,consented_at=CASE WHEN excluded.subscribed=1 THEN excluded.consented_at ELSE consented_at END,updated_at=excluded.updated_at`).run(id,enabled?1:0,now(),now(),randomBytes(32).toString('hex'));
  if(enabled)db.prepare("UPDATE launch_email_outbox SET status='pending' WHERE account_id=? AND status='cancelled'").run(id);
  else db.prepare("UPDATE launch_email_outbox SET status='cancelled' WHERE account_id=? AND status='pending'").run(id);
  return preference(id);
 }
 function unsubscribe(token){
  if(typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token))return false;
  const result=db.prepare('UPDATE launch_email_preferences SET subscribed=0,updated_at=? WHERE unsubscribe_token=?').run(now(),token);
  db.prepare("UPDATE launch_email_outbox SET status='cancelled' WHERE status='pending' AND account_id IN (SELECT account_id FROM launch_email_preferences WHERE unsubscribe_token=?)").run(token);
  return !!result.changes;
 }
 function adminStatus(){
  const counts={pending:0,sending:0,accepted:0,failed:0,review:0,cancelled:0};
  for(const row of db.prepare('SELECT status,COUNT(*) n FROM launch_email_outbox GROUP BY status').all())counts[row.status]=row.n;
  const s=settings(),c=control();
  const subscribers=db.prepare('SELECT COUNT(*) n FROM launch_email_preferences WHERE subscribed=1').get().n;
  return {enabled:!!c.enabled,configured:!!launchEmailConfig(env),subscribers,counts,lastError:c.last_error,cooldownUntil:c.cooldown_until,opensAt:s.opens_at,
   sendAt:s.opens_at-REMINDER_LEAD,waiting:!reminderDue(s,now()),
   recent:db.prepare('SELECT a.username,o.status,o.attempts,o.accepted_at,o.last_error FROM launch_email_outbox o JOIN accounts a ON a.id=o.account_id ORDER BY o.accepted_at DESC,o.first_attempt_at DESC LIMIT 15').all(),
   preview:{subject:LAUNCH_EMAIL_SUBJECT,text:`Core of Life açık beta açılışı: ${openingText(s.opens_at)}. Açılış saatinden itibaren mevcut hesabınla indirmeden ücretsiz oyna. Beta sonunda hesabın, seviyelerin ve eşyaların korunacak; ilerlemen sıfırlanmayacak.`,button:'Oyuna Git'}};
 }
 async function tick(){
  if(busy)return;
  busy=true;
  try{
   const c=control(),s=settings(),config=launchEmailConfig(env),time=now();
   if(!c.enabled||!reminderDue(s,time)||!config||c.cooldown_until>time)return;
   // Select only consented pre-opening accounts. Never retroactively opt users in.
   const candidates=db.prepare(`SELECT a.id,a.email_normalized,p.unsubscribe_token FROM launch_email_preferences p JOIN accounts a ON a.id=p.account_id LEFT JOIN launch_email_outbox o ON o.account_id=a.id WHERE p.subscribed=1 AND p.consented_at<? AND a.created_at*1000<? AND a.permanently_banned=0 AND a.suspended_until_ms<=? AND o.account_id IS NULL LIMIT 50`).all(s.opens_at,s.opens_at,time);
   for(const a of candidates){
    if(!validEmail(a.email_normalized))continue;
    const payload=buildLaunchEmail({...config,to:a.email_normalized,token:a.unsubscribe_token,opensAt:s.opens_at});
    db.prepare('INSERT OR IGNORE INTO launch_email_outbox(account_id,recipient,payload,idempotency_key) VALUES(?,?,?,?)').run(a.id,a.email_normalized,JSON.stringify(payload),'launch/'+randomUUID());
   }
   // An expired provider idempotency window must never cause an automatic duplicate.
   db.prepare("UPDATE launch_email_outbox SET status='review',last_error='delivery_uncertain' WHERE status IN ('pending','sending') AND first_attempt_at>0 AND first_attempt_at<=? AND lease_until<=?").run(time-23*HOUR,time);
   // Select, safely refresh and lease together: concurrent processes must send
   // exactly the payload/key stored in the outbox. Never refresh uncertain mail.
   let row;
   db.exec('BEGIN IMMEDIATE');
   try{
    row=db.prepare(`SELECT o.*,p.unsubscribe_token FROM launch_email_outbox o JOIN launch_email_preferences p ON p.account_id=o.account_id JOIN accounts a ON a.id=o.account_id WHERE p.subscribed=1 AND a.permanently_banned=0 AND a.suspended_until_ms<=? AND o.status IN ('pending','sending') AND o.next_attempt_at<=? AND o.lease_until<=? ORDER BY o.next_attempt_at,o.rowid LIMIT 1`).get(time,time,time);
    if(row){
     if(!row.uncertain&&!row.first_attempt_at){
      const refreshed=JSON.stringify(buildLaunchEmail({...config,to:row.recipient,token:row.unsubscribe_token,opensAt:s.opens_at}));
      if(refreshed!==row.payload){row.payload=refreshed;row.idempotency_key='launch/'+randomUUID();}
     }
     db.prepare("UPDATE launch_email_outbox SET payload=?,idempotency_key=?,status='sending',lease_until=?,attempts=attempts+1,uncertain=1,first_attempt_at=CASE WHEN first_attempt_at=0 THEN ? ELSE first_attempt_at END WHERE account_id=?").run(row.payload,row.idempotency_key,time+60000,time,row.account_id);
    }
    db.exec('COMMIT');
   }catch(error){db.exec('ROLLBACK');throw error;}
   if(!row)return;
   let response,payload;
   try{
    response=await fetchImpl('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${config.key}`,'Content-Type':'application/json','Idempotency-Key':row.idempotency_key},body:row.payload,signal:AbortSignal.timeout(8000)});
    if(response.ok)payload=await response.json();
   }catch{}
   if(response?.ok&&typeof payload?.id==='string'&&payload.id){
    db.prepare("UPDATE launch_email_outbox SET status='accepted',accepted_at=?,provider_id=?,lease_until=0,last_error='' WHERE account_id=?").run(now(),payload.id.slice(0,200),row.account_id);
    db.prepare("UPDATE launch_email_settings SET last_error='' WHERE id=1").run();
    return;
   }
   const status=response?.status||0,definiteRejection=status>=400&&status<500&&status!==408&&status!==409;
   const permanent=definiteRejection&&![401,403,429].includes(status);
   const code=status?`provider_${status}`:'provider_unavailable';
   const retryAfter=Number(response?.headers?.get('retry-after'));
   const delay=Math.min(HOUR,Math.max(60000,Number.isFinite(retryAfter)?retryAfter*1000:0,60000*2**Math.min(row.attempts,6)));
   // Definite rejections did not send mail; begin a fresh safe window after quota/config recovery.
   const safeRejection=definiteRejection&&!row.uncertain;
   db.prepare("UPDATE launch_email_outbox SET status=?,lease_until=0,next_attempt_at=?,first_attempt_at=CASE WHEN ? THEN 0 ELSE first_attempt_at END,uncertain=?,last_error=? WHERE account_id=?").run(permanent?'failed':'pending',now()+delay,safeRejection?1:0,safeRejection?0:1,code,row.account_id);
   db.prepare('UPDATE launch_email_settings SET cooldown_until=?,last_error=? WHERE id=1').run(now()+delay,code);
  }finally{busy=false;}
 }
 return {preference,canSubscribe,subscribe,unsubscribe,adminStatus,tick,
  async test(to){
   const config=launchEmailConfig(env);
   if(!config||!validEmail(to))throw new Error('Resend e-posta ayarları veya yönetici e-posta adresi geçersiz.');
   const payload=buildLaunchEmail({...config,to,token:randomBytes(32).toString('hex'),opensAt:settings().opens_at});
   payload.subject='[TEST] '+payload.subject;
   payload.text='Bu yalnızca bir testtir. Gerçek açılış gönderimi başlatılmadı.\n\n'+payload.text;
   payload.html=payload.html.replace('<h1 style=', '<p style="color:#d8bc78">TEST · Gerçek açılış gönderimi başlatılmadı.</p><h1 style=');
   delete payload.headers;
   // No subscription exists for an admin-only test. Do not include a dead unsubscribe link.
   payload.text=payload.text.split('\n\nBu tek seferlik')[0];
   payload.html=payload.html.replace(/<p style="font-size:14px;line-height:1.6;color:#c2cbbb">[\s\S]*?<\/a>/,'');
   const response=await fetchImpl('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${config.key}`,'Content-Type':'application/json','Idempotency-Key':'launch-test/'+randomUUID()},body:JSON.stringify(payload),signal:AbortSignal.timeout(8000)});
   if(!response.ok)throw new Error(`Test e-postası kabul edilmedi (Resend ${response.status}). Gönderici alan adını, API anahtarını ve kotayı kontrol et.`);
   const result=await response.json();if(!result?.id)throw new Error('E-posta sağlayıcısı gönderimi doğrulamadı.');
  },
  setEnabled(enabled){db.prepare('UPDATE launch_email_settings SET enabled=? WHERE id=1').run(enabled?1:0);},
  start(){const timer=setInterval(()=>{void tick().catch(()=>{console.error('Launch email queue retry');});},2000);timer.unref();return()=>clearInterval(timer);}
 };
}
