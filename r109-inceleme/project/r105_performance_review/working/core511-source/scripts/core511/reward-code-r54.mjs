import {xpGroupR56} from './r56-options.mjs';
import {xpGroupActiveR56,stageXpGroupR56,virtualBeforeXpR56,flushXpGroupR56,xpGroupReadCacheActiveR56,cachedXpGroupReadR56,cachedXpEligibilityR56} from './xp-group-r56.mjs';
import {rewardInCodeR54} from './r54-options.mjs';
import {nativeRewardOperationR54} from './retaliation-writer.mjs';
import {BELTS_R31} from './belt-model.mjs';
import {demand} from './contract.mjs';

const ordinary=new Set(['forest','frozen','ancient']);
const connections=new WeakMap(),MAX_SOURCES=128,MAX_RECIPIENTS=256;
const eligibility='p.id,p.hp,p.last_seen,p.movement_checked_at_ms,p.last_monster_hit_at,p.area,p.channel,p.arena_match_id,p.x,p.y,pm.party_id';
const historical=`AND NOT EXISTS(SELECT 1 FROM normal_reward_claims r WHERE r.monster_id=mp.monster_id AND r.spawn_round=mp.spawn_round AND r.player_id=mp.player_id)
 AND NOT EXISTS(SELECT 1 FROM sinsi_reward_claims r WHERE r.monster_id=mp.monster_id AND r.spawn_round=mp.spawn_round AND r.player_id=mp.player_id)
 AND NOT EXISTS(SELECT 1 FROM boss_reward_claims r WHERE (mp.monster_id='dunya-bosu-1' OR EXISTS(SELECT 1 FROM loadlab_boss_rounds_v1 lab_round WHERE lab_round.monster_id=mp.monster_id AND lab_round.boss_round=mp.spawn_round)) AND r.boss_round=mp.spawn_round AND r.player_id=mp.player_id)`;
const live=(p,since)=>p.hp>0&&Math.max(p.last_seen,Math.trunc(p.movement_checked_at_ms/1000),Math.trunc(p.last_monster_hit_at/1000))>=since;
const near=(a,b,since)=>live(a,since)&&live(b,since)&&a.id!==b.id&&a.area===b.area&&a.channel===b.channel&&a.arena_match_id===b.arena_match_id&&(a.x-b.x)**2+(a.y-b.y)**2<=5760000;
const round=value=>Math.trunc(value+0.5); // SQLite ROUND(x,0), nonnegative reward domain.
const utf8=(a,b)=>Buffer.compare(Buffer.from(a),Buffer.from(b));

