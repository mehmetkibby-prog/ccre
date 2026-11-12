import {humanAccountWhere492} from '../../../native510-bb3a6cc689c6/vds-server/src/admin-population492.mjs';

export function createRealmRegistrationsR101(db,{now=Date.now}={}) {
 db.exec(`CREATE TABLE IF NOT EXISTS realm_registrations_r101(realm_id TEXT NOT NULL CHECK(realm_id IN ('r1','r2')),account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,requested_at_ms INTEGER NOT NULL,PRIMARY KEY(realm_id,account_id));
 CREATE INDEX IF NOT EXISTS realm_registrations_order_r101 ON realm_registrations_r101(realm_id,requested_at_ms DESC,account_id DESC);
 CREATE TABLE IF NOT EXISTS realm_registration_init_r101(id INTEGER PRIMARY KEY CHECK(id=1));
 CREATE TABLE IF NOT EXISTS realm_access_policy_r101(realm_id TEXT PRIMARY KEY CHECK(realm_id='r2'),test_only INTEGER NOT NULL CHECK(test_only IN (0,1)),revision INTEGER NOT NULL);
 INSERT OR IGNORE INTO realm_access_policy_r101 VALUES('r2',1,1);`);
 db.exec('BEGIN IMMEDIATE');
 try {
  if(db.prepare('INSERT OR IGNORE INTO realm_registration_init_r101 VALUES(1)').run().changes)
   db.prepare("INSERT OR IGNORE INTO realm_registrations_r101 SELECT 'r1',id,created_at*1000 FROM accounts").run();
  db.exec('COMMIT');
 }catch(e){db.exec('ROLLBACK');throw e;}
 const check=db.prepare('SELECT 1 FROM realm_registrations_r101 WHERE realm_id=? AND account_id=?');
 const readTest=db.prepare("SELECT test_only,revision FROM realm_access_policy_r101 WHERE realm_id='r2'");
 const testAccess=()=>{const row=readTest.get();return {testOnly:row.test_only===1,revision:row.revision};};
 function saveTestAccess({enabled,revision}){
  if(typeof enabled!=='boolean'||!Number.isSafeInteger(revision)||revision<1)throw Object.assign(Error('Geçersiz test erişimi ayarı.'),{status:400});
  if(!db.prepare("UPDATE realm_access_policy_r101 SET test_only=?,revision=revision+1 WHERE realm_id='r2' AND revision=?").run(enabled?1:0,revision).changes)throw Object.assign(Error('Test ayarı başka pencerede değişti. Yenileyip tekrar dene.'),{status:409});
  return testAccess();
 }
 function enroll(realmId,accountId){
  if(!['r1','r2'].includes(realmId)||!db.prepare('SELECT 1 FROM accounts WHERE id=?').get(accountId))throw Error('Hesap bulunamadı.');
  db.prepare('INSERT OR IGNORE INTO realm_registrations_r101 VALUES(?,?,?)').run(realmId,accountId,now());
 }
 function wrap(realmId,launch){
  const access=realmId==='r2'?'r101_r2_launch_access':'launch_access';
  function registrations(search='',requestedPage=1){
   const q='%'+String(search).slice(0,80)+'%',human=humanAccountWhere492(db);
   const base=`FROM realm_registrations_r101 r JOIN accounts a ON a.id=r.account_id WHERE r.realm_id=? AND (${human})`;
   const totalRegistered=db.prepare('SELECT COUNT(*) n '+base).get(realmId).n;
   const filter=' AND (a.username LIKE ? OR a.email LIKE ?)';
   const total=db.prepare('SELECT COUNT(*) n '+base+filter).get(realmId,q,q).n;
   const pageCount=Math.max(1,Math.ceil(total/50)),page=Math.max(1,Math.min(pageCount,Math.floor(Number(requestedPage)||1)));
   const accounts=db.prepare(`SELECT a.id,a.username,a.email,a.created_at,NULL AS player_name,EXISTS(SELECT 1 FROM ${access} x WHERE x.account_id=a.id) AS allowed `+base+filter+' ORDER BY r.requested_at_ms DESC,a.id DESC LIMIT 50 OFFSET ?').all(realmId,q,q,(page-1)*50);
   return {accounts,total,page,pageCount,totalRegistered};
  }
  return {...launch,registrations,accounts:search=>registrations(search).accounts,...(realmId==='r2'?{testAccess,saveTestAccess}:{}),
   grant(accountId,allow){
    if(!check.get(realmId,accountId)){
     if(accountId===process.env.ADMIN_USER_ID)enroll(realmId,accountId);
     else throw Error('Bu hesap henüz bu sunucuya kayıt başvurusu yapmadı.');
    }
    return launch.grant(accountId,allow);
   },
   status(accountId){
    const s=launch.status(accountId);if(realmId!=='r2')return s;
    const owner=!!accountId&&accountId===process.env.ADMIN_USER_ID;
    const approved=!!accountId&&!!check.get('r2',accountId)&&launch.permitted(accountId);
    // Public preregistration keeps the countdown and automatic opening. The
    // realm's registration-list grant admits only that enrolled account early.
    if(!testAccess().testOnly){
     const waiting=s.mode==='scheduled'&&s.publicOpeningAt>s.serverTime;
     const canPlay=owner||(approved&&s.canPlay);
     return {...s,...(waiting?{canPlay,earlyAccess:canPlay,showLanding:!canPlay}:{}),approvalRequired:false,registered:!!accountId&&!!check.get('r2',accountId)};
    }
    const canPlay=owner||(approved&&s.canPlay);
    return {...s,canPlay,earlyAccess:approved||owner,showLanding:!canPlay,approvalRequired:true,registered:!!accountId&&!!check.get('r2',accountId),automaticOpening:false};
   }
  };
 }
 return {enroll,has:(realmId,accountId)=>!!check.get(realmId,accountId),wrap};
}

// Numeric population is deliberately absent, including for approved players.
export function academyCatalogR101(rows,{accountId,launchFor,security,includeHidden=false}={}) {
 return rows.flatMap(row=>{
  const policy=launchFor?.(row.id)?.status(accountId);
  const blocked=!!accountId&&security?.(row.id,accountId)?.blocked;
  if(row.id==='r2'&&policy?.approvalRequired!==false&&!includeHidden&&(!policy?.earlyAccess||blocked))return [];
  const canEnter=row.status==='open'&&policy?.canPlay===true&&!blocked;
  return [{...row,...(row.id==='r2'?{...(policy?.approvalRequired!==false?{status:row.status==='maintenance'?'maintenance':'closed',load:null}:{}),preRegistration:policy?.approvalRequired===false&&policy?.phase==='waiting',approvalRequired:policy?.approvalRequired!==false,registered:policy?.registered===true,approved:policy?.earlyAccess===true}:{}),canEnter}];
 });
}
