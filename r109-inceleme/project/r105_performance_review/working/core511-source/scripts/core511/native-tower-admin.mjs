import {TOWER_CATALOG,TOWER_KINDS,readTowerConfig,validateTowerConfig} from './tower-config.mjs';

const conflict=()=>Object.assign(new Error('Kule ayarları değişti. Paneli yenileyip tekrar kaydedin.'),{status:409});
// This adapter is private to the existing authorized, same-origin admin route.
// Its synchronous write runs under the native all-owner configuration barrier;
// that barrier waits for durableExternal before returning to the HTTP handler.
export class NativeTowerAdmin {
 constructor(database){this.database=database;}
 get(){const row=this.database.sqlite.prepare('SELECT value FROM kadim_tower_settings WHERE id=1').get();if(!row)throw Error('Kule ayarları henüz hazır değil.');const config=readTowerConfig(row.value);return {config,revision:config.revision,catalog:TOWER_CATALOG,kinds:TOWER_KINDS};}
 async save(input,revision){
  if(!Number.isSafeInteger(revision)||revision<1)throw conflict();
  let config;try{config=validateTowerConfig(input);}catch(error){error.status=422;throw error;}
  if(revision>=Number.MAX_SAFE_INTEGER)throw conflict();
  config.revision=revision+1;
  const db=this.database,barrier=db.core511Configuration;
  if(!barrier||typeof barrier.run!=='function')throw Object.assign(new Error('Çekirdek ayar kaydı için hazır değil.'),{status:503});
  if(this.get().revision!==revision)throw conflict();
  return barrier.run([],()=>{
   const sql=db.sqlite;if(sql.isTransaction)throw Error('tower_admin_transaction_overlap');
   sql.exec('BEGIN IMMEDIATE');
   try{
    const prior=sql.prepare('SELECT value FROM kadim_tower_settings WHERE id=1').get();
    if(!prior||readTowerConfig(prior.value).revision!==revision)throw conflict();
    const result=sql.prepare('UPDATE kadim_tower_settings SET value=?,revision=? WHERE id=1 AND value=?').run(JSON.stringify(config),config.revision,prior.value);
    if(result.changes!==1)throw conflict();
    sql.exec('COMMIT');return {config,revision:config.revision,catalog:TOWER_CATALOG,kinds:TOWER_KINDS};
   }catch(error){if(sql.isTransaction)sql.exec('ROLLBACK');throw error;}
  });
 }
}
