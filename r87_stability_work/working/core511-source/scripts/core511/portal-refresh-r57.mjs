import {portalSectionsR57,deathBatchR57} from './r57-options.mjs';
import {nonlethalSchemaR56} from './nonlethal-rewards-r56.mjs';
import {prepareCached477} from './writer-statements.mjs';

const portalTables=new Set(['adventure_portals','adventure_runs']);
const keys=['id','run_id','channel','area','x','y','opens_ms','closes_ms','gold','capacity','entered','source_key'];
const same=(a,b)=>a&&b&&Object.keys(a).length===keys.length&&keys.every(k=>Object.hasOwn(b,k)&&Object.is(a[k],b[k]));
const batches=new WeakMap();
// Only the bounded ordinary-area native attack batch calls this private
// wrapper. Those native paths can create adventure rows only via maybePortal;
// they cannot enter/leave/update an existing run. The exact trigger-schema
// check below and the final audited table allow-list still apply. Collect
// actual maybePortal returns in call order, retaining every native RNG draw.
export function captureDeathBatchPortalsR57(sql,work){
 if(!deathBatchR57||!portalSectionsR57||batches.has(sql))return work();
 let value;const created=[];
 const proof=capturePortalCreationR57(sql,()=>{batches.set(sql,created);try{value=work();return created;}finally{batches.delete(sql);}});
 if(proof)value.portalCreationR57=proof;else delete value.portalCreationR57;
 return value;
}
// Only the existing maybePortal calls are enclosed. With the exact known
// trigger schema they append one empty run + portal and cannot alter an old
// membership, inventory or run. Pre-existing adventure writes refuse reuse.
export function capturePortalCreationR57(sql,create){
 const batch=batches.get(sql);if(batch){const created=create();batch.push(...created);return null;}
 let before=null;
 if(portalSectionsR57&&sql.isTransaction&&nonlethalSchemaR56(sql))try{
  if(prepareCached477(sql,'SELECT v FROM temp.kernel511_refresh_enabled').get()?.v===1&&!prepareCached477(sql,"SELECT 1 FROM temp.kernel511_refresh_tables WHERE name IN ('adventure_runs','adventure_portals')").get())before={runs:prepareCached477(sql,'SELECT COALESCE(MAX(rowid),0) n FROM adventure_runs').get().n,portals:prepareCached477(sql,'SELECT COALESCE(MAX(rowid),0) n FROM adventure_portals').get().n};
 }catch{}
 // Never swallow a native gameplay/SQL failure or skip a random draw.
 const created=create();
 if(!before||!created.length||created.length>25)return null;
 try{
  const runs=prepareCached477(sql,'SELECT id,kind,channel,cycle,status,deadline_ms,revision FROM adventure_runs WHERE rowid>? LIMIT 26').all(before.runs),portals=prepareCached477(sql,'SELECT * FROM adventure_portals WHERE rowid>? LIMIT 26').all(before.portals),cycle=prepareCached477(sql,'SELECT cycle FROM world_state WHERE id=1').get().cycle;
  if(runs.length!==created.length||portals.length!==created.length||portals.some(p=>!created.some(c=>same(p,c)))||new Set(portals.map(p=>p.run_id)).size!==runs.length||runs.some(r=>r.kind!=='mist'||r.status!=='active'||r.deadline_ms!==0||r.revision!==1||r.cycle!==cycle||!portals.some(p=>p.run_id===r.id&&p.channel===r.channel)))return null;
  const proof={version:1,cycle,channel:portals[0].channel,capturedAtMs:Date.now(),portals};
  return validPortalCreationR57(proof)?proof:null;
 }catch{return null;}
}
export function validPortalCreationR57(proof){
 return portalSectionsR57&&proof?.version===1&&Number.isSafeInteger(proof.cycle)&&[1,2,3,4].includes(proof.channel)&&Number.isSafeInteger(proof.capturedAtMs)&&Array.isArray(proof.portals)&&proof.portals.length>0&&proof.portals.length<=25&&new Set(proof.portals.map(p=>p?.id)).size===proof.portals.length&&proof.portals.every(p=>p&&Object.keys(p).length===keys.length&&keys.every(k=>Object.hasOwn(p,k))&&['id','run_id','area','source_key'].every(k=>typeof p[k]==='string'&&p[k].length>0&&p[k].length<=300)&&p.channel===proof.channel&&['x','y','opens_ms','closes_ms','capacity','entered','gold'].every(k=>Number.isFinite(p[k]))&&Number.isSafeInteger(p.opens_ms)&&p.opens_ms>=0&&Number.isSafeInteger(p.closes_ms)&&p.closes_ms>p.opens_ms&&Number.isSafeInteger(p.capacity)&&p.capacity>=1&&p.capacity<=4&&p.entered===0&&[0,1].includes(p.gold))&&Buffer.byteLength(JSON.stringify(proof))<=32768;
}
export function portalRefreshScopeR57(result,cycle=null){
 const proof=result.portalCreationR57,audit=result.sharedRefresh;
 return validPortalCreationR57(proof)&&(cycle===null||proof.cycle===cycle)&&audit?.all===true&&Array.isArray(audit.tables)&&audit.tables.includes('adventure_portals')&&audit.tables.includes('adventure_runs');
}
export const portalRefreshTableR57=table=>portalTables.has(table);

// Validate the whole resident group before applying anything. A portal already
// advanced by another committed action forces the original authoritative read.
export function preparePortalRefreshR57(runtime,result,updates){
 if(!portalRefreshScopeR57(result,runtime.channel.world.cycle))return null;
 const proof=result.portalCreationR57,adventure=runtime.adventure,now=Date.now();
 if(!adventure?.portals||!adventure?.bundles||!adventure?.sent||proof.capturedAtMs>now||now-proof.capturedAtMs>1000||updates.some(u=>u.row.channel!==proof.channel)||proof.portals.some(p=>adventure.portals.has(p.id)&&!same(p,adventure.portals.get(p.id))))return null;
 const plans=[];
 for(const {row,sub} of updates){
  const bundle=adventure.bundles.get(row.id),publicBundle=sub.data.adventure511;
  if(!bundle||!Array.isArray(bundle.portals)||!publicBundle||!Array.isArray(publicBundle.portals)||proof.portals.some(p=>p.run_id===bundle.run?.id))return null;
  const merge=old=>[...new Map([...old,...proof.portals.filter(p=>p.channel===row.channel&&p.area===row.area)].filter(p=>p.closes_ms>now&&p.entered<p.capacity).map(p=>[p.id,p])).values()];
  plans.push({id:row.id,sub,bundle:{...bundle,portals:merge(bundle.portals)},publicBundle:{...publicBundle,portals:merge(publicBundle.portals)}});
 }
 return ()=>{for(const p of proof.portals)adventure.portals.set(p.id,p);for(const p of plans){adventure.bundles.set(p.id,p.bundle);p.sub.data={...p.sub.data,adventure511:p.publicBundle};}adventure.sent.clear();adventure.projectionCache=null;};
}
