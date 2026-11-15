import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {CHAMPIONS_MOBS_R118,CHAMPIONS_SPAWNS_R118,CHAMPIONS_ENTRY_R118,CHAMPIONS_LOOT_LABELS_R118,championsEligibleR118,championsWalkableR118,championsSegmentR118,defaultChampionsConfigR118,validateChampionsConfigR118,prepareChampionsDropsR118} from '../../r109_latency_completion/working/core511-source/scripts/core511/champions-config-r118.mjs';
import {ensureChampionsSchemaR118,createChampionsR118} from '../../r109_latency_completion/working/core511-source/scripts/core511/champions-service-r118.mjs';
const fixture=()=>{const sql=new DatabaseSync(':memory:');sql.exec("CREATE TABLE rune_v2_settings(id INTEGER PRIMARY KEY,config_json TEXT);CREATE TABLE monsters(id TEXT PRIMARY KEY,name TEXT,x REAL,y REAL,hp INTEGER,max_hp INTEGER,variant TEXT,area TEXT,channel INTEGER,is_boss INTEGER,is_stone INTEGER,summoned INTEGER,respawn_at INTEGER,spawn_round INTEGER)");const reference={monsters:Object.fromEntries(CHAMPIONS_MOBS_R118.map((m,i)=>[m.reference,{hp:10000+i*1000,damage:100+i*10,xp:1000+i*100,loot:{essence:{chance:100,min:10,max:10}}}]))};sql.prepare('INSERT INTO rune_v2_settings VALUES(1,?)').run(JSON.stringify(reference));sql.prepare("INSERT INTO monsters VALUES('existing','Existing',1,2,30,40,'normal','forest',1,0,0,0,0,7)").run();return {sql,reference};};

