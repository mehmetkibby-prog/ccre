import {createHash} from 'node:crypto';
const enabled=process.env.CORE511_R61_COMPACT_SECTIONS==='1';
const digest=row=>createHash('sha256').update(JSON.stringify(row)).digest('hex');
const same=(a,b)=>a&&b&&Object.keys(a).length===Object.keys(b).length&&Object.keys(a).every(k=>Object.hasOwn(b,k)&&Object.is(a[k],b[k]));
// Both rows were read inside the same native reward transaction. Replace only
// a byte-equivalent scalar player row already present in this live ACK. The
// SHA-256 binds the reference to that exact image, including every cold field.
// All owner, scope, epoch, encounter, equipment and durability checks remain.
export function compactCommitRowsR61(snapshot,players){
 if(!enabled||!Array.isArray(players)||players.length>25||new Set(players.map(p=>p?.id)).size!==players.length||!Array.isArray(snapshot?.actors)||snapshot.actors.length>25)return snapshot;
 return {...snapshot,actors:snapshot.actors.map(entry=>{
  const index=players.findIndex(p=>p?.id===entry.id);
  if(index<0||Object.hasOwn(entry,'playerRefR61')||!same(entry.player,players[index]))return entry;
  const {player,...rest}=entry;return {...rest,playerRefR61:{index,sha256:digest(players[index])}};
 })};
}
export function resolveCommitRowR61(entry,players){
 if(!entry||!Object.hasOwn(entry,'playerRefR61'))return entry;
 const ref=entry.playerRefR61;
 if(!enabled||Object.hasOwn(entry,'player')||!ref||Object.keys(ref).sort().join(',')!=='index,sha256'||!Number.isSafeInteger(ref.index)||ref.index<0||ref.index>=25||!Array.isArray(players)||players.length>25||typeof ref.sha256!=='string'||!/^[a-f0-9]{64}$/.test(ref.sha256))return null;
 const row=players[ref.index];if(!row||row.id!==entry.id||digest(row)!==ref.sha256)return null;
 const {playerRefR61,...rest}=entry;return {...rest,player:row};
}
