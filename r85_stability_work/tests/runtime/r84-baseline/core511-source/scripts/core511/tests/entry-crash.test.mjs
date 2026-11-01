import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {setupEntry} from './entry-fixture.mjs';
import {native,temporary} from './helpers.mjs';
import {ChannelOwnership} from '../ownership.mjs';
import {NativeGameServices} from '../game-services.mjs';
import {EntryWriter} from '../entry-writer.mjs';

test('new character, normalized name, weapon, starter ledger and admission survive actual SIGKILL on both COMMIT sides',async t=>{
 const s=await setupEntry(t,{fresh:true}),dir=temporary(t),now=s.clock(),peer={channel:4,incarnation:'entry-crash4'},authority=new ChannelOwnership(s.f.database,{realmId:'entry-crash',now:s.clock});await authority.initialize();await authority.registerProcess(4,peer.incarnation);
 s.sql.prepare('UPDATE launch_settings SET registration_at=0,opens_at=? WHERE id=1').run(now+86400000);
 const session=await s.auth.session(s.request()),options={session,channel:4,payload:{name:'YeniKahraman',role:'avci'},nowMs:now,seed:'5'.repeat(64)},input=path.join(dir,'input.json');fs.writeFileSync(input,JSON.stringify({options,peer}));s.sql.exec('PRAGMA wal_checkpoint(TRUNCATE)');
 const {LocalDatabase}=await native('vds-server/src/database.mjs');
 for(const phase of ['before','after']){
  const file=path.join(dir,phase+'.sqlite'),marker=path.join(dir,phase+'.marker');fs.copyFileSync(s.f.file,file);
  const child=spawn(process.execPath,[path.join(import.meta.dirname,'entry-crash-fixture.mjs'),file,input,phase,marker],{stdio:['ignore','ignore','pipe']});let stderr='';child.stderr.on('data',b=>stderr+=b);const [code,signal]=await once(child,'exit');assert.equal(signal,'SIGKILL',stderr);assert.equal(code,null);assert.equal(fs.readFileSync(marker,'utf8'),phase==='before'?'uncommitted_character':'durable_character_before_ack');
  const db=new LocalDatabase(file,{groupWrites:true,asyncDurable:true});try{
   const count=()=>db.sqlite.prepare('SELECT COUNT(*) n FROM players WHERE account_id=?').get(session.account.id).n;
   assert.equal(count(),phase==='after'?1:0,'inspect durable character BEFORE recovery');assert.equal(db.sqlite.prepare('SELECT COUNT(*) n FROM prereg_rewards WHERE account_id=?').get(session.account.id).n,phase==='after'?1:0);
   assert.equal(db.sqlite.prepare('SELECT COUNT(*) n FROM kernel511_admissions WHERE session_id=?').get(session.tokenHash).n,phase==='after'?1:0);
   const resumed=new ChannelOwnership(db,{realmId:'entry-crash',now:()=>now});
   if(phase==='before'){const services=new NativeGameServices(db.sqlite,{clock:()=>now}),entry=new EntryWriter({database:db,services,clock:()=>now});await db.atomic(sql=>{const created=entry.create(sql,options);assert.equal(created.accepted,true);return resumed.admitIn(sql,created.session.player.id,peer,{sessionId:session.tokenHash,guard:()=>true});});}
   const player=db.sqlite.prepare('SELECT id FROM players WHERE account_id=?').get(session.account.id),capture=()=>JSON.stringify(['players','player_items','character_names','prereg_rewards','kernel511_admissions'].map(table=>db.sqlite.prepare('SELECT * FROM '+table+' ORDER BY 1').all()));
   const committed=capture(),owner=resumed.owner(player.id);await resumed.admit(player.id,peer,{sessionId:session.tokenHash,guard:()=>true,prepare:()=>assert.fail('creation replay reran reward')});assert.equal(capture(),committed);assert.equal(count(),1);assert.equal(resumed.owner(player.id).epoch,owner.epoch);assert.equal(db.sqlite.prepare('SELECT COUNT(*) n FROM prereg_rewards WHERE account_id=?').get(session.account.id).n,1);
  }finally{db.close();}
 }
});
