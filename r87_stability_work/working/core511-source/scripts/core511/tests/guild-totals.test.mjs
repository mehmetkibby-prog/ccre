import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import {BASE,manifest,hash,seeded} from './helpers.mjs';
import {installGuildTotals,GUILD_CONTRIBUTIONS_SQL} from '../guild-totals.mjs';
// The original query is read from the pinned compiled main server, not a
// hand-written expected sum. This test covers the projection, not guild rules.
const name='dist-vds/server/index.js',source=fs.readFileSync(path.join(BASE,name),'utf8');assert.equal(hash(source),manifest.files.find(r=>r.path===name).sha256);
const start=source.indexOf('`WITH totals AS (',source.indexOf('async function guildSnapshot(')),end=source.indexOf('`).bind(includeContributions',start);
assert(start>0&&end>start);const oldSql=source.slice(start+1,end).replace("${feature510('mainSql')?'guild_ledger_contributions510':'guild_ledger_history'}",'guild_ledger_contributions510');
test('guild projection matches exact V510 WITH query across tax, leave/rejoin, updates, deletion and rollback',()=>{
 const db=new DatabaseSync(':memory:');
 try{
  db.exec(`CREATE TABLE players(id TEXT PRIMARY KEY,name TEXT);CREATE TABLE guild_members(player_id TEXT PRIMARY KEY,guild_id TEXT);CREATE TABLE guild_ledger(id INTEGER PRIMARY KEY,guild_id TEXT,player_id TEXT,kind TEXT,amount INTEGER);
   CREATE INDEX guild_ledger_contributions510 ON guild_ledger(guild_id,player_id,amount) WHERE kind='tax';
   INSERT INTO players VALUES('p1','Ada'),('p2','Bora'),('p3','Cem');INSERT INTO guild_members VALUES('p1','g1'),('p2','g1'),('p3','g2');`);
  const insert=db.prepare('INSERT INTO guild_ledger VALUES(?,?,?,?,?)'),random=seeded(19);
  for(let id=1;id<=1000;id++)insert.run(id,id%2?'g1':'g2',id%7===0?null:'p'+(id%4+1),id%5?'tax':'withdraw',Math.floor(random()*100));
  assert.throws(()=>installGuildTotals(db,{maintenance:true,players:1,durableDrained:true}),/quiescence/);
  installGuildTotals(db,{maintenance:true,players:0,durableDrained:true});
  const old=db.prepare(oldSql),fast=db.prepare(GUILD_CONTRIBUTIONS_SQL);
  const check=()=>{for(const guild of ['g1','g2',''])assert.deepEqual(fast.all(guild,guild),old.all(guild,guild));};check();
  db.exec("DELETE FROM guild_members WHERE player_id='p1';INSERT INTO guild_members VALUES('p1','g2')");check();
  db.exec("UPDATE guild_ledger SET amount=amount+3,player_id='p1',guild_id='g2' WHERE id<100;UPDATE guild_ledger SET kind='tax' WHERE id=100;DELETE FROM guild_ledger WHERE id>950");check();
  db.exec('BEGIN IMMEDIATE');insert.run(2000,'g1','p2','tax',123);check();db.exec('ROLLBACK');check();
  db.exec("DELETE FROM guild_ledger WHERE guild_id='g2'");check();
  installGuildTotals(db,{maintenance:true,players:0,durableDrained:true});check();
 }finally{db.close();}
});
