import {readZumrutToolR93} from './zumrut-tools-r93.mjs';
import {readAdventureBundle,publicAdventure} from './adventure-service.mjs';
import {createColdWorldRules,createWorldPlayerProjector} from './generated/cold-world-rules.mjs';
import {NativeGameServices} from './game-services.mjs';
import {demand} from './contract.mjs';
import {ColdReadCache} from './slim-reload.mjs';
import {r35Options} from './r35-options.mjs';

// Original public/private snapshot contract, on a query-only WAL reader.
// Nothing in this class is available to a simulation tick. It is used for
// admission or a committed inventory/area/party/configuration invalidation.
export class ColdWorldReader {
 constructor(sql){this.sql=sql;this.statements=new Map();this.running=false;this.metrics={snapshots:0,reads:0,sharedHits:0};this.cache=new ColdReadCache(sql);this.services=null;this.servicesToken=null;this.nowMs=0;}
 compiled(query){
  demand(typeof query==='string'&&/^\s*(SELECT|WITH)\b/i.test(query),'cold_world_read_only');
  let statement=this.statements.get(query);if(!statement){statement=this.sql.prepare(query);this.statements.set(query,statement);if(this.statements.size>256)this.statements.delete(this.statements.keys().next().value);}return statement;
 }
 async read({auth,nowMs,starterReward,maintenance=null,fresh=false}){
  demand(this.sql.isTransaction&&!this.running&&auth?.player?.id&&auth.account?.id&&Number.isSafeInteger(nowMs)&&Object.hasOwn(arguments[0],'starterReward'),'cold_world_context');
  this.running=true;this.nowMs=nowMs;const slim=r35Options.slimReload!=='0'&&!fresh,token=slim?this.cache.begin():null;
  const cache=new Map(),read=(query,params=[])=>{
   const key=JSON.stringify([query,params]);if(cache.has(key)){this.metrics.sharedHits++;return cache.get(key);}
   const execute=()=>{this.metrics.reads++;return this.compiled(query).all(...params).map(row=>({...row}));};
   const rows=slim?this.cache.read(query,params,execute):execute();cache.set(key,rows);return rows;
  };
  const prepare=query=>{this.compiled(query);const make=params=>({query,params,bind:(...args)=>make(args),all:()=>({results:read(query,params)}),first:()=>read(query,params)[0]??null});return make([]);};
  const project=createWorldPlayerProjector(read),database={prepare,batch:statements=>statements.map(s=>s.all()),readWorldSnapshot:(statements,{projection}={})=>{
   const rows=statements.map(s=>s.all());if(projection)rows[projection.playersIndex]={results:project(rows[projection.playersIndex].results,projection.ownerId,nowMs)};rows.playersProjected=!!projection;rows.snapshotAtMs=nowMs;return rows;
  }};
  try{
   let services;
   if(slim){if(!this.services)this.services=new NativeGameServices(this.sql,{clock:()=>this.nowMs});else if(this.servicesToken!==token)this.services.refresh();this.servicesToken=token;services=this.services;}
   else services=new NativeGameServices(this.sql,{clock:()=>nowMs});
   const {globals}=services;delete globals.__colRealm;
   if(maintenance)globals.__colRealm={maintenance:{view:id=>{demand(id===auth.account.id,'cold_world_maintenance_scope');return maintenance.view;},policy:{revision:maintenance.revision}}};
   const rules=createColdWorldRules({globals,now:()=>nowMs});
   const data=await rules.readColdWorld(database,{auth,nowMs,starterReward}),friends=await rules.readFriends487(database,auth.player.id);
   const area=this.sql.prepare('SELECT area FROM players WHERE id=?').get(auth.player.id).area,deadline=globals.__colGuildVillage.deadline(auth.player.id,area);
   const ownsToolR93=data.dungeonMaterials?.some(row=>row.amount>0&&(row.kind==='zumrut_axe_r93'||row.kind==='zumrut_pickaxe_r93'));
   const equippedToolR93=ownsToolR93?readZumrutToolR93(this.sql,auth.player.id):'';data.zumrutR93={equippedTool:equippedToolR93,...(area==='zumrut'?{nodeDepletions:globals.__colZumrutR93.nodeDepletions(data.channel)}:{})};
   data.players=data.players.map(row=>row.id===auth.player.id?{...row,equippedToolR93}:row);
   data.adventure511=publicAdventure(readAdventureBundle(this.sql,this.sql.prepare('SELECT * FROM players WHERE id=?').get(auth.player.id)));this.metrics.snapshots++;return {data,friends,guildAccess:{area,deadlineMs:Number.isFinite(deadline)?deadline:null}};
  }finally{this.running=false;}
 }
}
