import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createAttackWriterRules} from '../../working/core511-source/scripts/core511/generated/attack-writer-rules.mjs';
import {OperationRandom} from '../../working/core511-source/scripts/core511/operation-random.mjs';
import {native} from '../../working/core511-source/scripts/core511/tests/helpers.mjs';
const registry=(await native('vds-server/src/loadlab/registry.mjs')).installRegistry();
const input=JSON.parse(fs.readFileSync(new URL('./native-input.json',import.meta.url))),settings=Object.freeze(input.settings),candidate=process.env.R85_LOOT_PURE_CANDIDATE==='1';
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const factory=(seed='31'.repeat(32))=>{const rng=new OperationRandom(seed);return {rng,rules:createAttackWriterRules({globals:{},fourChannels:true,random:()=>rng.roll(),uuid:()=>rng.uuid(),now:()=>1793517890000})};};
const profile=()=>factory().rules.profileFromDefeat(input.defeat,input.defeat.loot_source_key,settings);
const expected=profile(),times=[];for(let i=0;i<50;i++)profile();
for(let i=0;i<500;i++){const rules=factory().rules,start=performance.now(),actual=rules.profileFromDefeat(input.defeat,input.defeat.loot_source_key,settings);times.push(performance.now()-start);assert.deepEqual(actual,expected);}
const rolls=[];for(let i=0;i<128;i++){const seed=i.toString(16).padStart(64,'0'),{rng,rules}=factory(seed),value=rules.profileFromDefeat(input.defeat,input.defeat.loot_source_key,settings),drops=rules.prepareProfileDrops(value,input.participants,input.defeat.monster_id,input.defeat,settings,1793517890,input.defeat.events_snapshot,input.defeat.pearls_retired===1);rolls.push({drops,counter:rng.counter,offset:rng.offset,next:rng.word()});assert.deepEqual(value,expected);}
// A fresh frozen settings image and a changed saved profile take native derive
// independently, then returning to the original identity restores its template.
const changed=Object.freeze({...settings,regular_item_drop_chance:0.0001}),black={loot_source_key:'black.slot1',loot_profile_revision:0,loot_profile_json:''},blackOriginal=factory().rules.profileFromDefeat(black,'black.slot1',settings),other=factory().rules.profileFromDefeat(black,'black.slot1',changed);assert.notDeepEqual(other,blackOriginal);assert.deepEqual(factory().rules.profileFromDefeat(black,'black.slot1',settings),blackOriginal);assert.deepEqual(profile(),expected);
times.sort((a,b)=>a-b);const out={candidate,scope:'500 isolated pure native profile lookups using fresh rules factories and exact committed native fixture. Native-body fixture exports only; no SQL/load/capacity measurement.',iterations:times.length,totalMs:times.reduce((a,b)=>a+b,0),p50Ms:times[250],p95Ms:times[475],profileHash:hash(expected),changedProfileHash:hash(other),rollsHash:hash(rolls),rngSeeds:128,settingsProperties:Object.keys(settings).length};
fs.writeFileSync(new URL('../../evidence/loot-pure-r85-cost-'+(candidate?'candidate':'baseline')+'.json',import.meta.url),JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out));
registry.close();
