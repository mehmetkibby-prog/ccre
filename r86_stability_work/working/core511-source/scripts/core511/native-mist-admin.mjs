import {randomUUID} from 'node:crypto';
import {MIST_CATALOG,MIST_KINDS,MIST_MAPS,readMistConfig,validateMistConfig} from './mist-config.mjs';
import {createRules} from './generated/rules.mjs';

const reject=(message,status=422)=>{throw Object.assign(Error(message),{status});};
const rules=createRules();
const spawnPoints=Object.freeze(Object.fromEntries(Object.keys(MIST_MAPS).map(area=>{
 const point=[[1800,1100],[900,900],[500,900],[1200,1000],[300,300]].find(([x,y])=>rules.isAreaWalkableSegment(area,x,y,x,y));
 return [area,point?{x:point[0],y:point[1]}:null];
})));
const sameSchedule=(row,wanted,immediate)=>row.channel===wanted.channel&&row.area===wanted.area&&row.x===wanted.x&&row.y===wanted.y&&row.gold===wanted.gold&&(immediate||row.at_ms===wanted.at_ms);
export class NativeMistAdmin {
 constructor(database){this.database=database;}
 get(){const sql=this.database.sqlite,config=readMistConfig(sql.prepare('SELECT value FROM adventure_settings WHERE id=1').get()?.value);return {config,revision:config.revision,catalog:MIST_CATALOG,kinds:MIST_KINDS,maps:MIST_MAPS,spawnPoints,schedules:sql.prepare('SELECT id,channel,area,x,y,at_ms,gold FROM adventure_schedule WHERE done_ms=0 ORDER BY at_ms LIMIT 64').all()};}
 async act(input){
  if(!input||typeof input!=='object'||Array.isArray(input))reject('Geçersiz Sis Yarığı isteği.');
  if(input.action==='sis_mist_get')return this.get();
  const db=this.database,barrier=db.core511Configuration;if(typeof barrier?.run!=='function')reject('Çekirdek ayar kaydı için hazır değil.',503);
  const before=this.get();let config=null,schedule=null;const immediate=input.action==='sis_mist_spawn';
  if(input.action==='sis_mist_save'){
   if(!Number.isSafeInteger(input.revision)||input.revision<1||input.revision>=Number.MAX_SAFE_INTEGER||input.revision!==before.revision)reject('Ayarlar değişti; taslağını koruyup canlı ayarları yeniden yükle.',409);
   try{config=validateMistConfig(input.config);}catch(e){reject(e.message);}
   config.revision=input.revision+1;
  }else if(immediate||input.action==='sis_mist_schedule'){
   const {area,channel,x,y}=input,at=immediate?Date.now():input.at_ms;
   if(!Object.hasOwn(MIST_MAPS,area)||![1,2,3,4].includes(channel)||![x,y].every(Number.isFinite)||!rules.isAreaWalkableSegment(area,x,y,x,y))reject('Harita, kanal veya yürünebilir koordinat seç.');
   if(!Number.isSafeInteger(at)||at<1||typeof input.gold!=='boolean')reject('Geçerli bir tarih ve portal türü seç.');
   if(input.requestId!==undefined&&(typeof input.requestId!=='string'||!/^[a-zA-Z0-9_-]{16,80}$/.test(input.requestId)))reject('Portal işlem kimliği geçersiz.');
   // The existing durable schedule row is also the retry receipt. Never use an
   // in-memory de-duplication flag: a lost HTTP reply must not create two portals.
   schedule={id:(immediate?'admin_spawn:':'admin_schedule:')+(input.requestId??randomUUID()),channel,area,x,y,at_ms:at,gold:input.gold?1:0};
  }else if(input.action!=='sis_mist_cancel')reject('Bilinmeyen Sis Yarığı işlemi.');
  if(input.action==='sis_mist_cancel'&&(typeof input.id!=='string'||!input.id||input.id.length>128))reject('Plan kimliği geçersiz.');
  return barrier.run([],()=>{
   const sql=db.sqlite;if(sql.isTransaction)throw Error('mist_admin_transaction_overlap');sql.exec('BEGIN IMMEDIATE');let operation;
   try{
    if(config){
     const row=sql.prepare('SELECT value,revision FROM adventure_settings WHERE id=1').get();
     if(!row||row.revision!==input.revision||readMistConfig(row.value).revision!==input.revision)reject('Ayarlar değişti; taslağını koruyup canlı ayarları yeniden yükle.',409);
     const result=sql.prepare('UPDATE adventure_settings SET revision=?,value=? WHERE id=1 AND revision=?').run(config.revision,JSON.stringify(config),input.revision);
     if(result.changes!==1)reject('Ayarlar değişti; yeniden yükle.',409);
    }
    if(schedule){
     const existing=sql.prepare('SELECT * FROM adventure_schedule WHERE id=?').get(schedule.id);
     if(existing){
      if(!sameSchedule(existing,schedule,immediate))reject('Aynı işlem kimliği farklı portal için kullanılamaz.',409);
      operation={id:existing.id,replayed:true,status:existing.done_ms===0?'queued':'completed'};
     }else{
      if(!readMistConfig(sql.prepare('SELECT value FROM adventure_settings WHERE id=1').get()?.value).enabled)reject('Sis Yarığı kapalı. Önce Genel bölümünden portal üretimini açıp kaydet.');
      if(!immediate&&(schedule.at_ms<Date.now()-3000||schedule.at_ms>Date.now()+30*86400000))reject('Planlanan tarih gelecekte ve en fazla 30 gün içinde olmalı.');
      if(sql.prepare('SELECT COUNT(*) AS n FROM adventure_schedule WHERE done_ms=0').get().n>=64)reject('En fazla 64 portal planlanabilir.');
      if(immediate)schedule.at_ms=Date.now();
      sql.prepare('INSERT INTO adventure_schedule(id,channel,area,x,y,at_ms,gold,done_ms) VALUES(?,?,?,?,?,?,?,0)').run(schedule.id,schedule.channel,schedule.area,schedule.x,schedule.y,schedule.at_ms,schedule.gold);
      operation={id:schedule.id,replayed:false,status:'queued'};
     }
    }
    if(input.action==='sis_mist_cancel'){
     // Keep the completed row as the durable retry receipt, including after a
     // cancellation. Replaying an earlier lost response cannot re-create it.
     sql.prepare('UPDATE adventure_schedule SET done_ms=? WHERE id=? AND done_ms=0').run(Date.now(),input.id);
     operation={id:input.id,status:'completed'};
    }
    sql.exec('COMMIT');return {...this.get(),...(operation?{operation}:{})};
   }catch(e){if(sql.isTransaction)sql.exec('ROLLBACK');throw e;}
  });
 }
}
