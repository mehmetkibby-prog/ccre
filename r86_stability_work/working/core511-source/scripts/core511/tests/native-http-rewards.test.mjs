import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {httpActionFixture} from './native-http-action-fixture.mjs';
import {put} from './pvp-fixture.mjs';
import {until} from './helpers.mjs';
const player=s=>s.f.sql.prepare('SELECT * FROM players WHERE id=?').get(s.f.id);
const code='YC-ABCD-EFGH-JKLM-NPQR',codeHash=createHash('sha256').update('yasam-cekirdegi:epin:v1:'+code.replaceAll('-','')).digest('base64url');
function seedEpin(f){const batch=randomUUID(),now=Math.floor(Date.now()/1000);put(f.sql,'epin_batches',{id:batch,name:'Isolated fixture',product_code:'core-coins-500-v1',code_count:1,created_at:now,expires_at:0});put(f.sql,'epin_codes',{code_hash:codeHash,code_hint:'Isolated fixture',batch_id:batch,product_code:'core-coins-500-v1',status:'active',created_at:now,expires_at:0,redeemed_at:0});}

for(const kind of ['epin','starter'])test('actual native '+kind+' reward updates the current owner exactly once',{timeout:35000},async t=>{
 const s=await httpActionFixture(t),{f,core}=s;
 await core.permanentPlayers([f.id],()=>{if(kind==='epin'){seedEpin(f);f.sql.prepare('UPDATE players SET hp=1 WHERE id=?').run(f.id);}else put(f.sql,'starter_admin_grants',{request_id:randomUUID(),account_id:f.account.id,player_id:f.id,admin_id:f.account.id,granted_at_ms:Date.now(),opened_at_ms:0});});
 const before=player(s),path=kind==='epin'?'/api/epin/redeem':'/api/starter-reward',call=()=>s.module.default(f.request({path,body:{code}}));let r;
 if(kind==='epin'){
  const command=s.writer.command.bind(s.writer);let accepted=false,answered=false,release;const gate=new Promise(resolve=>release=resolve);s.writer.command=async(peer,request)=>{const ack=await command(peer,request);if(request.playerId===f.id&&request.operation==='native_action'&&!accepted){accepted=true;await gate;}return ack;};
  try{s.live.ws.send(JSON.stringify({type:'input',sequence:1,payload:{action:'use_potion'}}));await until(()=>accepted,7000);const pending=call().finally(()=>answered=true);await until(()=>core.permanent.entries.get(f.id)?.phase==='freezing',5000);assert.equal(answered,false);assert.equal(player(s).core_coins,before.core_coins);release();r=await pending;}finally{release();s.writer.command=command;}
  assert.equal((await s.view()).potions,before.potions-1);
 }else r=await call();
 assert.equal(r.status,200,await r.text());const after=player(s),resident=await s.resources(f.id);
 if(kind==='epin'){assert.equal(after.core_coins,before.core_coins+500);assert.equal(resident.core_coins,after.core_coins);}else{assert.equal(after.potions,before.potions+10);assert.equal((await s.view()).potions,after.potions);assert.equal(resident.gems,before.gems+50);}
 assert.equal((await call()).status,kind==='epin'?400:409);assert.equal(player(s).core_coins,after.core_coins);assert.equal(player(s).potions,after.potions);assert.equal(player(s).gems,after.gems);assert.equal(core.permanent.entries.size,0);assert.equal(s.faults.length,0,s.faults.map(f=>f.error?.stack).join('\n'));
});

test('native onboarding read/advance remains durable and obsolete first-evolution claim retains its rejection',{timeout:35000},async t=>{
 const s=await httpActionFixture(t),{f,core}=s;await core.permanentPlayers([f.id],()=>f.sql.prepare('DELETE FROM player_onboarding WHERE player_id=?').run(f.id));
 const call=(path,method='POST',body={})=>s.module.default(f.request({path,method,body:method==='GET'?undefined:body}));
 const read=await call('/api/onboarding','GET');assert.equal(read.status,200);assert.deepEqual(await read.json(),{step:0,potionHintSeen:false});assert.equal(f.sql.prepare('SELECT step FROM player_onboarding WHERE player_id=?').get(f.id).step,0);
 const advance=await call('/api/onboarding','POST',{event:'teleport_open'});assert.equal(advance.status,200);assert.equal((await advance.json()).step,1);
 const denied=await call('/api/onboarding','POST',{event:'first_attack'});assert.equal(denied.status,200);assert.equal((await denied.json()).step,1);assert.equal((await call('/api/onboarding','POST',{event:'invented'})).status,409);
 const before=player(s),old=await call('/api/quests','POST',{action:'claim_first_evolution'});assert.equal(old.status,409);assert.match((await old.json()).error,/yeni Görevler/);assert.deepEqual(player(s),before);assert.equal(core.permanent.entries.size,0);assert.equal(s.faults.length,0);
});

