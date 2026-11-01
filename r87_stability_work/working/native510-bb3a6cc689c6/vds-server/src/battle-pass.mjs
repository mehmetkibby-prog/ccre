import {arenaWingsOwned477,arenaWingsActive477,grantArenaWings477,resumeArenaWings477,projectArenaWingAppearance477} from '../../lib/arena-wings477.mjs';
import {randomUUID} from 'node:crypto';
import {BATTLE_PASS_CATALOG,BATTLE_PASS_BY_ID,BATTLE_PASS_DAY_MS,defaultBattlePassConfig,validateBattlePassConfig} from '../../lib/battle-pass.mjs';
import {createDragonBoss} from './dragon-boss.mjs';

export function ensureBattlePassSchema(db){
 db.exec('BEGIN IMMEDIATE');try{
  const columns=new Set(db.prepare('PRAGMA table_info(players)').all().map(row=>row.name));
  if(!columns.has('battle_pass_season'))db.exec("ALTER TABLE players ADD COLUMN battle_pass_season TEXT NOT NULL DEFAULT ''");
  if(!columns.has('battle_pass_xp'))db.exec('ALTER TABLE players ADD COLUMN battle_pass_xp INTEGER NOT NULL DEFAULT 0 CHECK(battle_pass_xp>=0)');
  db.exec(`CREATE TABLE IF NOT EXISTS battle_pass_settings(id INTEGER PRIMARY KEY CHECK(id=1),revision INTEGER NOT NULL DEFAULT 1,config_json TEXT NOT NULL,active_json TEXT NOT NULL DEFAULT '',enabled INTEGER NOT NULL DEFAULT 0,season_id TEXT NOT NULL DEFAULT '',starts_at INTEGER NOT NULL DEFAULT 0,ends_at INTEGER NOT NULL DEFAULT 0,xp_cap INTEGER NOT NULL DEFAULT 0);
  CREATE TABLE IF NOT EXISTS battle_pass_purchases(season_id TEXT NOT NULL,player_id TEXT NOT NULL,price_paid INTEGER NOT NULL,created_at INTEGER NOT NULL,PRIMARY KEY(season_id,player_id));
  CREATE TABLE IF NOT EXISTS battle_pass_claims(season_id TEXT NOT NULL,player_id TEXT NOT NULL,track TEXT NOT NULL CHECK(track IN ('free','premium')),tier INTEGER NOT NULL,reward_json TEXT NOT NULL,created_at INTEGER NOT NULL,PRIMARY KEY(season_id,player_id,track,tier));
  CREATE TABLE IF NOT EXISTS battle_pass_receipts(player_id TEXT NOT NULL,request_id TEXT NOT NULL,fingerprint TEXT NOT NULL,result_json TEXT NOT NULL,created_at INTEGER NOT NULL,PRIMARY KEY(player_id,request_id));
  CREATE INDEX IF NOT EXISTS battle_pass_receipts_age ON battle_pass_receipts(created_at);
  CREATE INDEX IF NOT EXISTS battle_pass_claims_age ON battle_pass_claims(created_at);
  CREATE INDEX IF NOT EXISTS battle_pass_purchases_age ON battle_pass_purchases(created_at);`);
  db.prepare('INSERT OR IGNORE INTO battle_pass_settings(id,config_json) VALUES(1,?)').run(JSON.stringify(defaultBattlePassConfig()));
  db.exec('COMMIT');
 }catch(error){db.exec('ROLLBACK');throw error;}
}

