import {RUNE_TYPES,RUNE_MOBS,RUNE_SPAWNS,RUNE_SPAWN,runeWalkable,RUNE_GATE_MESSAGE,runeEligible,isRuneKind,runeUpgradeCost,runeBonusPercent,defaultRuneConfig,validateRuneConfig,runeMonsterKey} from '../../lib/runes.mjs';
export function ensureRuneSchema(db){
 db.exec('BEGIN IMMEDIATE');try{
  db.exec(`CREATE TABLE IF NOT EXISTS rune_settings(id INTEGER PRIMARY KEY CHECK(id=1),revision INTEGER NOT NULL DEFAULT 1,config_json TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS rune_starter_claims(player_id TEXT PRIMARY KEY,created_at INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS rune_receipts(player_id TEXT NOT NULL,request_id TEXT NOT NULL,action TEXT NOT NULL,fingerprint TEXT NOT NULL,result_json TEXT NOT NULL,created_at INTEGER NOT NULL,PRIMARY KEY(player_id,request_id));
  CREATE INDEX IF NOT EXISTS idx_rune_receipts_created ON rune_receipts(created_at);
  CREATE INDEX IF NOT EXISTS idx_rune_max_level ON player_items(power DESC) WHERE kind IN ('rune_attack','rune_defense','rune_hp');
  CREATE UNIQUE INDEX IF NOT EXISTS idx_rune_equipped_slot ON player_items(player_id,kind) WHERE equipped=1 AND kind IN ('rune_attack','rune_defense','rune_hp');`);
  db.prepare('INSERT OR IGNORE INTO rune_settings(id,config_json) VALUES(1,?)').run(JSON.stringify(defaultRuneConfig()));
  const cols=new Set(db.prepare('PRAGMA table_info(players)').all().map(c=>c.name));
  for(const k of ['rune_attack_level','rune_defense_level','rune_hp_level'])if(!cols.has(k))db.exec(`ALTER TABLE players ADD COLUMN ${k} INTEGER NOT NULL DEFAULT 0`);
  const update=ref=>`UPDATE players SET ${Object.keys(RUNE_TYPES).map(k=>`${k}_level=COALESCE((SELECT power FROM player_items WHERE player_id=players.id AND kind='${k}' AND equipped=1 LIMIT 1),0)`).join(',')} WHERE id=${ref}.player_id;`;
  for(const [event,ref]of [['INSERT','NEW'],['DELETE','OLD']])db.exec(`CREATE TRIGGER IF NOT EXISTS rune_item_${event.toLowerCase()} AFTER ${event} ON player_items WHEN ${ref}.kind IN ('rune_attack','rune_defense','rune_hp') BEGIN ${update(ref)} END;`);
  db.exec(`CREATE TRIGGER IF NOT EXISTS rune_item_update AFTER UPDATE OF power,equipped,player_id,kind ON player_items WHEN OLD.kind IN ('rune_attack','rune_defense','rune_hp') OR NEW.kind IN ('rune_attack','rune_defense','rune_hp') BEGIN ${update('OLD')} ${update('NEW')} END;`);
  db.exec('CREATE INDEX IF NOT EXISTS idx_players_rune_hp ON players(id) WHERE rune_hp_level>0');
  const cfg=validateRuneConfig(JSON.parse(db.prepare('SELECT config_json FROM rune_settings WHERE id=1').get().config_json));
  const insert=db.prepare(`INSERT OR IGNORE INTO monsters(id,name,x,y,hp,max_hp,variant,area,channel,is_boss,is_stone,summoned,respawn_at,spawn_round) VALUES(?,?,?,?,?,?,'normal','rune',?,0,0,0,0,1)`);
  for(let ch=1;ch<=3;ch++)for(const s of RUNE_SPAWNS){const m=cfg.monsters[s.key];insert.run(`rune-${s.key}-c${ch}-${s.slot}`,m.name,s.x,s.y,m.hp,m.hp,ch);}
  db.exec('CREATE TABLE IF NOT EXISTS rune_map_layout(id INTEGER PRIMARY KEY CHECK(id=1),version INTEGER NOT NULL)');
  if(!db.prepare('SELECT 1 FROM rune_map_layout WHERE id=1 AND version=423').get()){
   // Startup-only layout migration. Keep HP, spawn rounds, timers and earned
   // rewards. Reduce only the canonical ambient population, never loot receipts.
   const wanted=new Map();for(let ch=1;ch<=3;ch++)for(const point of RUNE_SPAWNS)wanted.set(`rune-${point.key}-c${ch}-${point.slot}`,point);
   const move=db.prepare('UPDATE monsters SET x=?,y=? WHERE id=?');
   const remove=db.prepare("DELETE FROM monsters WHERE id=? AND area='rune'");
   for(const monster of db.prepare("SELECT id FROM monsters WHERE area='rune'").all()){
    const point=wanted.get(monster.id);if(point)move.run(point.x,point.y,monster.id);
    else if(/^rune-(tide|warden|sentinel|wraith)-c[1-3]-[6-8]$/.test(monster.id))remove.run(monster.id);
   }
   const movePlayer=db.prepare('UPDATE players SET x=?,y=? WHERE id=?');
   for(const player of db.prepare("SELECT id,x,y FROM players WHERE area='rune'").all()){
    const x=Math.round(player.x*.8),y=Math.round(player.y*.8);movePlayer.run(runeWalkable(x,y)?x:RUNE_SPAWN.x,runeWalkable(x,y)?y:RUNE_SPAWN.y,player.id);
   }
   db.prepare('INSERT INTO rune_map_layout(id,version) VALUES(1,423) ON CONFLICT(id) DO UPDATE SET version=423').run();
  }
  db.exec('COMMIT');
 }catch(e){db.exec('ROLLBACK');throw e;}
}
export function createRunes(db,{refreshHp=id=>globalThis.__colPremium?.refreshHp(id)}={}){
 let current,snapshots;
 const refresh=()=>{const r=db.prepare('SELECT * FROM rune_settings WHERE id=1').get();current={revision:r.revision,config:validateRuneConfig(JSON.parse(r.config_json))};snapshots=Object.fromEntries(RUNE_MOBS.map(m=>[m.key,{lootSourceKey:'rune.'+m.key,lootProfileRevision:r.revision,lootProfileJson:JSON.stringify({version:1,key:'rune.'+m.key,runeLoot:current.config.monsters[m.key].loot})}]));return current;};refresh();
 const get=id=>{const p=db.prepare('SELECT id,role,level,rank_tier,hp,area,arena_match_id,combat_lock_until_ms FROM players WHERE id=?').get(id);if(!p)throw Error('Karakter bulunamadı.');return p;};
 const eligible=id=>{const p=get(id);if(!runeEligible(p))throw Error(RUNE_GATE_MESSAGE);return p;};
 const read=id=>{const p=get(id);return {...current,eligible:runeEligible(p),claimed:!!db.prepare('SELECT 1 FROM rune_starter_claims WHERE player_id=?').get(id),items:db.prepare("SELECT id,kind,item_name,power,equipped,sale_locked499 FROM player_items WHERE player_id=? AND kind IN ('rune_attack','rune_defense','rune_hp') ORDER BY kind,power DESC,id").all(id),materials:Object.fromEntries(db.prepare("SELECT kind,amount FROM dungeon_materials WHERE player_id=? AND kind IN ('rune_attack','rune_defense','rune_hp')").all(id).map(r=>[r.kind,r.amount]))};};
 const transact=fn=>{db.exec('BEGIN IMMEDIATE');try{const r=fn();db.exec('COMMIT');return r;}catch(e){db.exec('ROLLBACK');throw e;}};
 const assertNumeric=(level,step=current.config.bonusPerLevel)=>{if(!Number.isSafeInteger(Math.round(10000000*(1+level*step/100))))throw Error("Rün gücü sayısal işlem sınırına ulaştı.");};
 const insert=(id,kind,level=1)=>{const itemId=crypto.randomUUID();db.prepare("INSERT INTO player_items(id,player_id,kind,item_name,rarity,power,role,equipped,enchantments,created_at) VALUES(?,?,?,?,'unique',?,?,0,'[]',unixepoch())").run(itemId,id,kind,RUNE_TYPES[kind].label,level,get(id).role);return itemId;};
 return {refresh,settings:()=>current,read,
  factor(p,stat){return 1+(runeEligible(p)?(Number(p['rune_'+stat+'_level'])||0)*current.config.bonusPerLevel/100:0)+(globalThis.__colStatus?.bonus(p,stat)??0);},
  monster(m){const key=runeMonsterKey(m);return key?current.config.monsters[key]:null;},
  lootSnapshot(m){return snapshots[runeMonsterKey(m)]??null;},
  command(id,input){return transact(()=>{
   const p=eligible(id);const action=input?.action,requestId=input?.requestId;
   if(typeof requestId!=='string'||!/^[a-zA-Z0-9_-]{8,100}$/.test(requestId))throw Error('İşlem kimliği gerekli.');
   const fingerprint=JSON.stringify([action,input.itemId??null,input.kind??null,input.expectedLevel??null]);
   const prev=db.prepare('SELECT action,fingerprint,result_json FROM rune_receipts WHERE player_id=? AND request_id=?').get(id,requestId);
   if(prev){if(prev.action!==action||prev.fingerprint!==fingerprint)throw Error('İşlem kimliği daha önce kullanıldı.');return {...JSON.parse(prev.result_json),state:read(id),replayed:true};}
   let itemId=input.itemId,kind=input.kind;
   if(action==='rune_claim'){
    if(db.prepare('INSERT OR IGNORE INTO rune_starter_claims(player_id,created_at) VALUES(?,unixepoch())').run(id).changes)for(const k of Object.keys(RUNE_TYPES))insert(id,k);
   }else if(action==='rune_craft'){
    if(!isRuneKind(kind))throw Error('Geçersiz rün.');
    if(!db.prepare('UPDATE dungeon_materials SET amount=amount-5 WHERE player_id=? AND kind=? AND amount>=5').run(id,kind).changes)throw Error('Yeni bir rün için aynı türden 5 parça gerekli.');
    itemId=insert(id,kind);
   }else{
    const item=db.prepare("SELECT id,kind,power,equipped FROM player_items WHERE id=? AND player_id=? AND kind IN ('rune_attack','rune_defense','rune_hp')").get(itemId,id);
    if(!item)throw Error('Rün envanterinde bulunamadı.');kind=item.kind;
    if(input.expectedLevel!==item.power)throw Error('Rünün seviyesi değişti. Paneli yenile.');
    if(!['rune_upgrade','rune_equip','rune_unequip'].includes(action))throw Error('Geçersiz rün işlemi.');
    if((action!=='rune_upgrade'||item.equipped)&& (p.hp<=0||p.arena_match_id||db.prepare('SELECT 1 FROM dungeon_members WHERE player_id=? LIMIT 1').get(id)||p.combat_lock_until_ms>Date.now()))throw Error('Rününü değiştirmek için savaştan çıkmalısın.');
    if(action==='rune_upgrade'){
     assertNumeric(item.power+1);const cost=runeUpgradeCost(item.power);if(!Number.isSafeInteger(item.power+1))throw Error('Rün seviyesi işlenemedi.');
     if(!db.prepare('UPDATE dungeon_materials SET amount=amount-? WHERE player_id=? AND kind=? AND amount>=?').run(cost,id,kind,cost).changes)throw Error(`Bu seviye için ${cost} ${RUNE_TYPES[kind].shard} gerekli.`);
     db.prepare('UPDATE player_items SET power=power+1 WHERE id=? AND player_id=? AND power=?').run(itemId,id,item.power);
    }else if(action==='rune_equip'){
     assertNumeric(item.power);
     db.prepare('UPDATE player_items SET equipped=0 WHERE player_id=? AND kind=? AND equipped=1').run(id,kind);
     db.prepare('UPDATE player_items SET equipped=1 WHERE id=? AND player_id=?').run(itemId,id);
    }else db.prepare('UPDATE player_items SET equipped=0 WHERE id=? AND player_id=?').run(itemId,id);
    if(kind==='rune_hp')refreshHp(id);
   }
   const result={ok:true,itemId,message:action==='rune_upgrade'?'Rünün seviyesi yükseldi.':action==='rune_claim'?'Üç başlangıç rünün envanterine eklendi.':'Rün işlemi tamamlandı.'};
   db.prepare('INSERT INTO rune_receipts(player_id,request_id,action,fingerprint,result_json,created_at) VALUES(?,?,?,?,?,unixepoch())').run(id,requestId,action,fingerprint,JSON.stringify(result));
   // Bounded cleanup only on rare inventory mutations, indexed by timestamp.
   db.prepare('DELETE FROM rune_receipts WHERE rowid IN (SELECT rowid FROM rune_receipts WHERE created_at<unixepoch()-604800 ORDER BY created_at LIMIT 32)').run();
   return {...result,state:read(id)};
  });},
  save(input,revision){const next=validateRuneConfig(input),prior=current,priorSnapshots=snapshots;try{return transact(()=>{
   if(next.bonusPerLevel!==prior.config.bonusPerLevel){const maxLevel=db.prepare("SELECT MAX(power) AS level FROM player_items WHERE kind IN ('rune_attack','rune_defense','rune_hp')").get().level??0;assertNumeric(maxLevel,next.bonusPerLevel);}
   if(!db.prepare('UPDATE rune_settings SET config_json=?,revision=revision+1 WHERE id=1 AND revision=?').run(JSON.stringify(next),revision).changes)throw Error('Rün ayarları değişti. Paneli yenile.');
   refresh();if(next.bonusPerLevel!==prior.config.bonusPerLevel)for(const p of db.prepare('SELECT id FROM players WHERE rune_hp_level>0').all())refreshHp(p.id);return current;
  });}catch(e){current=prior;snapshots=priorSnapshots;throw e;}}
 };
}
