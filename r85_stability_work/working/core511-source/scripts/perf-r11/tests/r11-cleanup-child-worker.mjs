// Isolated test process: production channel DB, owner RPC and cleanup controls.
// It has no HTTP listener, service manager, game account login or live endpoint.
import {pathToFileURL} from 'node:url';
import {join} from 'node:path';
const boot=JSON.parse(process.env.COL_R4_CLEANUP_FIXTURE);
const load=path=>import(pathToFileURL(join(boot.runtime,path)).href);
const [{ChannelDatabase},{ChannelRpc},{WorldLoop},{installLoadLabChildControl}]=await Promise.all([
 load('vds-server/src/channel-database.mjs'),load('vds-server/src/channel-rpc.mjs'),
 load('vds-server/src/world-loop.mjs'),load('vds-server/src/loadlab/child-control.mjs'),
]);
const registry={active:()=>false,runStatus:id=>id===boot.runId?'revoked':null,playerRun:id=>boot.botIds.includes(id)?boot.runId:'',monsterRun:()=>'',accountRun:id=>boot.botIds.some(bot=>'account-'+bot===id)?boot.runId:'',enabled:()=>true,hasKnownEntities:()=>true,bossMonster:()=>null,stop(){}};
globalThis.__colLoadLab=registry;
const rpc=new ChannelRpc(process,{identity:boot.identity,handlers:{}});
const db=new ChannelDatabase(boot.file,{channel:1,eventRange:boot.eventRange,claim:id=>rpc.request('claim',{id}),request:request=>rpc.request('write',request)});
db.onFatal=error=>{process.send?.({type:'fixture-fatal',code:error.code??error.message});process.exit(1);};
const world=new WorldLoop(db.sqlite,{positions:db.positions,combat:db.combat,channel:1});
db.worldLoop=world;
installLoadLabChildControl({rpc,db,registry});
rpc.handlers.committed=async({changes})=>{await db.applyCommitted(changes);return {ok:true};};
rpc.handlers.fixturePing=()=>({pid:process.pid,sequence:db.sequence,realOwned:db.owners.has('real-1'),botOwned:boot.botIds.some(id=>db.owners.has(id)),failed:!!db.failure});
rpc.handlers.fixtureHumanWork=async()=>{
 await db.remote([{sql:'DELETE FROM combat_events WHERE created_at < ?',params:[-1]}]);
 await db.runPlayer('real-1',()=>db.remote([{sql:'UPDATE players SET gems=gems+1 WHERE id=?',params:['real-1']}]));
 return {pid:process.pid,sequence:db.sequence,gems:db.sqlite.prepare('SELECT gems FROM main.players WHERE id=?').get('real-1').gems};
};
for(const id of [...boot.botIds,'real-1']){await db.ensureOwner(id);db.combat.syncEntity('players',id);}
let stopping=false;
process.once('SIGTERM',async()=>{if(stopping)return;stopping=true;try{world.stop();await db.drain();db.close();rpc.close();process.exit(0);}catch(error){db.onFatal(error);}});
process.once('disconnect',()=>process.exit(1));
process.send({type:'fixture-ready',pid:process.pid});
