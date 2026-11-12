import {demand} from './contract.mjs';
import {prepareCached477} from './writer-statements.mjs';

const stampSql=`SELECT r.config_json,r.revision,
 (SELECT schema_version FROM pragma_schema_version) AS schema_version,
 (SELECT sql FROM main.sqlite_schema WHERE type='table' AND name='players') AS players_sql,
 (SELECT sql FROM main.sqlite_schema WHERE type='table' AND name='guild_skills') AS guild_sql
 FROM rank_settings r WHERE r.id=1`;
const fields=['config_json','revision','schema_version','players_sql','guild_sql'];

// Only the external reward worker opts in. Its FIFO reservation excludes other
// writers while these exact durable settings/schema bytes are read. Other
// service refreshes, including dynamic event profiles, still run every time.
export function createRewardRankRefreshR85(services){
 const sql=services.sql,database=services.database,factory=services.modules.ranks.createRanks;
 let cached=null;
 return {
  invalidate(){cached=null;},
  afterCommand(ack){
   // A proven native SQL rollback can resolve as a durable negative receipt,
   // rather than reject the worker promise. Its JS settings reads may have
   // observed uncommitted configuration, so success of the transport is not
   // sufficient evidence for retaining this cache.
   const result=ack?.result?.result;
   if(result?.status!==200||result.body?.not_executed)cached=null;
  },
  refresh(current){
   demand(current===services&&services.sql===sql&&services.database===database&&!sql.isTransaction&&!services.active,'reward_rank_refresh_context');
   const stamp=prepareCached477(sql,stampSql).get();
   demand(stamp&&typeof stamp.config_json==='string'&&typeof stamp.players_sql==='string','reward_rank_refresh_schema');
   const previous=services.globals.__colRanks;
   if(cached&&cached.service===previous&&cached.save===previous.save&&cached.settings===previous.settings&&fields.every(key=>Object.is(cached.stamp[key],stamp[key])))return previous;
   cached=null;
   const service=factory(database),save=service.save;
   // Native save updates a private JS cache before an outer transaction might
   // roll back. Invalidate before calling it, even if SQL later returns to the
   // exact old bytes or the native method throws. Service identity alone is not
   // evidence that its cached configuration still represents the durable row.
   service.save=function(...args){cached=null;return Reflect.apply(save,this,args);};
   cached={service,save:service.save,settings:service.settings,stamp};return service;
  }
 };
}
