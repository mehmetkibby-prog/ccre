import {STATUS_FIELDS,defaultStatusConfig,validateStatusConfig,statusBudget,statusBonus,validateStatusPoints} from '../../lib/status.mjs';
export function ensureStatusSchema(db){
 db.exec('BEGIN IMMEDIATE');try{
  const columns=new Set(db.prepare('PRAGMA table_info(players)').all().map(c=>c.name));
  for(const key of STATUS_FIELDS)if(!columns.has('stat_'+key))db.exec(`ALTER TABLE players ADD COLUMN stat_${key} INTEGER NOT NULL DEFAULT 0 CHECK(stat_${key} BETWEEN 0 AND 64)`);
  if(!columns.has('stat_revision'))db.exec('ALTER TABLE players ADD COLUMN stat_revision INTEGER NOT NULL DEFAULT 0');
  db.exec('CREATE TABLE IF NOT EXISTS status_settings(id INTEGER PRIMARY KEY CHECK(id=1),revision INTEGER NOT NULL DEFAULT 1,config_json TEXT NOT NULL)');
  db.prepare('INSERT OR IGNORE INTO status_settings(id,config_json) VALUES(1,?)').run(JSON.stringify(defaultStatusConfig()));
  db.exec('COMMIT');
 }catch(e){db.exec('ROLLBACK');throw e;}
}
export function createStatus(db,{refreshHp=id=>globalThis.__colPremium?.refreshHp(id),now=Date.now}={}){
 const player=db.prepare('SELECT * FROM players WHERE id=?'),setting=db.prepare('SELECT revision,config_json FROM status_settings WHERE id=1');
 const dungeon=db.prepare('SELECT 1 FROM dungeon_members WHERE player_id=? LIMIT 1');
 const update=db.prepare('UPDATE players SET stat_attack=?,stat_defense=?,stat_hp=?,stat_revision=stat_revision+1 WHERE id=? AND stat_revision=?');
 let current;const refresh=()=>{const s=setting.get();current={revision:s.revision,config:validateStatusConfig(JSON.parse(s.config_json))};return current;};refresh();
 const get=id=>{const p=player.get(id);if(!p)throw Error('Karakter bulunamadı.');return p;};
 const read=id=>{const p=get(id),points=Object.fromEntries(STATUS_FIELDS.map(k=>[k,p['stat_'+k]])),total=statusBudget(p.level);return {level:p.level,total,available:Math.max(0,total-points.attack-points.defense-points.hp),points,revision:p.stat_revision,settings:current};};
 const transact=fn=>{db.exec('BEGIN IMMEDIATE');try{const result=fn();db.exec('COMMIT');return result;}catch(e){db.exec('ROLLBACK');throw e;}};
 return {read,refresh,settings:()=>current,bonus:(p,stat)=>statusBonus(p,stat,current.config),
  command(id,input){return transact(()=>{
   const p=get(id);if(!current.config.enabled)throw Error('Statü sistemi şu anda kapalı.');
   if(input?.action!=='status_allocate')throw Error('Geçersiz statü işlemi.');
   const points=validateStatusPoints(input.points,p.level);
   if(!Number.isSafeInteger(input.revision)||input.revision<0||input.settingsRevision!==current.revision)throw Error('Statü ayarları değişti. Paneli yeniden aç.');
   if(STATUS_FIELDS.every(k=>points[k]===p['stat_'+k]))return {ok:true,replayed:true,state:read(id)};
   if(input.revision!==p.stat_revision)throw Error('Puanların değişti. Paneli yeniden aç.');
   if(p.hp<=0||p.arena_match_id||p.combat_lock_until_ms>now()||dungeon.get(id))throw Error('Puan dağıtmak veya sıfırlamak için savaştan çıkmalısın.');
   if(!update.run(points.attack,points.defense,points.hp,id,p.stat_revision).changes)throw Error('Statü puanları değişti. Paneli yeniden aç.');
   refreshHp(id);return {ok:true,state:read(id)};
  });},
  save(input,revision){const config=validateStatusConfig(input),previous=current;try{return transact(()=>{
   if(!db.prepare('UPDATE status_settings SET config_json=?,revision=revision+1 WHERE id=1 AND revision=?').run(JSON.stringify(config),revision).changes)throw Error('Statü ayarları değişti. Paneli yenile.');
   refresh();if(config.enabled!==previous.config.enabled||config.hp!==previous.config.hp)for(const p of db.prepare('SELECT id FROM players WHERE stat_hp>0').all())refreshHp(p.id);
   return current;
  });}catch(e){current=previous;throw e;}}
 };
}
