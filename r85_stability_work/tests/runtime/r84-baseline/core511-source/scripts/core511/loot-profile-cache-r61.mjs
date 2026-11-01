// Reuse only deterministic profile derivation within one native rules factory.
// No player rows, eligibility, RNG draws, claims, rewards or SQL are cached.
const MAX_ENTRIES=32,MAX_BYTES=256*1024,MAX_JSON_CHARS=32768;
const plain=value=>value&&typeof value==='object'&&[null,Object.prototype].includes(Object.getPrototypeOf(value));
const immutableSettings=value=>plain(value)&&Object.isFrozen(value)&&Object.values(Object.getOwnPropertyDescriptors(value)).every(d=>Object.hasOwn(d,'value')&&(d.value===null||['string','number','boolean','undefined'].includes(typeof d.value)));
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
  const key=JSON.stringify([fallbackKey,source,revision,json]);
  if(key.length*2>MAX_BYTES)return derive();
  const hit=entries.get(key);if(hit)return hit.value;
  const value=derive();let size;
  // Unknown future output shapes retain the original result without reuse.
  try{size=(key.length+JSON.stringify(value).length)*2;}catch{return value;}
  if(size>MAX_BYTES)return value;
  while(entries.size>=MAX_ENTRIES||bytes+size>MAX_BYTES){const oldest=entries.keys().next().value;bytes-=entries.get(oldest).bytes;entries.delete(oldest);}
  entries.set(key,{value,bytes:size});bytes+=size;return value;
 };
}
