import fs from 'node:fs';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {GameWriter} from '../working/core511-source/scripts/core511/writer-runtime.mjs';
import {ChannelOwnership} from '../working/core511-source/scripts/core511/ownership.mjs';
const sql=new DatabaseSync(':memory:'),database={sqlite:sql,atomic:async fn=>fn(sql)};
const authority=new ChannelOwnership(database,{realmId:'owner-scan'});
await authority.initialize();
const writer={database,owners:new Map()},presence=Array.from({length:50},(_,i)=>({actor:'online-'+i}));
sql.exec('BEGIN');
for(const {actor}of presence){
 sql.prepare("INSERT INTO kernel511_channel_owners(player_id,channel,epoch,incarnation,state,updated_ms) VALUES(?,1,1,'live','active',0)").run(actor);
 sql.prepare("INSERT INTO kernel511_admissions VALUES(?,1,1,'session',0)").run(actor);
}
sql.exec('COMMIT');
const summary=[];
for(const count of [0,5000,20000]){
 sql.prepare("DELETE FROM kernel511_channel_owners WHERE player_id LIKE 'offline-%'").run();
 if(count)sql.prepare(`WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i+1 FROM n WHERE i<?) INSERT INTO kernel511_channel_owners(player_id,channel,epoch,incarnation,state,updated_ms) SELECT 'offline-'||i,1,2,'old','active',0 FROM n`).run(count);
 const samples=[];
 for(let i=0;i<12;i++){
  const start=performance.now();GameWriter.prototype.refreshOwners.call(writer,presence);samples.push(performance.now()-start);
  for(const {actor}of presence)assert.equal(writer.owners.get(actor)?.admitted,true);
 }
 samples.sort((a,b)=>a-b);summary.push({offline:count,online:50,loaded:writer.owners.size,medianMs:samples[6],maxMs:samples.at(-1)});
}
fs.writeFileSync(new URL('../evidence/owner-scan-'+(process.argv[2]??'baseline')+'.json',import.meta.url),JSON.stringify(summary,null,2));
console.log(JSON.stringify(summary));sql.close();
