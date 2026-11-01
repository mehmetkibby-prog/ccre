import {optimizeR18} from './perf-r18-features.mjs';
import {canonicalRewardXpR18} from './perf-r18-pure.mjs';
import {forgeDropSql491} from '../../lib/forge-material491.mjs';
import {cauldronDropSql488} from '../../lib/cauldron488.mjs';
import {perfR11Features} from './perf-r11-features.mjs';
import {createRewardSqlNormalizerR11} from './reward-sql-shape-cache-r11.mjs';
import {createHash} from 'node:crypto';
import {preparedSchemaVersions477,prepareCached477,preparedStatementsStats477} from './prepared-statements477.mjs';
import {REWARD_TRIGGER_HASHES_R7,REWARD_FRAME_HASHES_R7} from './reward-trigger-shapes-r7.mjs';
import {recordWriterJobDetail477} from './writer-sql-timing477.mjs';

const schemaDiagnostics=new WeakMap(),schemaCache=new WeakMap(),compiledShapes=new Map(),shapeCache=new Map();
function exactFrameShape(sql,index){const key=index+':'+sql;if(shapeCache.has(key))return shapeCache.get(key);const supported=REWARD_FRAME_HASHES_R7[index].includes(hash(optimizeR18&&index===4?canonicalRewardXpR18(sql):sql));if(shapeCache.size>=64)shapeCache.delete(shapeCache.keys().next().value);shapeCache.set(key,supported);return supported;}
const normal=perfR11Features.enabled('rewardSqlShapeCache')?createRewardSqlNormalizerR11():sql=>sql.replace(/\s+/g,' ').trim();
const starts=(frame,prefix)=>typeof frame?.sql==='string'&&Array.isArray(frame.params)&&normal(frame.sql).startsWith(prefix);
const hash=sql=>createHash('sha256').update(sql.trim()).digest('hex');
// Exact MAIN definitions collected on 2026-10-07 and reconstructed from
// pinned source; see scripts/perf-r10/schema/REVIEW.md. Keep the full SQL hash,
// trigger name and scope together. This does not accept arbitrary WHEN clauses.
const reviewedMainTriggersR10=Object.freeze({
 arena_round_reset425:'ae8739a2839064a40d80a1ba6550eaab4c6561aa182407115d48be325eca6b6a',
 rank_tier_changed:'feae71bf1b072dc9f5363941d56e7b755097e7ac0b7ca8a181b6d870f472e51c',
 rank_reward_equipment_changed:'71ab02a2295970c2dba0ad28a6884bbd949aa5a1d55ed70620c657cfb7416a7d',
});
// Reviewed V491 schema: these four exact MAIN triggers only use the current
// item/player rows. They neither read regrouped monster claims/participants
// nor use RNG; player-item reward writes retain their original order.
const reviewedEnhancementTriggers491=Object.freeze({
 enhancement491_preserve_canonical_name:'b470a535a5a918d27b8c5d25542c3737e95a1cc8ca57d0f339aa8735390009bc',
 expansion456_jewelry_insert:'8f87941ecbb4f82a28fc4a194e92a80147b5f0eaae5edfb0212cf571996bb51e',
 expansion456_jewelry_delete:'d7579fed434d0f145202c0ad1336a1aad7c1c5dd58c7f2ce3b408e4ee3ee2932',
 expansion456_jewelry_update:'b012a6dffa37c0954bd89892e4663f47b4abe50d4fd94010c5f450b76c7f2d22'
});
function reviewedEnhancementTrigger491(row){return row.scope==='main'&&Object.hasOwn(reviewedEnhancementTriggers491,row.name)&&reviewedEnhancementTriggers491[row.name]===hash(row.sql);}
function reviewedMainTriggerR10(row){return row.scope==='main'&&Object.hasOwn(reviewedMainTriggersR10,row.name)&&reviewedMainTriggersR10[row.name]===hash(row.sql);}
const observers=/^col_(?:writer_|loadlab_|push_|world_|combat_|position_|observed_)/;
function observerOnly(row){
 if(row.scope!=='temp'||!observers.test(row.name)||!/^[A-Za-z_][A-Za-z_0-9]*$/.test(row.name))return false;
 const match=row.sql.match(/\bBEGIN\s+SELECT\s+(col_(?:channel_writer_changed|push_changed|world_changed|combat_changed|position_changed|channel_observed))\(([^;]*)\);\s*END;?\s*$/i);
 if(!match)return false;
 // The complete header is part of the safety decision. A read-only body is
 // not enough: WHEN may run RNG/functions and observe per-target row order.
 const identifier='(?:[A-Za-z_][A-Za-z_0-9]*|"[A-Za-z_][A-Za-z_0-9]*")';
 const safeHeader=new RegExp('^CREATE TRIGGER '+row.name+' AFTER (?:INSERT|UPDATE(?: OF '+identifier+'(?:,\\s*'+identifier+')*)?|DELETE) ON (?:main\\.)?'+identifier+'\\s*$');
 if(!safeHeader.test(row.sql.slice(0,match.index)))return false;
 // Column order can differ after years of additive migrations. The two writer
 // notification helpers generate this exact read-only CASE as their fifth
 // argument. Validate every OLD/NEW/label triplet, not arbitrary expressions.
 // No function call, SQL subquery, write, extra statement or mismatched column.
 const changed=arg=>{
  const expected=row.name==='col_writer_players_UPDATE'?'col_channel_writer_changed':row.name==='col_observed_players_UPDATE'?'col_channel_observed':null;
  if(!expected||!row.sql.startsWith('CREATE TRIGGER '+row.name+' AFTER UPDATE ON main.\"players\" BEGIN SELECT '+expected+'('))return false;
  const value=arg.trim();if(!/^CASE (?:WHEN OLD\."[A-Za-z_][A-Za-z_0-9]*" IS NOT NEW\."[A-Za-z_][A-Za-z_0-9]*" THEN '[A-Za-z_][A-Za-z_0-9]*' )+ELSE '' END$/.test(value))return false;
  const parts=[...value.matchAll(/WHEN OLD\."([A-Za-z_][A-Za-z_0-9]*)" IS NOT NEW\."([A-Za-z_][A-Za-z_0-9]*)" THEN '([A-Za-z_][A-Za-z_0-9]*)'/g)];
  return parts.length<=512&&parts.every(p=>p[1]===p[2]&&p[1]===p[3])&&new Set(parts.map(p=>p[1])).size===parts.length;
 };
 return match[2].split(',').every((arg,index)=>/^\s*(?:NULL|[01]|(?:NEW|OLD)\.(?:[A-Za-z_][A-Za-z_0-9]*|"[A-Za-z_][A-Za-z_0-9]*")|'[A-Za-z_][A-Za-z_0-9]*')\s*$/i.test(arg)||(index===4&&/^col_(?:channel_writer_changed|channel_observed)$/.test(match[1])&&changed(arg)));
}
function supportedSchema(db,generatedObservers){
 const versions=preparedSchemaVersions477(db),generation=preparedStatementsStats477(db)?.invalidations,prior=schemaCache.get(db);
 if(generation!==undefined&&prior&&prior.generatedObservers===generatedObservers&&prior.generation===generation&&prior.mainVersion===versions.mainVersion&&prior.tempVersion===versions.tempVersion)return prior.supported;
 const rows=prepareCached477(db,"SELECT 'main' AS scope,name,sql FROM main.sqlite_schema WHERE type='trigger' AND sql IS NOT NULL UNION ALL SELECT 'temp',name,sql FROM sqlite_temp_schema WHERE type='trigger' AND sql IS NOT NULL").all();
 const unknown=rows.filter(row=>!(observerOnly(row)||reviewedMainTriggerR10(row)||reviewedEnhancementTrigger491(row)||(row.scope==='temp'&&generatedObservers?.get(row.name)===row.sql)||REWARD_TRIGGER_HASHES_R7.includes(hash(row.sql))));
 const supported=unknown.length===0;
 // Only the existing schema refresh does this work. Keep one bounded snapshot;
 // do not export SQL, trigger names, bindings, player identities or tokens.
 const examples=unknown.map(row=>({scope:row.scope,sha256:hash(row.sql)})).sort((a,b)=>a.scope.localeCompare(b.scope)||a.sha256.localeCompare(b.sha256));
 schemaDiagnostics.set(db,Object.freeze({schema:'col-reward-schema-diagnostics-r9-v1',observedAtMs:Date.now(),mainVersion:versions.mainVersion,tempVersion:versions.tempVersion,recognized:supported,triggerCount:rows.length,unknownCount:unknown.length,unknownMainCount:unknown.filter(row=>row.scope==='main').length,unknownTempCount:unknown.filter(row=>row.scope==='temp').length,unknown:Object.freeze(examples.slice(0,8).map(Object.freeze)),omittedUnknown:Math.max(0,examples.length-8)}));
 schemaCache.set(db,{...versions,generation,generatedObservers,supported});return supported;
}
export function rewardBatchDiagnosticsR9(db){const value=schemaDiagnostics.get(db);return value?{...value,unknown:value.unknown.map(row=>({...row}))}:null;}

