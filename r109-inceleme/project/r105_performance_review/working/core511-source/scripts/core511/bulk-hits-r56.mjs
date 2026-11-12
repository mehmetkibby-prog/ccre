import {withXpGroupR56} from './xp-group-r56.mjs';
import {bulkHitShapesR56 as shape} from './bulk-hit-shapes-r56.mjs';
import {prepareServerStatement} from './server-statements.mjs';
import {demand} from './contract.mjs';
const stats=new WeakMap();export const bulkHitStatsR56=sql=>({...stats.get(sql)});
function lean(plan){
 const list=plan.hitStatements;if(!Array.isArray(list)||![3,4].includes(list.length)||plan.xpResultIndex!==-1||plan.beforeHealthIndex!==list.length-2||plan.healthResultIndex!==list.length-1)return null;
 const offset=list.length-3;if(offset&&list[0].sql!==shape.event)return null;
 const [participant,before,health]=list.slice(offset),p=participant?.params,b=before?.params,h=health?.params,t=plan.target;
 if(participant?.sql!==shape.participant||before?.sql!==shape.before||health?.sql!==shape.health||p?.length!==4||b?.length!==2||h?.length!==9||p[2]!==t.id||p[3]!==t.spawn_round||b[0]!==t.id||b[1]!==t.spawn_round||h[7]!==t.id||h[8]!==t.spawn_round||h[0]!==plan.rolled||![2,3,4,6].every(i=>h[i]===h[0]))return null;
 if(!Number.isFinite(h[0])||h[0]<1||!Number.isSafeInteger(h[1])||typeof p[0]!=='string'||!Number.isSafeInteger(p[1])||t.is_boss||t.is_stone||!['forest','frozen','ancient'].includes(t.area)||![1,2,3,4].includes(t.channel))return null;
 return {id:t.id,round:t.spawn_round,damage:h[0],at:h[1],actor:p[0],created:p[1],plan};
}
// Only called by the private generated writer port under the exact trigger
// certificate. Bounded <=64 native plans; unknown/full reward plans execute
// unchanged. No ACK, lease release, persistent cache or transaction split.
export function createBulkHitsR56(sql){
 const count=stats.get(sql)??{groups:0,hits:0,fallbacks:0};stats.set(sql,count);
 const before=prepareServerStatement(sql,`SELECT m.id,m.hp,m.wave_stage,m.spawn_round,m.area,m.channel,m.is_boss,m.is_stone FROM json_each(?) j JOIN monsters m ON m.id=json_extract(j.value,'$.id') ORDER BY CAST(j.key AS INTEGER)`);
 const participants=prepareServerStatement(sql,`INSERT INTO monster_participants(monster_id,spawn_round,player_id,created_at)
 SELECT m.id,m.spawn_round,json_extract(j.value,'$.actor'),json_extract(j.value,'$.created') FROM json_each(?) j JOIN monsters m ON m.id=json_extract(j.value,'$.id')
 WHERE m.hp>0 AND m.spawn_round=json_extract(j.value,'$.round') ORDER BY CAST(j.key AS INTEGER)
 ON CONFLICT(monster_id,spawn_round,player_id) DO UPDATE SET created_at=excluded.created_at`);
 const health=prepareServerStatement(sql,`WITH batch AS MATERIALIZED(SELECT json_extract(value,'$.id') id,json_extract(value,'$.round') round,json_extract(value,'$.damage') damage,json_extract(value,'$.at') at FROM json_each(?))
 UPDATE monsters AS m SET hp=MAX(0,m.hp-b.damage),last_damaged_at_ms=b.at FROM batch b WHERE m.id=b.id AND m.spawn_round=b.round AND m.hp>b.damage RETURNING id,hp,wave_stage`);
 return (database,plans)=>withXpGroupR56(sql,plans,()=>{
  demand(sql.isTransaction&&Array.isArray(plans)&&plans.length<=64,'r56_bulk_scope');const output=[];
  for(let i=0;i<plans.length;){
   const run=[];for(let j=i;j<plans.length&&run.length<64;j++){const row=lean(plans[j]);if(!row)break;run.push(row);}
   if(run.length<3){count.fallbacks++;output.push(database.batch(plans[i++].hitStatements));continue;}
   // Finish the last hit with its exact native statements, retaining SQLite's
   // changes()/last_insert_rowid() state for the next native plan.
   const batch=run.slice(0,-1),payload=JSON.stringify(batch.map(({plan,...r})=>r));
   const old=before.all(payload),valid=old.length===batch.length&&new Set(batch.map(r=>r.id)).size===batch.length&&old.every((r,j)=>r.id===batch[j].id&&r.spawn_round===batch[j].round&&r.hp>batch[j].damage&&r.channel===batch[j].plan.target.channel&&r.area===batch[j].plan.target.area&&!r.is_boss&&!r.is_stone);
   if(!valid){count.fallbacks++;output.push(database.batch(plans[i++].hitStatements));continue;}
   sql.exec('SAVEPOINT core511_nonlethal_bulk_r56');const produced=[];
   try{
    const eventResults=batch.map(r=>r.plan.hitStatements.length===4?database.batch([r.plan.hitStatements[0]]):[]);
    demand(participants.run(payload).changes===batch.length,'r56_bulk_participant_count');
    const changed=health.all(payload),map=new Map(changed.map(r=>[r.id,r]));demand(changed.length===batch.length,'r56_bulk_health_count');
    for(let j=0;j<batch.length;j++){const r=map.get(batch[j].id);demand(r&&r.hp===old[j].hp-batch[j].damage&&r.wave_stage===old[j].wave_stage,'r56_bulk_result');produced.push([...eventResults[j],{results:[]},{results:[{hp:old[j].hp}]},{results:[{hp:r.hp,wave_stage:r.wave_stage}]}]);}
    produced.push(database.batch(run.at(-1).plan.hitStatements));sql.exec('RELEASE core511_nonlethal_bulk_r56');
   }catch(error){sql.exec('ROLLBACK TO core511_nonlethal_bulk_r56;RELEASE core511_nonlethal_bulk_r56');throw error;}
   output.push(...produced);i+=run.length;count.groups++;count.hits+=batch.length;
  }
  return output;
 });
}
