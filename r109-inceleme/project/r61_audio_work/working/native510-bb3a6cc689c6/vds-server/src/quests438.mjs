import {arenaWingsOwned477,arenaWingsActive477,grantArenaWings477,resumeArenaWings477,projectArenaWingAppearance477} from '../../lib/arena-wings477.mjs';
import {randomUUID} from 'node:crypto';
import {defaultQuests438,validateQuests438,QUEST_CATALOG438,QUEST_BY_ID438,QUEST_EVENTS438,questClassItem438,questEnchantments438} from '../../lib/quests438.mjs';
import {battlePassXpSql} from '../../lib/battle-pass.mjs';
import {levelCosts} from '../../lib/level-progression.mjs';
import {playerLevelCap} from '../../lib/expansion65.mjs';
import {createDragonBoss} from './dragon-boss.mjs';
import {isCoupon483,mintCoupon483} from './cp-coupons483.mjs';

export function ensureQuests438Schema(db){
 db.exec('BEGIN IMMEDIATE');try{
  const columns=new Set(db.prepare('PRAGMA table_info(players)').all().map(c=>c.name));
  for(const column of ['quest_kills438','quest_fish438'])if(!columns.has(column))db.exec(`ALTER TABLE players ADD COLUMN ${column} INTEGER NOT NULL DEFAULT 0`);
  db.exec(`CREATE TABLE IF NOT EXISTS quest_settings438(id INTEGER PRIMARY KEY CHECK(id=1),revision INTEGER NOT NULL DEFAULT 1,enabled INTEGER NOT NULL DEFAULT 1,config_json TEXT NOT NULL);
   CREATE TABLE IF NOT EXISTS quest_claims438(player_id TEXT NOT NULL,quest_id TEXT NOT NULL,kills INTEGER NOT NULL,fish INTEGER NOT NULL,reward_json TEXT NOT NULL,claimed_at INTEGER NOT NULL,PRIMARY KEY(player_id,quest_id));
   CREATE TABLE IF NOT EXISTS quest_receipts438(player_id TEXT NOT NULL,request_id TEXT NOT NULL,fingerprint TEXT NOT NULL,result_json TEXT NOT NULL,PRIMARY KEY(player_id,request_id));
   CREATE TABLE IF NOT EXISTS quest_ids438(id TEXT PRIMARY KEY,event TEXT NOT NULL);`);
  db.prepare('INSERT OR IGNORE INTO quest_settings438(id,config_json) VALUES(1,?)').run(JSON.stringify(defaultQuests438()));
  const config=validateQuests438(JSON.parse(db.prepare('SELECT config_json FROM quest_settings438 WHERE id=1').get().config_json));
  for(const q of config.quests)db.prepare('INSERT OR IGNORE INTO quest_ids438 VALUES(?,?)').run(q.id,q.event);
  // Preserve every earlier first-evolution payment; never pay a second starter reward.
  db.exec(`INSERT OR IGNORE INTO quest_claims438(player_id,quest_id,kills,fish,reward_json,claimed_at)
   SELECT player_id,'first_evolution',0,0,'[]',claimed_at*1000 FROM player_evolution_quest WHERE claimed_at IS NOT NULL;`);
  db.exec('COMMIT');
 }catch(error){db.exec('ROLLBACK');throw error;}
}

