// Only ordinary static default profiles reach this helper. Adventure, event,
// rune and live dragon profiles keep their original dynamic paths.
const states=new WeakMap(),checked=new WeakSet(),live=[];
const MAX_BYTES=262144,MAX_ENTRIES=32,MAX_SETTINGS=8;
function immutableSettings(value){
 if(!value||typeof value!=='object'||![null,Object.prototype].includes(Object.getPrototypeOf(value))||!Object.isFrozen(value))return false;
 if(checked.has(value))return true;
 const descriptors=Object.getOwnPropertyDescriptors(value);
 if(!Reflect.ownKeys(descriptors).every(key=>typeof key==='string'&&Object.hasOwn(descriptors[key],'value')&&(descriptors[key].value===null||['string','number','boolean','undefined'].includes(typeof descriptors[key].value))))return false;
 checked.add(value);return true;
}
export function defaultLootTemplateR87(settings,key,build){
 if(!immutableSettings(settings)||typeof key!=='string'||key.length>128)return build();
 let state=states.get(settings);
 if(!state){state={entries:new Map(),bytes:0,tracked:false};states.set(settings,state);}
 if(!state.tracked){
  for(let i=live.length-1;i>=0;i--)if(!live[i].deref())live.splice(i,1);
  while(live.length>=MAX_SETTINGS){const old=live.shift().deref();if(old){old.entries.clear();old.bytes=0;old.tracked=false;}}
  state.tracked=true;live.push(new WeakRef(state));
 }
 const hit=state.entries.get(key);if(hit)return {...hit.value};
 const result=build();
 if(!result||Object.keys(result).sort().join(',')!=='lootProfileJson,lootProfileRevision,lootSourceKey'||typeof result.lootSourceKey!=='string'||!Number.isSafeInteger(result.lootProfileRevision)||typeof result.lootProfileJson!=='string')return result;
 const bytes=Buffer.byteLength(key)+Buffer.byteLength(result.lootSourceKey)+Buffer.byteLength(result.lootProfileJson)+32;
 if(bytes>MAX_BYTES)return result;
 while(state.entries.size&&(state.entries.size>=MAX_ENTRIES||state.bytes+bytes>MAX_BYTES)){
  const first=state.entries.keys().next().value;state.bytes-=state.entries.get(first).bytes;state.entries.delete(first);
 }
 state.entries.set(key,{value:Object.freeze({...result}),bytes});state.bytes+=bytes;
 return result;
}
