import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
const core=process.env.STUTTER_TREE+'/core511-source/scripts/core511/';
const {setupPvp,put}=await import(core+'tests/pvp-fixture.mjs');
const {GameWriter}=await import(core+'writer-runtime.mjs');
const {createTowerSchema}=await import(core+'tower-config.mjs');
const {createAdventureSchema}=await import(core+'adventure-schema.mjs');
const {decodeCommittedActorR113}=await import(core+'committed-codec-r113.mjs');
const close=[];
try{
 const f=await setupPvp({after:fn=>close.push(fn)});f.reset({area:'forest'});
 const {sql,id}=f;createTowerSchema(sql);createAdventureSchema(sql);
 const writer=new GameWriter(f.f.database,{realmId:'r1',ports:{guard:()=>true}});await writer.initialize();
 const peer={channel:1,incarnation:'r127-perf-test'};
 await writer.register(peer);const owner=await writer.admit(id,peer,{sessionId:'benchmark-session',guard:()=>true});
 const context={actor:id,peer,epoch:owner.epoch,sequence:1,key:'bench'};
 sql.prepare('DELETE FROM player_items WHERE player_id=?').run(id);
 const sizes=[[30,15],[35,60]],results=[];
 for(const [bag,storage] of sizes){
  sql.prepare('DELETE FROM player_items WHERE player_id=?').run(id);
  sql.prepare('DELETE FROM player_storage_items WHERE player_id=?').run(id);
  sql.exec('BEGIN');
  const item=(n)=>({id:'item-'+n,player_id:id,kind:n%2?'armor':'weapon',item_name:'Kraliyet Kılıcı '+n,rarity:n%4?'red':'emerald',power:10+n,role:'avci',enchantments:JSON.stringify([{stat:'pve',value:n%19},{stat:'hp',value:n%31}]),created_at:Math.floor(n/3)});
  for(let n=0;n<bag;n++)put(sql,'player_items',{...item(n),equipped:n<2?1:0});
  for(let n=0;n<storage;n++)put(sql,'player_storage_items',{...item(n),id:'storage-'+n,slot:n+1});
  sql.exec('COMMIT');
  const durations=[];let inspected,encodedBytes;
  for(let n=0;n<130;n++){
   context.key='bench-'+bag+'-'+n;
   const value=await f.f.database.atomic(()=>{
    sql.prepare("UPDATE player_items SET enchantments=? WHERE id='item-0'").run('[{"stat":"kills","value":'+n+'}]');
    const result={players:[sql.prepare('SELECT * FROM players WHERE id=?').get(id)],result:{status:200,body:{ok:true}},sharedRefresh:{version:1,actors:[id],tables:['players','player_items'],all:false}};
    const start=performance.now();
    const captured=writer.committedR113.capture(sql,'attack',{},context,result);
    if(n>=10)durations.push(performance.now()-start);
    return captured;
   });
   const part=value.committedR113.actors[0];inspected=decodeCommittedActorR113(part);encodedBytes=Buffer.byteLength(part.image);
   assert.equal(inspected.sections.inventory.length,bag);assert.equal(inspected.sections.storageItems.length,storage);
   assert.deepEqual(JSON.parse(inspected.sections.inventory.find(it=>it.id==='item-0').enchantments),[{stat:'kills',value:n}]);
  }
  durations.sort((a,b)=>a-b);
  results.push({kind:'complete',bag,storage,operations:durations.length,meanMs:durations.reduce((a,b)=>a+b)/durations.length,medianMs:durations[60],p95Ms:durations[113],encodedBytes});
  for(const action of ['use_potion','collect']){
   const times=[];let bytes,version;
   for(let i=0;i<130;i++){
    context.key='native-'+bag+'-'+action+'-'+i;
    const payload={input:{action,targetId:'ground-'+i},...(action==='collect'?{localScope:{kind:'collect',owner:id}}:{})};
    const captured=await f.f.database.atomic(()=>{
     sql.prepare('UPDATE players SET hp=?,potions=? WHERE id=?').run(70+i%12,7-i%3,id);
     const row=sql.prepare('SELECT * FROM players WHERE id=?').get(id);
     const result={players:[row],encounters:[[id,null]],result:{status:200,body:{ok:true}},sharedRefresh:{version:1,actors:[id],tables:action==='collect'?['players','world_drops']:['players'],all:false},
       ...(action==='collect'?{collectLight:{version:1,actor:id,target:payload.input.targetId,inventory:null}}:{})};
     const start=performance.now(),value=writer.committedR113.capture(sql,'native_action',payload,context,result);
     if(i>=10)times.push(performance.now()-start);
     return value;
    });
    const proof=captured.committedR113;version=proof.version;bytes=Buffer.byteLength(JSON.stringify(proof));
    const revision=sql.prepare('SELECT revision FROM kernel511_actor_revision_r113 WHERE actor=?').get(id).revision;
    if(version===3){assert.equal(proof.id,id);assert.equal(proof.next,revision);assert.equal(proof.action,action);}
    else {const full=decodeCommittedActorR113(proof.actors[0]);assert.equal(full.next,revision);assert.equal(full.bundle.player.hp,70+i%12);}
   }
   times.sort((a,b)=>a-b);
   results.push({kind:action,bag,storage,operations:times.length,medianMs:times[60],p95Ms:times[113],encodedBytes:bytes,version});
  }
 }
 console.log(JSON.stringify({results}));
}finally{for(const fn of close.reverse())await fn();}
