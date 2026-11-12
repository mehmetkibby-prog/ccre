import {createHash} from 'node:crypto';
import {checkpointSqlBatchR531} from './r531-options.mjs';
import {prepareServerStatement} from './server-statements.mjs';
import {preparedSchemaVersions477} from '../../../native510-bb3a6cc689c6/vds-server/src/prepared-statements477.mjs';
import {checkpointTriggerHashesR531} from './checkpoint-triggers-r531.mjs';
import {checkpointTriggerHashesR54} from './checkpoint-triggers-r54.mjs';
import {rewardIdleCostR54} from './r54-options.mjs';
import {demand} from './contract.mjs';
const schemas=new WeakMap(),stats={batches:0,rows:0,fallbacks:0};
export const checkpointSqlStatsR531=()=>({...stats});
const quote=x=>'"'+x+'"';
const tables=['monsters','monster_participants','boss_participants','combat_events'];
function approved(sql){
 // R110: same two PRAGMA values through the connection's already compiled
 // schema statements (or its writer-lock snapshot); no per-call PRAGMA compile.
 const {mainVersion:main,tempVersion:temp}=preparedSchemaVersions477(sql),old=schemas.get(sql);
 if(old?.main===main&&old.temp===temp)return old.ok;
 const list=tables.map(n=>"'"+n+"'").join(','),query="SELECT sql FROM %s WHERE type='trigger' AND tbl_name IN ("+list+")";
 const mains=prepareServerStatement(sql,query.replace('%s','main.sqlite_schema')).all(),temps=prepareServerStatement(sql,query.replace('%s','temp.sqlite_schema')).all();
 const ok=!mains.length&&temps.every(r=>{const hash=createHash('sha256').update(r.sql).digest('hex');return checkpointTriggerHashesR531.has(hash)||rewardIdleCostR54&&checkpointTriggerHashesR54.has(hash);});
 schemas.set(sql,{main,temp,ok});return ok;
}
// A transaction-local bulk SQL plan. There are no gameplay changes or writes
// until the existing handler has validated EVERY row. Unknown triggers retain
// the original per-row execution, including its trigger ordering semantics.
export function checkpointSqlBatchPlanR531(sql,payload,specs,columnLists){
 if(!checkpointSqlBatchR531)return null;
 const groups=new Map();
 for(const [kind,spec]of Object.entries(specs)){
  const rows=payload[kind];if(!Array.isArray(rows)||rows.length>1024)return null;
  const keys=new Set();for(const pair of rows){if(!pair?.current||spec.keys.some(k=>!Object.hasOwn(pair.current,k)))return null;const key=JSON.stringify(spec.keys.map(k=>pair.current[k]));if(keys.has(key))return null;keys.add(key);}
  groups.set(kind,{spec,rows,insert:[],update:[],saved:null});
 }
 if(!approved(sql)){stats.fallbacks++;return null;}
 const prepare=query=>prepareServerStatement(sql,query);
 const records=group=>{
  if(group.saved)return group.saved;
  const {spec,rows}=group,names=columnLists[Object.keys(specs).find(k=>specs[k]===spec)],table=spec.table??'monsters';
  // Only keys are required for the indexed read. Array slots avoid shipping
  // and reparsing every current column again for each guarded lookup.
  const query='SELECT '+names.map(n=>'stored.'+quote(n)).join(',')+' FROM json_each(?) requested JOIN main.'+quote(table)+' stored ON '+spec.keys.map((k,i)=>'stored.'+quote(k)+" IS json_extract(requested.value,'"+(rewardIdleCostR54?'$['+i+']':'$.'+k)+"')").join(' AND ');
  const found=rows.length?prepare(query).all(JSON.stringify(rows.map(p=>rewardIdleCostR54?spec.keys.map(k=>p.current[k]):p.current))):[];
  group.saved=new Map(found.map(r=>[JSON.stringify(spec.keys.map(k=>r[k])),r]));return group.saved;
 };
 return {
  read(kind,current){const group=groups.get(kind);return records(group).get(JSON.stringify(group.spec.keys.map(k=>current[k])))??null;},
  queue(kind,current,base){groups.get(kind)[base?'update':'insert'].push(current);},
  finish(events){
   for(const [kind,group]of groups){const {spec}=group,table=spec.table??kind,names=columnLists[kind];
    if(group.update.length){
     const columns=[...new Set([...spec.keys,...spec.fields])],source='SELECT '+columns.map((k,i)=>"json_extract(value,'"+(rewardIdleCostR54?'$['+i+']':'$.'+k)+"') AS "+quote(k)).join(',')+' FROM json_each(?)';
     const query='WITH batch AS MATERIALIZED ('+source+') UPDATE main.'+quote(table)+' AS saved SET '+spec.fields.map(k=>quote(k)+'=batch.'+quote(k)).join(',')+' FROM batch WHERE '+spec.keys.map(k=>'saved.'+quote(k)+' IS batch.'+quote(k)).join(' AND ');
     demand(prepare(query).run(JSON.stringify(rewardIdleCostR54?group.update.map(r=>columns.map(k=>r[k])):group.update)).changes===group.update.length,'combat_checkpoint_conflict');
    }
    if(group.insert.length){const query='INSERT INTO main.'+quote(table)+'('+names.map(quote).join(',')+') SELECT '+names.map(k=>"json_extract(value,'$."+k+"')").join(',')+' FROM json_each(?) ORDER BY key';prepare(query).run(JSON.stringify(group.insert));}
   }
   if(events.length)prepare("INSERT INTO main.combat_events(player_id,target_id,role,ability,created_at) SELECT json_extract(value,'$.player_id'),json_extract(value,'$.target_id'),json_extract(value,'$.role'),json_extract(value,'$.ability'),json_extract(value,'$.created_at') FROM json_each(?) ORDER BY key").run(JSON.stringify(events));
   stats.batches++;stats.rows+=[...groups.values()].reduce((n,g)=>n+g.insert.length+g.update.length,events.length);
  }
 };
}
