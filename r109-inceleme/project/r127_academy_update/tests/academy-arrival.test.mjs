import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {nativeHttpHost} from '../../r109_latency_completion/working/core511-source/scripts/core511/tests/native-http-host-fixture.mjs';
import {currentRealmFixture} from '../../r109_latency_completion/tests/current-realm-fixture.mjs';
import {put} from '../../r109_latency_completion/working/core511-source/scripts/core511/tests/pvp-fixture.mjs';
import {nativeTokenHash} from '../../r109_latency_completion/working/core511-source/scripts/core511/entry-writer.mjs';
import {PROTOCOL} from '../../r109_latency_completion/working/core511-source/scripts/core511/contract.mjs';

test('50 concurrent authenticated public character requests reach the R2 game host on its four configured channels',{timeout:90000},async t=>{
 assert.equal(process.env.CORE101_REALM_ID,'r2');
 const actors=[];
 const s=await nativeHttpHost(t,{realmId:'r2',realmSetup:async(host,seed)=>{
  await currentRealmFixture(t,host).prepare();
  const db=host.database.sqlite,base=db.prepare('SELECT * FROM players WHERE id=?').get(seed.id);
  const original=db.prepare('SELECT * FROM auth_sessions WHERE account_id=?').get(seed.account.id);
  db.exec('DELETE FROM game_presence;UPDATE players SET last_seen=0;UPDATE game_settings SET channel_capacity=10');
  // Local fixture accounts model already enrolled characters after the public opening.
  for(let i=0;i<50;i++){
   const account=i?{...seed.account,id:randomUUID(),username:'Academy'+i,username_normalized:'academy'+i,email:'academy'+i+'@fixture.invalid',email_normalized:'academy'+i+'@fixture.invalid'}:seed.account;
   const token=i?'academy_'+randomUUID():seed.token,instance=randomUUID(),channel=1+i%4,id=i?randomUUID():seed.id;
   if(i){
    put(db,'accounts',account);put(db,'players',{...base,id,account_id:account.id,channel,name:'Academy'+i,last_seen:0,area:'bazaar'});
    put(db,'auth_sessions',{...original,account_id:account.id,token_hash:nativeTokenHash(token),expires_at:Math.floor(Date.now()/1000)+3600});
   }
   put(db,'game_presence',{account_id:account.id,token_hash:nativeTokenHash(token),instance_id:instance,expires_at_ms:Date.now()+120000,chat_after_id:0});
   actors.push({id,account,channel,token,instance,ip:'198.51.100.'+(i+1)});
  }
 }});
 await s.host.database.atomic(()=>{for(const a of actors)globalThis.__colLaunch.grant(a.account.id,true);});
 const request=async a=>{
  const payload={protocol:PROTOCOL,channel:a.channel};
  const response=await s.core.http(s.f.request({path:'/api/realtime/core511-character',headers:{
    Cookie:'__Host-yasam-session='+a.token+'; __Host-yasam-csrf='+s.f.csrf,'X-Game-Instance':a.instance,'X-Real-IP':a.ip},body:payload}));
  return {status:response.status,...await response.json()};
 };
 const batch=await Promise.all(actors.map(request));
 const stats={};for(const result of batch){const key=result.code??String(result.status);stats[key]=(stats[key]??0)+1;}
 t.diagnostic(JSON.stringify(stats));assert.equal(batch.filter(x=>x.status===200).length,40,JSON.stringify(stats)+JSON.stringify(batch.find(x=>x.status!==200)));
 assert.equal(batch.filter(x=>x.code==='channel_full').length,10);
 for(let channel=1;channel<=4;channel++)assert.equal(s.f.sql.prepare('SELECT COUNT(*) n FROM kernel511_admissions WHERE channel=?').get(channel).n,10);
 assert.equal(s.faults.length,0);
});
