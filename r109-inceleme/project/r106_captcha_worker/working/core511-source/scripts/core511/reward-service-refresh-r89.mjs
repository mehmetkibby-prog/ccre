import {demand} from './contract.mjs';

// Only the reserved reward worker uses this cache. Compare the complete SQL
// settings row before each command; revision alone and data_version are not
// sufficient. Dynamic event/dragon/community state keeps its native refresh.
const tables=new Map([
 ['__colStatus','status_settings'],['__colQuests438','quest_settings438'],
 ['__colRunes','rune_settings'],['__colRuneV2','rune_v2_settings'],
 ['__colArenaMarket','arena_market_settings'],['__colBattlePass','battle_pass_settings'],
 ['__colProgression','progression_settings'],
]);
const equal=(a,b)=>a&&b&&Object.keys(a).length===Object.keys(b).length&&Object.keys(a).every(k=>Object.hasOwn(b,k)&&Object.is(a[k],b[k]));
export function createRewardServiceRefreshR89(services){
 const sql=services.sql,rows=new Map(),wrapped=new WeakMap(),statements=new Map();
 const enabled=process.env.CORE511_R89_SERVICE_REFRESH!=='0';
 const invalidate=()=>rows.clear();
 return {
  invalidate,
  afterCommand(ack){if(ack?.result?.result?.status!==200||ack?.result?.result?.body?.not_executed)invalidate();},
  refresh(current,key){
   if(!enabled||!tables.has(key))return false;
   demand(current===services&&current.sql===sql&&!sql.isTransaction&&!services.active,'reward_service_refresh_context');
   const service=services.globals[key];demand(service&&typeof service.refresh==='function','reward_service_refresh_missing');
   if(!wrapped.has(service)){
    const methods=new Map();
    // Native setters can update their private JS state before an outer SQL
    // rollback. Invalidate before calling them, even if SQL later matches.
    for(const name of ['save','command','startSeason','endSeason','refresh'])if(typeof service[name]==='function'){
     const original=service[name],wrapper=function(...args){rows.delete(key);return Reflect.apply(original,this,args);};
     service[name]=wrapper;methods.set(name,wrapper);
    }
    wrapped.set(service,methods);
   }
   let read=statements.get(key);if(!read){read=sql.prepare('SELECT * FROM '+tables.get(key)+' WHERE id=1');statements.set(key,read);}
   const row=read.get(),prior=rows.get(key),methods=wrapped.get(service);
   if(prior?.service===service&&prior.refresh===service.refresh&&equal(prior.row,row)&&[...methods].every(([name,fn])=>service[name]===fn))return true;
   rows.delete(key);service.refresh();
   if(row)rows.set(key,{service,refresh:service.refresh,row});
   return true;
  },
 };
}
