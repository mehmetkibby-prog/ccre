import fs from 'node:fs';
import path from 'node:path';
import {validId,VERSION} from './protocol.mjs';

// IDs are ownership, never display names. Revoked IDs remain tombstones until
// coordinated drain+deletion is complete, so stale requests cannot turn real.
export function createRegistry({now=Date.now,readSeed}={}){
 let frame={version:VERSION,generation:0,enabled:false,runs:[]};
 let players=new Map(),monsters=new Map(),accounts=new Map(),teams=new Map(),instances=new Map(),sources=new Map();
 const revoked=new Map();
 function apply(next){
  if(next?.version!==VERSION||!Number.isSafeInteger(next.generation)||next.generation<frame.generation||!Array.isArray(next.runs)||next.runs.length>2)throw Error('invalid_loadlab_registry');
  next=structuredClone(next);
  // A missing/stale state file must not turn surviving database markers into
  // real accounts. Bounded indexed ownership reads occur on control changes,
  // never per game request. Only a proven database cleanup removes tombstones.
  const durable=readSeed?.();
  for(const old of durable?.runs??[]){
   let run=next.runs.find(r=>r.id===old.id);
   if(!run){run={...old,status:'revoked',heartbeatUntilMs:0};next.runs.push(run);continue;}
   // Index the first entry, matching Array.find even for malformed input.
   // The validation below still rejects duplicate IDs/accounts. Durable seed
   // reads and same-generation revalidation remain mandatory after provisioning.
   const byAccount=new Map(),byPlayer=new Map();
   for(const b of run.bots){if(!byAccount.has(b.accountId))byAccount.set(b.accountId,b);if(!byPlayer.has(b.id))byPlayer.set(b.id,b);}
   let missing=false;
   for(const b of old.bots){
    const sameAccount=byAccount.get(b.accountId),sameId=byPlayer.get(b.id);
    const accountOnly=b.id==='unadmitted-'+b.accountId;
    if(sameId&&sameId.accountId!==b.accountId||sameAccount&&!accountOnly&&sameAccount.id!==b.id)throw Error('durable_player_identity_mismatch');
    // Pending assignments are durable, not heartbeat-owned. A captured older
    // heartbeat must not restore a transferred bot's former channel/targets.
    if(sameId&&b.admissionScenarioR14)Object.assign(sameId,{channel:b.channel,area:b.area,kind:b.kind,targetIds:b.targetIds,assignmentRevision:b.assignmentRevision,visitedChannels:b.visitedChannels,admissionScenarioR14:b.admissionScenarioR14});
    if(!sameId&&!(accountOnly&&sameAccount)){run.bots.push(b);if(!byPlayer.has(b.id))byPlayer.set(b.id,b);if(!byAccount.has(b.accountId))byAccount.set(b.accountId,b);missing=true;}
   }
   const knownMonsters=new Set(run.monsters);
   for(const id of old.monsters)if(!knownMonsters.has(id)){run.monsters.push(id);knownMonsters.add(id);missing=true;}
   run.monsterProfiles??=[];run.bossRanges??=[];
   const byProfile=new Map(),byRange=new Map();
   for(const p of run.monsterProfiles)if(!byProfile.has(p.id))byProfile.set(p.id,p);
   for(const b of run.bossRanges)if(!byRange.has(b.monsterId))byRange.set(b.monsterId,b);
   for(const p of old.monsterProfiles??[]){const found=byProfile.get(p.id);if(found&&found.sourceId!==p.sourceId)throw Error('durable_monster_profile_mismatch');if(!found){run.monsterProfiles.push(p);byProfile.set(p.id,p);missing=true;}}
   for(const b of old.bossRanges??[]){const found=byRange.get(b.monsterId);if(found&&(found.start!==b.start||found.count!==b.count))throw Error('durable_boss_range_mismatch');if(!found){run.bossRanges.push(b);byRange.set(b.monsterId,b);missing=true;}}
   if(missing){run.status='revoked';run.heartbeatUntilMs=0;}
  }
  if(next.runs.length>2)throw Error('loadlab_ownership_recovery_required');
  const ps=new Map(),ms=new Map(),as=new Map(),ts=new Map(),ins=new Map(),ss=new Map();
  for(const r of next.runs){
   if(r.targetSupplyProfile!==undefined&&r.targetSupplyProfile!=='r10-clientlike-900-1000-45000-normal-respawn1s-v1')throw Error('invalid_loadlab_target_supply_profile');
   if(!validId(r.id)||!Array.isArray(r.bots)||r.bots.length>75||!Array.isArray(r.monsters)||r.monsters.length>225||!Number.isSafeInteger(r.expiresAtMs)||!Number.isSafeInteger(r.heartbeatUntilMs))throw Error('invalid_loadlab_run');
   for(const b of r.bots){if(!validId(b.id)||!validId(b.accountId)||ps.has(b.id)||as.has(b.accountId)||![0,1,2].includes(b.team??0)||b.instance!==undefined&&!/^[a-f0-9-]{36}$/.test(b.instance))throw Error('invalid_loadlab_bot');ps.set(b.id,r.id);as.set(b.accountId,r.id);ts.set(b.id,b.team??0);if(b.instance)ins.set(b.id,b.instance);}
   for(const id of r.monsters){if(!validId(id)||ms.has(id))throw Error('invalid_loadlab_monster');ms.set(id,r.id);}
   if(!Array.isArray(r.bossRanges??[])||(r.bossRanges??[]).length>3)throw Error('invalid_boss_ranges');
   for(const b of r.bossRanges??[])if(!validId(b.monsterId)||ms.get(b.monsterId)!==r.id||!Number.isSafeInteger(b.start)||b.start<2**40||b.count!==1024||!Number.isSafeInteger(b.start+b.count))throw Error('invalid_boss_range');
   if(!Array.isArray(r.monsterProfiles??[])||(r.monsterProfiles??[]).length>225)throw Error('invalid_monster_profiles');
   const profiles=new Set();for(const p of r.monsterProfiles??[]){if(!validId(p.id)||!validId(p.sourceId)||ms.get(p.id)!==r.id||profiles.has(p.id))throw Error('invalid_monster_profile');profiles.add(p.id);ss.set(p.id,p.sourceId);}
  }
  players=ps;monsters=ms;accounts=as;teams=ts;instances=ins;sources=ss;frame=structuredClone(next);for(const id of revoked.keys())if(!frame.runs.some(r=>r.id===id))revoked.delete(id);return {ok:true,generation:frame.generation};
 }
 const registry={apply,playerRun:id=>players.get(id)||'',monsterRun:id=>monsters.get(id)||'',accountRun:id=>accounts.get(id)||'',playerTeam:id=>teams.get(id)||0,
  playerInstance:id=>instances.get(id)||'',
  enabled:()=>frame.enabled===true&&frame.windowExpiresAtMs>now(),
  hasKnownEntities:()=>players.size>0||monsters.size>0||accounts.size>0,
  playerIds(runId,channel,area){const r=frame.runs.find(r=>r.id===runId);return r?r.bots.filter(b=>(channel===undefined||channel===0||b.channel===channel)&&(area===undefined||b.area===area)).map(b=>b.id):[];},
  bossMonster(round){if(!Number.isSafeInteger(round))return null;for(const r of frame.runs)for(const b of r.bossRanges??[])if(round>=b.start&&round<b.start+b.count)return {id:b.monsterId,runId:r.id};return null;},
  monsterSource(id){return sources.get(id)||'';},
  targetSupplyProfile(id){const r=frame.runs.find(run=>run.id===id);return r?.targetSupplyProfile==='r10-clientlike-900-1000-45000-normal-respawn1s-v1'?r.targetSupplyProfile:null;},
  stop(id,detail={}){if(players.size&&frame.runs.some(r=>r.id===id))revoked.set(id,{code:String(detail.code??'isolation_rejected').slice(0,96),atMs:now()});},
  faults:()=>[...revoked].map(([runId,value])=>({runId,...value})),
  active(id){const at=now(),r=frame.runs.find(r=>r.id===id);return !!(!revoked.has(id)&&frame.enabled&&r?.status==='running'&&r.expiresAtMs>at&&r.heartbeatUntilMs>at&&frame.windowExpiresAtMs>at);},
  runStatus:id=>{const run=frame.runs.find(r=>r.id===id);return run?(typeof run.status==='string'?run.status:'invalid'):null;},
  snapshot:()=>structuredClone(frame),
  deny(){frame={...frame,enabled:false};},
 };
 return registry;
}
export function loadRuntimeConfig(file='/etc/col-loadlab-live/runtime.json'){
 try{const stat=fs.lstatSync(file);if(!stat.isFile()||stat.isSymbolicLink()||stat.size>16384||(stat.mode&0o007))throw Error('unsafe_loadlab_runtime_config');const value=JSON.parse(fs.readFileSync(file,'utf8'));if(value.schemaVersion!==1||!/^[a-f0-9]{64}$/.test(value.controlKey)||value.allowedSourceIp!=='45.84.191.73'||value.accountsPort!==44471||value.gamePort!==44472||value.stateFile!=='/var/lib/col-loadlab-live/state.json')throw Error('invalid_loadlab_runtime_config');return value;}catch(e){if(e.code==='ENOENT')return null;throw e;}
}
export function installRegistry({config,now=Date.now,onChange=()=>{},seed,readSeed}={}){
 const registry=createRegistry({now,readSeed});globalThis.__colLoadLab=registry;
 const initialSeed=seed??readSeed?.();if(initialSeed)registry.apply(initialSeed);
 if(!config)return {registry,close(){}};
 let closed=false,scheduled=false,watcher;
 const read=()=>{scheduled=false;if(closed)return;try{const s=fs.lstatSync(config.stateFile);if(!s.isFile()||s.isSymbolicLink()||s.size>262144)throw Error('unsafe_state');registry.apply(JSON.parse(fs.readFileSync(config.stateFile,'utf8')));onChange(registry.snapshot());}catch(e){registry.deny();onChange(registry.snapshot());if(e.code!=='ENOENT')console.error('loadlab_registry_rejected');}};
 // Watch the directory so atomic rename does not detach the watcher. File
 // reads occur on run-control changes, never in a player request hot path.
 read();watcher=fs.watch(path.dirname(config.stateFile),(_kind,name)=>{if(String(name)!==path.basename(config.stateFile)||scheduled)return;scheduled=true;setImmediate(read);});watcher.unref();watcher.on('error',()=>{registry.deny();onChange(registry.snapshot());});
 return {registry,close(){closed=true;watcher.close();registry.deny();}};
}
