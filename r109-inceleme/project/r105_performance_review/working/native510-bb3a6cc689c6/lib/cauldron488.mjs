import {validateCauldronRewards488} from './cauldron-catalog488.mjs';

export const CAULDRON_INGREDIENTS488=Object.freeze(['bat_wing','ghost_dust','pumpkin_seed']);
export const CAULDRON_AREAS488=Object.freeze([{id:'forest',name:'Kuzey Ormanı'},{id:'frozen',name:'Donmuş Çam Geçidi'},{id:'black',name:'Kara Bölge'},{id:'ancient',name:'Kadim Kök Vadisi'},{id:'sinsi',name:'Sinsi Taş Vadisi'},{id:'rune',name:'Kadim Rün Sahili'},{id:'rune_v2',name:'Karanlık Rün Sahili'}]);
const AREAS=new Set(CAULDRON_AREAS488.map(x=>x.id));
const exact=(o,keys,label)=>{if(!o||typeof o!=='object'||Array.isArray(o)||Object.keys(o).some(k=>!keys.includes(k)))throw Error(label+' geçersiz.');};
const integer=(v,min,max,label)=>{if(!Number.isSafeInteger(v)||v<min||v>max)throw Error(label+' geçersiz.');return v;};
export function defaultCauldron488(){return {version:1,enabled:false,dropMaps:[...AREAS],drops:{bat_wing:60000,ghost_dust:50000,pumpkin_seed:80000},recipes:[]};}
export function validateCauldron488(input){
 exact(input,['version','enabled','dropMaps','drops','recipes'],'Kazan ayarı');
 if(input.version!==1||typeof input.enabled!=='boolean')throw Error('Kazan ayar sürümü geçersiz.');
 if(!Array.isArray(input.dropMaps)||input.dropMaps.length>AREAS.size||new Set(input.dropMaps).size!==input.dropMaps.length||input.dropMaps.some(x=>!AREAS.has(x)))throw Error('Malzeme haritaları geçersiz.');
 exact(input.drops,CAULDRON_INGREDIENTS488,'Malzeme oranı');
 const drops=Object.fromEntries(CAULDRON_INGREDIENTS488.map(k=>[k,integer(input.drops[k],0,1000000,'Malzeme oranı')]));
 if(!Array.isArray(input.recipes)||input.recipes.length>8)throw Error('En fazla 8 kazan tarifi olabilir.');
 const ids=new Set(),recipes=input.recipes.map(r=>{
  exact(r,['id','name','cost','dailyLimit','rewards'],'Tarif');
  if(typeof r.id!=='string'||!/^[A-Za-z0-9_-]{1,48}$/.test(r.id)||ids.has(r.id))throw Error('Tarif kimliği geçersiz veya tekrar ediyor.');ids.add(r.id);
  if(typeof r.name!=='string'||r.name.trim().length<1||r.name.trim().length>48||/[<>\u0000-\u001f\u007f]/u.test(r.name))throw Error('Tarif adı 1–48 karakter olmalı.');
  exact(r.cost,CAULDRON_INGREDIENTS488,'Tarif malzemesi');
  const cost=Object.fromEntries(CAULDRON_INGREDIENTS488.map(k=>[k,integer(r.cost[k],0,1000,'Malzeme adedi')]));
  if(Object.values(cost).reduce((a,b)=>a+b,0)<1)throw Error('Her tarif en az bir malzeme istemeli.');
  return {id:r.id,name:r.name.trim(),cost,dailyLimit:integer(r.dailyLimit,1,100,'Günlük tarif hakkı'),rewards:validateCauldronRewards488(r.rewards)};
 });
 if(input.enabled&&(!recipes.length||!input.dropMaps.length))throw Error('Kazanı açmadan önce ödüllü bir tarif ve malzeme haritası seç.');
 return {version:1,enabled:input.enabled,dropMaps:[...input.dropMaps],drops,recipes};
}
let lastJson,lastState;
export function cauldronSettings488(settings){
 const raw=typeof settings==='string'?settings:settings?.events_json??'';
 if(raw===lastJson&&lastState)return lastState;
 let state;
 try{const root=JSON.parse(raw||'{}'),saved=root.cauldron488;if(!saved)state={config:defaultCauldron488(),revision:0};else{const {revision,...input}=saved;integer(revision,1,Number.MAX_SAFE_INTEGER-1,'Kazan ayar sürümü');state={config:validateCauldron488(input),revision};}}
 catch{state={config:defaultCauldron488(),revision:0};}
 for(const r of state.config.recipes){Object.freeze(r.cost);for(const reward of r.rewards)Object.freeze(reward);Object.freeze(r.rewards);Object.freeze(r);}
 Object.freeze(state.config.recipes);Object.freeze(state.config.drops);Object.freeze(state.config.dropMaps);Object.freeze(state.config);Object.freeze(state);lastJson=raw;lastState=state;return state;
}
export const cauldronDay488=nowMs=>Math.floor((nowMs+10800000)/86400000);
export function cauldronDropSnapshot488(settings,area){
 const {config,revision}=cauldronSettings488(settings);
 if(!config.enabled||!config.dropMaps.includes(area)||!Object.values(config.drops).some(v=>v>0))return null;
 return {v:1,area,revision,rates:CAULDRON_INGREDIENTS488.map(k=>config.drops[k])};
}
function snapshot488(settings,target){
 if(typeof target?.events_snapshot==='string'){
  try{const s=JSON.parse(target.events_snapshot).cauldron488;
   return s?.v===1&&AREAS.has(s.area)&&Array.isArray(s.rates)&&s.rates.length===3&&s.rates.every(x=>Number.isInteger(x)&&x>=0&&x<=1000000)?s:null;
  }catch{return null;}
 }
 return cauldronDropSnapshot488(settings,target?.area??target?.monster_area);
}
// Existing monster XP claim tokens admit the exact eligible player set once.
// The added statement lives inside that SAME lethal/reward transaction; it
// cannot award from intermediate hits, PvP or a replayed/deferred claim.
export function cauldronDropStatements488(database,settings,target,monsterId,token,now,isTestMonster){
 const s=snapshot488(settings,target);if(!s||!s.rates.some(x=>x>0)||isTestMonster?.(monsterId))return [];
 return [database.prepare(cauldronDropSql488(s.rates)).bind(token,now)];
}
export function cauldronDropSql488(rates){
 if(!Array.isArray(rates)||rates.length!==3||rates.some(n=>!Number.isInteger(n)||n<0||n>1000000))throw Error('Invalid cauldron drop rates');
 const rolls=rates.map(n=>n===0?'0':n===1000000?'1':`CASE WHEN ((random() & 2147483647)%1000000)<${n} THEN 1 ELSE 0 END`);
 return `WITH earned AS MATERIALIZED (
  SELECT c.player_id,${rolls[0]} AS bat_wing,${rolls[1]} AS ghost_dust,${rolls[2]} AS pumpkin_seed
  FROM monster_xp_claims c JOIN players p ON p.id=c.player_id WHERE c.claim_token=?
  AND p.loadlab_run_id='' AND NOT EXISTS(SELECT 1 FROM loadlab_entities_v1 e WHERE e.id=p.id OR e.account_id=p.account_id)
  AND NOT EXISTS(SELECT 1 FROM loadlab_admissions_v1 a WHERE a.account_id=p.account_id)
 ) INSERT INTO player_cauldron488(player_id,bat_wing,ghost_dust,pumpkin_seed,updated_at)
 SELECT player_id,bat_wing,ghost_dust,pumpkin_seed,? FROM earned WHERE bat_wing+ghost_dust+pumpkin_seed>0
 ON CONFLICT(player_id) DO UPDATE SET bat_wing=MIN(1000000,player_cauldron488.bat_wing+excluded.bat_wing),ghost_dust=MIN(1000000,player_cauldron488.ghost_dust+excluded.ghost_dust),pumpkin_seed=MIN(1000000,player_cauldron488.pumpkin_seed+excluded.pumpkin_seed),updated_at=excluded.updated_at`;
}
