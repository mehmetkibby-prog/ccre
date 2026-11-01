const validId=id=>typeof id==='string'&&/^[a-z][a-z0-9-]{0,31}$/.test(id);
const validIdentity=id=>typeof id==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(id);
function validate(expected){
  if(!validId(expected?.realmId)||!validIdentity(expected?.dbIdentity))throw new Error('Explicit realm/database identity required');
}

// Startup is read-only with respect to identity. An unbound legacy database
// must pass the separately controlled offline migration; starting a process
// never silently adopts an arbitrary file as that realm's world.
export function assertRealmDatabaseIdentity(db,expected){
  validate(expected);
  const exists=db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='realm_identity'").get();
  if(!exists)throw new Error('Realm database has not completed identity migration');
  const row=db.prepare('SELECT realm_id,database_id FROM realm_identity WHERE id=1').get();
  if(!row||row.realm_id!==expected.realmId||row.database_id!==expected.dbIdentity)throw new Error('Wrong realm database');
  return {realmId:row.realm_id,dbIdentity:row.database_id};
}

export function bindRealmDatabaseIdentity(db,expected){
  validate(expected);
  if(db.prepare('PRAGMA synchronous').get().synchronous<2)throw new Error('Offline identity binding requires FULL durability');
  db.exec('BEGIN IMMEDIATE');
  try{
    db.exec(`CREATE TABLE IF NOT EXISTS realm_identity(
      id INTEGER PRIMARY KEY CHECK(id=1),realm_id TEXT NOT NULL,database_id TEXT NOT NULL
    )`);
    db.prepare('INSERT OR IGNORE INTO realm_identity(id,realm_id,database_id) VALUES(1,?,?)').run(expected.realmId,expected.dbIdentity);
    const result=assertRealmDatabaseIdentity(db,expected);
    db.exec('COMMIT');return result;
  }catch(error){db.exec('ROLLBACK');throw error;}
}
