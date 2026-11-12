import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createRewardServices} from '../generated/reward-services.mjs';
import {createRules} from '../generated/rules.mjs';
import {WriterSettings} from '../writer-settings.mjs';
import {ENCHANT_TIER_DEFAULTS,ENCHANT_TIERS} from '../../../../native510-bb3a6cc689c6/lib/enchantment-tiers.mjs';
import {installRegistry} from '../../../../native510-bb3a6cc689c6/vds-server/src/loadlab/registry.mjs';

const tiers=[1,2,3,5],suffixes=['one','two','four','five'];
const seeded=(seed=12345)=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};
const tierSettings=Object.fromEntries(suffixes.map((suffix,i)=>['enchant_life_steal_tier_'+suffix,tiers[i]]));
function fixture(t,itemId='class:blue_armor'){
 const sql=new DatabaseSync(':memory:');t.after(()=>sql.close());
 sql.exec(`CREATE TABLE game_settings(id INTEGER PRIMARY KEY,blue_weapon_power_min INTEGER,blue_weapon_power_max INTEGER,blue_armor_power_min INTEGER,blue_armor_power_max INTEGER);
 INSERT INTO game_settings VALUES(1,31,31,47,47);
 CREATE TABLE combat_settings(id INTEGER PRIMARY KEY,${Object.keys(ENCHANT_TIER_DEFAULTS).map(k=>k+' INTEGER').join(',')});
 CREATE TABLE players(id TEXT PRIMARY KEY,role TEXT,level INTEGER,gems INTEGER,quest_kills438 INTEGER,quest_fish438 INTEGER);
 INSERT INTO players VALUES('player','muhafiz',50,100,1000,0);
 CREATE TABLE player_items(id TEXT PRIMARY KEY,player_id TEXT,kind TEXT,item_name TEXT,rarity TEXT,power INTEGER,role TEXT,equipped INTEGER,enchantments TEXT,created_at INTEGER);
 CREATE TABLE quest_settings438(id INTEGER PRIMARY KEY,revision INTEGER,enabled INTEGER,config_json TEXT);
 CREATE TABLE quest_claims438(player_id TEXT,quest_id TEXT,kills INTEGER,fish INTEGER,reward_json TEXT,claimed_at INTEGER,PRIMARY KEY(player_id,quest_id));
 CREATE TABLE quest_receipts438(player_id TEXT,request_id TEXT,fingerprint TEXT,result_json TEXT,PRIMARY KEY(player_id,request_id));
 CREATE TABLE player_evolution_quest(player_id TEXT,completed_at INTEGER,claimed_at INTEGER);`);
 const settings={...ENCHANT_TIER_DEFAULTS,...tierSettings};
 sql.prepare('INSERT INTO combat_settings(id,'+Object.keys(settings).join(',')+') VALUES(1,'+Object.keys(settings).map(()=>'?').join(',')+')').run(...Object.values(settings));
 const reward={itemId,amount:1,...(itemId.startsWith('gear:')?{power:61}:{})};
 const config={enabled:true,quests:[{id:'r76_hunt',title:'R76 hunt',description:'',event:'kill',target:1,rewards:[reward]}]};
 sql.prepare('INSERT INTO quest_settings438 VALUES(1,1,1,?)').run(JSON.stringify(config));
 let sequence=0;const random=seeded(),now=()=>1_800_000_000_000;
 const service=createRewardServices({globals:{},random,uuid:()=>`r76-gear-${++sequence}`,now}).quests.createQuests438(sql,{random,now});
 return {sql,service,reward,claim(i){return service.command('player',{action:'quest_claim',questId:'r76_hunt',revision:1,requestId:'r76-claim-'+String(i).padStart(16,'0')});}};
}
function counts(rows){const out={};for(const row of rows)for(const e of JSON.parse(row.enchantments))if(e.kind==='life_steal')out[e.value]=(out[e.value]??0)+1;return out;}

for(const itemId of ['class:blue_weapon','class:blue_armor','gear:muhafiz:armor:blue'])test('R76 current admin tiers reach actual quest gear '+itemId,t=>{
 const f=fixture(t,itemId);
 for(let i=0;i<400;i++){f.sql.exec('DELETE FROM quest_claims438');f.claim(i);}
 const items=f.sql.prepare('SELECT * FROM player_items').all(),observed=counts(items);
 assert.equal(items.length,400);assert.deepEqual(Object.keys(observed).map(Number).sort((a,b)=>a-b),tiers,JSON.stringify(observed));
 assert(items.every(i=>i.power===(itemId==='class:blue_weapon'?31:itemId==='class:blue_armor'?47:61)));
 assert(items.every(i=>JSON.parse(i.enchantments).length===4));
 t.diagnostic(JSON.stringify({itemId,items:items.length,lifeSteal:observed}));
});