// Only the canonical server-generated ingredient statement is admitted here.
// Extract three bounded integer probabilities, then compare the ENTIRE SQL to
// the actual factory. A prefix or a read-only-looking suffix is never enough.
const cauldronFramePrefix488='WITH earned AS MATERIALIZED (';
function cauldronFrame488(frame,token,now){
 if(!frame||typeof frame.sql!=='string'||!Array.isArray(frame.params)||frame.params.length!==2||frame.params[0]!==token||frame.params[1]!==now||frame.loadlabReward||frame.loadlabRateLimit)return false;
 const line=frame.sql.match(/\n  SELECT c\.player_id,(.+) AS bat_wing,(.+) AS ghost_dust,(.+) AS pumpkin_seed\n/);
 if(!line)return false;
 const rates=line.slice(1).map(value=>{
  if(value==='0')return 0;if(value==='1')return 1000000;
  const match=value.match(/^CASE WHEN \(\(random\(\) & 2147483647\)%1000000\)<([1-9][0-9]{0,5}) THEN 1 ELSE 0 END$/);
  return match?Number(match[1]):-1;
 });
 return rates.every(value=>Number.isSafeInteger(value)&&value>=0&&value<=1000000)&&rates.some(value=>value>0)&&frame.sql===cauldronDropSql488(rates);
}
const forgeFramePrefix491='WITH forge_earned491 AS MATERIALIZED (';
function forgeFrame491(frame,token){
 if(!frame||typeof frame.sql!=='string'||!Array.isArray(frame.params)||frame.params.length!==1||frame.params[0]!==token||frame.loadlabReward||frame.loadlabRateLimit)return false;
 const line=frame.sql.match(/\n  SELECT c\.player_id,(.+) AS amount\n/);if(!line)return false;
 const m=line[1].match(/^CASE WHEN \(\(random\(\) & 2147483647\)%10000\)<([1-9][0-9]{0,3}) THEN 1 ELSE 0 END$/),rate=line[1]==='1'?10000:m?Number(m[1]):-1;
 return rate>0&&rate<=10000&&frame.sql===forgeDropSql491(rate);
}
const extraRewardFrames491=(frames,cursor)=>{
 const cauldron=starts(frames[cursor+5],cauldronFramePrefix488)?frames[cursor+5]:null;
 const forge=starts(frames[cursor+5+(cauldron?1:0)],forgeFramePrefix491)?frames[cursor+5+(cauldron?1:0)]:null;
 return {cauldron,forge,count:(cauldron?1:0)+(forge?1:0)};
};
const rewardFrameIndex488=(group,index)=>group.start+index+(index>=5?(group.cauldron488?1:0)+(group.forge491?1:0):0);

