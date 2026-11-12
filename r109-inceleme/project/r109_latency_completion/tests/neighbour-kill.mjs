import {fileURLToPath as reviewFilePath} from 'node:url';
const reviewWorkspace=reviewFilePath(new URL('../../',import.meta.url));
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import {randomUUID,createHash} from 'node:crypto';
const root=(reviewWorkspace+'r105_performance_review'),tree=process.env.STUTTER_TREE||root+'/working',c=tree+'/core511-source/scripts/core511';
const {nativeHttpHost}=await import(c+'/tests/native-http-host-fixture.mjs');
const {put}=await import(c+'/tests/pvp-fixture.mjs');
const {until}=await import(c+'/tests/helpers.mjs');
const {currentRealmFixture}=await import('./current-realm-fixture.mjs');
const {createTowerSchema,TOWER_DEFAULTS}=await import(c+'/tower-config.mjs');
const {Core511Transport,CLIENT_PROTOCOL}=await import((process.env.CLIENT_TREE?process.env.CLIENT_TREE+'/core511-source/scripts/core511':c)+'/client-transport.mjs');
const {ProcessStream}=await import(c+'/process-stream.mjs');
const {WebSocket}=await import('/tmp/core511-build-deps/node_modules/ws/wrapper.mjs');
const hash=x=>createHash('sha256').update(x).digest('base64url');
const actors=[],events=[];
const note=(...v)=>console.log(...v);
test('killing a neighbouring tower mob must preserve damage already accepted on a living mob',{timeout:60000},async t=>{
 const s=await nativeHttpHost(t,{realmId:process.env.CORE101_REALM_ID||'r1',realmSetup:async(host,seed)=>{
  const realm=currentRealmFixture(t,host);await realm.prepare();
  const original=globalThis.fetch;t.after(()=>{globalThis.fetch=original;});
  globalThis.fetch=(url,opt)=>opt?.headers?.['x-col-service-path']==='/internal/launch/status'?Promise.resolve(Response.json({phase:'normal',showLanding:false,canPlay:true,registrationOpen:true,serverTime:Date.now()})):original(url,opt);
  const q=host.database.sqlite;createTowerSchema(q);const cfg=structuredClone(TOWER_DEFAULTS);cfg.minLevel=1;
  for(const [i,floor] of cfg.floors.entries()){floor.waves=1;floor.spawns=[{...floor.spawns[0],kind:i===9?'azrail':'guard',count:1,hp:1,damage:0,xp:0,drops:[]},{...floor.spawns[0],kind:'acolyte',count:1,hp:85,damage:0,xp:0,drops:[]}];}
  q.prepare('UPDATE kadim_tower_settings SET value=?').run(JSON.stringify(cfg));
  q.prepare("UPDATE players SET area='bazaar',channel=1,x=2070,y=430,level=65,hp=100000,max_hp=100000,last_seen=? WHERE id=?").run(Math.floor(Date.now()/1000),seed.id);
  const player=q.prepare('SELECT * FROM players WHERE id=?').get(seed.id),session=q.prepare('SELECT * FROM auth_sessions WHERE account_id=?').get(seed.account.id);
  for(let i=0;i<3;i++){
   const actor={id:i?randomUUID():seed.id,account:i?{...seed.account,id:randomUUID(),username:'Kule'+i,username_normalized:'kule'+i,email:'kule'+i+'@fixture.invalid',email_normalized:'kule'+i+'@fixture.invalid'}:seed.account,token:i?'tower_session_'+randomUUID():seed.token,csrf:seed.csrf,instance:i?randomUUID():seed.instance};actors.push(actor);
   if(i){put(q,'accounts',actor.account);put(q,'players',{...player,id:actor.id,name:'Kule'+i,account_id:actor.account.id});put(q,'auth_sessions',{...session,token_hash:hash(actor.token),account_id:actor.account.id});put(q,'game_presence',{account_id:actor.account.id,token_hash:hash(actor.token),instance_id:actor.instance,expires_at_ms:Date.now()+120000,chat_after_id:0});}
  }
  if(true){put(q,'parties',{id:'tower-group',leader_id:actors[0].id,created_at:Math.floor(Date.now()/1000)});for(const a of actors)put(q,'party_members',{party_id:'tower-group',player_id:a.id,joined_at:Math.floor(Date.now()/1000)});}
 }});
 note('host ready');
 const server=http.createServer(),bridges=[];t.after(()=>{for(const b of bridges)b.destroy();server.close();});
 server.on('upgrade',async(req,socket,head)=>{try{
  const channel=Number(req.url.match(/channel\/(\d)/)[1]),row=s.supervisor.rows.get(channel),stream='test-browser:'+randomUUID(),bridge=new ProcessStream(row.child,{stream});bridges.push(bridge);
  await new Promise((resolve,reject)=>row.child.send({type:'test-browser-connection',stream},e=>e?reject(e):resolve()));
  const headers={...req.headers,origin:s.f.origin,'x-real-ip':'198.51.100.105'};
  bridge.write('GET '+req.url+' HTTP/1.1\r\n'+Object.entries(headers).map(([k,v])=>k+': '+v).join('\r\n')+'\r\n\r\n');if(head.length)bridge.write(head);
  socket.pipe(bridge).pipe(socket);socket.on('error',()=>bridge.destroy());bridge.on('error',()=>socket.destroy());
 }catch(e){socket.destroy();events.push({error:e.stack});}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 for(const actor of actors){
  await s.host.database.atomic(()=>globalThis.__colLaunch.grant(actor.account.id,true));
  class FaultSocket extends WebSocket { constructor(url){super(url);this.ordinal=++actor.connections;} addEventListener(kind,fn,...args){return super.addEventListener(kind,kind==='message'?event=>{if(actor.drop&&this.ordinal===1)return;fn(event);}:fn,...args);} }
  actor.connections=0;actor.client=new Core511Transport({WebSocket:FaultSocket,origin,headers:()=>({}),fetch:async(url,opt)=>{
   const response=await s.core.http(new Request(s.f.origin+new URL(url).pathname,{method:'POST',headers:{origin:s.f.origin,cookie:'__Host-yasam-session='+actor.token+'; __Host-yasam-csrf='+actor.csrf,'X-CSRF-Token':actor.csrf,'X-Game-Instance':actor.instance,'X-Real-IP':'198.51.100.105','content-type':'application/json'},body:opt.body}));
   events.push({actor:actor.id,http:new URL(url).pathname,status:response.status});return response;
  },notify:(kind,value)=>{if(kind==='error'||kind==='status'){events.push({actor:actor.id,kind,value});note(kind,value);}}});
  t.after(()=>actor.client.dispose());
  note('character',actor.id);await actor.client.replace('character',{channel:1});await actor.client.image();note('entered',actor.id);
 }

 const send=async(a,action,extra={})=>{const r=await a.client.command({action,requestId:randomUUID(),...extra});assert.equal(r.status,200,JSON.stringify(r));return r;};
 for(const a of actors)await send(a,'adventure_tower_enter');
 await until(()=>actors.every(a=>a.client.world?.adventure511?.run?.floor===1),10000);
 const area=s.f.sql.prepare('SELECT area FROM players WHERE id=?').get(actors[0].id).area;
 const mobs=s.f.sql.prepare('SELECT * FROM monsters WHERE area=? AND hp>0 ORDER BY hp').all(area),victim=mobs[0],survivor=mobs[1];assert.equal(victim.hp,1);assert.equal(survivor.hp,85);
 await s.core.permanentPlayers(actors.map(a=>a.id),()=>{
  for(const [i,a]of actors.entries()){const mob=i===1?victim:survivor;s.f.sql.prepare('UPDATE players SET x=?,y=?,attack_one_at=0 WHERE id=?').run(mob.x,mob.y,a.id);}
 });
 const hit=await send(actors[0],'attack',{targetId:survivor.id,spawnRound:survivor.spawn_round,ability:0,intentId:randomUUID()});assert.equal(hit.body.hits[0].killed,false);const hp=hit.body.hits[0].hp;
 const kill=await send(actors[1],'attack',{targetId:victim.id,spawnRound:victim.spawn_round,ability:0,intentId:randomUUID()});assert.equal(kill.body.hits[0].killed,true);
 await until(()=>actors.every(a=>a.client.world?.monsters.find(m=>m.id===victim.id)?.hp===0),5000);
 const rows=actors.map(a=>({id:a.id,survivorHp:a.client.world?.monsters.find(m=>m.id===survivor.id)?.hp,ready:a.client.ready,connections:a.connections}));
 const evidence={acceptedHp:hp,sqlHp:s.f.sql.prepare('SELECT hp FROM monsters WHERE id=?').get(survivor.id).hp,rows,faults:s.faults.map(x=>x.error?.message)};
 fs.writeFileSync(root+'/evidence/native-neighbour-'+(process.env.AUDIT_NAME||'fixed')+'.json',JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify(evidence));
 for(const row of rows)assert.equal(row.survivorHp,hp,'a different mob death must not reset accepted nonlethal damage');
 assert.equal(s.faults.length,0);
});
