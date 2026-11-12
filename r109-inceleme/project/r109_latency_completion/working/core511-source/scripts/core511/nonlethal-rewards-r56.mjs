import {contentTriggerHashesR102} from './content-trigger-audit-r102.mjs';
import {zumrutAuditHashesR93} from './zumrut-audit-hashes-r93.mjs';
import {dailyRewardTriggerHashesR76} from './daily-monster-rewards-r76.mjs';
import {gameplayR60} from './r60-options.mjs';
import {rewardAuditHashesR60} from './reward-audit-r60.mjs';
import {castleAuditHashesR59} from './castle-audit-r59.mjs';
import {guildCapacityHashR59} from './guild-capacity-r59.mjs';
import {castleCapacityHashR59} from './castle-capacity-sql-r59.mjs';
import {castleEnabled} from './castle-model-r59.mjs';
import {createBulkHitsR56} from './bulk-hits-r56.mjs';
import {bulkHitsR56} from './r56-options.mjs';
import {createHash} from 'node:crypto';
import {prepareServerStatement} from './server-statements.mjs';
import {preparedSchemaVersions477} from '../../../native510-bb3a6cc689c6/vds-server/src/prepared-statements477.mjs';
import {nonlethalTriggersR56} from './nonlethal-triggers-r56.mjs';
import {nonlethalRewardsR56} from './r56-options.mjs';
import {itemRefreshTriggerHashesR57} from './item-refresh-audit-r57.mjs';
const certified=new WeakMap(),counters=new WeakMap();
const hash=s=>createHash('sha256').update(s).digest('hex');
export function nonlethalStatsR56(sql){return {...counters.get(sql)};}
export function nonlethalSchemaR56(sql){
 // R110: same PRAGMA values via the connection's compiled schema statements.
 const {mainVersion:main,tempVersion:temp}=preparedSchemaVersions477(sql),prior=certified.get(sql);
 if(prior&&prior.main===main&&prior.temp===temp)return prior.ok;
 const rows=prepareServerStatement(sql,"SELECT 'main' scope,name,sql FROM main.sqlite_schema WHERE type='trigger' UNION ALL SELECT 'temp',name,sql FROM temp.sqlite_schema WHERE type='trigger'").all();
 const ok=rows.every(r=>(contentTriggerHashesR102[r.scope+':'+r.name]??nonlethalTriggersR56[r.scope+':'+r.name]??itemRefreshTriggerHashesR57[r.scope+':'+r.name]??castleAuditHashesR59[r.scope+':'+r.name]??dailyRewardTriggerHashesR76[r.scope+':'+r.name]??zumrutAuditHashesR93[r.scope+':'+r.name])===hash(r.sql)||(gameplayR60.rewardSections&&rewardAuditHashesR60[r.scope+':'+r.name]===hash(r.sql))||(castleEnabled()&&r.scope==='main'&&(r.name==='channel_capacity_reentry'&&hash(r.sql)===castleCapacityHashR59||r.name==='guild_member_capacity'&&hash(r.sql)===guildCapacityHashR59)));certified.set(sql,{main,temp,ok});return ok;
}
// Called at the original per-target preparation point, inside the sole writer.
// Only zero-row reward statements are omitted. Exact baseline triggers cannot
// mutate monster HP/life between preparation and the native hit batch. The
// original participant, cooldown, HP, engagement and event statements remain.
export function nonlethalRewardPortR56(sql,rng){
 let reserved=null,reservedRoll=null;const random=()=>{if(reservedRoll===null)return rng.random();const value=reservedRoll;reservedRoll=null;return value;};const uuid=()=>{if(reserved===null)return rng.uuid();const value=reserved;reserved=null;return value;};
 if(!nonlethalRewardsR56)return {uuid,random,skip:undefined};
 const stats=counters.get(sql)??{skipped:0,full:0,schemaFallback:0};counters.set(sql,stats);
 const supported=sql.isTransaction&&nonlethalSchemaR56(sql);
 if(!supported){stats.schemaFallback++;return {uuid,random,skip:undefined};}
 const read=prepareServerStatement(sql,'SELECT hp,spawn_round,channel,area,is_boss,is_stone FROM monsters WHERE id=?'),used=prepareServerStatement(sql,'SELECT 1 FROM monster_xp_claims WHERE claim_token=? LIMIT 1');
 return {uuid,random,...(bulkHitsR56?{hitGroupSize:64,batchHits:createBulkHitsR56(sql)}:{}),skip(target,damage){
  if(!sql.isTransaction||!['forest','frozen','ancient'].includes(target.area)||target.channel<1||target.channel>4||target.is_boss||target.is_stone||!Number.isFinite(damage)||damage<1||/^(?:frozen-(?:boss|water)|ancient-boss|dragon-world|stone-boss-black|dunya-bosu)/.test(target.id)){stats.full++;return false;}
  const row=read.get(target.id);
  if(!row||!(row.hp>damage)||row.spawn_round!==target.spawn_round||row.channel!==target.channel||row.area!==target.area||row.is_boss||row.is_stone){stats.full++;return false;}
  // Native bonusAmount consumes one roll, then prepareMonsterXp one UUID even when its SQL writes no row.
  // Keep that draw at this same point; reused tokens retain the original path.
  reservedRoll=rng.random();reserved=rng.uuid();if(used.get(reserved)){stats.full++;return false;}
  reserved=null;reservedRoll=null;stats.skipped++;return true;
 }};
}