test('R76 cauldron class rewards reload tier changes; stored gear and claim replay stay untouched',t=>{
 const f=fixture(t);f.sql.prepare("INSERT INTO player_items VALUES('old','player','armor','Existing armor','blue',20,'muhafiz',0,?,1)").run('[{"kind":"life_steal","value":15}]');
 for(const currentTiers of [[1,2,3,5],[2,4,6,8]]){
  f.sql.exec('UPDATE combat_settings SET '+suffixes.map((k,i)=>'enchant_life_steal_tier_'+k+'='+currentTiers[i]).join(','));
  const before=f.sql.prepare('SELECT count(*) n FROM player_items').get().n;
  f.sql.exec('BEGIN');try{for(let i=0;i<100;i++)f.service.grantCauldronReward488('player',f.reward);f.sql.exec('COMMIT');}catch(error){f.sql.exec('ROLLBACK');throw error;}
  const observed=counts(f.sql.prepare('SELECT * FROM player_items ORDER BY rowid LIMIT -1 OFFSET ?').all(before));assert.deepEqual(Object.keys(observed).map(Number),currentTiers);
 }
 const first=f.claim(999),before=f.sql.prepare('SELECT * FROM player_items ORDER BY id').all();assert.equal(first.ok,true);
 assert.equal(f.claim(999).replayed,true);assert.deepEqual(f.sql.prepare('SELECT * FROM player_items ORDER BY id').all(),before);
 assert.equal(f.sql.prepare("SELECT enchantments FROM player_items WHERE id='old'").get().enchantments,'[{"kind":"life_steal","value":15}]');
});

test('R76 ordinary, boss and rune ground-loot rolls respect all four saved tiers',t=>{
 const previous=globalThis.__colLoadLab;installRegistry();t.after(()=>{if(previous===undefined)delete globalThis.__colLoadLab;else globalThis.__colLoadLab=previous;});
 const settings={...ENCHANT_TIER_DEFAULTS,...tierSettings,enchant_item_chance:1,enchant_one_chance:1,enchant_two_chance:0,enchant_three_chance:0,enchant_four_chance:0,enchant_life_steal_weight:1};
 for(const [kind]of ENCHANT_TIERS)if(kind!=='life_steal')settings['enchant_'+kind+'_weight']=0;
 const random=seeded(412),rules=createRules({random,uuid:()=>String(random()),globals:{}}),owner={player_id:'player',role:'muhafiz',level:1,drop_charm_until:0};
 for(const key of ['forest.normal','boss.world','sinsi.stone','rune.normal']){
  const rune=key.startsWith('rune.'),profile=rune?{key,runeLoot:{blue:{chance:100,min:1,max:1}}}:{version:1,key,groups:[{id:'gear',rolls:1,gearChanceModel:'direct',charmMultiplierBps:10000,outcomes:[{id:'weapon',item:{type:'gear',family:'generic',kind:'weapon',rarity:'blue'},baseChancePpm:1000000,minAmount:1,maxAmount:1,charmWeight:1}]}]};
  const found=new Set();let gear=0;
  for(let i=0;i<500;i++)for(const row of rules.prepareProfileDrops(profile,[owner],'golge-normal-c1-1',{x:100,y:100,area:'forest'},settings,1800000000,'{}')){gear++;for(const e of JSON.parse(row[9]))if(e.kind==='life_steal')found.add(e.value);}
  assert(gear>=500,key);assert.deepEqual([...found].sort((a,b)=>a-b),tiers,key);t.diagnostic(JSON.stringify({key,gear,tiers:[...found].sort((a,b)=>a-b)}));
 }
});

test('R76 writer settings cache observes tier updates and transaction rollback',t=>{
 const f=fixture(t),cache=new WriterSettings();cache.initialize(f.sql);
 assert.equal(cache.read(f.sql).enchant_life_steal_tier_five,5);
 f.sql.exec('BEGIN;UPDATE combat_settings SET enchant_life_steal_tier_five=4');assert.equal(cache.read(f.sql).enchant_life_steal_tier_five,4);
 f.sql.exec('ROLLBACK');assert.equal(cache.read(f.sql).enchant_life_steal_tier_five,5);
 f.sql.exec('UPDATE combat_settings SET enchant_life_steal_tier_five=3');assert.equal(cache.read(f.sql).enchant_life_steal_tier_five,3);
});
