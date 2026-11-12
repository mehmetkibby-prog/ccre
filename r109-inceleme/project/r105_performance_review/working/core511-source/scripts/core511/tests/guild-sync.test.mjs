import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {BASE,hash,native,until,temporary} from './helpers.mjs';
import {ReadWorker} from '../read-worker.mjs';
import {GuildSyncReader} from '../guild-sync-reader.mjs';
import {DurableGuildState,readGuildRevision} from '../guild-state.mjs';
const {createGuildSkill}=await native('vds-server/src/guild-skill.mjs');
function tinyDatabase(t,file=':memory:'){
 const sqlite=new DatabaseSync(file);t.after(()=>sqlite.close());sqlite.exec("CREATE TABLE guild_members(player_id TEXT PRIMARY KEY,guild_id TEXT);CREATE TABLE guild_skills(guild_id TEXT PRIMARY KEY,active_level INTEGER,active_until INTEGER);INSERT INTO guild_skills VALUES('g1',1,100000),('g2',2,50000);INSERT INTO guild_members VALUES('p1','g1'),('p2','g1'),('p3','g2');");
 const database={sqlite,afterCommit:()=>Promise.resolve(),atomic:async function(fn){sqlite.exec('BEGIN');let value;try{value=fn(sqlite);sqlite.exec('COMMIT');}catch(error){sqlite.exec('ROLLBACK');throw error;}await this.afterCommit();return value;}};return database;
}
test('guild synchronization closure and cooperative yields preserve exact native source',()=>{const proof=JSON.parse(fs.readFileSync(new URL('../generated/guild-sync-proof.json',import.meta.url))),source=fs.readFileSync(path.join(BASE,proof.source),'utf8');assert.equal(hash(source),proof.sourceSha256);assert.equal(hash(fs.readFileSync(new URL('../generated/guild-sync-rules.mjs',import.meta.url))),proof.generatedSha256);for(const p of proof.slices)assert.equal(hash(source.slice(p.start,p.end)),p.sha256);});
test('read-worker replacement rejects a lost guild cursor and a fresh owner scans every native member again',async t=>{
 const file=path.join(temporary(t),'guild-read.sqlite'),database=tinyDatabase(t,file),feed=new DurableGuildState(database);await feed.initialize();const reader=new ReadWorker(file,new Map(),{actorBundles:true});t.after(()=>reader.close());
 const request={incarnation:'guild-process-before',token:'guild-scan-before',sequence:0,start:true,nowMs:60000,durableRevision:feed.current},first=(await reader.query('kernel511_guild_step',request)).rows;assert.equal(first.actor,'p1');await reader.worker.terminate();
 await assert.rejects(reader.query('kernel511_guild_step',{...request,start:false,sequence:first.sequence}),/guild_sync_new_owner/);
 const fresh={...request,incarnation:'guild-process-after',token:'guild-scan-after'},actors=[];while(true){const frame=(await reader.query('kernel511_guild_step',fresh)).rows;fresh.start=false;fresh.sequence=frame.sequence;if(frame.done)break;if(frame.actor)actors.push(frame.actor);}
 assert.deepEqual(actors,['p1','p2','p3']);assert.equal(reader.starts,2);assert.equal(database.sqlite.prepare('SELECT COUNT(*) n FROM guild_members').get().n,3);
});
test('guild reader repairs exactly the original owners across expiry, leave, reactivation and changes between yielded owner acknowledgements',async t=>{
 const original=tinyDatabase(t),candidate=tinyDatabase(t),feed=new DurableGuildState(candidate);await feed.initialize();let now=50000,oracleTrace=[],candidateTrace=[],oracleMutation=null,candidateMutation=null;
 const oracle=createGuildSkill(original.sqlite,{now:()=>now,refreshHp:id=>{oracleTrace.push({id,hp:oracle.bonuses(id).hp});oracleMutation?.(id);}});oracle.observeCommits();const reader=new GuildSyncReader(candidate.sqlite),projection=createGuildSkill(candidate.sqlite,{now:()=>now});let serial=0;
 const mutate=async sql=>{original.sqlite.exec(sql);oracle.committed([{table:'guild_members'}]);await candidate.atomic(db=>db.exec(sql));};
 async function compare(){oracleTrace=[];candidateTrace=[];await oracle.syncInBackground();const token='guild-sync-token-'+(++serial);let sequence=0,start=true;while(true){const frame=reader.step({incarnation:'guild-reader-owner-1',token,sequence,start,nowMs:now,durableRevision:feed.current});assert.equal(frame.ahead,undefined);sequence=frame.sequence;start=false;if(frame.done)break;if(frame.actor){candidateTrace.push({id:frame.actor,hp:projection.bonuses(frame.actor).hp});await candidateMutation?.(frame.actor);}}assert.deepEqual(candidateTrace,oracleTrace);return candidateTrace;}
 assert.equal((await compare()).length,3);now=50001;assert.deepEqual(await compare(),[]);
 now=60000;await mutate("DELETE FROM guild_members WHERE player_id='p2'");assert.deepEqual((await compare()).map(r=>r.id),['p2']);
 now=100000;assert.deepEqual((await compare()).map(r=>r.id),['p1']);
 await mutate("INSERT INTO guild_members VALUES('p2','g1');UPDATE guild_skills SET active_level=2,active_until=150000 WHERE guild_id='g1'");assert.deepEqual((await compare()).map(r=>r.id),['p1','p2']);
 await mutate("UPDATE guild_skills SET active_level=1,active_until=170000 WHERE guild_id='g1'");
 oracleMutation=id=>{if(id==='p1'){original.sqlite.exec("UPDATE guild_skills SET active_level=3 WHERE guild_id='g1'");oracle.committed([{table:'guild_skills'}]);oracleMutation=null;}};
 candidateMutation=async id=>{if(id==='p1'){await candidate.atomic(db=>db.exec("UPDATE guild_skills SET active_level=3 WHERE guild_id='g1'"));candidateMutation=null;}};
 assert.deepEqual((await compare()).map(r=>r.id),['p1','p2']);assert.deepEqual((await compare()).map(r=>r.id),['p1'],'mid-scan revision is not marked reconciled before the next scan');
 now=170000;assert.deepEqual((await compare()).map(r=>r.id),['p1','p2']);now=160000;assert.deepEqual((await compare()).map(r=>r.id),['p1','p2'],'backwards clock re-evaluates native bonuses');
});
test('guild versions survive rollback/no-op and a reader step never consumes an image ahead of durable acknowledgement',async t=>{
 const database=tinyDatabase(t),feed=new DurableGuildState(database);await feed.initialize();const initial=feed.current;
 await assert.rejects(database.atomic(sql=>{sql.exec("UPDATE guild_skills SET active_level=2 WHERE guild_id='g1'");throw Error('guild-rollback');}),/guild-rollback/);assert.equal(readGuildRevision(database.sqlite),initial);await database.atomic(sql=>sql.exec('UPDATE guild_skills SET active_level=active_level'));assert.equal(feed.current,initial);
 let release;const wait=new Promise(r=>release=r);database.afterCommit=()=>wait;const task=database.atomic(sql=>{sql.exec("UPDATE guild_skills SET active_level=2 WHERE guild_id='g1'");assert.equal(sql.prepare('SELECT changes() n').get().n,1);});await until(()=>readGuildRevision(database.sqlite)>initial);
 const reader=new GuildSyncReader(database.sqlite),request={incarnation:'guild-reader-owner-1',token:'guild-transaction-token',sequence:0,start:true,nowMs:60000,durableRevision:feed.current};const frame=reader.step(request);assert.equal(frame.ahead,initial+1);assert.equal(frame.sequence,0);assert.equal(feed.current,initial);release();await task;
 const next=reader.step({...request,durableRevision:feed.current});assert.equal(next.sequence,1);assert.equal(next.actor,'p1');assert.throws(()=>reader.step({...request,start:false,durableRevision:feed.current}),/guild_sync_step_fenced/);
 const replacement=reader.step({...request,incarnation:'guild-reader-owner-2',token:'guild-new-owner-token',durableRevision:feed.current});assert.equal(replacement.actor,'p1','new OS owner replays reconciliation from a fresh native cache');
});
