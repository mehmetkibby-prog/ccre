import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {AutoIpAuthorityR102,AUTO_IP_TTL_R102} from '../../r109_latency_completion/working/core511-source/scripts/core511/auto-ip-r102.mjs';
import {createRealmRegistrationsR101,academyCatalogR101} from '../../r109_latency_completion/working/core511-source/scripts/core511/academy-access-r101.mjs';
import {createLaunchService,ensureLaunchSchema} from '../../r109_latency_completion/working/native510-bb3a6cc689c6/vds-server/src/launch-service.mjs';
import {channelAdmissionR59,residentCapacityR59} from '../../r109_latency_completion/working/core511-source/scripts/core511/castle-capacity-r59.mjs';
import {publicShopRows,trackShopStock,visibleShops} from '../../r109_latency_completion/working/core511-source/scripts/core511/shop-feed-r127.mjs';

test('the shared IP admits three distinct auto-hunting characters across both modes and realms',()=>{
 let now=1;const authority=new AutoIpAuthorityR102({now:()=>now});now+=AUTO_IP_TTL_R102;
 const req=(realm,id,mode,extra={})=>authority.handle(realm,{action:'claim',accountId:'a'+id,playerId:'p'+id,ip:'192.0.2.17',mode,...extra});
 const one=req('r1',1,'world'),renew=req('r1',1,'world');assert(one.ok&&renew.ok);
 const island=req('r1',1,'island');assert.equal(island.key,one.key);
 assert.ok(req('r2',2,'world').ok);assert.ok(req('r2',3,'island').ok);
 assert.equal(req('r1',4,'world',{ip:'::ffff:192.0.2.17'}).status,409);
 req('r1',1,'world',{action:'release',key:one.key,token:one.token});
 req('r1',1,'island',{action:'release',key:island.key,token:island.token});
 assert.equal(req('r1',4,'world').status,409);
 req('r1',1,'world',{action:'release',key:renew.key,token:renew.token});assert.ok(req('r1',4,'world').ok);
 now+=AUTO_IP_TTL_R102+1;assert.ok(req('r2',5,'island').ok);
});

test('public Akademi countdown flips at the exact boundary, admits a 50-character arrival against its channel capacities, then reuses the freed place',async()=>{
 const db=new DatabaseSync(':memory:');
 try{
  db.exec('CREATE TABLE accounts(id TEXT PRIMARY KEY,created_at INT); CREATE TABLE kernel511_admissions(player_id TEXT PRIMARY KEY,channel INTEGER); CREATE TABLE players(id TEXT PRIMARY KEY,channel INTEGER,area TEXT); CREATE TABLE castle_entries_r59(player_id TEXT)');
  ensureLaunchSchema(db,{accountsOnly:true});
  const opening=Date.parse('2026-11-20T17:00:00Z');let now=opening-1;
  db.prepare("UPDATE launch_settings SET enabled=1,mode='scheduled',public_opens_at=? WHERE id=1").run(opening);
  const access=createRealmRegistrationsR101(db,{now:()=>now});
  const policy=access.wrap('r2',createLaunchService(db,{accountsOnly:true,now:()=>now}));
  policy.saveTestAccess({enabled:false,revision:policy.testAccess().revision});
  const candidates=Array.from({length:50},(_,index)=>'player-'+index);
  for(const id of candidates){db.prepare('INSERT INTO accounts VALUES(?,1)').run(id);access.enroll('r2',id);}
  const catalog=id=>academyCatalogR101([{id:'r2',status:'open'}],{accountId:id,launchFor:()=>policy})[0];
  assert.ok(candidates.every(id=>!catalog(id).canEnter));now=opening;
  assert.ok(candidates.every(id=>catalog(id).canEnter));assert.equal(policy.status().phase,'open');
  assert.equal(residentCapacityR59(1),10);
  const accepted=await Promise.all(candidates.map(async(id,i)=>{
   const channel=i%4+1;
   if(!channelAdmissionR59(db,id,channel))return false;
   db.prepare('INSERT INTO kernel511_admissions VALUES(?,?)').run(id,channel);return true;
  }));
  assert.equal(accepted.filter(Boolean).length,40);assert.equal(accepted.filter(v=>!v).length,10);
  db.prepare("DELETE FROM kernel511_admissions WHERE player_id='player-0'").run();
  assert.ok(channelAdmissionR59(db,'player-40',1));
  now+=1000;assert.ok(catalog('player-40').canEnter);
  db.prepare("UPDATE launch_settings SET mode='maintenance',maintenance_deadline_ms=0 WHERE id=1").run();
  assert.equal(catalog('player-40').canEnter,false);
 } finally{db.close();}
});

test('player already in the village sees a new stall on stocking and its removal at sellout, expiration or closure',()=>{
 const db=new DatabaseSync(':memory:');try{
  db.exec("CREATE TABLE players(id,stall_skin_enabled); CREATE TABLE market_shops(id,owner_id,owner_name,name,x,y,channel,active,created_at); CREATE TABLE market_listings(shop_id); CREATE TABLE premium_listings(id,seller_id,product,payload); CREATE TABLE kernel511_market_version(id,revision); INSERT INTO kernel511_market_version VALUES(1,0); INSERT INTO players VALUES('seller',1)");
  trackShopStock(db);
  db.exec("INSERT INTO market_shops VALUES('stall','seller','Ada','İksir',20,30,1,1,990)");
  const view=(viewer,chan,now=1000000)=>visibleShops(new Map(publicShopRows(db).map(row=>[row.id,row])),[],viewer,chan,now);
  assert.equal(view('other',1).shops.length,0);assert.equal(view('seller',1).shops.length,1);
  db.exec("INSERT INTO market_listings VALUES('stall')");assert.equal(view('other',1).shops[0].stock_count502,1);assert.equal(view('other',4).shops.length,0);
  db.exec("UPDATE players SET stall_skin_enabled=0 WHERE id='seller'");assert.equal(view('other',1).shops[0].stall_skin_enabled,0);
  db.exec("DELETE FROM market_listings");assert.equal(view('other',1).shops.length,0);
  db.prepare('INSERT INTO premium_listings VALUES(?,?,?,?)').run('listing','seller','costume',JSON.stringify({item:{expires_at_ms:1001000}}));
  assert.equal(view('other',1).until,1001000);assert.equal(view('other',1,1001000).shops.length,0);
  db.exec("UPDATE market_shops SET active=0");assert.equal(view('seller',1).shops.length,0);
  assert.equal(db.prepare('SELECT revision FROM kernel511_market_version').get().revision,4);
 }finally{db.close();}
});
