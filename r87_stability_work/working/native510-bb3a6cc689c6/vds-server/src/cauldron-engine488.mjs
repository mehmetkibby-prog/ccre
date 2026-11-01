import {CAULDRON_INGREDIENTS488,CAULDRON_AREAS488,cauldronSettings488,cauldronDay488,validateCauldron488} from '../../lib/cauldron488.mjs';
import {CAULDRON_CATALOG488} from '../../lib/cauldron-catalog488.mjs';
import {createCauldronGrants488} from './cauldron-grants488.mjs';
import {colLabIsPlayer} from './loadlab-gameplay.mjs';
const reject488=(code,message)=>{throw Object.assign(Error(message),{gameCode:'cauldron_'+code+'488'});};

export function ensureCauldronSchema488(db){
 db.exec(`CREATE TABLE IF NOT EXISTS player_cauldron488 (
  player_id TEXT PRIMARY KEY NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  bat_wing INTEGER NOT NULL DEFAULT 0 CHECK(bat_wing BETWEEN 0 AND 1000000),
  ghost_dust INTEGER NOT NULL DEFAULT 0 CHECK(ghost_dust BETWEEN 0 AND 1000000),
  pumpkin_seed INTEGER NOT NULL DEFAULT 0 CHECK(pumpkin_seed BETWEEN 0 AND 1000000),updated_at INTEGER NOT NULL DEFAULT 0
 );
 CREATE TABLE IF NOT EXISTS cauldron_receipts488 (
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,request_id TEXT NOT NULL,
  fingerprint TEXT NOT NULL,recipe_id TEXT NOT NULL,day_key INTEGER NOT NULL,result_json TEXT NOT NULL,created_at INTEGER NOT NULL,
  PRIMARY KEY(player_id,request_id)
 );
 CREATE INDEX IF NOT EXISTS cauldron_receipts488_daily ON cauldron_receipts488(player_id,day_key,recipe_id);
 CREATE INDEX IF NOT EXISTS loadlab_entities_account488 ON loadlab_entities_v1(account_id);`);
}
export function createCauldron488(db,{now=Date.now,grants,isTestPlayer=colLabIsPlayer}={}){
 const grant=grants??createCauldronGrants488(db,{now});
 const setting=db.prepare('SELECT events_json FROM game_settings WHERE id=1');
 const owned=db.prepare('SELECT id,account_id FROM players WHERE id=?');
 const balance=db.prepare('SELECT bat_wing,ghost_dust,pumpkin_seed FROM player_cauldron488 WHERE player_id=?');
 const receipt=db.prepare('SELECT fingerprint,result_json FROM cauldron_receipts488 WHERE player_id=? AND request_id=?');
 const daily=db.prepare('SELECT recipe_id,COUNT(*) AS used FROM cauldron_receipts488 WHERE player_id=? AND day_key=? GROUP BY recipe_id');
 const ingredients=id=>{const row=balance.get(id);return Object.fromEntries(CAULDRON_INGREDIENTS488.map(k=>[k,Number(row?.[k]??0)]));};
 const state=()=>cauldronSettings488(setting.get()?.events_json??'');
 const compact=(id,settings)=>{const {config,revision}=settings===undefined?state():cauldronSettings488(settings);return {enabled:config.enabled,revision,dayKey:cauldronDay488(now()),ingredients:config.enabled&&!isTestPlayer(id)?ingredients(id):{bat_wing:0,ghost_dust:0,pumpkin_seed:0}};};
 const read=id=>{if(isTestPlayer(id))throw Error('Test hesapları kazan etkinliğine katılamaz.');if(!owned.get(id))throw Error('Karakter bulunamadı.');const s=state(),ids=new Set(s.config.recipes.flatMap(r=>r.rewards.map(x=>x.itemId))),dayKey=cauldronDay488(now());return {...compact(id),recipes:s.config.recipes,rewardCatalog:CAULDRON_CATALOG488.filter(i=>ids.has(i.id)),dailyCrafts:Object.fromEntries(daily.all(id,dayKey).map(r=>[r.recipe_id,Number(r.used)])),serverTime:now()};};
 const transaction=fn=>{db.exec('BEGIN IMMEDIATE');try{const result=fn();db.exec('COMMIT');return result;}catch(error){if(db.isTransaction)db.exec('ROLLBACK');throw error;}};
 return {compact,read,settings(){return {...state(),catalog:CAULDRON_CATALOG488,areas:CAULDRON_AREAS488};},
  save(input,expectedRevision,expectedEvents){
   const config=validateCauldron488(input);
   transaction(()=>{const previous=setting.get()?.events_json??'',current=cauldronSettings488(previous);
    if(!Number.isSafeInteger(expectedRevision)||expectedRevision!==current.revision||typeof expectedEvents!=='string'||expectedEvents!==previous)throw Error('Etkinlik ayarları değişti. Güncel ayarları yükle.');
    const root=JSON.parse(previous||'{}'),next=JSON.stringify({...root,cauldron488:{...config,revision:current.revision+1}});
    if(!db.prepare('UPDATE game_settings SET events_json=? WHERE id=1 AND events_json=?').run(next,previous).changes)throw Error('Etkinlik ayarları başka bir oturumda değişti.');
   });return this.settings();
  },
  command(accountId,playerId,input){
   if(typeof input?.requestId!=='string'||!/^[A-Za-z0-9_-]{16,80}$/.test(input.requestId)||typeof input.recipeId!=='string'||!/^[A-Za-z0-9_-]{1,48}$/.test(input.recipeId)||!Number.isSafeInteger(input.configRevision)||input.configRevision<1)reject488('request_invalid','Kazan isteği geçersiz.');
   const fingerprint=JSON.stringify([input.recipeId,input.configRevision]);
   const outcome=transaction(()=>{
    const player=owned.get(playerId);if(!player||player.account_id!==accountId||isTestPlayer(playerId))reject488('actor_invalid','Bu karakter kazan etkinliğine katılamaz.');
    const prior=receipt.get(playerId,input.requestId);
    if(prior){if(prior.fingerprint!==fingerprint)reject488('request_conflict','İşlem kimliği başka bir tarifte kullanılmış.');return {receipt:JSON.parse(prior.result_json),replayed:true};}
    const {config,revision}=state();if(!config.enabled)reject488('disabled','Cadının Kazanı şu anda kapalı.');if(revision!==input.configRevision)reject488('config_changed','Kazan tarifleri değişti. Paneli yeniden aç.');
    const recipe=config.recipes.find(r=>r.id===input.recipeId);if(!recipe)reject488('recipe_invalid','Tarif bulunamadı.');
    const t=now(),dayKey=cauldronDay488(t),used=Number(db.prepare('SELECT COUNT(*) AS n FROM cauldron_receipts488 WHERE player_id=? AND day_key=? AND recipe_id=?').get(playerId,dayKey,recipe.id).n);
    if(used>=recipe.dailyLimit)reject488('daily_limit','Bu tarifin günlük hakkı doldu. Haklar Türkiye saatiyle 00.00’da yenilenir.');
    const c=recipe.cost;
    if(!db.prepare('UPDATE player_cauldron488 SET bat_wing=bat_wing-?,ghost_dust=ghost_dust-?,pumpkin_seed=pumpkin_seed-?,updated_at=? WHERE player_id=? AND bat_wing>=? AND ghost_dust>=? AND pumpkin_seed>=?').run(c.bat_wing,c.ghost_dust,c.pumpkin_seed,Math.floor(t/1000),playerId,c.bat_wing,c.ghost_dust,c.pumpkin_seed).changes)reject488('ingredients_missing','Tarif için yeterli malzemen yok.');
    const rewards=recipe.rewards.map(reward=>grant.grant(playerId,reward));
    const result={requestId:input.requestId,recipeId:recipe.id,recipeName:recipe.name,rewards,createdAt:t};
    db.prepare('INSERT INTO cauldron_receipts488(player_id,request_id,fingerprint,recipe_id,day_key,result_json,created_at) VALUES(?,?,?,?,?,?,?)').run(playerId,input.requestId,fingerprint,recipe.id,dayKey,JSON.stringify(result),t);
    return {receipt:result,replayed:false};
   });return {ok:true,...outcome,cauldron488:read(playerId)};
  }
 };
}