export function createQuests438(db,{now=Date.now,random=Math.random}={}){
 const dragon=createDragonBoss(db,{now,random});
 const player=db.prepare('SELECT * FROM players WHERE id=?');
 const setting=db.prepare('SELECT * FROM quest_settings438 WHERE id=1');
 const claimRows=db.prepare('SELECT * FROM quest_claims438 WHERE player_id=?');
 const evolution=db.prepare('SELECT completed_at,claimed_at FROM player_evolution_quest WHERE player_id=?');
 const receipt=db.prepare('SELECT fingerprint,result_json FROM quest_receipts438 WHERE player_id=? AND request_id=?');
 let current;
 const refresh=()=>{const row=setting.get();current={revision:row.revision,config:validateQuests438(JSON.parse(row.config_json))};return settings();};
 const settings=()=>({...current,catalog:QUEST_CATALOG438,eventTypes:QUEST_EVENTS438});
 const get=id=>{const p=player.get(id);if(!p)throw Error('Karakter bulunamadı.');return p;};
 const read=id=>{
  const p=get(id),earned=new Map(claimRows.all(id).map(c=>[c.quest_id,c])),evo=evolution.get(id);
  let blocked=false,baselineKills=0,baselineFish=0;
  const quests=current.config.quests.map(q=>{
   const claim=earned.get(q.id),claimed=!!claim,available=!blocked&&!claimed&&current.config.enabled;
   const progress=claimed?q.target:!available?0:q.event==='kill'?Math.min(q.target,Math.max(0,p.quest_kills438-baselineKills)):q.event==='fish'?Math.min(q.target,Math.max(0,p.quest_fish438-baselineFish)):q.event==='evolution'&&evo?1:0;
   if(claim){baselineKills=Math.max(baselineKills,claim.kills);baselineFish=Math.max(baselineFish,claim.fish);}else blocked=true;
   return {...q,rewards:claim?JSON.parse(claim.reward_json):q.rewards,progress,claimed,available,complete:claimed||available&&progress>=q.target};
  });
  return {enabled:current.config.enabled,revision:current.revision,role:p.role,level:p.level,gems:p.gems,quests,
   guidance:{firstKill:p.quest_kills438>0,status:p.level>=2&&(p.stat_attack??0)+(p.stat_defense??0)+(p.stat_hp??0)===0,skill:p.gems>=35&&Math.max(p.skill_one??1,p.skill_two??1,p.skill_three??1)<=1},
   catalog:QUEST_CATALOG438.filter(i=>quests.some(q=>q.rewards.some(r=>r.itemId===i.id))).map(i=>questClassItem438(i,p.role))};
 };
 const transaction=fn=>{db.exec('BEGIN IMMEDIATE');try{const result=fn();db.exec('COMMIT');return result;}catch(error){db.exec('ROLLBACK');throw error;}};
 const grantXp=(id,amount)=>{
  const p=get(id),s=db.prepare('SELECT * FROM game_settings WHERE id=1').get()??{},costs=levelCosts(s),cap=playerLevelCap(s,p);
  const xp=p.level>=cap?p.xp:Math.min(p.xp+amount,costs.slice(0,cap-1).reduce((a,b)=>a+b,0));
  let threshold=0,level=1;for(const cost of costs.slice(0,cap-1)){threshold+=cost;if(xp<threshold)break;level++;}
  db.prepare(`UPDATE players SET ${battlePassXpSql(String(amount))},${globalThis.__colRanks?'rank_xp=CASE WHEN level>=65 AND rank_tier>0 THEN MIN(9000000000000,rank_xp+?) ELSE rank_xp END,':''}xp=?,level=? WHERE id=?`).run(...(globalThis.__colRanks?[amount]:[]),xp,Math.max(p.level,level),id);
 };
 const grant=(id,reward)=>{
  const item=QUEST_BY_ID438.get(reward.itemId),p=get(id);
  if(item.type==='premium'&&isCoupon483(item.kind))return mintCoupon483({db,now},p,item.kind);
  if(item.type==='xp')return grantXp(id,reward.amount);
  if(item.type==='class'){
   const s=db.prepare('SELECT * FROM game_settings WHERE id=1').get()??{},gear=questClassItem438(item,p.role);
   const lo=Math.max(0,Math.floor(Number(s['blue_'+item.kind+'_power_min'])||15)),hi=Math.max(lo,Math.floor(Number(s['blue_'+item.kind+'_power_max'])||25)),power=lo+Math.floor(Math.max(0,Math.min(.999999999,random()))*(hi-lo+1));
   return db.prepare("INSERT INTO player_items(id,player_id,kind,item_name,rarity,power,role,equipped,enchantments,created_at) VALUES(?,?,?,?,'blue',?,?,0,?,?)").run(randomUUID(),id,item.kind,gear.name,power,p.role,JSON.stringify(questEnchantments438(item.kind,s,random)),Math.floor(now()/1000));
  }
  if(item.id==='resource:core_coins')return db.prepare('UPDATE players SET core_coins=core_coins+? WHERE id=?').run(reward.amount,id);
  if(item.id==='arena:wings')return grantArenaWings477(db,id,now());
  if(item.id==='arena:exp_ring')return db.prepare('UPDATE players SET arena_exp_rings=arena_exp_rings+? WHERE id=?').run(reward.amount,id);
  if(item.type==='rune')return db.prepare("INSERT INTO player_items(id,player_id,kind,item_name,rarity,power,role,equipped,enchantments,created_at) VALUES(?,?,?,?,'unique',?,?,0,'[]',?)").run(randomUUID(),id,item.kind,item.name,reward.power,p.role,Math.floor(now()/1000));
  return dragon.grantCatalog(id,item,reward.amount,{item_name:item.name,power:reward.power??0,enchantments:item.type==='gear'?JSON.stringify(questEnchantments438(item.kind,db.prepare('SELECT * FROM game_settings WHERE id=1').get()??{},random)):'[]'});
 };
 refresh();
 return {grantCauldronReward488(id,reward){
   if(!db.isTransaction)throw Error('Kazan tecrübe ödülü atomik işlem gerektirir.');
   const item=QUEST_BY_ID438.get(reward?.itemId);if(!item||!['xp','class'].includes(item.type)||!Number.isSafeInteger(reward.amount)||reward.amount<1||reward.amount>(item.type==='xp'?1000000:1))throw Error('Kazan görev ödülü geçersiz.');
   return grant(id,reward);
  },read,settings,refresh,get enabled(){return current.config.enabled;},
  save(input,revision){const config=validateQuests438(input);transaction(()=>{
   if(setting.get().revision!==revision)throw Error('Görev ayarları değişti. Paneli yenile.');
   const known=new Map(db.prepare('SELECT * FROM quest_ids438').all().map(q=>[q.id,q.event]));
   for(const q of config.quests){if(known.has(q.id)&&known.get(q.id)!==q.event)throw Error('Bir görev kimliğinin türü değiştirilemez; yeni kimlik kullan.');known.set(q.id,q.event);}
   if(known.size>200)throw Error('En fazla 200 kalıcı görev kimliği kullanılabilir. Mevcut görevleri düzenle.');
   for(const q of config.quests)db.prepare('INSERT OR IGNORE INTO quest_ids438 VALUES(?,?)').run(q.id,q.event);
   db.prepare('UPDATE quest_settings438 SET config_json=?,enabled=?,revision=revision+1 WHERE id=1').run(JSON.stringify(config),Number(config.enabled));
  });return refresh();},
  command(id,input){return transaction(()=>{
   refresh();
   if(typeof input?.requestId!=='string'||!/^[a-zA-Z0-9_-]{16,80}$/.test(input.requestId))throw Error('İşlem kimliği geçersiz.');
   if(!['quest_claim','quest_tutorial'].includes(input.action))throw Error('Geçersiz görev işlemi.');
   const fingerprint=JSON.stringify([input.action,input.questId]),prior=receipt.get(id,input.requestId);
   if(prior){if(prior.fingerprint!==fingerprint)throw Error('İşlem kimliği başka bir işlemde kullanılmış.');return {...JSON.parse(prior.result_json),state:read(id),replayed:true};}
   const state=read(id),quest=state.quests.find(q=>q.id===input.questId);
   if(!quest)throw Error('Görev bulunamadı.');
   if(quest.claimed)return {ok:true,replayed:true,message:'Bu görevin ödülü zaten teslim edildi.',state};
   if(input.revision!==current.revision)throw Error('Görev bilgileri değişti. Paneli yenile.');
   if(!quest.available)throw Error('Önce sıradaki görevi tamamla.');
   const p=get(id);
   if(input.action==='quest_tutorial'){
    if(quest.event!=='market'||p.area!=='bazaar')throw Error('Pazar öğretisini Pazar Alanı’nda tamamlayabilirsin.');
   }else if(quest.event==='market'||!quest.complete)throw Error('Görev hedefi henüz tamamlanmadı.');
   // Claim identity, all rewards, legacy handoff and reply are one durable write.
   db.prepare('INSERT INTO quest_claims438 VALUES(?,?,?,?,?,?)').run(id,quest.id,p.quest_kills438,p.quest_fish438,JSON.stringify(quest.rewards),now());
   for(const reward of quest.rewards)grant(id,reward);
   if(quest.id==='first_evolution')db.prepare('UPDATE player_evolution_quest SET claimed_at=COALESCE(claimed_at,?) WHERE player_id=?').run(Math.floor(now()/1000),id);
   const result={ok:true,message:quest.rewards.length?'Görev tamamlandı; ödüllerin çantana eklendi.':'Görev tamamlandı.'};
   db.prepare('INSERT INTO quest_receipts438 VALUES(?,?,?,?)').run(id,input.requestId,fingerprint,JSON.stringify(result));
   return {...result,state:read(id)};
  });}
 };
}