function connection(sql){
 let s=connections.get(sql);if(s)return s;
 s={active:null,cache:new Map(),stats:{inserts:0,updates:0,recipients:0,fallbacks:0,totalMs:0,maxMs:0}};
 s.prepare=query=>{let p=s.cache.get(query);if(!p){p=sql.prepare(query);if(s.cache.size>=64)s.cache.delete(s.cache.keys().next().value);s.cache.set(query,p);}return p;};
 // This pure function sees the values of the row AT UPDATE time. In particular
 // an earlier player's trigger cannot be overwritten with a stale JS snapshot.
 sql.function('kernel511_reward_value_r54',{varargs:true},(column,...values)=>{
  const a=s.active;demand(a,'reward_r54_scope_missing');
  if(!a.last||values.some((v,i)=>!Object.is(v,a.last[i]))){a.last=values;a.result=finalRewardR54(values,a);}
  return a.result[column];
 });connections.set(sql,s);return s;
}
export function rewardCodeStatsR54(sql){return {...connections.get(sql)?.stats};}
// Register the same lazy reward UDF before optional compile-only boot work.
// No row, reward context, SQL statement execution or RNG is created here.
export function initializeRewardCodeR54(sql){if(rewardInCodeR54)connection(sql);}
export function finalRewardR54(values,{amounts,game,curve,pass,now,wallSeconds,extra,ranks,quest}){
 const [id,xp,level,rankXp,rankTier,wisdom,isGm,area,bpXp,bpSeason,kills]=values;
 const amount=amounts.get(id),cap=game.expansion65_enabled===1||isGm===1&&id===game.expansion65_preview_player_id?65:50;
 const wisdomAmount=level>=65&&rankTier>0?round(amount*(extra&&wisdom>wallSeconds*1000?1.25:1)):amount;
 const active=area!=='afk'&&wisdomAmount>0&&pass?.enabled===1&&pass.season_id!==''&&pass.starts_at<=now*1000&&pass.ends_at>now*1000;
 let nextLevel=level;for(let n=1;n<=cap;n++)if(curve[n]<=xp+amount)nextLevel=Math.max(nextLevel,n);
 return {xp:level>=cap?xp:Math.min(curve[cap],xp+amount),level:nextLevel,
  rank_xp:ranks&&level>=65&&rankTier>0?Math.min(9000000000000,rankXp+wisdomAmount):rankXp,
  battle_pass_xp:active?Math.min(pass.xp_cap,(bpSeason===pass.season_id?bpXp:0)+Math.trunc(wisdomAmount)):bpXp,
  battle_pass_season:active?pass.season_id:bpSeason,quest_kills438:quest?Math.min(1000000000,kills+1):kills};
}
function roster(sql,s,sources){
 const parties=[...new Set(sources.map(p=>p.party_id).filter(p=>p!==null))];
 if(!parties.length)return new Map();
 return cachedXpGroupReadR56(sql,'roster:'+JSON.stringify(parties),()=>{
 const rows=s.prepare(`SELECT ${eligibility} FROM json_each(?) ids JOIN party_members pm ON pm.party_id=ids.value JOIN players p ON p.id=pm.player_id LIMIT 257`).all(JSON.stringify(parties));
 if(rows.length>MAX_RECIPIENTS){flushXpGroupR56(sql);return null;}
 const map=new Map();for(const p of rows){let list=map.get(p.party_id);if(!list)map.set(p.party_id,list=[]);list.push(p);}return map;
 });
}
function sourceRows(sql,s,query,...params){
 if(!xpGroupReadCacheActiveR56(sql))return s.prepare(query).all(...params);
 const narrow=query.replace('SELECT '+eligibility+' FROM ','SELECT p.id FROM ');
 if(narrow===query)return s.prepare(query).all(...params);
 const ids=s.prepare(narrow).all(...params).map(r=>r.id);
 if(ids.length>MAX_SOURCES)return ids.map(id=>({id}));
 return cachedXpEligibilityR56(sql,ids,missing=>s.prepare(`SELECT ${eligibility} FROM json_each(?) ids JOIN players p ON p.id=ids.value LEFT JOIN party_members pm ON pm.player_id=p.id`).all(JSON.stringify(missing)))??s.prepare(query).all(...params);
}
function recipients(sources,teams,since){
 const ids=new Set(sources.map(p=>p.id));for(const source of sources)for(const ally of teams.get(source.party_id)??[])if(near(source,ally,since))ids.add(ally.id);return ids;
}
function amountsFor(sources,teams,since,xp){
 const buckets=new Map();
 for(const source of sources){
  if(source.party_id!==null&&!live(source,since))continue;
  const key=source.party_id===null?'solo:'+source.id:'party:'+source.party_id;
  let ids=buckets.get(key);if(!ids)buckets.set(key,ids=new Set());ids.add(source.id);
  for(const ally of teams.get(source.party_id)??[])if(near(source,ally,since))ids.add(ally.id);
 }
 const amounts=new Map();for(const ids of buckets.values()){
  const amount=Math.trunc(xp*(100+2*(Math.min(5,ids.size)-1))/100);
  for(const id of ids)amounts.set(id,(amounts.get(id)??0)+amount);
 }return amounts;
}
function snapshotBoosts(sql,s,amounts,{now,balance,extra,guild}){
 const ids=JSON.stringify([...amounts.keys()]);
 const wall=s.prepare("SELECT unixepoch() seconds,CAST(ROUND((julianday('now')-2440587.5)*86400000) AS INTEGER) millis").get();
 const rows=cachedXpGroupReadR56(sql,'boost:'+wall.seconds+':'+ids,()=>s.prepare(`SELECT p.id,p.level,p.xp_ring_until,p.halloween_candy_until,p.arena_exp_until,p.pumpkin_enabled499,p.pumpkin_until499,p.radiant_enabled,p.radiant_until,
 (SELECT i.item_name FROM player_items i WHERE i.player_id=p.id AND i.kind='belt' AND i.equipped=1 AND i.rarity='crafted' AND i.power=0 AND i.role='all' AND i.enchantments='[]' AND i.expires_at_ms=0 AND i.premium_origin=0 LIMIT 1) belt,
 EXISTS(SELECT 1 FROM player_items i WHERE i.player_id=p.id AND i.kind='costume' AND i.equipped=1) costume,
 (SELECT s.active_level FROM guild_skills s JOIN guild_members m ON m.guild_id=s.guild_id WHERE m.player_id=p.id AND s.active_until>?) guildLevel
 FROM json_each(?) ids JOIN players p ON p.id=ids.value`).all(wall.seconds*1000,ids));
 const pets=cachedXpGroupReadR56(sql,'pets:'+ids,()=>s.prepare('SELECT player_id,kind,acquired_at FROM player_pets WHERE player_id IN(SELECT value FROM json_each(?)) AND equipped=1').all(ids)),petById=new Map();
 for(const pet of pets)if(pet.acquired_at+604800>wall.seconds){const boost=pet.kind==='dog'?1.2:['bird','monkey'].includes(pet.kind)?1.1:1;petById.set(pet.player_id,Math.max(petById.get(pet.player_id)??1,boost));}
 const out=new Map();for(const p of rows){
  // Native multiply association is intentional; no reordered floating point.
  let amount=amounts.get(p.id);
  if(balance)amount*=p.level>=balance.from?balance.percent/100:1;
  amount*=guild?1+({1:.05,2:.07,3:.15}[p.guildLevel]??0):1;
  amount*=p.xp_ring_until>now?1.25:1;amount*=petById.get(p.id)??1;
  amount*=1+(Object.values(BELTS_R31).find(b=>b.name===p.belt)?.experiencePercent??0)/100;
  amount*=p.halloween_candy_until>wall.seconds*1000?1.25:1;
  amount*=p.arena_exp_until>wall.seconds*1000?1.2:1;
  amount*=extra&&p.pumpkin_enabled499===1&&p.pumpkin_until499>wall.millis?1.25:extra&&p.radiant_enabled===1&&p.radiant_until>wall.seconds*1000||p.costume?1.2:1;
  out.set(p.id,round(amount));
 }return {amounts:out,wallSeconds:wall.seconds};
}

