// The same small factory is embedded in native client/admin bundles. It has
// one bounded cache per realm/module, never a player cache or timer.
export function createSpecialistSkills459(){
 const defaults={
  arkanist_burst:{multiplier:2.1,cooldownMs:18000},
  arkanist_heal:{healPercent:20,cooldownMs:24000},
  avci_sharp:{multiplier:2.2,cooldownMs:18000},
  avci_trap:{multiplier:1.5,rootMs:1800,cooldownMs:20000},
  muhafiz_tank:{healPercent:12,guardPercent:20,guardMs:6000,cooldownMs:24000},
  muhafiz_strike:{multiplier:2.2,cooldownMs:18000},
 };
 const bounds={multiplier:[.1,10],healPercent:[0,30],guardPercent:[0,75],guardMs:[0,30000],rootMs:[0,2000],cooldownMs:[1000,120000]};
 const plain=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
 const freeze=value=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.freeze(value);for(const child of Object.values(value))freeze(child);}return value;};
 freeze(defaults);freeze(bounds);
 function defaultConfig(){return {revision:0,skills:Object.fromEntries(Object.entries(defaults).map(([id,values])=>[id,{...values}]))};}
 function validate(input){
  if(!plain(input)||!Number.isSafeInteger(input.revision)||input.revision<0||input.revision>=Number.MAX_SAFE_INTEGER||!plain(input.skills))throw Error('Uzmanlık becerisi ayarları veya sürümü geçersiz.');
  if(Object.keys(input).some(k=>!['revision','skills'].includes(k))||Object.keys(input.skills).some(id=>!Object.hasOwn(defaults,id)))throw Error('Bilinmeyen uzmanlık becerisi veya ayar alanı.');
  const skills={};
  for(const[id,fields]of Object.entries(defaults)){
   const row=input.skills[id];if(!plain(row)||Object.keys(row).some(k=>!Object.hasOwn(fields,k)))throw Error('Uzmanlık becerisi alanları geçersiz: '+id);
   skills[id]={};for(const key of Object.keys(fields)){const n=row[key],[min,max]=bounds[key];if(typeof n!=='number'||!Number.isFinite(n)||n<min||n>max||(key.endsWith('Ms')&&!Number.isSafeInteger(n)))throw Error(id+': '+key+' '+min+'–'+max+' arasında olmalı.');skills[id][key]=n;}
  }
  return {revision:input.revision,skills};
 }
 const cache=new Map();let parses=0;
 function record(raw){
  const key=typeof raw==='string'?raw:'';let hit=cache.get(key);if(hit){cache.delete(key);cache.set(key,hit);return hit;}
  let config;try{const value=key?JSON.parse(key):null;config=value?.specialistSkills459===undefined?defaultConfig():validate(value.specialistSkills459);}catch{config=defaultConfig();}
  parses++;hit={config:freeze(config),branches:new Map()};cache.set(key,hit);if(cache.size>8)cache.delete(cache.keys().next().value);return hit;
 }
 function read(raw){return record(raw).config;}
 function configure(branch,settings){
  if(!branch)return null;if(settings===undefined)return branch;
  const entry=record(typeof settings==='string'?settings:settings?.events_json),row=entry.config.skills[branch.id];if(!row)return branch;
  if(!entry.branches.has(branch.id))entry.branches.set(branch.id,freeze({...branch,
   ...(row.multiplier!==undefined?{multiplier:row.multiplier}:{}),
   ...(row.healPercent!==undefined?{heal:row.healPercent/100}:{}),
   ...(row.guardPercent!==undefined?{guard:row.guardPercent/100}:{}),
   ...(row.guardMs!==undefined?{guardMs:row.guardMs}:{}),
   ...(row.rootMs!==undefined?{rootMs:row.rootMs}:{}),cooldown:row.cooldownMs,
  }));return entry.branches.get(branch.id);
 }
 // Used only by tests/diagnostics, never sent in a world snapshot.
 return {defaults,bounds,defaultConfig,validate,read,configure,diagnostics:()=>({cacheSize:cache.size,parses})};
}
const api=createSpecialistSkills459();
export const SPECIALIST_SKILL_DEFAULTS459=api.defaults;
export const SPECIALIST_SKILL_BOUNDS459=api.bounds;
export const defaultSpecialistSkills459=api.defaultConfig;
export const validateSpecialistSkills459=api.validate;
export const readSpecialistSkills459=api.read;
export const configureSpecialization459=api.configure;
export const specialistSkillsDiagnostics459=api.diagnostics;