export function createBattlePass(db,{now=Date.now}={}){
 const dragon=createDragonBoss(db,{now});
 const player=db.prepare('SELECT * FROM players WHERE id=?');
 const setting=db.prepare('SELECT * FROM battle_pass_settings WHERE id=1');
 const purchase=db.prepare('SELECT price_paid FROM battle_pass_purchases WHERE season_id=? AND player_id=?');
 const claims=db.prepare('SELECT track,tier FROM battle_pass_claims WHERE season_id=? AND player_id=?');
 const receipt=db.prepare('SELECT fingerprint,result_json FROM battle_pass_receipts WHERE player_id=? AND request_id=?');
 let current;
 const refresh=()=>{const row=setting.get();if(!row)throw Error('Savaş bileti ayarları bulunamadı.');current={row,draft:validateBattlePassConfig(JSON.parse(row.config_json)),active:row.active_json?validateBattlePassConfig(JSON.parse(row.active_json)):null};return settings();};
 const season=()=>({id:current.row.season_id,startsAt:current.row.starts_at,endsAt:current.row.ends_at,status:!current.row.season_id?'draft':current.row.ends_at<=now()?'ended':'active',config:current.active});
 const settings=()=>({revision:current.row.revision,config:current.draft,season:season(),catalog:BATTLE_PASS_CATALOG});
 const get=id=>{const p=player.get(id);if(!p)throw Error('Karakter bulunamadı.');return p;};
 const read=id=>{
  const p=get(id),s=season(),config=current.active??current.draft,claimed={free:[],premium:[]};
  for(const row of claims.all(s.id,id))claimed[row.track].push(row.tier);
  const itemIds=new Set(config.tiers.flatMap(t=>[t.free?.itemId,t.premium?.itemId]).filter(Boolean));
  return {revision:current.row.revision,config,season:s,xp:p.battle_pass_season===s.id?p.battle_pass_xp:0,premium:!!purchase.get(s.id,id),claimed,coreCoins:p.core_coins,level:p.level,serverTime:now(),rewardCatalog:BATTLE_PASS_CATALOG.filter(item=>itemIds.has(item.id))};
 };
 const transaction=fn=>{
  db.exec('BEGIN IMMEDIATE');try{const result=fn();db.exec('COMMIT');return result;}catch(error){db.exec('ROLLBACK');throw error;}
 };
 const grant=(id,reward)=>{
  const item=BATTLE_PASS_BY_ID.get(reward.itemId);
  if(item.id==='resource:core_coins'){
   if(!db.prepare('UPDATE players SET core_coins=core_coins+? WHERE id=? AND core_coins>=0 AND core_coins<=?').run(reward.amount,id,Number.MAX_SAFE_INTEGER-reward.amount).changes)throw Error('ÇP bakiyesi güncellenemedi.');
  }else if(item.id==='arena:wings')grantArenaWings477(db,id,now());
  else if(item.id==='arena:exp_ring')db.prepare('UPDATE players SET arena_exp_rings=arena_exp_rings+? WHERE id=?').run(reward.amount,id);
  else if(item.type==='rune')db.prepare("INSERT INTO player_items(id,player_id,kind,item_name,rarity,power,role,equipped,enchantments,created_at) VALUES(?,?,?,?,'unique',?,?,0,'[]',?)").run(randomUUID(),id,item.kind,item.name,reward.power,get(id).role,Math.floor(now()/1000));
  else dragon.grantCatalog(id,item,reward.amount,{item_name:item.name,power:reward.power??0,enchantments:'[]'});
 };
 refresh();
 return {refresh,read,settings,
  save(input,revision){const config=validateBattlePassConfig(input);transaction(()=>{
   if(!db.prepare('UPDATE battle_pass_settings SET config_json=?,revision=revision+1 WHERE id=1 AND revision=?').run(JSON.stringify(config),revision).changes)throw Error('Savaş bileti ayarları değişti. Paneli yenile.');
  });return refresh();},
  endSeason(input,adminId){
   if(typeof input?.requestId!=='string'||!/^[a-zA-Z0-9_-]{16,80}$/.test(input.requestId)||typeof input.seasonId!=='string'||!/^[a-zA-Z0-9_-]{1,80}$/.test(input.seasonId)||!Number.isSafeInteger(input.revision)||input.revision<1||typeof adminId!=='string'||!adminId||adminId.length>160)throw Error('Sezon bitirme isteği geçersiz. Paneli yenile.');
   const fingerprint=JSON.stringify([input.seasonId,input.revision]),auditId='battle-pass-end469:'+input.requestId;
   const endResult=transaction(()=>{
    const previous=db.prepare('SELECT admin_account_id,action,detail_json FROM admin_audit_events WHERE id=?').get(auditId);
    if(previous){
     const detail=JSON.parse(previous.detail_json);
     if(previous.admin_account_id!==adminId||previous.action!=='battle_pass_end'||detail.fingerprint!==fingerprint)throw Error('İşlem kimliği başka bir işlemde kullanılmış.');
     return {...detail.result,replayed:true};
    }
    const row=setting.get(),time=now();
    if(!row.season_id||row.season_id!==input.seasonId||row.revision!==input.revision)throw Error('Sezon veya ayarları değişti. Paneli yenile.');
    if(!Number.isSafeInteger(time)||time<0)throw Error('Sezon saati geçersiz.');
    const changed=row.ends_at>time;
    if(changed&&row.revision>=Number.MAX_SAFE_INTEGER)throw Error('Sezon ayar sürümü sınırına ulaşıldı.');
    // Same as natural expiry: earned claims and authoritative pre-end reward
    // timestamps remain valid until another season starts. No history is erased.
    if(changed&&!db.prepare('UPDATE battle_pass_settings SET ends_at=?,revision=revision+1 WHERE id=1 AND season_id=? AND revision=? AND ends_at=?').run(time,row.season_id,row.revision,row.ends_at).changes)throw Error('Sezon veya ayarları değişti. Paneli yenile.');
    const result={seasonId:row.season_id,previousEndsAt:row.ends_at,endedAt:changed?time:row.ends_at,changed};
    db.prepare("INSERT INTO admin_audit_events(id,admin_account_id,action,target_account_id,detail_json,created_at_ms) VALUES(?,?,?,'',?,?)").run(auditId,adminId,'battle_pass_end',JSON.stringify({fingerprint,result}),time);
    return result;
   });
   return {...refresh(),endResult};
  },
  startSeason(revision){transaction(()=>{
   const row=setting.get(),time=now();if(row.revision!==revision)throw Error('Savaş bileti ayarları değişti. Paneli yenile.');
   if(row.season_id&&row.ends_at>time)throw Error('Mevcut sezon bitmeden yeni sezon başlatılamaz.');
   const config={...validateBattlePassConfig(JSON.parse(row.config_json)),enabled:true};
   db.prepare('UPDATE battle_pass_settings SET active_json=?,enabled=1,season_id=?,starts_at=?,ends_at=?,xp_cap=?,revision=revision+1 WHERE id=1').run(JSON.stringify(config),randomUUID(),time,time+config.durationDays*BATTLE_PASS_DAY_MS,config.tiers.at(-1).xp);
   // Bounded history cleanup runs only when an administrator starts a season.
   // Old IDs are rejected before claims; active receipts are never pruned here.
   for(const table of ['battle_pass_receipts','battle_pass_claims','battle_pass_purchases'])db.prepare(`DELETE FROM ${table} WHERE rowid IN(SELECT rowid FROM ${table} WHERE created_at<? ORDER BY created_at LIMIT 500)`).run(time-90*BATTLE_PASS_DAY_MS);
  });return refresh();},
  command(id,input){return transaction(()=>{
   // Recheck settings within the writer transaction; a channel's cached panel
   // state must not authorize spending against a replaced season.
   refresh();
   if(typeof input?.requestId!=='string'||!/^[a-zA-Z0-9_-]{16,80}$/.test(input.requestId))throw Error('İşlem kimliği geçersiz.');
   const fingerprint=JSON.stringify([input.action,input.seasonId,input.tier??null,input.track??null]);
   const prior=receipt.get(id,input.requestId);
   if(prior){if(prior.fingerprint!==fingerprint)throw Error('İşlem kimliği başka bir işlemde kullanılmış.');return {...JSON.parse(prior.result_json),state:read(id),replayed:true};}
   const p=get(id),s=season(),config=current.active;
   if(!config||input.seasonId!==s.id)throw Error('Sezon değişti. Savaş bileti panelini yenile.');
   let message,replayed=false;
   if(input.action==='battle_pass_buy'){
    if(purchase.get(s.id,id)){message='Premium Savaş Biletin zaten etkin.';replayed=true;}
    else{
     if(s.status!=='active'||!current.row.enabled||now()<s.startsAt)throw Error('Bu sezon için bilet satışı kapalı.');
     if(input.revision!==current.row.revision)throw Error('Savaş bileti bilgileri değişti. Paneli yenile.');
     if(!db.prepare('UPDATE players SET core_coins=core_coins-? WHERE id=? AND core_coins>=?').run(config.price,id,config.price).changes)throw Error('Yeterli Çekirdek Paran yok.');
     db.prepare('INSERT INTO battle_pass_purchases VALUES(?,?,?,?)').run(s.id,id,config.price,now());
     message='Premium Savaş Bileti açıldı. Ulaştığın kademelerin premium ödüllerini alabilirsin.';
    }
   }else if(input.action==='battle_pass_claim'){
    if(!['free','premium'].includes(input.track)||!Number.isSafeInteger(input.tier))throw Error('Ödül seçimi geçersiz.');
    const tier=config.tiers.find(row=>row.id===input.tier),reward=tier?.[input.track];
    if(!reward)throw Error('Bu kademede seçili ödül bulunamadı.');
    if(input.track==='premium'&&!purchase.get(s.id,id))throw Error('Bu ödül için Premium Savaş Bileti gerekli.');
    if(p.battle_pass_season!==s.id||p.battle_pass_xp<tier.xp)throw Error('Bu ödül için gerekli tecrübeye henüz ulaşmadın.');
    const claim=db.prepare('INSERT OR IGNORE INTO battle_pass_claims VALUES(?,?,?,?,?,?)').run(s.id,id,input.track,tier.id,JSON.stringify(reward),now());
    if(claim.changes){grant(id,reward);message=BATTLE_PASS_BY_ID.get(reward.itemId).name+' ödülün teslim edildi.';}
    else{message='Bu ödül zaten teslim edildi.';replayed=true;}
   }else throw Error('Geçersiz savaş bileti işlemi.');
   const result={ok:true,message,...(replayed?{replayed:true}:{})};
   if(!replayed)db.prepare('INSERT INTO battle_pass_receipts VALUES(?,?,?,?,?)').run(id,input.requestId,fingerprint,JSON.stringify(result),now());
   return {...result,state:read(id)};
  });}
 };
}
