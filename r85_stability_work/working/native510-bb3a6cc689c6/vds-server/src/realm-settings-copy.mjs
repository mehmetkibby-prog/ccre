import {DatabaseSync} from 'node:sqlite';
import {ensureLaunchSchema} from './launch-service.mjs';
import {verifyBackup} from './sqlite-backup.mjs';
const tables=['game_settings','combat_settings','economy_settings','monster_combat_config','dungeon_settings','dragon_settings','premium_shop_settings','progression_settings','guild_village_settings','rank_settings','launch_settings'];
const quote=s=>'"'+s.replaceAll('"','""')+'"';
// Preserve game balance from the VERIFIED archive; not a player/identity import.
// Destinations must still be empty. Unknown source tables are never copied.
export async function preserveRealmSettings({backupFile,manifest}){
 await verifyBackup(backupFile);const source=new DatabaseSync(backupFile,{readOnly:true}),report=[];
 try{
  for(const target of [{id:'accounts',database:manifest.accountsDatabase},...manifest.realms]){
   const db=new DatabaseSync(target.database);
   try{
    db.exec('PRAGMA synchronous=FULL; BEGIN IMMEDIATE');
    for(const table of target.id==='accounts'?['accounts']:['accounts','players','player_items'])
     if(db.prepare(`SELECT count(*) n FROM ${table}`).get().n)throw new Error('Settings restoration requires an empty world');
    if(target.id==='accounts')ensureLaunchSchema(db,{accountsOnly:true});
    for(const table of target.id==='accounts'?['launch_settings']:tables){
     if(!source.prepare("SELECT 1 FROM sqlite_schema WHERE type='table' AND name=?").get(table))continue;
     const columns=source.prepare(`PRAGMA table_info(${quote(table)})`).all().map(r=>r.name);
     const supported=new Set(db.prepare(`PRAGMA table_info(${quote(table)})`).all().map(r=>r.name));
     if(columns.some(c=>!supported.has(c)))throw new Error('Settings schema mismatch: '+table);
     const rows=source.prepare(`SELECT * FROM ${quote(table)}`).all();
     const put=db.prepare(`INSERT OR REPLACE INTO ${quote(table)}(${columns.map(quote)}) VALUES(${columns.map(()=>'?')})`);
     for(const row of rows)put.run(...columns.map(c=>row[c]));
     report.push({realm:target.id,table,rows:rows.length});
    }
    if(target.id!=='accounts')db.exec('UPDATE game_settings SET channel_capacity=25 WHERE id=1');
    db.exec('COMMIT');
   }catch(e){try{db.exec('ROLLBACK');}catch{}throw e;}finally{db.close();}
  }
 }finally{source.close();}
 return report;
}
