import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {EncounterCheckpoints,EncounterChanges,writeEncounterCheckpoint,ENCOUNTER_FIELDS} from '../encounter-checkpoint.mjs';
const row=(sequence=8,time=100,monster='m')=>({player_id:'p',monster_id:monster,spawn_round:1,next_hit_at_ms:time+100,expires_at_ms:time+8000,hit_sequence:sequence,updated_at_ms:time,last_skill_at_ms:time,attackers489:JSON.stringify({[monster]:{monster_id:monster,spawn_round:1,next_hit_at_ms:time+100,last_skill_at_ms:time}})});
function fixture(t){const db=new DatabaseSync(':memory:');t.after(()=>db.close());db.exec('CREATE TABLE players(id TEXT PRIMARY KEY,area TEXT,channel INTEGER,hp INTEGER); INSERT INTO players VALUES(\'p\',\'forest\',4,100); CREATE TABLE monsters(id TEXT PRIMARY KEY,area TEXT,channel INTEGER); INSERT INTO monsters VALUES(\'m\',\'forest\',4),(\'n\',\'forest\',4); CREATE TABLE pve_engagements('+ENCOUNTER_FIELDS.map(k=>k+' '+(['player_id','monster_id','attackers489'].includes(k)?'TEXT':'INTEGER')+(k==='player_id'?' PRIMARY KEY':'')).join(',')+');');const base=row();db.prepare('INSERT INTO pve_engagements VALUES('+ENCOUNTER_FIELDS.map(()=>'?').join(',')+')').run(...ENCOUNTER_FIELDS.map(k=>base[k]));return {db,base};}
test('a real clear/rearm journal permits a new counter, but missing/invalid lifecycle and stale bases still fail',t=>{
 const {db,base}=fixture(t),current=row(1,201,'n'),transitions=[{before:row(9,150),after:null},{before:null,after:row(0,200,'n')}];
 for(const payload of [{base,current},{base,current,transitions:[transitions[1]]},{base,current,transitions:[{before:row(7,150),after:null},transitions[1]]},{base,current,transitions:[transitions[0],{before:null,after:row(3,200,'n')}]},{base,current:row(0,199,'n'),transitions}])assert.throws(()=>writeEncounterCheckpoint(db,payload,{actor:'p'}),/encounter_(revision_regression|restart_invalid)/);
 assert.throws(()=>writeEncounterCheckpoint(db,{base:{...base,hit_sequence:7},current,transitions},{actor:'p'}),/encounter_snapshot_conflict/);
 assert.throws(()=>writeEncounterCheckpoint(db,{base,current,transitions:[{before:{...base,player_id:'other'},after:null},transitions[1]]},{actor:'p'}),/encounter_columns/);
 assert.deepEqual(writeEncounterCheckpoint(db,{base,current,transitions},{actor:'p'}),current);
 assert.throws(()=>writeEncounterCheckpoint(db,{base,current,transitions},{actor:'p'}),/encounter_snapshot_conflict/);
});
test('an ACK for an earlier clear keeps a later rearm pending; hydration/forget remove old journals',()=>{
 let live=row();const journal=new EncounterCheckpoints(()=>live);journal.hydrate('p',live);
 const change=next=>{journal.observe('p',live,next);live=next;};change(null);const clear=journal.snapshot('p');change(row(0,200,'n'));
 journal.acknowledged('p',clear,null);const restart=journal.snapshot('p');assert.equal(restart.base,null);assert.equal(restart.transitions.length,1);assert.equal(restart.transitions[0].before,null);
 journal.acknowledged('p',restart,live);assert.equal(journal.changed('p'),false);change(null);change(row(0,300));journal.hydrate('p',live);assert.equal(journal.changed('p'),false);journal.forget('p');assert.equal(journal.transitions.size,0);
});
test('private operation overlays preserve clear/rearm order and recycled storage cannot change published plans',()=>{
 const base=row(),changes=new EncounterChanges(()=>base);changes.set('p',row(9,150));changes.set('p',null);changes.set('p',row(0,200,'n'));changes.set('p',row(1,201,'n'));const plan=changes.snapshot();changes.clear();
 assert.deepEqual(plan.map(([,v])=>v?.hit_sequence??null),[9,null,0,1]);assert.equal(changes.size,0);assert.deepEqual(changes.snapshot(),[]);
 let live=base;const journal=new EncounterCheckpoints(()=>live);journal.hydrate('p',base);for(const [id,next]of plan){journal.observe(id,live,next);live=next;}
 assert.equal(journal.snapshot('p').transitions.length,2);
});
