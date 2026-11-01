import assert from 'node:assert/strict';
import fs from 'node:fs';
import {randomUUID,createHash} from 'node:crypto';
import {nativeHttpHost} from '../runtime/r84-baseline/core511-source/scripts/core511/tests/native-http-host-fixture.mjs';
import {put,update} from '../runtime/r84-baseline/core511-source/scripts/core511/tests/pvp-fixture.mjs';
import {until} from '../runtime/r84-baseline/core511-source/scripts/core511/tests/helpers.mjs';
// Production supervisors deliberately clear execArgv. Propagate this fixture
// loader through NODE_OPTIONS so the same compared modules run in children.
process.env.NODE_OPTIONS=(process.env.NODE_OPTIONS??'')+' --import '+new URL('./register-progress.mjs',import.meta.url).pathname;
const cleanups=[],t={after:fn=>cleanups.push(fn)},candidate=process.env.R85_PROGRESS_CANDIDATE==='1',label=process.env.R85_PROGRESS_LABEL??(candidate?'r85':'r84'),material=process.env.R85_PROGRESS_MATERIAL==='1',hitCount=material?1:6,rows=[],queries=[];
let s,live,error=null,materialSnapshot;
try{
 s=await nativeHttpHost(t,{realmSetup:async(host,seed)=>{
  await host.database.atomic(sql=>{
   update(sql,'players',seed.id,{area:'forest',channel:1,x:2700,y:2025,level:65,rank_tier:1,rank_xp:100,rank_forest:50,rank_frozen:50,rank_black:50,rank_ancient:50,hp:100000,max_hp:100000,attack_one_at:0,last_seen:0});
   if(material){put(sql,'dungeon_materials',{player_id:seed.id,kind:'weathered_iron',amount:7});sql.exec("CREATE TRIGGER r85_material_reward AFTER INSERT ON monster_xp_claims BEGIN INSERT INTO dungeon_materials(player_id,kind,amount) VALUES(NEW.player_id,'weathered_iron',3) ON CONFLICT(player_id,kind) DO UPDATE SET amount=amount+3;END");}
   for(let i=0;i<hitCount;i++)put(sql,'monsters',{id:'golge-progress-native-'+i,name:'Gölge',area:'forest',channel:1,x:2720,y:2025,hp:1,max_hp:1,spawn_round:17,last_damaged_at_ms:Date.now(),last_regen_at_ms:Date.now()});
  });
 }});
 await s.world.stopJobs();await s.host.database.atomic(()=>globalThis.__colLaunch.grant(s.f.account.id,true));
 const ticket=await s.http('character',{channel:1});assert.equal(ticket.status,200,JSON.stringify(ticket));live=await s.connect(ticket);
 live.ws.on('message',bytes=>{const p=JSON.parse(bytes);if(p.type==='event')live.ws.send(JSON.stringify({type:'event_ack',ids:[p.id]}));});
 const original=s.reader.query.bind(s.reader);s.reader.query=async(name,...args)=>{const at=performance.now();try{return await original(name,...args);}finally{queries.push({name,ms:performance.now()-at});}};
 for(let i=0;i<hitCount;i++){
  if(i)await new Promise(resolve=>setTimeout(resolve,1400));
  const at=performance.now(),queryStart=queries.length,sequence=i*2+1;
  live.ws.send(JSON.stringify({type:'input',sequence,payload:{action:'attack',targetId:'golge-progress-native-'+i,spawnRound:17,ability:0,intentId:randomUUID()}}));
  let result;await until(()=>{result=live.packets.flatMap(p=>p.results??[]).find(r=>r.sequence===sequence);return result;},10000);
  assert(!result.error&&!(result.status>=400),JSON.stringify(result));
  const inputAckMs=performance.now()-at,moveAt=performance.now();
  live.ws.send(JSON.stringify({type:'input',sequence:sequence+1,payload:{action:'move',area:'forest',x:2700,y:2025}}));
  let move;await until(()=>{move=live.packets.flatMap(p=>p.results??[]).find(r=>r.sequence===sequence+1);return move;},10000);
  assert(!move.error&&!(move.status>=400),JSON.stringify(move));
  const moveAckMs=performance.now()-moveAt;
  await until(()=>s.host.database.sqlite.prepare('SELECT COUNT(*) n FROM monster_xp_claims WHERE monster_id=? AND player_id=? AND spawn_round=17').get('golge-progress-native-'+i,s.f.id).n===1,10000);
  const ms=performance.now()-at,player=s.host.database.sqlite.prepare('SELECT rank_xp,rank_tier FROM players WHERE id=?').get(s.f.id);
  assert.equal(s.host.database.sqlite.prepare('SELECT COUNT(*) n FROM monster_xp_claims WHERE monster_id=? AND player_id=? AND spawn_round=17').get('golge-progress-native-'+i,s.f.id).n,1,JSON.stringify({result,monster:s.host.database.sqlite.prepare('SELECT hp,spawn_round,x,y FROM monsters WHERE id=?').get('golge-progress-native-'+i),actor:s.host.database.sqlite.prepare('SELECT hp,x,y,area FROM players WHERE id=?').get(s.f.id)}));
  rows.push({sequence,ms,inputAckMs,moveAckMs,rankXp:player.rank_xp,rankTier:player.rank_tier,queries:queries.slice(queryStart)});
  live.packets.length=0;
 }
 const child=s.supervisor.rows.get(1).child,request=randomUUID();let snapshot;
 const listener=message=>{if(message?.type==='test-progress-state'&&message.request===request)snapshot=message.snapshot;};child.on('message',listener);child.send({type:'test-progress-state',request,actor:s.f.id});await until(()=>snapshot);child.off('message',listener);
 const durable=s.host.database.sqlite.prepare('SELECT * FROM players WHERE id=?').get(s.f.id);
 assert(durable.rank_xp>100);assert.equal(durable.rank_tier,1);
 assert.equal(snapshot.player.rank_xp,durable.rank_xp);assert.equal(snapshot.owner.rank.xp,durable.rank_xp);assert.equal(snapshot.dungeon.rank_xp,durable.rank_xp);
 if(material){materialSnapshot=snapshot.materials;const amount=s.f.sql.prepare("SELECT amount FROM dungeon_materials WHERE player_id=? AND kind='weathered_iron'").get(s.f.id).amount;assert.equal(amount,10);for(const [mirror,inventory] of Object.entries(materialSnapshot))assert.equal(inventory.weathered_iron,amount,mirror+' committed material mirror');}
 assert.equal(s.faults.length,0,JSON.stringify(s.faults.map(f=>f.error?.message)));
 const coldReads=queries.filter(q=>q.name==='kernel511_actor_world').length;
 assert.equal(coldReads,candidate?0:hitCount,'ranked kills route through expected refresh path');
}catch(e){error={message:e.message,stack:e.stack};process.exitCode=1;}
finally{
 live?.ws.terminate();for(const cleanup of cleanups.toReversed())try{await cleanup();}catch(e){error??={message:e.message,stack:e.stack};process.exitCode=1;}
 const files=candidate?['actor-section-reuse-r52.mjs','actor-progress-refresh-r85.mjs','collect-materials-r85.mjs']:['actor-section-reuse-r52.mjs'],base=new URL(candidate?'../../working/core511-source/scripts/core511/':'../runtime/r84-baseline/core511-source/scripts/core511/',import.meta.url),hashes=Object.fromEntries(files.map(file=>[file,createHash('sha256').update(fs.readFileSync(new URL(file,base))).digest('hex')]));
 const report={label,passed:!error,error,materialSnapshot,execArgv:process.execArgv,hashes,scope:hitCount+' native ranked lethal hits; full SQLite writer and 4 channel processes, actual WS over OS IPC, pinned R84 plus only progress modules for candidate'+(material?'; isolated direct-material grant trigger':''),rows,queries,liveTouched:false,fullBrowser:false};
 fs.writeFileSync(new URL('../../evidence/progress-native-ack-'+label+'.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}
