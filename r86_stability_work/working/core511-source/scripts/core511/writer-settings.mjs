import {prepareCached477} from '../../../native510-bb3a6cc689c6/vds-server/src/prepared-statements477.mjs';
import {SETTINGS_CACHE} from './performance-options.mjs';

export class WriterSettings {
 initialize(sql){
  this.sql=sql;if(!SETTINGS_CACHE)return;
  let serial=0;
  // The JS serial cannot be rolled back. The TEMP row can. Their combination
  // distinguishes a reverted edit from a later edit reusing the same counter.
  sql.function('kernel511_settings_serial',()=>++serial);
  sql.exec('CREATE TEMP TABLE kernel511_settings_version(v INTEGER NOT NULL);INSERT INTO kernel511_settings_version VALUES(0)');
  for(const table of ['game_settings','combat_settings'])for(const event of ['INSERT','UPDATE','DELETE'])sql.exec(`CREATE TEMP TRIGGER kernel511_settings_${table}_${event} AFTER ${event} ON main.${table} BEGIN UPDATE kernel511_settings_version SET v=kernel511_settings_serial();END`);
  this.version=sql.prepare('SELECT v FROM temp.kernel511_settings_version');
  this.external=sql.prepare('PRAGMA data_version');
 }
 read(sql){
  if(sql!==this.sql)throw new TypeError('Settings connection mismatch');
  const load=()=>({...prepareCached477(sql,'SELECT * FROM game_settings WHERE id=1').get(),...prepareCached477(sql,'SELECT * FROM combat_settings WHERE id=1').get()});
  if(!SETTINGS_CACHE)return load();
  const version=this.version.get().v,external=this.external.get().data_version;
  if(!this.cached||version!==this.cached.version||external!==this.cached.external)this.cached={version,external,value:Object.freeze(load())};
  return this.cached.value;
 }
}
