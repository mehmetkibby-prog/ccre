// Only the generated attack rules use this pool. Their string parser is pure,
// and the existing deepFreeze runs before admission. Cache configuration, not
// time-dependent event eligibility, random rolls, settings rows or rewards.
const entries=new Map(),MAX_ENTRIES=8,MAX_BYTES=262144;
let retainedBytes=0;
export function readEventConfigR86(raw,build){
 if(typeof raw!=='string')return build();
 const hit=entries.get(raw);
 if(hit){entries.delete(raw);entries.set(raw,hit);return hit.value;}
 const value=build(),bytes=Buffer.byteLength(raw,'utf8')+Buffer.byteLength(JSON.stringify(value),'utf8');
 if(bytes>MAX_BYTES)return value;
 while(entries.size&&(entries.size>=MAX_ENTRIES||retainedBytes+bytes>MAX_BYTES)){
  const key=entries.keys().next().value;retainedBytes-=entries.get(key).bytes;entries.delete(key);
 }
 entries.set(raw,{value,bytes});retainedBytes+=bytes;return value;
}
