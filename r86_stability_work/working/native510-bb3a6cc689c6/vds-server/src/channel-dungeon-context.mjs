import {PremiumEngine} from './premium-engine.mjs';
import {createRanks} from './ranks.mjs';
import {createGuildSkill} from './guild-skill.mjs';
import {createProgressionSettings} from './progression-settings.mjs';
import {createDragonBoss} from './dragon-boss.mjs';

// Helpers outlive a tick, their SQL never does. Every statement invocation is
// routed to the current synchronous private plan, including cached statements.
// Cached settings still contribute a fresh replay guard in each using plan.
export function createDungeonContext(workspace){
 const factories={__colPremium:db=>new PremiumEngine(db),__colRanks:createRanks,__colGuildSkill:createGuildSkill,__colProgression:createProgressionSettings,__colDragonBoss:createDragonBoss};
 const settingsTables={__colRanks:'rank_settings',__colProgression:'progression_settings'};
 const helpers=new Map(),schema=new Map(),proxies=new Map();
 let active=null,used=null,initialSettings=null;
 const plan=()=>{if(!active)throw Error('dungeon_helper_outside_boundary');return active;};
 const adapter={
  get isTransaction(){return plan().isTransaction;},
  exec(sql){return plan().exec(sql);},
  prepare(sql){
   // A workspace's schema is immutable for its entire lifetime. These probes
   // never select player/economy rows and need no durable decision guard.
   const metadata=/^\s*PRAGMA table_info\(/i.test(sql)||/^SELECT 1 FROM sqlite_master WHERE (?:type='table' AND )?name='(?:guild_skills|player_pets|player_storage_items)'$/.test(sql);
   const invoke=(method,params)=>{
    plan();
    if(metadata){
     const key=sql+'\u001f'+method+'\u001f'+JSON.stringify(params);
     if(!schema.has(key))schema.set(key,workspace.sqlite.prepare(sql)[method](...params));
     return structuredClone(schema.get(key));
    }
    if(initialSettings?.sql===sql&&method==='get'&&!params.length){const row=initialSettings.row;initialSettings=null;return row;}
    return plan().prepare(sql)[method](...params);
   };
   return {get:(...params)=>invoke('get',params),all:(...params)=>invoke('all',params),run:(...params)=>invoke('run',params)};
  }
 };
 const helper=name=>{
  plan();
  if(!used.has(name)){
   used.add(name);
   const table=settingsTables[name];
   if(table){
    const sql='SELECT * FROM '+table+' WHERE id=1';
    const row=active.prepare(sql).get();
    // Compare the actual immutable settings payload, not only a caller's
    // revision number. Administrative changes take effect on the next use.
    const signature=JSON.stringify(row),cached=helpers.get(name);
    if(!cached||cached.signature!==signature){
     initialSettings={sql,row};
     try{helpers.set(name,{value:factories[name](adapter),signature});}
     finally{initialSettings=null;}
    }
   }else if(!helpers.has(name))helpers.set(name,{value:factories[name](adapter)});
  }
  return helpers.get(name).value;
 };
 for(const name of Object.keys(factories))proxies.set(name,new Proxy({}, {get(_target,key){
  const value=helper(name)[key];
  return typeof value==='function'?(...args)=>{const current=helper(name);return current[key](...args);}:value;
 }}));
 return (currentPlan,fn)=>{
  if(active)throw Error('nested_dungeon_context');
  const saved=new Map();active=currentPlan;used=new Set();
  try{
   for(const [name,proxy]of proxies)if(globalThis[name]){saved.set(name,globalThis[name]);globalThis[name]=proxy;}
   return fn();
  }finally{
   for(const [name,value]of saved)globalThis[name]=value;
   active=null;used=null;initialSettings=null;
  }
 };
}
