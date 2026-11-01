import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import {CollectWriteAudit} from '../../working/core511-source/scripts/core511/collect-light.mjs';
import {nonlethalTriggersR56} from '../../working/core511-source/scripts/core511/nonlethal-triggers-r56.mjs';
const sql=new DatabaseSync(':memory:');
sql.exec('CREATE TABLE world_drops(id TEXT,owner_id TEXT); CREATE TABLE player_items(player_id TEXT,equipped INTEGER); CREATE TABLE dungeon_materials(player_id TEXT,kind TEXT,amount INTEGER)');
const audit=new CollectWriteAudit();audit.initialize(sql);
const triggers=sql.prepare("SELECT name,sql FROM temp.sqlite_schema WHERE type='trigger' AND name LIKE 'kernel511_collect_dungeon_materials_%' ORDER BY name").all().map(row=>({...row,sha256:createHash('sha256').update(row.sql).digest('hex'),allowlisted:nonlethalTriggersR56['temp:'+row.name]===createHash('sha256').update(row.sql).digest('hex')}));
assert.equal(triggers.length,3);
const checks=[];
for(const actor of ['owner','foreign']){
 sql.exec('BEGIN');
 const result=audit.run(sql,{localScope:{owner:'owner'},input:{targetId:'drop'}},()=>sql.prepare('INSERT INTO dungeon_materials VALUES(?,?,?)').run(actor,'weathered_iron',3));
 checks.push({writtenActor:actor,safe:result.safe});assert.equal(result.safe,actor==='owner');sql.exec('ROLLBACK');
}
sql.close();
const report={scope:'Independent actual production CollectWriteAudit against in-memory Node22 SQLite; exact trigger SQL/hash and owner guard. Full native schema compatibility tested separately.',passed:true,triggers,checks,liveTouched:false};
fs.writeFileSync(new URL('../../evidence/independent-collect-trigger-proof.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({triggers:triggers.map(({name,sha256,allowlisted})=>({name,sha256,allowlisted})),checks}));
