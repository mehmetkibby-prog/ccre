import {prepareCached477} from './writer-statements.mjs';

// Post-native read-only hydration. SQLite JSON input bounds each IN lookup;
// indexed IDs are selected, then restored to the original hit order. No cache
// survives this synchronous transaction and no reward computation is changed.
const CHUNK=128;
export function attackMonsterRowsR51(sql,ids){
 const rows=new Map();
 for(let i=0;i<ids.length;i+=CHUNK){const keys=[...new Set(ids.slice(i,i+CHUNK))];for(const row of prepareCached477(sql,'SELECT * FROM monsters WHERE id IN (SELECT value FROM json_each(?))').all(JSON.stringify(keys)))rows.set(row.id,row);}
 return ids.map(id=>rows.get(id));
}
export function attackParticipantRowsR51(sql,monsters){
 const groups=new Map(),keys=[];
 for(const m of monsters){const key=JSON.stringify([m.id,m.spawn_round]);if(!groups.has(key)){groups.set(key,[]);keys.push([m.id,m.spawn_round]);}}
 for(let i=0;i<keys.length;i+=CHUNK){
  const list=keys.slice(i,i+CHUNK);
  const rows=prepareCached477(sql,`SELECT p.monster_id,p.spawn_round,p.player_id,p.created_at,p.stone_damage476,p.stone_first_hit_at_ms476
   FROM json_each(?) j JOIN monster_participants p
   ON p.monster_id=json_extract(j.value,'$[0]') AND p.spawn_round=json_extract(j.value,'$[1]')
   ORDER BY CAST(j.key AS INTEGER),p.rowid`).all(JSON.stringify(list));
  for(const row of rows)groups.get(JSON.stringify([row.monster_id,row.spawn_round])).push(row);
 }
 return monsters.flatMap(m=>groups.get(JSON.stringify([m.id,m.spawn_round])));
}
