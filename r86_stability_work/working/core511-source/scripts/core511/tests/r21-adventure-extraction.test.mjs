import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {adaptDungeonTower,adaptAdventureAggro,adaptAdventureClock} from '../adapt-adventure-generated.mjs';
const core=path.resolve(import.meta.dirname,'..'),hash=bytes=>createHash('sha256').update(bytes).digest('hex');
test('pinned V510 extraction preserves all four shipped solo/group/adventure rule modules byte-for-byte',t=>{
 const out=fs.mkdtempSync(path.join(core,'generated-r21-repro-'));t.after(()=>fs.rmSync(out,{recursive:true,force:true}));
 for(const name of ['dungeon','aggro','world-clock']){
  execFileSync(process.execPath,[path.join(core,'extract-'+name+'.mjs')],{env:{...process.env,COL_CORE511_RULE_OUTPUT:out},stdio:'pipe'});
  const proof=JSON.parse(fs.readFileSync(path.join(out,name+'-proof.json'),'utf8'));
  assert.equal(proof.baselineManifestSha256,'bb3a6cc689c695d97f127a2eefb9ad141b0e655eb39bbebeea5f05704074ad3b');
  for(const item of proof.modules??[{generated:name+'-rules.mjs',generatedSha256:proof.generatedSha256}]){
   const shipped=fs.readFileSync(path.join(core,'generated',item.generated)),rebuilt=fs.readFileSync(path.join(out,item.generated));assert.deepEqual(rebuilt,shipped,item.generated);assert.equal(hash(shipped),item.generatedSha256);
  }
  assert.deepEqual(proof,JSON.parse(fs.readFileSync(path.join(core,'generated',name+'-proof.json'),'utf8')));
 }
});
test('adventure extraction rejects unknown anchors rather than silently dropping hooks',()=>{
 for(const adapt of [adaptDungeonTower,adaptAdventureAggro,adaptAdventureClock])assert.throws(()=>adapt('export const changed=true;'),/anchor drift/);
});