function parse(frames,minGroups=2){
 let cursor=0;const event=starts(frames[0],'INSERT INTO combat_events (player_id, target_id, role, ability, created_at) VALUES')?frames[cursor++]:null,groups=[];
 while(cursor<frames.length){
  const start=cursor,extras491=extraRewardFrames491(frames,cursor),extra488=extras491.cauldron,extra491=extras491.forge,rows=[...frames.slice(cursor,cursor+5),...frames.slice(cursor+5+extras491.count,cursor+9+extras491.count)];if(rows.length!==9)return null;
  const[p,d,b,c,x,g,w,h,u]=rows;if(rows.some((frame,index)=>!frame||typeof frame.sql!=='string'||!exactFrameShape(frame.sql,index)))return null;
  if(!starts(p,'INSERT INTO monster_participants (monster_id, spawn_round, player_id, created_at) SELECT id, spawn_round, ?, ? FROM monsters WHERE id = ? AND hp > 0 AND spawn_round = ? ON CONFLICT(monster_id, spawn_round, player_id) DO UPDATE SET created_at = excluded.created_at')||p.params.length!==4)return null;
  if(!starts(d,'INSERT OR IGNORE INTO normal_defeats (monster_id, spawn_round, defeated_at, x, y, xp_reward, essence_min, essence_span, loot_source_key, loot_profile_revision, loot_profile_json, events_snapshot) SELECT id, spawn_round, ?, x, y, ?, ?, ?, ?,')||d.params.length!==12)return null;
  if(!starts(b,'SELECT id,xp')||!normal(b.sql).endsWith('FROM players WHERE id IN (SELECT player_id FROM monster_participants WHERE monster_id=? AND spawn_round=?)')||b.params.length!==2)return null;
  if(!starts(c,'WITH reward_input(seen_since,xp_amount) AS (SELECT ?,?), sources AS (')||!c.sql.includes('INSERT OR IGNORE INTO monster_xp_claims(monster_id,spawn_round,player_id,claim_token,awarded_at)')||c.params.length!==10)return null;
  if(!starts(x,'WITH RECURSIVE reward_input(seen_since,xp_amount) AS (SELECT ?,?), sources AS (')||!x.sql.includes('UPDATE players SET ')||!x.sql.includes(' RETURNING id,xp,level')||x.params.length!==5)return null;
  if(!starts(g,'INSERT OR IGNORE INTO guild_monster_claims(world_cycle,monster_id,spawn_round,guild_id)')||g.params.length!==4||!starts(w,'UPDATE player_items SET enchantments=CASE')||w.params.length!==5)return null;
  if(normal(h.sql)!=='SELECT hp FROM monsters WHERE id=? AND hp>0 AND spawn_round=?'||h.params.length!==2||!starts(u,'UPDATE monsters SET hp = MAX(0, hp - ?), last_damaged_at_ms = ?,')||!u.sql.endsWith('RETURNING hp, wave_stage')||u.params.length!==9)return null;
  const[actor,now,id,round]=p.params,damage=d.params[10],token=c.params[8];
  if(typeof actor!=='string'||typeof id!=='string'||!Number.isSafeInteger(round)||round<0||!Number.isSafeInteger(now)||!Number.isFinite(damage)||damage<=0||typeof token!=='string')return null;
  if(d.params[0]!==now||d.params[9]!==id||d.params[11]!==round||b.params[0]!==id||b.params[1]!==round||c.params[0]!==now-30||c.params[1]!==d.params[1]||c.params[2]!==id||c.params[3]!==round||c.params[4]!==damage||c.params[5]!==damage||c.params[6]!==id||c.params[7]!==round||c.params[9]!==now||x.params[0]!==now-30||x.params[1]!==d.params[1]||x.params[2]!==token||x.params[3]!==now||x.params[4]!==token||g.params[0]!==actor||g.params[1]!==id||g.params[2]!==round||g.params[3]!==damage||w.params[1]!==actor||w.params[2]!==id||w.params[3]!==round||w.params[4]!==damage||h.params[0]!==id||h.params[1]!==round||u.params[0]!==damage||u.params[7]!==id||u.params[8]!==round)return null;
  if(rows.some(f=>f.loadlabRateLimit))return null;
  if(extra488&&!cauldronFrame488(extra488,token,now))return null;if(extra491&&!forgeFrame491(extra491,token))return null;
  const lab=d.loadlabReward??null;if(lab&&(extra488||extra491))return null;if(lab){if(lab.phase!=='inline'||lab.version!==1||lab.count!==6||lab.index!==0||lab.monsterId!==id||lab.spawnRound!==round||!lab.runId||p.loadlabReward||h.loadlabReward||u.loadlabReward)return null;for(let n=1;n<=6;n++){const z=rows[n].loadlabReward;if(!z||z.runId!==lab.runId||z.monsterId!==id||z.spawnRound!==round||z.count!==6||z.index!==n-1||z.version!==1||z.phase!=='inline')return null;}}else if(rows.some(f=>f.loadlabReward))return null;
  groups.push({start,rows,actor,now,id,round,damage,token,lab,...(extra488?{cauldron488:extra488}:{}),...(extra491?{forge491:extra491}:{})});cursor+=9+extras491.count;
 }
 if(groups.length<minGroups||groups.length>32||new Set(groups.map(g=>g.id)).size!==groups.length)return null;
 const first=groups[0];if(groups.some(g=>g.actor!==first.actor||g.now!==first.now||g.lab?.runId!==first.lab?.runId))return null;
 // The cast centre is the selected monster, while AoE groups retain database
 // order. The selected monster must belong to this cast, but need not be first.
 // Preserve the original event and every group/result position unchanged.
 if(event&&(event.params[0]!==first.actor||!groups.some(g=>g.id===event.params[1])))return null;
 for(const index of [0,1,2,3,5,6,7,8])if(groups.some(g=>g.rows[index].sql!==first.rows[index].sql))return null;
 return {groups,event};
}
// Bind placeholders only, never question marks in quoted SQL/comments.
function jsonBindings(sql,alias='wanted'){
 let out='',i=0,index=0,state='';while(i<sql.length){const c=sql[i],n=sql[i+1];if(state){out+=c;i++;if((state==='\''||state==='"'||state==='`')&&c===state){if(n===state){out+=n;i++;}else state='';}else if(state===']'&&c===']')state='';else if(state==='line'&&c==='\n')state='';else if(state==='comment'&&c==='*'&&n==='/'){out+=n;i++;state='';}continue;}if(c==='\''||c==='"'||c==='`'){state=c;out+=c;i++;}else if(c==='['){state=']';out+=c;i++;}else if(c==='-'&&n==='-'){state='line';out+=c+n;i+=2;}else if(c==='/'&&n==='*'){state='comment';out+=c+n;i+=2;}else if(c==='?'){out+=`json_extract(${alias}.value,'$[${index++}]')`;i++;}else{out+=c;i++;}}return {sql:out,count:index};
}
function bulkSql(groups){
 const p=groups[0].rows[0].sql,d=groups[0].rows[1].sql,c=groups[0].rows[3].sql,key=p+'\0'+d+'\0'+c;const prior=compiledShapes.get(key);if(prior)return prior;
 let ps=jsonBindings(p);if(ps.count!==4)throw Error('reward_bulk_participant_shape');
 ps=ps.sql.replace('FROM monsters WHERE','FROM (SELECT key,value FROM json_each(?)) AS wanted JOIN monsters WHERE').replace('ON CONFLICT(monster_id, spawn_round, player_id)','ORDER BY CAST(wanted.key AS INTEGER) ON CONFLICT(monster_id, spawn_round, player_id)')+' RETURNING monster_id,spawn_round,player_id';
 let ds=jsonBindings(d);if(ds.count!==12)throw Error('reward_bulk_defeat_shape');
 ds=ds.sql.replace(/FROM monsters\s+WHERE id =/,'FROM (SELECT key,value FROM json_each(?)) AS wanted JOIN monsters WHERE id =')+' ORDER BY CAST(wanted.key AS INTEGER) RETURNING monster_id,spawn_round';
 const historical=c.match(/AND NOT EXISTS\(SELECT 1 FROM normal_reward_claims[\s\S]*?\n\s*\),peers AS \(/)?.[0]?.replace(/\n\s*\),peers AS \($/,'');if(!historical)throw Error('reward_bulk_claim_shape');
 const cs=`WITH reward_batch AS MATERIALIZED(SELECT CAST(key AS INTEGER) AS reward_index,json_extract(value,'$[0]') AS seen_since,json_extract(value,'$[2]') AS monster_id,json_extract(value,'$[3]') AS spawn_round,json_extract(value,'$[4]') AS damage,json_extract(value,'$[8]') AS claim_token,json_extract(value,'$[9]') AS awarded_at FROM json_each(?)),
 sources AS(SELECT p.*,b.reward_index,b.seen_since FROM reward_batch b JOIN monster_participants mp ON mp.monster_id=b.monster_id AND mp.spawn_round=b.spawn_round JOIN players p ON p.id=mp.player_id WHERE EXISTS(SELECT 1 FROM monsters m WHERE m.id=mp.monster_id AND m.spawn_round=mp.spawn_round AND m.hp>0 AND m.hp<=b.damage) AND NOT EXISTS(SELECT 1 FROM monster_xp_claims c WHERE c.monster_id=mp.monster_id AND c.spawn_round=mp.spawn_round AND c.player_id=mp.player_id) ${historical}),
 peers AS(SELECT source.reward_index,ally.id AS player_id FROM sources source JOIN party_members mine ON mine.player_id=source.id JOIN party_members team ON team.party_id=mine.party_id AND team.player_id<>source.id JOIN players ally ON ally.id=team.player_id WHERE source.hp>0 AND MAX(source.last_seen,CAST(source.movement_checked_at_ms/1000 AS INTEGER),CAST(source.last_monster_hit_at/1000 AS INTEGER))>=source.seen_since AND ally.hp>0 AND MAX(ally.last_seen,CAST(ally.movement_checked_at_ms/1000 AS INTEGER),CAST(ally.last_monster_hit_at/1000 AS INTEGER))>=source.seen_since AND ally.area=source.area AND ally.channel=source.channel AND ally.arena_match_id=source.arena_match_id AND (ally.x-source.x)*(ally.x-source.x)+(ally.y-source.y)*(ally.y-source.y)<=640000),
 recipients AS(SELECT reward_index,id AS player_id FROM sources UNION SELECT reward_index,player_id FROM peers)
 INSERT OR IGNORE INTO monster_xp_claims(monster_id,spawn_round,player_id,claim_token,awarded_at) SELECT b.monster_id,b.spawn_round,r.player_id,b.claim_token,b.awarded_at FROM recipients r JOIN reward_batch b ON b.reward_index=r.reward_index ORDER BY b.reward_index,r.player_id RETURNING monster_id,spawn_round,player_id`;
 const result={participant:ps,defeat:ds,claim:cs};if(compiledShapes.size>=8)compiledShapes.delete(compiledShapes.keys().next().value);compiledShapes.set(key,result);return result;
}
function splitResult(result,id,round){const rows=result.results.filter(r=>r.monster_id===id&&r.spawn_round===round);return {...result,results:[],meta:{...result.meta,changes:rows.length}};}
export function prepareRewardBatchR7(db,frames,generatedObservers){
 const first=starts(frames[0],'INSERT INTO combat_events (player_id, target_id, role, ability, created_at) VALUES')?1:0;
 recordWriterJobDetail477(db,'bulkRewardExamined');
 if(frames.length-first<18||!starts(frames[first],'INSERT INTO monster_participants (monster_id, spawn_round, player_id, created_at)')){recordWriterJobDetail477(db,'bulkRewardNotCandidate');return null;}
 recordWriterJobDetail477(db,'bulkRewardAttempted');
 const fallback=reason=>{recordWriterJobDetail477(db,'bulkRewardFallback'+reason);return null;};
 const parsed=parse(frames);if(!parsed)return fallback('Shape');const {groups,event}=parsed;
 if(!db.isTransaction)return fallback('Scope');if(!supportedSchema(db,generatedObservers))return fallback('Schema');
 // These callbacks depend on intra-cast row visibility/RNG. Preserve the exact
 // old sequence whenever either feature can execute; unknown triggers also fall back.
 // With puzzle enabled, preserve old sequencing whenever the exact 30s
 // trigger gate could fire. This recipient superset includes target participants,
 // the actor about to be inserted, and all party peers (even remote/dead peers).
 // No authenticated XP/item trigger changes party membership. If every possible
 // recipient is below 30s, no puzzle callback can run during this cast.
 const state=prepareCached477(db,`WITH wanted AS MATERIALIZED(SELECT json_extract(value,'$[0]') AS id,json_extract(value,'$[1]') AS round FROM json_each(?)),
 sources(player_id) AS(SELECT mp.player_id FROM wanted w JOIN monster_participants mp ON mp.monster_id=w.id AND mp.spawn_round=w.round UNION SELECT ?),
 recipients(player_id) AS(SELECT player_id FROM sources UNION SELECT team.player_id FROM sources s JOIN party_members mine ON mine.player_id=s.player_id JOIN party_members team ON team.party_id=mine.party_id)
 SELECT CASE WHEN (SELECT enabled FROM broken_core_settings464 WHERE id=1)=1 THEN EXISTS(SELECT 1 FROM recipients r LEFT JOIN broken_core_state464 b ON b.player_id=r.player_id WHERE ?-COALESCE(b.last_tick,0)>=30000) ELSE 0 END AS puzzle,
 EXISTS(SELECT 1 FROM community_runs WHERE published=1 AND start_at<=? AND end_at>?) AS community,
 (SELECT json_group_array(json_object('id',m.id,'round',m.spawn_round,'boss',m.is_boss,'stone',m.is_stone,'area',m.area)) FROM wanted w JOIN monsters m ON m.id=w.id) AS monsters`).get(JSON.stringify(groups.map(g=>[g.id,g.round])),groups[0].actor,groups[0].now*1000,groups[0].now,groups[0].now);
 if(state.puzzle)return fallback('Puzzle');if(state.community)return fallback('Community');const monsters=JSON.parse(state.monsters??'[]');if(monsters.length!==groups.length||monsters.some(m=>m.boss||m.stone||!['forest','frozen','black','ancient','rune','afk','sinsi'].includes(m.area)||/^(?:frozen-(?:boss|water)|ancient-boss|dragon-world|stone-boss-black|dunya-bosu)/.test(m.id)))return fallback('Scope');
 const sql=bulkSql(groups),out=[],map=Array(frames.length);if(event){map[0]=out.length;out.push(event);}
 const pIndex=out.length;out.push({sql:sql.participant,params:[JSON.stringify(groups.map(g=>g.rows[0].params))]});
 const rewardStart=out.length,dIndex=out.length;out.push({sql:sql.defeat,params:[JSON.stringify(groups.map(g=>g.rows[1].params))]});
 const cIndex=out.length;out.push({sql:sql.claim,params:[JSON.stringify(groups.map(g=>g.rows[3].params))]});
 for(const g of groups){map[g.start]=r=>splitResult(r[pIndex],g.id,g.round);map[g.start+1]=r=>splitResult(r[dIndex],g.id,g.round);map[g.start+3]=r=>splitResult(r[cIndex],g.id,g.round);for(const i of [2,4,5,6]){map[rewardFrameIndex488(g,i)]=out.length;const f=g.rows[i];out.push({sql:f.sql,params:f.params});if(i===4){let extraIndex491=g.start+5;if(g.cauldron488){map[extraIndex491++]=out.length;out.push(g.cauldron488);}if(g.forge491){map[extraIndex491]=out.length;out.push(g.forge491);}}}}
 const rewardEnd=out.length;
 if(groups[0].lab){const targets=Object.freeze(groups.map(g=>Object.freeze({monsterId:g.id,spawnRound:g.round}))),group=Object.freeze({version:2,runId:groups[0].lab.runId,phase:'inline_many',targets,count:rewardEnd-rewardStart});for(let i=rewardStart;i<rewardEnd;i++)out[i].loadlabReward={...group,index:i-rewardStart};}
 for(const g of groups)for(const i of [7,8]){map[rewardFrameIndex488(g,i)]=out.length;out.push(g.rows[i]);}
 recordWriterJobDetail477(db,'bulkRewardTargets',groups.length);recordWriterJobDetail477(db,'bulkRewardPreparations',1);recordWriterJobDetail477(db,'bulkRewardFramesSaved',frames.length-out.length);
 return {frames:out,restore(results){if(results.length!==out.length)throw Error('reward_bulk_result_count');return map.map(value=>typeof value==='function'?value(results):results[value]);}};
}

// R13 reuses this exact reviewed recognizer, including bind relationships.
export function parseRewardGroupsR13(frames){
 const first=starts(frames[0],'INSERT INTO combat_events (player_id, target_id, role, ability, created_at) VALUES')?1:0;
 if(frames.some(frame=>starts(frame,cauldronFramePrefix488)||starts(frame,forgeFramePrefix491))){const ends=[];let cursor=first;while(ends.length<32&&cursor+9<=frames.length){cursor+=9+extraRewardFrames491(frames,cursor).count;if(cursor<=frames.length)ends.push(cursor);}for(let index=ends.length-1;index>=0;index--){const parsed=parse(frames.slice(0,ends[index]),1);if(parsed)return parsed;}return null;}
 for(let n=Math.min(32,Math.floor((frames.length-first)/9));n>=1;n--){const parsed=parse(frames.slice(0,first+n*9),1);if(parsed)return parsed;}
 return null;
}
export const supportedRewardSchemaR13=supportedSchema;
