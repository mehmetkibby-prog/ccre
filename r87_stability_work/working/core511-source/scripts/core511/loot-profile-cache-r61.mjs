// Keep the existing per-factory object identity and mutation behavior. Only
// independently constructed factories share a private immutable template of
// the known pure native profile shape, copied before it reaches each factory.
// Rows, RNG, claims, rolls and SQL are never cached here.
const MAX_ENTRIES=32,MAX_BYTES=256*1024,MAX_JSON_CHARS=32768,MAX_SETTINGS=8;
const plain=value=>value&&typeof value==='object'&&[null,Object.prototype].includes(Object.getPrototypeOf(value));
const immutableSettingsSeen=new WeakSet(),sharedSettings=new WeakMap(),liveSettings=[];
function immutableSettings(value){
 if(immutableSettingsSeen.has(value))return true;
 if(!plain(value)||!Object.isFrozen(value))return false;
 const descriptors=Object.getOwnPropertyDescriptors(value);
 if(!Reflect.ownKeys(descriptors).every(key=>typeof key==='string'&&Object.hasOwn(descriptors[key],'value')&&(descriptors[key].value===null||['string','number','boolean','undefined'].includes(typeof descriptors[key].value))))return false;
 immutableSettingsSeen.add(value);return true;
}
function sharedFor(settings){
 let state=sharedSettings.get(settings);
 if(!state){state={entries:new Map(),bytes:0,tracked:false};sharedSettings.set(settings,state);}
 if(!state.tracked){
  for(let i=liveSettings.length-1;i>=0;i--)if(!liveSettings[i].deref())liveSettings.splice(i,1);
  while(liveSettings.length>=MAX_SETTINGS){const old=liveSettings.shift().deref();if(old){old.entries.clear();old.bytes=0;old.tracked=false;}}
  state.tracked=true;liveSettings.push(new WeakRef(state));
 }
 return state;
}
const keys={profile:new Set(['version','key','label','groups']),group:new Set(['id','label','rolls','charmMultiplierBps','equipmentChancePpm','gearChanceModel','outcomes']),outcome:new Set(['id','item','baseChancePpm','minAmount','maxAmount','charmWeight']),item:new Set(['type','kind','rarity','family'])};
function template(value,type='profile',budget={nodes:0,seen:new WeakSet()}){
 if(!plain(value)||!Object.isExtensible(value)||budget.seen.has(value)||++budget.nodes>4096)return null;budget.seen.add(value);
 const descriptors=Object.getOwnPropertyDescriptors(value),names=Reflect.ownKeys(descriptors);
 if(names.some(k=>typeof k!=='string'||!keys[type].has(k)))return null;
 if(type==='profile'&&(descriptors.version?.value!==1||typeof descriptors.key?.value!=='string'||!descriptors.groups))return null;
 const out=Object.create(Object.getPrototypeOf(value));
 for(const key of names){
  const d=descriptors[key];if(!Object.hasOwn(d,'value')||!d.enumerable||!d.configurable||!d.writable)return null;
  let v=d.value;
  if(key==='groups'||key==='outcomes'){
   if(!Array.isArray(v)||!Object.isExtensible(v)||Object.getPrototypeOf(v)!==Array.prototype||v.length>256||Reflect.ownKeys(v).length!==v.length+1)return null;
   if(budget.seen.has(v)||++budget.nodes>4096)return null;budget.seen.add(v);
   const length=Object.getOwnPropertyDescriptor(v,'length');if(!length||!Object.hasOwn(length,'value')||length.value!==v.length||length.enumerable||length.configurable||!length.writable)return null;
   const members=[];for(let i=0;i<v.length;i++){const entry=Object.getOwnPropertyDescriptor(v,String(i));if(!entry||!Object.hasOwn(entry,'value')||!entry.enumerable||!entry.configurable||!entry.writable)return null;const child=template(entry.value,key==='groups'?'group':'outcome',budget);if(!child)return null;members.push(child);}v=Object.freeze(members);
  }else if(key==='item'){v=template(v,'item',budget);if(!v)return null;}
  else if(v!==null&&!['string','number','boolean','undefined'].includes(typeof v)||typeof v==='number'&&!Number.isFinite(v))return null;
  out[key]=v;
 }
 return Object.freeze(out);
}
function copy(value){
 if(value===null||typeof value!=='object')return value;
 if(Array.isArray(value)){const result=new Array(value.length);for(let i=0;i<value.length;i++)result[i]=copy(value[i]);return result;}
 const result=Object.create(Object.getPrototypeOf(value));for(const key of Object.keys(value))result[key]=copy(value[key]);return result;
}
function add(state,key,value,size){
 while(state.entries.size>=MAX_ENTRIES||state.bytes+size>MAX_BYTES){const oldest=state.entries.keys().next().value;state.bytes-=state.entries.get(oldest).bytes;state.entries.delete(oldest);}
 state.entries.set(key,{value,bytes:size});state.bytes+=size;
}
export function createLootProfileCacheR61({enabled=process.env.CORE511_R61_LOOT_PROFILE_CACHE==='1'}={}){
 if(!enabled)return null;
 const entries=new Map();let settingsIdentity=null,bytes=0;
 return (defeat,fallbackKey,settings,derive)=>{
  if(typeof fallbackKey!=='string'||fallbackKey.length>128||fallbackKey.startsWith('rune.')||fallbackKey.startsWith('rune_v2.')||!plain(defeat))return derive();
  if(settingsIdentity===null||settings!==settingsIdentity){entries.clear();bytes=0;settingsIdentity=null;if(!immutableSettings(settings))return derive();settingsIdentity=settings;}
  const fields=['loot_source_key','loot_profile_revision','loot_profile_json'].map(key=>Object.getOwnPropertyDescriptor(defeat,key));
  if(fields.some(d=>!d||!Object.hasOwn(d,'value')))return derive();
  const [source,revision,json]=fields.map(d=>d.value);
  if(typeof source!=='string'||source.length>128||!Number.isSafeInteger(revision)||revision<0||typeof json!=='string'||json.length>MAX_JSON_CHARS)return derive();
  const key=JSON.stringify([fallbackKey,source,revision,json]);if(key.length*2>MAX_BYTES)return derive();
  const hit=entries.get(key);if(hit)return hit.value;
  const shared=sharedFor(settings),prior=shared.entries.get(key);
  const value=prior?copy(prior.value):derive();let size;
  try{size=prior?.bytes??(key.length+JSON.stringify(value).length)*2;}catch{return value;}
  if(size>MAX_BYTES)return value;
  if(!prior){const frozen=template(value);if(frozen)add(shared,key,frozen,size);}
  while(entries.size>=MAX_ENTRIES||bytes+size>MAX_BYTES){const oldest=entries.keys().next().value;bytes-=entries.get(oldest).bytes;entries.delete(oldest);}
  entries.set(key,{value,bytes:size});bytes+=size;return value;
 };
}
