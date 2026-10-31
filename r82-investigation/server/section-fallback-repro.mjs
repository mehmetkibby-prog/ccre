// Source-exact isolated refresh-path reproduction. Imported policy/port
// dependencies are controlled fixtures; this is NOT a full server boot.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const root = new URL('../../r81-work/core511-source/scripts/core511/', import.meta.url);
const sourcePath = fileURLToPath(new URL('actor-section-reuse-r52.mjs', root));
const source = fs.readFileSync(sourcePath, 'utf8');
const sandbox = {
  actorSectionReuseR52: true,
  rewardAsyncReplyR54: true,
  refreshReadPipelineR56: true,
  sectionReadGroupR56: true,
  commitSectionsR57: true,
  groundLoot30s: true,
  rewardSectionTableR60: () => false,
  needsMaterialSectionsR60: () => false,
  validMaterialSectionR60: () => true,
  materialPartR60: () => ({}),
  portalRefreshScopeR57: () => false,
  portalRefreshTableR57: () => false,
  ENCOUNTER_FIELDS: ['player_id'],
  Buffer, process,
};
vm.createContext(sandbox);
vm.runInContext(source.replace(/^import .*;\n/gm, '').replace(/^export /gm, '') +
  '\nglobalThis.api={applyActorSectionsR52,actorSectionMetricsR52,fields};', sandbox,
  {filename:sourcePath});

const resident = fs.readFileSync(new URL('resident-channel.mjs', root),'utf8');
const start = resident.indexOf(' async applyCommit(result,context){');
const end = resident.indexOf('\n action(context){', start);
assert(start>=0 && end>start);
const context = {
  ipcSafeStream:false,
  demand:(condition,code)=>assert(condition,code),
};
vm.createContext(context);
vm.runInContext('globalThis.applyCommit=({' + resident.slice(start,end) + '}).applyCommit',context);

function fixture(changes){
  const previous={id:'actor-1',hp:100,hp_revision:1,level:65,area:'forest',channel:1,
    arena_match_id:'',xp:1000,rank_tier:1,rank_xp:100,rank_forest:50,
    battle_pass_xp:100,battle_pass_season:'season-1'};
  const row={...previous,...changes},owner={epoch:1,channel:1,incarnation:'channel-1'};
  const result={players:[row],monsters:[],sharedRefresh:{version:1,all:false,tables:['players'],actors:['actor-1']},
    actorSectionsR52:{version:1,cycle:1,actor:'actor-1',actors:[{id:'actor-1',owner,engagement:null}]}};
  const sub={ownerRow:{...previous,rank:{tier:1,xp:100}},data:{area:'forest',channel:1,players:[{...previous}]},revision:1};
  let loaded=0;
  const runtime={
    channel:{world:{cycle:1},owners:new Map([['actor-1',owner]]),
      view:{player:()=>previous,setPlayer:()=>{},setEngagement:()=>{}},
      kernel:{players:new Map([['actor-1',{epoch:1,barrier:Promise.resolve(),suspended:false}]])},
      frames:{entries:new Map([['actor-1',{valid:true}]])},
      lanes:{busy:()=>true},state:{assertOwner:()=>{}},presence:{merge:row=>row},setMonster:()=>{}},
    world:{subscribers:new Map([['actor-1',sub]])},dungeon:{locked:()=>false},slimReload:{forget:()=>{}},
  };
  const channel=runtime.channel;
  Object.assign(channel,{completedClaimHintsR56:{record:()=>{}},
    ports:{actorSectionRefreshR52:r=>sandbox.api.applyActorSectionsR52(runtime,r)},
    loadActor:async()=>{loaded++;return{};},applyBundle:()=>{},revision:0});
  return {result,channel,sub,loaded:()=>loaded};
}

const cases=[
  ['ordinary XP only',{xp:1001},0],
  ['rank XP only',{rank_xp:101},1],
  ['rank quest count',{rank_forest:51},1],
  ['battle pass XP only',{battle_pass_xp:101},1],
  ['battle pass season',{battle_pass_season:'season-2'},1],
  ['level change must retain full reload',{level:66},1],
];
for(const [label,changes,expectedReads] of cases){
  const f=fixture(changes),before=sandbox.api.actorSectionMetricsR52.columnFallback;
  await context.applyCommit.call(f.channel,f.result);
  assert.equal(f.loaded(),expectedReads,label);
  assert.equal(sandbox.api.actorSectionMetricsR52.columnFallback-before,expectedReads,label);
  console.log(JSON.stringify({case:label,fullActorReads:f.loaded(),columnFallback:expectedReads}));
}

// A deliberately incomplete candidate demonstrates why extending the scalar
// allowlist alone is unsafe. This mutation exists ONLY in the isolated VM.
sandbox.api.fields.add('rank_xp');
const naive=fixture({rank_xp:101});
await context.applyCommit.call(naive.channel,naive.result);
assert.equal(naive.loaded(),0);
assert.equal(naive.sub.ownerRow.rank_xp,101);
assert.equal(naive.sub.ownerRow.rank.xp,100);
console.log(JSON.stringify({case:'naive rank_xp allowlist addition is insufficient',
  fullActorReads:naive.loaded(),rawRankXp:naive.sub.ownerRow.rank_xp,
  projectedRankXp:naive.sub.ownerRow.rank.xp,nestedProjectionStale:true}));
sandbox.api.fields.delete('rank_xp');