test('initialization seeds four channels from each realm actual rune values only once and preserves existing monsters',()=>{
 const {sql,reference}=fixture();try{const before=sql.prepare("SELECT * FROM monsters WHERE id='existing'").get();ensureChampionsSchemaR118(sql);const service=createChampionsR118(sql),state=service.settings();assert.equal(sql.prepare("SELECT COUNT(*) n FROM monsters WHERE area='champions'").get().n,192);assert.deepEqual(sql.prepare("SELECT * FROM monsters WHERE id='existing'").get(),before);
 for(const m of CHAMPIONS_MOBS_R118){const ref=reference.monsters[m.reference],cfg=state.config.monsters[m.key];assert.equal(cfg.hp,Math.ceil(ref.hp*1.12));assert.equal(cfg.damage,Math.ceil(ref.damage*1.12));assert.equal(cfg.xp,Math.ceil(ref.xp*1.1));assert.equal(cfg.essence,11);assert.equal(cfg.loot.royal_crown.chance,2);assert(Object.entries(cfg.loot).every(([key,row])=>key==='royal_crown'||row.chance===0));}
 for(let channel=1;channel<=4;channel++)for(const point of CHAMPIONS_SPAWNS_R118){const id=`champions-${point.key}-c${channel}-${String(point.slot).padStart(2,'0')}`,row=sql.prepare('SELECT x,y FROM monsters WHERE id=?').get(id);assert.deepEqual([row.x,row.y],[point.x,point.y]);}
 sql.prepare("UPDATE monsters SET hp=0,spawn_round=12,respawn_at=987 WHERE area='champions'").run();sql.prepare("UPDATE rune_v2_settings SET config_json='{}'").run();ensureChampionsSchemaR118(sql);assert.equal(sql.prepare("SELECT SUM(hp) n FROM monsters WHERE area='champions'").get().n,0);assert.deepEqual(createChampionsR118(sql).settings(),state);
 }finally{sql.close();}
});
test('champion-only eligibility and open-map spawn geometry',()=>{
 for(const player of [null,{}, {level:65,rank_tier:99},{champion_level_r102:0},{champion_level_r102:-1},{champion_level_r102:1.5},{champion_level_r102:'1'}])assert.equal(championsEligibleR118(player),false);
 assert(championsEligibleR118({champion_level_r102:1}));assert(championsWalkableR118(CHAMPIONS_ENTRY_R118.x,CHAMPIONS_ENTRY_R118.y));assert.equal(CHAMPIONS_SPAWNS_R118.length,48);
 for(const p of CHAMPIONS_SPAWNS_R118){assert(championsWalkableR118(p.x,p.y));assert(championsSegmentR118(CHAMPIONS_ENTRY_R118.x,CHAMPIONS_ENTRY_R118.y,p.x,p.y));}
 for(const m of CHAMPIONS_MOBS_R118)assert.equal(CHAMPIONS_SPAWNS_R118.filter(p=>p.key===m.key).length,12);
 for(let i=0;i<CHAMPIONS_SPAWNS_R118.length;i++){const p=CHAMPIONS_SPAWNS_R118[i];assert(Math.hypot(p.x-CHAMPIONS_ENTRY_R118.x,p.y-CHAMPIONS_ENTRY_R118.y)>=300);assert(p.x>=320&&p.x<=3280&&p.y>=350&&p.y<=2100);for(const q of CHAMPIONS_SPAWNS_R118.slice(0,i))assert(Math.hypot(p.x-q.x,p.y-q.y)>=220);}
 assert(new Set(CHAMPIONS_SPAWNS_R118.map(p=>p.x)).size>=45);assert(new Set(CHAMPIONS_SPAWNS_R118.map(p=>p.y)).size>=45);
 assert(!championsWalkableR118(20,20));assert(!championsSegmentR118(80,100,3600,2400));
});
test('admin revision CAS, bounds and frozen earned-loot snapshots survive configuration changes',()=>{
 const {sql}=fixture();try{ensureChampionsSchemaR118(sql);const service=createChampionsR118(sql),before=service.settings(),monster={id:'champions-ivory_guard-c1-01',area:'champions'},earned=service.lootSnapshot(monster);const config=structuredClone(before.config);config.monsters.ivory_guard.hp=4321;config.monsters.ivory_guard.damage=0;config.monsters.ivory_guard.xp=0;config.monsters.ivory_guard.essence=0;config.monsters.ivory_guard.loot.royal_crown.chance=75;assert.equal(service.save(config,before.revision).revision,2);assert.equal(service.monster(monster).hp,4321);assert.equal(JSON.parse(earned.lootProfileJson).championsLoot.royal_crown.chance,2);assert.throws(()=>service.save(config,before.revision),/Ayarlar değişti/);assert.equal(service.settings().revision,2);
 for(const bad of [()=>{config.monsters.ivory_guard.hp=0;},()=>{config.monsters.ivory_guard.loot.royal_crown.chance=101;},()=>{config.monsters.ivory_guard.loot.unknown={chance:1,min:1,max:1};}]){const original=structuredClone(config);bad();assert.throws(()=>validateChampionsConfigR118(config));Object.keys(config).forEach(k=>delete config[k]);Object.assign(config,original);}
 }finally{sql.close();}
});
test('champions loot obeys only saved admin rates, uses one authoritative owner and no implicit global event drops',()=>{
 const config=defaultChampionsConfigR118(),profile={key:'champions.ivory_guard',championsLoot:config.monsters.ivory_guard.loot,championsEssence:11};profile.championsLoot.royal_crown.chance=100;
 const helpers={random:()=>0,uuid:()=>crypto.randomUUID(),role:()=>{throw Error('disabled gear roll');},name:()=>'',power:()=>0,enchants:()=>[]};const rows=prepareChampionsDropsR118(profile,[{player_id:'owner1'},{player_id:'owner2'}],'champions-ivory_guard-c1-01',{x:500,y:500},{world_boss_purple_chance:1},1000,helpers);
 assert.deepEqual(rows.map(r=>[r[1],r[3],r[7]]),[['owner1','essence',11],['owner1','royal_crown',1]]);assert(rows.every(r=>r[12]===1030&&r[13]===1005));assert.equal(Object.hasOwn(CHAMPIONS_LOOT_LABELS_R118,'essence'),false);assert.deepEqual(prepareChampionsDropsR118(profile,[], 'm',{x:0,y:0},{},1,helpers),[]);
});
