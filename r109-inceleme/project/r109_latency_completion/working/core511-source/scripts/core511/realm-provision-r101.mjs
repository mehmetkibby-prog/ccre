import fs from 'node:fs';
import path from 'node:path';
import {prepareNewRealmSchemaR101} from './generated/new-realm-schema-r101.mjs';
import {createEmptyRealmWorld} from '../../../native510-bb3a6cc689c6/vds-server/src/realm-world-bootstrap.mjs';
import {LocalDatabase} from '../../../native510-bb3a6cc689c6/vds-server/src/database.mjs';
import {createNativeWorldStartup} from './generated/native-world-startup.mjs';
import {DatabaseHost} from './database-host.mjs';
import {NativeWorldStartup} from './native-world-startup.mjs';

// Exclusive new-file creation. This function never opens an existing world.
// Initial configuration is versioned defaults; accounts and inventories arrive
// only through authenticated realm entry, never by cloning the Efsane database.
export async function provisionAcademyR101({file,dbIdentity}){
 if(!path.isAbsolute(file)||fs.existsSync(file)||fs.existsSync(file+'-wal'))throw Error('Akademi için yeni veritabanı yolu gerekli.');
 createEmptyRealmWorld({destination:file,realmId:'r2',dbIdentity});
 const database=new LocalDatabase(file,{groupWrites:false,asyncDurable:false});
 try{
  await prepareNewRealmSchemaR101(database.sqlite,{database:file});
  await createNativeWorldStartup(database).ensureWorldSeed();
  database.sqlite.prepare('UPDATE game_settings SET channel_capacity=10 WHERE id=1').run();
  await database.durableAfterCommit();
 }finally{database.close();}
 const host=await DatabaseHost.open({file,realmId:'r2',dbIdentity});
 try{
  await host.bootstrap();await NativeWorldStartup.prepare(host);
  const sql=host.database.sqlite;
  for(const table of ['accounts','players','player_items','auth_sessions'])if(sql.prepare(`SELECT COUNT(*) n FROM ${table}`).get().n!==0)throw Error('Yeni Akademi oyuncu verisi içeriyor.');
  if(sql.prepare('PRAGMA quick_check').get().quick_check!=='ok')throw Error('Yeni Akademi doğrulanamadı.');
  const channels=sql.prepare('SELECT DISTINCT channel FROM monsters ORDER BY channel').all().map(r=>r.channel);
  if(![1,2,3,4].every(n=>channels.includes(n)))throw Error('Dört Akademi kanalı hazırlanamadı.');
  return {realmId:'r2',channels:4,capacity:10,players:0,bytes:fs.statSync(file).size};
 }finally{await host.close();}
}
