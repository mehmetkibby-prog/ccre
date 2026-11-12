import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {BASE,hash,seeded} from './helpers.mjs';
import {REST_REGEN_SQL,REST_INPUT_FIELDS,restRegeneration} from '../generated/rest-regeneration-rules.mjs';
const proof=JSON.parse(fs.readFileSync(new URL('../generated/rest-regeneration-proof.json',import.meta.url))),source=fs.readFileSync(path.join(BASE,proof.source),'utf8'),nativeSql=Function(source.replace('export const','const')+'\nreturn REST_REGEN_SQL;')();
test('rest regeneration compiler preserves exact native expressions and simultaneous update fields',()=>{
 assert.equal(hash(source),proof.sourceSha256);for(const row of proof.declarations)assert.equal(hash(source.slice(row.start,row.end)),row.sha256);assert.equal(nativeSql,REST_REGEN_SQL);assert.equal(hash(nativeSql),proof.sqlSha256);assert.equal(hash(fs.readFileSync(new URL('../generated/rest-regeneration-rules.mjs',import.meta.url))),proof.generatedSha256);assert.deepEqual(proof.writes,['last_seen','hp','hp_revision','last_regen_at']);
});
test('Map rest regeneration matches native SQLite on exact boundaries, clock reversal, offline credit, cap and fractional rounding',t=>{
 const sql=new DatabaseSync(':memory:');t.after(()=>sql.close());sql.exec('CREATE TABLE players(id TEXT PRIMARY KEY,'+REST_INPUT_FIELDS.map(k=>k+' INTEGER NOT NULL').join(',')+",respawn_at_ms INTEGER NOT NULL,area TEXT NOT NULL,channel INTEGER NOT NULL,arena_match_id TEXT NOT NULL)");
 const now=1900000000500,base={id:'rest-native',hp:501,max_hp:10000,hp_revision:8,last_seen:Math.floor(now/1000),last_regen_at:now-2000,last_movement_at_ms:now-10000,last_monster_hit_at:now-10000,attack_one_at:0,attack_two_at:0,attack_three_at:0,attack_four_at:0,respawn_at_ms:0,area:'forest',channel:4,arena_match_id:''},keys=Object.keys(base),insert=sql.prepare('INSERT INTO players('+keys.join(',')+') VALUES('+keys.map(()=>'?').join(',')+')'),update=sql.prepare('UPDATE players SET '+keys.filter(k=>k!=='id').map(k=>k+'=?').join(',')+' WHERE id=?'),read=sql.prepare('SELECT * FROM players WHERE id=?'),native=sql.prepare(nativeSql);insert.run(...keys.map(k=>base[k]));let cases=0;
 function compare(p,b){update.run(...keys.filter(k=>k!=='id').map(k=>p[k]),p.id);const memory=restRegeneration(p,b);native.get(...b);assert.deepEqual(memory,{...read.get(p.id)},JSON.stringify({p,b}));cases++;}
 for(const age of [-5000,0,999,1000,1001,4999,5000,5001,86400000])for(const seen of [0,14,15,16,10000])for(const hp of [0,1,501,9999,10000,10001])for(const percent of [0,0.00001,0.3333,2.5,100])compare({...base,hp,last_seen:Math.floor(now/1000)-seen,last_regen_at:now-age},[now,base.id,percent,3,2]);
 for(const field of ['last_movement_at_ms','last_monster_hit_at','attack_one_at','attack_two_at','attack_three_at','attack_four_at'])for(const delta of [-1,0,1])compare({...base,[field]:now-(field==='last_movement_at_ms'?2000:3000)+delta},[now,base.id,2.5,3,2]);
 const random=seeded(823771);for(let n=0;n<2000;n++){const max_hp=1+Math.floor(random()*100000000),hp=Math.floor(random()*max_hp),elapsed=Math.floor(random()*9000),at=n%8===0?0:now,p={...base,max_hp,hp,last_seen:Math.floor(at/1000)-Math.floor(random()*20),last_regen_at:at-elapsed,last_movement_at_ms:at-Math.floor(random()*20000),last_monster_hit_at:at-Math.floor(random()*20000)};compare(p,[at,p.id,random()*100,Math.floor(random()*10),Math.floor(random()*5)]);}
 assert.equal(cases,3368);
});
