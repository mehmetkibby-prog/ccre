import {SOLO_CATALOG} from '../../../native510-bb3a6cc689c6/lib/solo-dungeon.mjs';
export const TOWER_KEY='kadim-tower-r18';
export const TOWER_KINDS=Object.freeze({guard:'Zincirli Nöbetçi',acolyte:'Kül Vaizi',claw:'Yarık Pençe',stone:'Kadim Sinsi Taş',warden:'Kör Gardiyan',mourner:'Matem Rahibesi',azrail:'Azrail'});
export const TOWER_MATERIALS=Object.freeze([
 {id:'tower:seal_shard',kind:'tower_seal_shard',name:'Kadim Kat Mührü',type:'towerMaterial',forge:0},
 {id:'tower:chain_ore',kind:'tower_chain_ore',name:'Ruh Zinciri Halkası',type:'towerMaterial',forge:0},
 {id:'tower:mourning_essence',kind:'tower_mourning_essence',name:'Sinsi Taş Çekirdeği',type:'towerMaterial',forge:0},
 {id:'tower:azrail_seal',kind:'tower_azrail_seal',name:'Matem İpeği',type:'towerMaterial',forge:0},
]);
export const TOWER_CHEST=Object.freeze({id:'tower:azrail_chest',kind:'tower_azrail_chest',name:'Azrail Sandığı',type:'towerChest'});
export const TOWER_HOOK=Object.freeze({id:'tower:azrail_hook',kind:'tower_azrail_hook',name:'AZRAİL KANCASI',type:'towerItem'});
export const TOWER_HOOK_CHANCE=6;
export const TOWER_CATALOG=Object.freeze([...TOWER_MATERIALS,TOWER_CHEST,TOWER_HOOK,...SOLO_CATALOG]);
export const TOWER_CATALOG_BY_ID=new Map(TOWER_CATALOG.map(item=>[item.id,item]));
export const TOWER_NAMES=['Mühür Avlusu','Kül Koridoru','Pençe Geçidi','Zincir Salonu','Gardiyanın Zindanı','Kırık Ruhlar','Matem Mabedi','Sessiz Çığlık','Son Mühür','Azrail’in Tahtı'];
const loot=(i,chance=15)=>({itemId:TOWER_MATERIALS[i].id,chance,min:1,max:1});
export const defaultTowerXp=(kind,floor=1)=>Math.round(({guard:200,acolyte:220,claw:200,stone:600,warden:2000,mourner:3000,azrail:10000}[kind]??200)*(1+(Math.max(1,Math.min(10,floor))-1)*.15));
const spawn=(kind,floor,count)=>({kind,count,xp:defaultTowerXp(kind,floor),hp:Math.round((kind==='stone'?2500:kind==='warden'||kind==='mourner'?10000:kind==='azrail'?35000:700)*(1+floor*.55)),damage:Math.round((kind==='azrail'?75:kind==='warden'||kind==='mourner'?40:14)*(1+floor*.14)),speed:kind==='stone'?0:kind==='claw'?130:kind==='azrail'?115:100,attackMs:kind==='azrail'?3800:kind==='stone'?5000:2200,range:kind==='azrail'?550:kind==='acolyte'?360:150,telegraphMs:kind==='azrail'?1400:900,radius:kind==='azrail'?240:105,drops:[loot(Math.min(3,Math.floor((floor-1)/3)),kind==='stone'?35:15)]});
export const TOWER_DEFAULTS=Object.freeze({enabled:true,minLevel:30,durationSeconds:3600,revision:1,
 floors:Array.from({length:10},(_,i)=>{const floor=i+1;return {name:TOWER_NAMES[i],waves:floor===10?1:2,waveDelayMs:2500,spawns:[spawn(i%3===0?'guard':i%3===1?'acolyte':'claw',floor,Math.min(8,3+i)),spawn('stone',floor,Math.min(3,1+Math.floor(i/4))),...(floor===5?[spawn('warden',floor,1)]:floor===7?[spawn('mourner',floor,1)]:floor===10?[spawn('azrail',floor,1)]:[])]};}),
 patterns:{circle:{enabled:true,damage:120,telegraphMs:1200,cooldownMs:5500,radius:170},line:{enabled:true,damage:150,telegraphMs:1400,cooldownMs:6500,radius:650},ring:{enabled:true,damage:180,telegraphMs:1800,cooldownMs:8500,radius:460}},
 chest:[{itemId:TOWER_HOOK.id,chance:TOWER_HOOK_CHANCE,min:1,max:1},loot(2,100),loot(3,25)]});
