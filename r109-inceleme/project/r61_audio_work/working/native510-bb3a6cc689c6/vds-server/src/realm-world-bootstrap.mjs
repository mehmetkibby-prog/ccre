import {DatabaseSync} from 'node:sqlite';
import {readdirSync,readFileSync,openSync,closeSync,fsyncSync,realpathSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {bindRealmDatabaseIdentity} from './realm-database-identity.mjs';

// Local creation from the versioned base schema only. No D1 connection, no
// schema-reference execution, no legacy player/account rows are imported.
export function createEmptyRealmWorld({destination,realmId,dbIdentity}) {
 if(typeof destination!=='string'||!path.isAbsolute(destination)||path.normalize(destination)!==destination||realpathSync(path.dirname(destination))!==path.dirname(destination))throw new Error('Canonical new realm database path required');
 const fd=openSync(destination,'wx',0o600);closeSync(fd);
 const db=new DatabaseSync(destination);
 try {
  db.exec('PRAGMA synchronous=FULL; PRAGMA journal_mode=DELETE; BEGIN IMMEDIATE');
  const root=fileURLToPath(new URL('../../drizzle/',import.meta.url));
  for(const file of readdirSync(root).filter(f=>/^\d+_[a-z0-9_]+\.sql$/.test(f)).sort())db.exec(readFileSync(path.join(root,file),'utf8'));
  for(const table of ['accounts','players','player_items','auth_sessions'])
   if(db.prepare(`SELECT count(*) n FROM ${table}`).get().n!==0)throw new Error('Base world contains user data');
  db.prepare('INSERT OR IGNORE INTO world_state(id,health,updated_at) VALUES(1,100,?)').run(Math.floor(Date.now()/1000));
  db.prepare('UPDATE game_settings SET channel_capacity=25 WHERE id=1').run();
  if(db.prepare('PRAGMA integrity_check').get().integrity_check!=='ok')throw new Error('New world integrity failed');
  db.exec('COMMIT');
  bindRealmDatabaseIdentity(db,{realmId,dbIdentity});
 }catch(error){try{db.exec('ROLLBACK');}catch{}throw error;}finally{db.close();}
 const file=openSync(destination,'r');try{fsyncSync(file);}finally{closeSync(file);}
 const directory=openSync(path.dirname(destination),'r');try{fsyncSync(directory);}finally{closeSync(directory);}
 return {realmId,dbIdentity,accounts:0,players:0,items:0,channels:3,channelCapacity:25};
}
