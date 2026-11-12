import {xpGroupR56,rewardReadCacheR56} from './r56-options.mjs';
import {prepareServerStatement} from './server-statements.mjs';
import {demand} from './contract.mjs';
const active=new WeakMap(),initialized=new WeakSet(),metrics=new WeakMap();
export const xpGroupStatsR56=sql=>({...metrics.get(sql)});
export function initializeXpGroupR56(sql){if(!xpGroupR56||initialized.has(sql))return;sql.exec('CREATE TEMP TABLE kernel511_xp_metadata_r56(v INTEGER NOT NULL);INSERT INTO kernel511_xp_metadata_r56 VALUES(0)');initialized.add(sql);}
export function xpGroupActiveR56(sql){return Boolean(active.get(sql));}
export const xpGroupReadCacheActiveR56=sql=>{const s=active.get(sql);return Boolean(rewardReadCacheR56&&s&&!s.disabled&&!s.readDisabled);};
export function cachedXpGroupReadR56(sql,key,load){
 const s=active.get(sql);if(!xpGroupReadCacheActiveR56(sql))return load();
 if(s.reads.has(key)){s.metrics.readCacheHits++;return s.reads.get(key);}
 const value=load();s.metrics.readCacheMisses++;
 if(s.reads.size>=16)s.reads.delete(s.reads.keys().next().value);s.reads.set(key,value);
 s.metrics.maxReadCacheEntries=Math.max(s.metrics.maxReadCacheEntries,s.reads.size);return value;
}
export function cachedXpEligibilityR56(sql,ids,loadMissing){
 const s=active.get(sql);if(!xpGroupReadCacheActiveR56(sql))return null;
 const missing=[...new Set(ids)].filter(id=>!s.eligibility.has(id));
 if(s.eligibility.size+missing.length>256){s.reads.clear();s.eligibility.clear();s.readDisabled=true;return null;}
 if(missing.length){for(const row of loadMissing(missing))s.eligibility.set(row.id,row);}
 if(ids.some(id=>!s.eligibility.has(id))){s.reads.clear();s.eligibility.clear();s.readDisabled=true;return null;}
 s.metrics.eligibilityHits+=ids.length-missing.length;s.metrics.eligibilityMisses+=missing.length;s.metrics.maxEligibilityRows=Math.max(s.metrics.maxEligibilityRows,s.eligibility.size);
 return ids.map(id=>s.eligibility.get(id));
}
export function flushXpGroupR56(sql){const s=active.get(sql);if(!s)return;s.reads.clear();s.eligibility.clear();if(!s.rows.size)return;
 const columns=s.columns,rows=[...s.rows].map(([id,values])=>[id,...columns.map(c=>values[c])]),json=JSON.stringify(rows);
 const query='WITH batch AS MATERIALIZED(SELECT json_extract(value,\'$[0]\') id,'+columns.map((c,i)=>"json_extract(value,'$["+(i+1)+"]') AS "+c).join(',')+' FROM json_each(?)) UPDATE players AS p SET '+columns.map(c=>c+'=b.'+c).join(',')+' FROM batch b WHERE p.id=b.id';
 demand(prepareServerStatement(sql,query).run(json).changes===rows.length,'r56_xp_flush_count');s.metrics.flushes++;s.metrics.playerWrites+=rows.length;s.rows.clear();
}
export function virtualBeforeXpR56(sql,result){const s=active.get(sql);if(!s?.rows.size)return result;return {...result,results:result.results.map(row=>{const pending=s.rows.get(row.id);if(!pending)return row;const next=Object.assign(Object.create(Object.getPrototypeOf(row)),row);for(const k of Object.keys(row))if(Object.hasOwn(pending,k))next[k]=pending[k];return next;})};}
export function stageXpGroupR56(sql,{columns,rows,compute,ranks}){
 const s=active.get(sql);if(!s||s.disabled)return null;
 if(rows.length>256){flushXpGroupR56(sql);s.disabled=true;return null;}
 if(s.columns&&JSON.stringify(columns)!==JSON.stringify(s.columns))flushXpGroupR56(sql);s.columns=columns;
 const calculated=[];for(const row of rows){const values={...row,...s.rows.get(row.id)},next=compute(values);if(values.level<1||values.level>=65||next.level!==values.level||next.rank_xp!==values.rank_xp){flushXpGroupR56(sql);s.disabled=true;return null;}calculated.push({row:values,next});}
 const unchecked=calculated.filter(({row})=>!s.safeGear.has(row.id)).map(({row})=>row.id);
 if(unchecked.length){
  const bad=prepareServerStatement(sql,`SELECT 1 FROM json_each(?) ids JOIN players p ON p.id=ids.value JOIN player_items i ON i.player_id=p.id WHERE i.equipped=1 AND ((i.kind IN ('weapon','armor','shoes','necklace') AND p.level<iif(i.rarity='blue',7,iif(i.rarity='orange',20,iif(i.rarity='red',30,iif(i.rarity='unique',50,1))))) OR (p.level<60 AND i.rarity='purple' AND i.kind IN ('weapon','armor','helmet','shoes','necklace'))) LIMIT 1`).get(JSON.stringify(unchecked));
  if(bad){flushXpGroupR56(sql);s.disabled=true;return null;}for(const id of unchecked)s.safeGear.add(id);
 }
 if(new Set([...s.rows.keys(),...rows.map(r=>r.id)]).size>256){flushXpGroupR56(sql);s.disabled=true;return null;}
 for(const {row,next}of calculated)s.rows.set(row.id,Object.fromEntries(columns.map(c=>[c,next[c]])));
 s.metrics.stagedUpdates++;s.metrics.virtualPlayerUpdates+=calculated.length;
 return {results:calculated.map(({row,next})=>Object.assign(Object.create(null),{id:row.id,xp:next.xp,level:next.level},ranks?{rank_xp:next.rank_xp}:{}))};
}
export function withXpGroupR56(sql,plans,work){
 if(!xpGroupR56||!initialized.has(sql)||active.has(sql)||plans.some(p=>!['forest','frozen','ancient'].includes(p.target?.area)||p.target.is_boss||p.target.is_stone||![1,2,3,4].includes(p.target.channel)||typeof p.target.id!=='string'||/^(?:frozen-(?:boss|water)|ancient-boss|dragon-world|stone-boss-black|dunya-bosu|event-|rune-|sinsi-)/.test(p.target.id)))return work();
 const stats=metrics.get(sql)??{groups:0,flushes:0,playerWrites:0,stagedUpdates:0,virtualPlayerUpdates:0,readCacheHits:0,readCacheMisses:0,maxReadCacheEntries:0,eligibilityHits:0,eligibilityMisses:0,maxEligibilityRows:0};metrics.set(sql,stats);stats.groups++;
 const state={rows:new Map(),columns:null,safeGear:new Set(),reads:new Map(),eligibility:new Map(),readDisabled:false,disabled:false,metrics:stats};active.set(sql,state);let succeeded=false;
 try{const result=work();flushXpGroupR56(sql);succeeded=true;return result;}
 finally{active.delete(sql);if(succeeded&&stats.flushes)prepareServerStatement(sql,'UPDATE temp.kernel511_xp_metadata_r56 SET v=v').run();}
}
