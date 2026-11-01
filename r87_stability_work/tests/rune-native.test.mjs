import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const root=process.env.R85_RUNTIME_TREE+'/core511-source/scripts/core511/';
const {setup,extraPlayer}=await import(root+'tests/process-fixture.mjs');
const {until}=await import(root+'tests/helpers.mjs');
test('Rune V2 ordinary native death, reward claim replay and second player movement',{timeout:50000},async t=>{
 const target='rune-v2-tide-c4-1',s=await setup(t,{shared:true,localCombat:{id:target,hp:1,area:'rune_v2'}});
 await s.world.stopJobs();const other=extraPlayer(s,887,'r87-rune-observer');
 const a=await s.connect(await s.http('character',{channel:4})),b=await s.connect(await other.http('character',{channel:4}));
 await s.core.permanentPlayers([s.f.id,other.id],()=>{
  for(const id of [s.f.id,other.id])s.f.sql.prepare("UPDATE players SET area='rune_v2',level=65,x=2700,y=2025,hp=100000,max_hp=100000,attack_one_at=0,attack_two_at=0,attack_three_at=0,attack_four_at=0,respawn_at_ms=0,stun_until_ms=0,root_until_ms=0 WHERE id=?").run(id);
 });
 await until(()=>a.packets.some(p=>JSON.stringify(p).includes('rune_v2')),5000);
 const command=s.writer.command.bind(s.writer),calls=[];
 s.writer.command=async(peer,request)=>{const at=performance.now(),ack=await command(peer,request);calls.push({operation:request.operation,action:request.payload?.input?.action,joined:!!request.payload?.checkpointR53,ms:performance.now()-at,status:ack.result?.result?.status});return ack;};
 const result=(live,seq)=>live.packets.flatMap(p=>p.results??[]).find(r=>r.sequence===seq);
 const send=(live,sequence,payload)=>live.ws.send(JSON.stringify({type:'input',sequence,payload}));
 const started=performance.now();send(a,1,{action:'attack',ability:0,targetId:target,spawnRound:17,intentId:'r87-rune-kill'});
 await until(()=>result(a,1)||s.faults.length,8000);assert.equal(s.faults.length,0,s.faults.map(f=>f.error?.stack).join('\n'));assert.equal(result(a,1).status,200,JSON.stringify(result(a,1)));
 const attackAckMs=performance.now()-started;
 const defeat=()=>s.f.sql.prepare('SELECT * FROM normal_defeats WHERE monster_id=? AND spawn_round=17').get(target);
 assert(defeat(),'native rune defeat is durable');
 const afterAttack={...defeat()};
 if(process.env.R87_EXPECT_JOINED==='1'){assert(calls.some(c=>c.operation==='attack'&&c.joined));assert(afterAttack.rewards_completed_at>0,'rune loot must finish in the defeat transaction');}
 send(a,2,{action:'claim_rewards',rewardTargets:[{id:target,spawnRound:17}]});await until(()=>result(a,2)||s.faults.length,8000);assert.equal(result(a,2).status,200,JSON.stringify(result(a,2)));
 const claims=()=>s.f.sql.prepare('SELECT COUNT(*) n FROM normal_reward_claims WHERE monster_id=? AND spawn_round=17').get(target).n;
 const before=claims();assert.equal(before,1);send(a,3,{action:'claim_rewards',rewardTargets:[{id:target,spawnRound:17}]});await until(()=>result(a,3)||s.faults.length,8000);assert.equal(result(a,3).status,200);assert.equal(claims(),before,'claim replay cannot duplicate reward');
 const own=b.packets.flatMap(p=>p.image?.players??p.world?.players??[]).find(p=>p.id===other.id);
 // Direct accepted move uses the same native coordinate authority as browser input.
 send(b,1,{action:'move',x:2703,y:2025});await until(()=>result(b,1)||s.faults.length,8000);assert.equal(result(b,1).status,200,JSON.stringify(result(b,1)));assert.equal(s.faults.length,0);
 const report={source:process.env.R85_RUNTIME_TREE,attackAckMs,afterAttack,finalDefeat:defeat(),rewardClaims:claims(),calls,observerMove:result(b,1),faults:s.faults.length,passed:true};
 fs.writeFileSync('/workspace/ccre/r87_stability_work/evidence/rune-'+(process.env.R87_EXPECT_JOINED==='1'?'candidate':'baseline')+'.json',JSON.stringify(report,null,2)+'\n');
});