export function prepareRewardCodeR54(sql,args){
 if(!rewardInCodeR54){flushXpGroupR56(sql);return null;}
 const {statements,database,subject,monsterId,spawnRound,lethalDamage,includeBefore,token,xp,now,extra,guild,ranks,quest,balanceSql}=args;
 const area=subject?.area??subject?.monster_area;
 if(!ordinary.has(area)||(subject?.channel??subject?.monster_channel)===0||(subject?.is_boss??subject?.monster_is_boss)||(subject?.is_stone??subject?.monster_is_stone)||!Number.isSafeInteger(xp)||xp<0||xp>1000000000){flushXpGroupR56(sql);return null;}
 // Pending native defeat rows omit channel. Resolve that one key within the
 // same transaction; never apply the port to world-owned channel zero.
 const channel=subject?.channel??subject?.monster_channel??connection(sql).prepare('SELECT channel FROM monsters WHERE id=?').get(monsterId)?.channel;
 if(![1,2,3,4].includes(channel)){flushXpGroupR56(sql);return null;}
 const balanceMatch=balanceSql==='1'?null:/^\(CASE WHEN p\.level>=(\d+) THEN (\d+)\/100\.0 ELSE 1 END\)$/.exec(balanceSql);
 if(balanceSql!=='1'&&!balanceMatch){flushXpGroupR56(sql);return null;}
 const balance=balanceMatch?{from:Number(balanceMatch[1]),percent:Number(balanceMatch[2])}:null,s=connection(sql),at=includeBefore?1:0;
 const fallback=index=>{flushXpGroupR56(sql);s.stats.fallbacks++;return database.batch([statements[index]])[0];};
 const wrap=(index,work)=>nativeRewardOperationR54(()=>{const started=performance.now();try{return work();}finally{const ms=performance.now()-started;s.stats.totalMs+=ms;s.stats.maxMs=Math.max(s.stats.maxMs,ms);}});
 const insert=wrap(at,()=>{
  const sources=sourceRows(sql,s,`SELECT ${eligibility} FROM monster_participants mp JOIN players p ON p.id=mp.player_id LEFT JOIN party_members pm ON pm.player_id=p.id WHERE mp.monster_id=? AND mp.spawn_round=?
   AND (? IS NULL OR EXISTS(SELECT 1 FROM monsters m WHERE m.id=mp.monster_id AND m.spawn_round=mp.spawn_round AND m.hp>0 AND m.hp<=?))
   AND NOT EXISTS(SELECT 1 FROM monster_xp_claims c WHERE c.monster_id=mp.monster_id AND c.spawn_round=mp.spawn_round AND c.player_id=mp.player_id) ${historical} LIMIT 129`,monsterId,spawnRound,lethalDamage??null,lethalDamage??null);
  if(sources.length>MAX_SOURCES)return fallback(at);const teams=roster(sql,s,sources);if(!teams)return fallback(at);
  const ids=[...cachedXpGroupReadR56(sql,'recipients:'+JSON.stringify(sources.map(p=>p.id))+':'+(now-30),()=>recipients(sources,teams,now-30))].sort(utf8);if(ids.length>MAX_RECIPIENTS)return fallback(at);
  const meta=s.prepare('INSERT OR IGNORE INTO monster_xp_claims(monster_id,spawn_round,player_id,claim_token,awarded_at) SELECT ?,?,value,?,? FROM json_each(?)').run(monsterId,spawnRound,token,now,JSON.stringify(ids));
  s.stats.inserts++;return {results:[],meta};
 });
 const update=wrap(at+1,()=>{
  const sources=sourceRows(sql,s,`SELECT ${eligibility} FROM monster_participants mp JOIN players p ON p.id=mp.player_id JOIN monster_xp_claims c ON c.monster_id=mp.monster_id AND c.spawn_round=mp.spawn_round AND c.player_id=mp.player_id LEFT JOIN party_members pm ON pm.player_id=p.id WHERE c.claim_token=? ${historical} LIMIT 129`,token);
  if(sources.length>MAX_SOURCES)return fallback(at+1);const teams=roster(sql,s,sources);if(!teams)return fallback(at+1);
  const amounts=cachedXpGroupReadR56(sql,'amounts:'+JSON.stringify([sources.map(p=>p.id),now-30,xp]),()=>amountsFor(sources,teams,now-30,xp));if(amounts.size>MAX_RECIPIENTS)return fallback(at+1);
  if(!amounts.size){s.stats.updates++;return {results:[]};}
  const game=cachedXpGroupReadR56(sql,'game',()=>s.prepare('SELECT xp_curve_json,expansion65_enabled,expansion65_preview_player_id FROM game_settings WHERE id=1').get());
  const curve=cachedXpGroupReadR56(sql,'curve',()=>{const costs=JSON.parse(game.xp_curve_json),value=[null,0];for(let level=2;level<=65;level++)value[level]=value[level-1]+Math.trunc(Number(costs[level-2]??0));return value;});
  if(curve.some(v=>v!==null&&!Number.isSafeInteger(v)))return fallback(at+1);
  const pass=cachedXpGroupReadR56(sql,'pass',()=>s.prepare('SELECT * FROM battle_pass_settings WHERE id=1').get()),boost=snapshotBoosts(sql,s,amounts,{now,balance,extra,guild});
  const columns=[...(quest?['quest_kills438']:[]),'battle_pass_xp','battle_pass_season',...(ranks?['rank_xp']:[]),'xp','level'];
  const params='id,xp,level,rank_xp,rank_tier,wisdom_until,is_gm,area,battle_pass_xp,battle_pass_season,quest_kills438';
  const query=`UPDATE players SET ${columns.map(c=>`${c}=kernel511_reward_value_r54('${c}',${params})`).join(',')} WHERE id IN(SELECT player_id FROM monster_xp_claims WHERE claim_token=?) AND id IN(SELECT value FROM json_each(?)) RETURNING id,xp,level${ranks?',rank_xp':''}`;
  const contextR56={...boost,game,curve,pass,now,extra,ranks,quest,last:null};
  if(xpGroupActiveR56(sql)){
   const rows=s.prepare(`SELECT ${params} FROM players WHERE id IN(SELECT player_id FROM monster_xp_claims WHERE claim_token=?) AND id IN(SELECT value FROM json_each(?)) ORDER BY rowid`).all(token,JSON.stringify([...boost.amounts.keys()]));
   const staged=stageXpGroupR56(sql,{columns,rows,ranks,compute:row=>finalRewardR54(params.split(',').map(k=>row[k]),contextR56)});
   if(staged){s.stats.updates++;s.stats.recipients+=staged.results.length;return staged;}
  }
  const previous=s.active;s.active=contextR56;
  try{const result={results:s.prepare(query).all(token,JSON.stringify([...boost.amounts.keys()]))};s.stats.updates++;s.stats.recipients+=result.results.length;return result;}finally{s.active=previous;}
 });
 const result=[...statements];if(includeBefore&&xpGroupR56){const original=result[0];result[0]=nativeRewardOperationR54(()=>virtualBeforeXpR56(sql,original.all()));}result[at]=insert;result[at+1]=update;return result;
}
