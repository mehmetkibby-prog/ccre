import {humanAccountWhere492} from './admin-population492.mjs';
// All dates are absolute UTC milliseconds; administration displays Europe/Istanbul.
export const LAUNCH_DEFAULTS={enabled:1,registration_at:Date.parse('2026-09-21T00:00:00+03:00'),opens_at:Date.parse('2026-09-23T19:00:00+03:00'),ends_at:Date.parse('2026-09-28T19:00:00+03:00'),mode:'scheduled'};
export const PUBLIC_OPENING478=Date.parse('2026-10-10T19:00:00+03:00');
// Separate from the historical beta dates: those dates also bound starter gifts.
const publicOpening=s=>Number.isSafeInteger(s.public_opens_at)&&s.public_opens_at>0&&s.public_opens_at<4102444800000?s.public_opens_at:0;
export function launchPhase(s,now=Date.now()){
 if(s.mode==='maintenance')return 'maintenance';
 if(!s.enabled)return 'normal';
 if(s.mode==='open')return 'open';
 if(s.mode==='closed')return 'waiting';
 if(s.mode==='scheduled'&&publicOpening(s))return now<publicOpening(s)?'waiting':'open';
 if(now<s.registration_at)return 'normal';
 if(now<s.opens_at)return 'waiting';
 return now<s.ends_at?'open':'ended';
}
export function ensureLaunchSchema(db,{accountsOnly=false,resetClosed438=false}={}){
 db.exec(`CREATE TABLE IF NOT EXISTS launch_settings(id INTEGER PRIMARY KEY CHECK(id=1),enabled INTEGER NOT NULL,registration_at INTEGER NOT NULL,opens_at INTEGER NOT NULL,ends_at INTEGER NOT NULL,mode TEXT NOT NULL,revision INTEGER NOT NULL DEFAULT 1);
 CREATE TABLE IF NOT EXISTS launch_access(account_id TEXT PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,granted_at INTEGER NOT NULL);`);
 const columns=new Set(db.prepare('PRAGMA table_info(launch_settings)').all().map(c=>c.name));
 if(!columns.has('maintenance_text'))db.exec("ALTER TABLE launch_settings ADD COLUMN maintenance_text TEXT NOT NULL DEFAULT ''");
 if(!columns.has('maintenance_started_at'))db.exec("ALTER TABLE launch_settings ADD COLUMN maintenance_started_at INTEGER NOT NULL DEFAULT 0");
 if(!columns.has('maintenance_deadline_ms'))db.exec("ALTER TABLE launch_settings ADD COLUMN maintenance_deadline_ms INTEGER NOT NULL DEFAULT 0");
 if(!columns.has('public_opens_at'))db.exec('ALTER TABLE launch_settings ADD COLUMN public_opens_at INTEGER NOT NULL DEFAULT 0');
 if(!accountsOnly)db.exec('CREATE INDEX IF NOT EXISTS game_presence_expiry438 ON game_presence(expires_at_ms)');
 const s=LAUNCH_DEFAULTS;
 const result=db.prepare('INSERT OR IGNORE INTO launch_settings(id,enabled,registration_at,opens_at,ends_at,mode) VALUES(1,?,?,?,?,?)').run(s.enabled,s.registration_at,s.opens_at,s.ends_at,s.mode);
 // Only first installation initializes the old in-game countdown. Restarts preserve admin edits.
 if(result.changes&&!accountsOnly)db.prepare('UPDATE game_settings SET beta_starts_at=?,beta_ends_at=? WHERE id=1').run(s.opens_at/1000,s.ends_at/1000);
 // Owner requested a one-time return to preregistration. This runs on accounts startup before HTTP accepts requests, on its FULL-durable connection.
 if(accountsOnly&&resetClosed438){db.exec('CREATE TABLE IF NOT EXISTS launch_schema_updates(version INTEGER PRIMARY KEY,applied_at INTEGER NOT NULL)');db.exec('BEGIN IMMEDIATE');try{const applied=db.prepare('INSERT OR IGNORE INTO launch_schema_updates(version,applied_at) VALUES(438,?)').run(Date.now());if(applied.changes)db.prepare("UPDATE launch_settings SET enabled=1,mode='closed',revision=revision+1 WHERE id=1").run();db.exec('COMMIT');}catch(error){db.exec('ROLLBACK');throw error;}}
 // Arm once on the FULL-durable accounts connection, before accepting HTTP.
 // A later manual close or maintenance change survives every restart/reinstall.
 // Existing explicit maintenance/open states keep their authority.
 if(accountsOnly&&resetClosed438){
  db.exec('BEGIN IMMEDIATE');
  try{
   const applied=db.prepare('INSERT OR IGNORE INTO launch_schema_updates(version,applied_at) VALUES(478,?)').run(Date.now());
   if(applied.changes)db.prepare("UPDATE launch_settings SET public_opens_at=?,mode=CASE WHEN mode='maintenance' THEN 'maintenance' WHEN mode='open' OR enabled=0 THEN 'open' ELSE 'scheduled' END,enabled=1,revision=revision+1 WHERE id=1").run(PUBLIC_OPENING478);
   db.exec('COMMIT');
  }catch(error){db.exec('ROLLBACK');throw error;}
 }
}
export function createLaunchService(db,{now=Date.now,accountsOnly=false}={}){
 // These run on every authenticated gameplay request. Cache compiled plans,
 // never settings or authorization results: edits/revocations remain immediate.
 const listeners=new Set();
 const notify=()=>{for(const listener of listeners)try{listener();}catch{}};
 const readSettings=db.prepare('SELECT * FROM launch_settings WHERE id=1');
 const readAccess=db.prepare('SELECT 1 FROM launch_access WHERE account_id=?');
 const settings=()=>({...readSettings.get()});
 const permitted=id=>!!id&&!!readAccess.get(id);
 function status(accountId){const s=settings(),phase=launchPhase(s,now()),earlyAccess=permitted(accountId),opening=publicOpening(s);return {enabled:!!s.enabled,phase,mode:s.mode,registrationAt:s.registration_at,opensAt:opening||s.opens_at,endsAt:s.ends_at,publicOpeningAt:opening,automaticOpening:!!s.enabled&&s.mode==='scheduled'&&!!opening,permanentOpening:!!opening,serverTime:now(),canPlay:phase==='maintenance'?!!accountId&&now()<s.maintenance_deadline_ms:(phase==='normal'||phase==='open'||earlyAccess),earlyAccess,showLanding:phase==='waiting'||phase==='ended'||phase==='maintenance',maintenanceText:s.maintenance_text??'',maintenanceStartedAt:s.maintenance_started_at??0,maintenanceDeadlineMs:s.maintenance_deadline_ms??0,registrationOpen:phase!=='maintenance',revision:s.revision};}
 function save(input){
  const s={enabled:input.enabled?1:0,registration_at:input.registration_at,opens_at:input.opens_at,ends_at:input.ends_at,mode:input.mode,maintenance_text:String(input.maintenance_text??'').trim().slice(0,2000)};
  if(!['scheduled','open','closed','maintenance'].includes(s.mode)||![s.registration_at,s.opens_at,s.ends_at].every(v=>Number.isSafeInteger(v)&&v>0&&v<4102444800000)||s.registration_at>=s.opens_at||s.opens_at>=s.ends_at)throw new Error('Kayıt, açılış ve bitiş tarihleri sıralı olmalı.');
  if(input.public_opens_at!==undefined&&(!Number.isSafeInteger(input.public_opens_at)||input.public_opens_at<0||input.public_opens_at>=4102444800000))throw new Error('Kalıcı açılış tarihi geçersiz.');
  db.exec('BEGIN IMMEDIATE');try{
   const previous=settings(),entering=s.mode==='maintenance'&&previous.mode!=='maintenance';
   const started=s.mode==='maintenance'?(entering?now():previous.maintenance_started_at):0;
   const deadline=s.mode==='maintenance'?(entering?started+10000:previous.maintenance_deadline_ms):0;
   const opening=input.public_opens_at??publicOpening(previous);
   const r=db.prepare('UPDATE launch_settings SET enabled=?,registration_at=?,opens_at=?,ends_at=?,mode=?,maintenance_text=?,maintenance_started_at=?,maintenance_deadline_ms=?,public_opens_at=?,revision=revision+1 WHERE id=1 AND revision=?').run(s.enabled,s.registration_at,s.opens_at,s.ends_at,s.mode,s.maintenance_text,started,deadline,opening,input.revision);
   if(!r.changes)throw new Error('Ayarlar başka pencerede değişti. Yenileyip tekrar dene.');
   if(!accountsOnly)db.prepare('UPDATE game_settings SET beta_starts_at=?,beta_ends_at=? WHERE id=1').run(Math.floor(s.opens_at/1000),Math.floor(s.ends_at/1000));db.exec('COMMIT');
  }catch(e){db.exec('ROLLBACK');throw e;}notify();return settings();
 }
 return {settings,status,save,permitted,controlState(){const s=settings();return {revision:s.revision,phase:launchPhase(s,now()),startedAt:s.maintenance_started_at??0,deadlineMs:s.maintenance_deadline_ms??0,serverTime:now(),adminAccountId:process.env.ADMIN_USER_ID||'',maintenanceText:s.maintenance_text??''};},subscribe(listener){listeners.add(listener);return()=>listeners.delete(listener);},
  registrations(search='',requestedPage=1){
   const q='%'+String(search).slice(0,80)+'%';
   const playerJoin=accountsOnly?'':'LEFT JOIN players p ON p.account_id=a.id';
   const playerName=accountsOnly?'NULL':'p.name';
   const human492=humanAccountWhere492(db);
   const where=`(${human492}) AND (a.username LIKE ? OR a.email LIKE ? OR ${playerName} LIKE ?)`;
   const total=db.prepare(`SELECT COUNT(*) n FROM accounts a ${playerJoin} WHERE ${where}`).get(q,q,q).n;
   const pageCount=Math.max(1,Math.ceil(total/50)),page=Math.max(1,Math.min(pageCount,Math.floor(Number(requestedPage)||1)));
   const accounts=db.prepare(`SELECT a.id,a.username,a.email,a.created_at,${playerName} AS player_name,CASE WHEN x.account_id IS NULL THEN 0 ELSE 1 END AS allowed FROM accounts a ${playerJoin} LEFT JOIN launch_access x ON x.account_id=a.id WHERE ${where} ORDER BY a.created_at DESC,a.id DESC LIMIT 50 OFFSET ?`).all(q,q,q,(page-1)*50);
   return {accounts,total,page,pageCount,totalRegistered:db.prepare(`SELECT COUNT(*) n FROM accounts a WHERE ${human492}`).get().n};
  },
  deadline(accountId){const s=settings();if(s.mode==='maintenance')return s.maintenance_deadline_ms||now();if(permitted(accountId)||!s.enabled||s.mode==='open')return Infinity;const t=now(),opening=publicOpening(s);if(s.mode==='scheduled'&&opening)return t<opening?opening:Infinity;return t<s.registration_at?s.registration_at:t<s.ends_at?s.ends_at:t;},
  grant(accountId,allow){if(!db.prepare('SELECT 1 FROM accounts WHERE id=?').get(accountId))throw new Error('Hesap bulunamadı.');if(allow)db.prepare('INSERT OR IGNORE INTO launch_access VALUES(?,?)').run(accountId,now());else db.prepare('DELETE FROM launch_access WHERE account_id=?').run(accountId);},
  accounts(search=''){const q='%'+String(search).slice(0,80)+'%';const playerName=accountsOnly?'NULL':'p.name',playerJoin=accountsOnly?'':'LEFT JOIN players p ON p.account_id=a.id';return db.prepare(`SELECT a.id,a.username,${playerName} AS player_name,CASE WHEN x.account_id IS NULL THEN 0 ELSE 1 END AS allowed FROM accounts a ${playerJoin} LEFT JOIN launch_access x ON x.account_id=a.id WHERE (${humanAccountWhere492(db)}) AND (a.username LIKE ? OR ${playerName} LIKE ? OR x.account_id IS NOT NULL) ORDER BY allowed DESC,a.username LIMIT 100`).all(q,q);}
 };
}