test('native rank appearance updates its owner and retains unlock restrictions',{timeout:35000},async t=>{
 const s=await httpActionFixture(t),{f,core}=s;await core.permanentPlayers([f.id],()=>f.sql.prepare("UPDATE players SET level=65,rank_tier=1,rank_unlocked='[\"hunter_weapon\"]',rank_cosmetics='{}' WHERE id=?").run(f.id));
 const call=body=>s.module.default(f.request({path:'/api/ranks',body})),r=await call({action:'equip',slot:'weapon',reward:'hunter_weapon'});assert.equal(r.status,200,await r.text());assert.equal(JSON.parse(player(s).rank_cosmetics).weapon,'hunter_weapon');assert.equal((await s.resources(f.id)).rank_cosmetics,player(s).rank_cosmetics);
 const before=player(s);assert.equal((await call({action:'equip',slot:'costume',reward:'legend_costume'})).status,409);assert.deepEqual(player(s),before);assert.equal(core.permanent.entries.size,0);assert.equal(s.faults.length,0);
});

for(const phase of ['before','after'])test('native E-PIN source SIGKILL '+phase+' COMMIT recovers the current code receipt and never grants twice',{timeout:40000},async t=>{
 const s=await httpActionFixture(t),{f,core,host,supervisor,ticket}=s;await core.permanentPlayers([f.id],()=>seedEpin(f));const before=player(s).core_coins,source=supervisor.rows.get(ticket.channel),others=[...supervisor.rows.values()].filter(r=>r!==source),world=s.world.row,db=host.database,execute=db.execute.bind(db),durable=db.durableAfterCommit.bind(db);let killed=false;
 const status=()=>f.sql.prepare('SELECT status FROM epin_codes WHERE code_hash=?').get(codeHash).status,call=()=>s.module.default(f.request({path:'/api/epin/redeem',body:{code}}));
 db.execute=statement=>{const result=execute(statement);if(phase==='before'&&!killed&&statement.sql.startsWith("UPDATE epin_codes SET status = 'redeemed'")){killed=true;source.child.kill('SIGKILL');throw Error('epin_before_commit');}return result;};
 db.durableAfterCommit=()=>{const pending=durable();if(phase==='after'&&!killed&&status()==='redeemed'){killed=true;return Promise.resolve(pending).then(()=>{source.child.kill('SIGKILL');throw Error('epin_after_commit');});}return pending;};
 try{const r=await call();assert.notEqual(r.status,200,await r.text());}finally{db.execute=execute;db.durableAfterCommit=durable;}
 assert(killed);assert.equal(status(),phase==='after'?'redeemed':'active');assert.equal(player(s).core_coins,before+(phase==='after'?500:0));await until(()=>source.exited&&supervisor.rows.get(ticket.channel)!==source&&supervisor.rows.get(ticket.channel)?.state==='running'&&!core.permanent.entries.has(f.id),20000);assert.equal(source.child.signalCode,'SIGKILL');assert.equal(s.world.row,world);assert(others.every(r=>supervisor.rows.get(r.peer.channel)===r));const fresh=await s.http('ticket');assert.equal(fresh.status,200,JSON.stringify(fresh));await s.connect(fresh);assert.equal((await s.resources(f.id)).core_coins,player(s).core_coins);
 const retry=await call();assert.equal(retry.status,phase==='after'?400:200,await retry.text());assert.equal(player(s).core_coins,before+500);assert.equal((await call()).status,400);assert.equal((await s.resources(f.id)).core_coins,before+500);
});
