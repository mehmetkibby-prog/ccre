import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {syncBuiltinESMExports} from 'node:module';
import {native,hash} from './helpers.mjs';
import {json,update,put} from './pvp-fixture.mjs';
import {actionRandom} from '../action-writer.mjs';
import {serviceTransactionDatabase} from '../service-transaction.mjs';
import {NATIVE_MODE_SQL_BATCHES} from '../generated/reward-services.mjs';

export const modeGlobals={__colDungeon:{locked:()=>false}};
export function captureModes(sql){
 const tables=sql.prepare("SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'kernel511_%' ORDER BY name").all();
 return Object.fromEntries(tables.map(({name})=>[name,json(sql.prepare('SELECT * FROM "'+name.replaceAll('"','""')+'"').all()).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)))]));
}
export function withNativeModeOracle(s,fn,seed=s.seed){
 const rng=actionRandom(seed),oldMath=Math.random,oldDate=Date.now,oldUuid=crypto.randomUUID,oldWeb=globalThis.crypto.randomUUID,prior=new Map(Object.entries(modeGlobals).map(([k])=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
 try{
  Math.random=rng.random;Date.now=()=>s.nowMs;crypto.randomUUID=rng.uuid;globalThis.crypto.randomUUID=rng.uuid;syncBuiltinESMExports();Object.assign(globalThis,modeGlobals);
  return fn(serviceTransactionDatabase(s.sql,{allowedExec:NATIVE_MODE_SQL_BATCHES}),rng);
 }finally{
  Math.random=oldMath;Date.now=oldDate;crypto.randomUUID=oldUuid;globalThis.crypto.randomUUID=oldWeb;syncBuiltinESMExports();for(const [key,value]of prior){if(value)Object.defineProperty(globalThis,key,value);else delete globalThis[key];}
 }
}
export async function compareMode(s,services,label,nativeFactory,oldOperation,newOperation){
 return s.f.database.atomic(()=>compareModeSync(s,services,label,nativeFactory,oldOperation,newOperation));
}
export function compareModeSync(s,services,label,nativeFactory,oldOperation,newOperation){
 assert(s.sql.isTransaction);
 const seed=hash(s.seed+label);let expected,after;
  s.sql.exec('SAVEPOINT mode_oracle');
  try{withNativeModeOracle(s,(db)=>{const original=nativeFactory(db);expected=json(oldOperation(original));after=captureModes(s.sql);},seed);}
  finally{s.sql.exec('ROLLBACK TO mode_oracle;RELEASE mode_oracle');}
 const actual=services.run({nowMs:s.nowMs,seed},g=>newOperation(g));
 assert.deepEqual(json(actual),expected,label+' response');assert.deepEqual(captureModes(s.sql),after,label+' persisted rows');return actual;
}

export async function prepareCauldron(s,itemId='resource:gems'){
 const {defaultCauldron488}=await native('lib/cauldron488.mjs');
 const {CAULDRON_BY_ID488}=await native('lib/cauldron-catalog488.mjs'),item=CAULDRON_BY_ID488.get(itemId);assert(item);
 const reward={itemId,amount:1,...(item.powerMin!==undefined?{power:item.defaultPower}:{})},prior=JSON.parse(s.sql.prepare('SELECT events_json FROM game_settings WHERE id=1').get().events_json||'{}');
 const config={...defaultCauldron488(),enabled:true,revision:1,recipes:[{id:'native511',name:'Native oracle',cost:{bat_wing:1,ghost_dust:1,pumpkin_seed:1},dailyLimit:100,rewards:[reward]}]};
 s.sql.prepare('UPDATE game_settings SET events_json=? WHERE id=1').run(JSON.stringify({...prior,cauldron488:config}));
 s.sql.prepare('INSERT INTO player_cauldron488(player_id,bat_wing,ghost_dust,pumpkin_seed) VALUES(?,100,100,100) ON CONFLICT(player_id) DO UPDATE SET bat_wing=100,ghost_dust=100,pumpkin_seed=100').run(s.id);
 return {requestId:'cauldron-native511-'+hash(itemId).slice(0,16),recipeId:'native511',configRevision:1};
}

export async function prepareModeCase(s,kind,action,extra={}){
 const {sql,id,nowMs}=s,requestId='core511-mode-'+hash(kind+action+JSON.stringify(extra)).slice(0,24);let input={action,requestId,...extra};
 if(kind==='rune'){
  update(sql,'players',id,{level:65,rank_tier:1,area:'forest',combat_lock_until_ms:0,arena_match_id:''});
  sql.prepare('INSERT INTO dungeon_materials(player_id,kind,amount) VALUES(?,?,100) ON CONFLICT(player_id,kind) DO UPDATE SET amount=100').run(id,'rune_attack');
  if(!['rune_claim','rune_craft'].includes(action)){const itemId='mode-rune-item';sql.prepare("INSERT OR REPLACE INTO player_items(id,player_id,kind,item_name,rarity,power,role,equipped,enchantments,created_at) VALUES(?,?,'rune_attack','Rün','unique',1,'avci',?,'[]',1)").run(itemId,id,action==='rune_unequip'?1:0);input={...input,itemId,expectedLevel:1};}else if(action==='rune_craft')input.kind='rune_attack';
 }else if(kind==='arena_market'){
  update(sql,'players',id,{area:'forest',combat_lock_until_ms:0,arena_match_id:'',arena_coins:100000,arena_exp_rings:1,arena_wings_owned:1,arena_wings_expires_at_ms:nowMs+86400000});
  if(action==='arena_market_buy'){input.itemId??='arena:wings';input.revision=sql.prepare('SELECT revision FROM arena_market_settings WHERE id=1').get().revision;sql.prepare('UPDATE arena_market_settings SET config_json=? WHERE id=1').run(JSON.stringify([{itemId:input.itemId,price:5,amount:1,...(input.itemId.startsWith('rune:')?{power:1}:{})}]));}else if(action==='arena_market_wings')input.enabled=true;
 }else if(kind==='battle_pass'){
  const {defaultBattlePassConfig}=await native('lib/battle-pass.mjs'),config={...defaultBattlePassConfig(),enabled:true};
  const active=JSON.stringify(config),season='core511-test-season';sql.prepare('UPDATE battle_pass_settings SET config_json=?,active_json=?,enabled=1,season_id=?,starts_at=?,ends_at=?,xp_cap=? WHERE id=1').run(active,active,season,nowMs-1000,nowMs+86400000,config.tiers.at(-1).xp);
  update(sql,'players',id,{core_coins:10000,battle_pass_season:season,battle_pass_xp:config.tiers.at(-1).xp});input.seasonId=season;input.revision=sql.prepare('SELECT revision FROM battle_pass_settings WHERE id=1').get().revision;
  if(action==='battle_pass_claim'){input.track??='free';input.tier??=1;if(input.track==='premium')sql.prepare('INSERT OR IGNORE INTO battle_pass_purchases VALUES(?,?,?,?)').run(season,id,config.price,nowMs-500);}
 }else if(kind==='community_claim'){
  const {defaultCommunityConfig}=await native('lib/community-event.mjs'),config=defaultCommunityConfig(),account=sql.prepare('SELECT account_id FROM players WHERE id=?').get(id).account_id;
  sql.prepare('INSERT OR IGNORE INTO community_runs(id,config_json,start_at,end_at,published,total,created_at) VALUES(?,?,?,?,1,?,?)').run('core511-community',JSON.stringify(config),Math.floor(nowMs/1000)-10,Math.floor(nowMs/1000)+3600,config.stages.at(-1).target,1);
  sql.prepare('INSERT OR IGNORE INTO community_progress VALUES(?,?,?)').run('core511-community',account,config.minimum);input={eventId:'core511-community',stage:extra.stage??0};
 }else if(kind==='cauldron')input=await prepareCauldron(s,extra.itemId);
 else if(kind==='guild_village'){
  const {villageArea,GUILD_DECOR}=await native('lib/guild-village.mjs');sql.prepare('UPDATE guild_village_settings SET enabled=1 WHERE id=1').run();
  update(sql,'players',id,{area:villageArea(1),combat_lock_until_ms:0,arena_match_id:'',root_until_ms:0,stun_until_ms:0,pearls:1000,gems:1000000,essence:100000});
  if(!sql.prepare('SELECT 1 FROM guilds WHERE id=?').get('mode-guild'))sql.prepare('INSERT INTO guilds(id,name,name_key,leader_id,created_at) VALUES(?,?,?,?,1)').run('mode-guild','Core guild','core guild',id);if(!sql.prepare('SELECT 1 FROM guild_members WHERE player_id=?').get(id))sql.prepare('INSERT INTO guild_members(player_id,guild_id,joined_at) VALUES(?,?,1)').run(id,'mode-guild');
  input.requestId=hash(action).slice(0,8)+'-1111-4111-8111-'+hash(action).slice(8,20);
  if(action==='buy'){input.district=1;input.slot=1;}else if(action==='village')input.district=1;
  else{sql.prepare('INSERT OR IGNORE INTO guild_castles(guild_id,district,slot,purchased_by,purchased_at,decor_essence) VALUES(?,1,1,?,1,?)').run('mode-guild',id,action==='upgrade'?GUILD_DECOR[0].essence:0);if(action==='donate')input.amount=100;if(action==='upgrade')input.level=1;if(action==='invite')input.target=s.targetId;if(action==='revoke'){input.target=s.targetId;sql.prepare('INSERT OR REPLACE INTO guild_castle_guests VALUES(?,?,?,?)').run('mode-guild',s.targetId,id,Math.floor(nowMs/1000)+1800);}}
 }else throw Error('Unknown isolated mode case '+kind);
 return {kind,input,nowMs,seed:s.seed};
}