const integer=(v,a,b,label)=>{if(!Number.isSafeInteger(v)||v<a||v>b)throw Error('Geçersiz kule ayarı: '+label);return v;};
function validateDrops(rows,{chest=false}={}){
 if(!Array.isArray(rows)||rows.length>16)throw Error('Bir ödül tablosunda en fazla 16 satır olabilir.');const ids=new Set();let gear=0;
 const out=rows.map(row=>{const item=TOWER_CATALOG_BY_ID.get(row?.itemId);if(!item||item.id===TOWER_CHEST.id||(!chest&&item.id===TOWER_HOOK.id)||ids.has(item.id))throw Error('Geçersiz/tekrarlanan kule ödülü.');ids.add(item.id);const chance=Number(row.chance);if(!Number.isFinite(chance)||chance<0||chance>100)throw Error('Düşme oranı 0–100 olmalı.');const stack=['resource','material','stone','towerMaterial','towerItem'].includes(item.type),min=integer(row.min,1,stack?1000:1,'ödül miktarı'),max=integer(row.max,min,stack?1000:1,'ödül miktarı');if(!stack&&chance>0)gear++;return {itemId:item.id,chance:Math.round(chance*10000)/10000,min,max};});
 if(gear>8)throw Error('Bir tablodan en fazla 8 ayrı ekipman düşebilir.');
 if(chest){const hook=out.find(r=>r.itemId===TOWER_HOOK.id);if(!hook||hook.chance!==TOWER_HOOK_CHANCE||hook.min!==1||hook.max!==1)throw Error('Azrail Kancası sandıktan %6 olasılıkla 1 adet çıkmalı.');}
 return out;
}
export function validateTowerConfig(input){
 if(!input||typeof input.enabled!=='boolean')throw Error('Kule açık/kapalı ayarı geçersiz.');
 const out={enabled:input.enabled,minLevel:integer(input.minLevel,1,100,'asgari seviye'),durationSeconds:integer(input.durationSeconds,300,14400,'süre'),revision:integer(input.revision??1,1,Number.MAX_SAFE_INTEGER,'sürüm')};
 if(!Array.isArray(input.floors)||input.floors.length!==10)throw Error('Kule tam 10 kat olmalı.');
 out.floors=input.floors.map((f,i)=>{if(typeof f?.name!=='string'||f.name.trim().length<1||f.name.length>60)throw Error('Kat adı geçersiz.');if(!Array.isArray(f.spawns)||!f.spawns.length||f.spawns.length>14)throw Error('Her katta 1–14 canavar grubu olmalı.');const floor={name:f.name.trim(),waves:integer(f.waves,1,10,'dalga'),waveDelayMs:integer(f.waveDelayMs,500,30000,'dalga arası süre'),spawns:f.spawns.map(s=>{if(!Object.hasOwn(TOWER_KINDS,s.kind))throw Error('Canavar türü geçersiz.');return {kind:s.kind,count:integer(s.count,0,30,'canavar sayısı'),xp:integer(s.xp??defaultTowerXp(s.kind,i+1),0,100000000,'tecrübe puanı'),hp:integer(s.hp,1,100000000,'can'),damage:integer(s.damage,0,1000000,'hasar'),speed:integer(s.speed,0,240,'hız'),attackMs:integer(s.attackMs,600,60000,'saldırı aralığı'),range:integer(s.range,60,650,'menzil'),telegraphMs:integer(s.telegraphMs,300,10000,'işaret süresi'),radius:integer(s.radius,40,650,'işaret alanı'),drops:validateDrops(s.drops??[])};})};const count=floor.spawns.reduce((sum,s)=>sum+s.count,0);if(count<1||count>60)throw Error('Bir dalgada 1–60 düşman olabilir.');for(let wave=1;wave<=floor.waves;wave++){const enemies=floor.spawns.reduce((n,s)=>n+(s.kind==='stone'?wave===1:['warden','mourner','azrail'].includes(s.kind)?wave===floor.waves:true)*s.count,0);if(enemies<1)throw Error(`${i+1}. katın ${wave}. dalgası boş olamaz; her dalgaya canavar, ilk dalgaya taş, son dalgaya boss yerleştirilir.`);}const azrails=floor.spawns.filter(s=>s.kind==='azrail').reduce((n,s)=>n+s.count,0);if((i!==9&&azrails)||(i===9&&azrails!==1))throw Error('Azrail yalnız 10. katta, tam 1 adet olmalı.');return floor;});
 out.patterns={};for(const kind of ['circle','line','ring']){const p=input.patterns?.[kind];if(!p||typeof p.enabled!=='boolean')throw Error('Azrail saldırı deseni geçersiz.');out.patterns[kind]={enabled:p.enabled,damage:integer(p.damage,0,1000000,'desen hasarı'),telegraphMs:integer(p.telegraphMs,400,10000,'desen süresi'),cooldownMs:integer(p.cooldownMs,1000,60000,'desen aralığı'),radius:integer(p.radius,60,650,'desen alanı')};}
 if(!Object.values(out.patterns).some(p=>p.enabled))throw Error('Azrail için en az bir alan saldırısı açık olmalı.');
 out.chest=validateDrops(input.chest,{chest:true});return out;
}
export function readTowerConfig(value){
 if(value==null)return structuredClone(TOWER_DEFAULTS);
 try{
  let input=typeof value==='string'?JSON.parse(value):value;
  // Compatibility with the previously locked 10% setting. Apply the new fixed
  // rule while reading; keep custom floors/other loot and stored JSON intact.
  if(Array.isArray(input?.chest))input={...input,chest:input.chest.map(row=>row?.itemId===TOWER_HOOK.id&&Number(row.chance)===10?{...row,chance:TOWER_HOOK_CHANCE}:row)};
  return validateTowerConfig(input);
 }catch(error){throw Error('Kadim Kulesi ayarı okunamadı: '+error.message);}
}
export function createTowerSchema(sql){sql.exec(`CREATE TABLE IF NOT EXISTS kadim_tower_settings(id INTEGER PRIMARY KEY CHECK(id=1),value TEXT NOT NULL,revision INTEGER NOT NULL DEFAULT 1);CREATE TABLE IF NOT EXISTS kadim_tower_receipts(player_id TEXT NOT NULL,request_id TEXT NOT NULL,kind TEXT NOT NULL,result TEXT NOT NULL,PRIMARY KEY(player_id,request_id,kind));CREATE TABLE IF NOT EXISTS kadim_tower_kills(run_id TEXT NOT NULL,enemy_id TEXT NOT NULL,player_id TEXT NOT NULL,PRIMARY KEY(run_id,enemy_id,player_id));`);sql.prepare('INSERT OR IGNORE INTO kadim_tower_settings(id,value) VALUES(1,?)').run(JSON.stringify(TOWER_DEFAULTS));}
export function towerConfigFromDatabase(sql){return readTowerConfig(sql.prepare('SELECT value FROM kadim_tower_settings WHERE id=1').get()?.value);}
export function towerSummary(run){return {floorName:run.tower.floors[run.stage-1].name,waves:run.tower.floors[run.stage-1].waves,wave:run.wave,remaining:run.enemies.filter(e=>e.hp>0).length,floorCount:10};}
