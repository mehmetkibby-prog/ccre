import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {temporary,until} from './helpers.mjs';
import {systemFixture} from './system-writer-fixture.mjs';
import {OrderedSystemClient} from '../system-writer.mjs';
import {CombatCheckpoints} from '../combat-checkpoint.mjs';
const peer={realm:'system-native',channel:0,role:'world',incarnation:'world-boot'};
async function fixture(t){const dir=temporary(t),file=path.join(dir,'system.sqlite'),f=await systemFixture(file);t.after(()=>f.db.close());const owner=await f.writer.register(peer);return {...f,dir,file,owner};}
const requestFor=(f,patch={hp:90,last_regen_at_ms:100000})=>{const base={...f.db.sqlite.prepare("SELECT * FROM monsters WHERE id='shared'").get()};return {epoch:f.owner.epoch,sequence:1,key:'world-regeneration',kind:'combat_checkpoint',payload:{monsters:[{base,current:{...base,...patch}}],participants:[],bossParticipants:[],combatEvents:[]}};};

test('empty world uses an explicit durable process sequence with no player admission; stale owners and altered replays are fenced',async t=>{
 const f=await fixture(t),request=requestFor(f),ack=await f.writer.command(peer,request);assert.equal(ack.result.saved.monsters[0].current.hp,90);
 assert.deepEqual(await f.writer.command(peer,request),ack);assert.equal(f.writer.owner('world').sequence,1);
 await assert.rejects(f.writer.command(peer,{...request,payload:{...request.payload,combatEvents:[{}]}}),/system_key_reused/);
 await assert.rejects(f.writer.command({...peer,realm:'other'},request),/system_realm_fenced/);
 await assert.rejects(f.writer.register({...peer,incarnation:'world-new'}),/system_process_still_live/);
 await f.writer.disconnect(peer);const owner=await f.writer.register({...peer,incarnation:'world-new'});assert.equal(owner.epoch,2);
 await assert.rejects(f.writer.command(peer,request),/system_epoch_fenced/);assert.equal(f.db.sqlite.prepare('SELECT COUNT(*) n FROM kernel511_admissions').get().n,0);
 assert.equal(f.db.sqlite.prepare('SELECT COUNT(*) n FROM kernel511_system_receipts').get().n,1);
});
test('system fsync ACK precedes the next checkpoint and never overwrites newer resident damage',async t=>{
 const f=await fixture(t),client=new OrderedSystemClient({owner:f.owner,request:r=>f.writer.command(peer,r)}),journal=new CombatCheckpoints({submit:e=>client.submit(e)}),base={...f.db.sqlite.prepare("SELECT * FROM monsters WHERE id='shared'").get()};journal.hydrate('monsters',[base]);journal.changed({monsters:[{...base,hp:80}]});
 const durable=f.db.durableAfterCommit.bind(f.db);let release;const hold=new Promise(r=>release=r);f.db.durableAfterCommit=()=>Promise.resolve(durable()).then(()=>hold);
 const pending=journal.flush();await until(()=>f.db.sqlite.prepare("SELECT hp FROM monsters WHERE id='shared'").get().hp===80);journal.changed({monsters:[{...base,hp:70}]});assert.equal(client.sequence,0);release();await pending;f.db.durableAfterCommit=durable;
 assert.equal(journal.snapshot().monsters[0].current.hp,70);await journal.drain();assert.equal(client.sequence,2);assert.equal(f.db.sqlite.prepare("SELECT hp FROM monsters WHERE id='shared'").get().hp,70);
});
test('fourth-channel system lane cannot write shared monsters and follows channel death fencing',async t=>{
 const f=await fixture(t),channel={realm:peer.realm,channel:4,incarnation:'channel4'};await f.authority.registerProcess(4,channel.incarnation);const owner=await f.writer.register(channel),request=requestFor(f);request.epoch=owner.epoch;
 await assert.rejects(f.writer.command(channel,request),/combat_checkpoint_owner_fenced/);assert.equal(f.writer.owner('channel:4').sequence,0);
 const base={...f.db.sqlite.prepare("SELECT * FROM monsters WHERE id='local'").get()};request.payload.monsters=[{base,current:{...base,hp:90}}];await f.writer.command(channel,request);
 await f.authority.disconnectProcess(4,channel.incarnation);await assert.rejects(f.writer.command(channel,request),/channel_process_fenced/);
 assert.equal(f.db.sqlite.prepare("SELECT hp FROM monsters WHERE id='shared'").get().hp,50);
});
test('actual pre/post COMMIT SIGKILL leaves native monster checkpoint and system receipt atomic',async t=>{
 const f=await fixture(t),request=requestFor(f),input=path.join(f.dir,'request.json');fs.writeFileSync(input,JSON.stringify({peer,request}));f.db.sqlite.exec('PRAGMA wal_checkpoint(TRUNCATE)');
 for(const phase of ['before','after']){
  const file=path.join(f.dir,phase+'.sqlite'),marker=path.join(f.dir,phase+'.marker');fs.copyFileSync(f.file,file);
  const child=spawn(process.execPath,[path.join(import.meta.dirname,'system-writer-crash.mjs'),file,input,phase,marker],{stdio:['ignore','ignore','pipe']});let stderr='';child.stderr.on('data',b=>stderr+=b);const [code,signal]=await once(child,'exit');assert.equal(code,null,stderr);assert.equal(signal,'SIGKILL',stderr);assert.equal(fs.readFileSync(marker,'utf8'),phase==='before'?'uncommitted_monster':'durable_monster_before_ack');
  const s=await systemFixture(file,{initialize:false});try{
   assert.equal(s.db.sqlite.prepare("SELECT hp FROM monsters WHERE id='shared'").get().hp,phase==='before'?50:90);assert.equal(s.db.sqlite.prepare('SELECT COUNT(*) n FROM kernel511_system_receipts').get().n,phase==='before'?0:1);
   await s.writer.command(peer,request);await s.writer.command(peer,request);assert.equal(s.db.sqlite.prepare("SELECT hp FROM monsters WHERE id='shared'").get().hp,90);assert.equal(s.db.sqlite.prepare('SELECT COUNT(*) n FROM kernel511_system_receipts').get().n,1);
  }finally{s.db.close();}
 }
});
