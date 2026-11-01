import test from 'node:test';
import assert from 'node:assert/strict';
import {native} from './helpers.mjs';
import {ResidentState} from '../resident-state.mjs';
import {WorldProjection} from '../world-projection.mjs';
import {publicWorldPlayer} from '../generated/world-projection-rules.mjs';
import {timedPlayerView} from '../timed-player-view.mjs';
import fs from 'node:fs';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {BASE,hash} from './helpers.mjs';
import {liveMarketShops,marketShopDeadline} from '../generated/market-clock-rules.mjs';
const {WorldPush}=await native('vds-server/src/world-push.mjs');
const {installRegistry}=await native('vds-server/src/loadlab/registry.mjs');
const {applyWorldDelta}=await native('lib/world-push.mjs');
const json=x=>JSON.parse(JSON.stringify(x));
function fixture(t,{channel=1,area='forest',count=25}={}){
 let time=100000;installRegistry({now:()=>time});const previous=globalThis.__colRealm,globals={__colRealm:{maintenance:{policy:{revision:1},view:()=>null}}};globalThis.__colRealm=globals.__colRealm;t.after(()=>{globalThis.__colRealm=previous;});
 const state=new ResidentState(channel),players=state.table('players'),monsters=new Map(),view={players,monsters,engagements:new Map(),player:id=>players.get(id)};
 for(let i=0;i<count;i++)state.put('players',{id:'player-'+i,name:'Player '+i,account_id:'private-account-'+i,privateToken:'never-shared-'+i,role:'avci',level:40,hp:100,max_hp:100,hp_revision:1,x:1000+i*20,y:1000,cycle:1,channel,area,instanceId:'',arena_match_id:'',last_seen:100,is_gm:0,gm_invisible:0,gm_visibility_revision:1,realtime_scope_version:1,quest_kills438:i,quest_fish438:i});
 const m={id:'golge-projection',name:'Target',area,channel,x:1020,y:1000,hp:100,max_hp:100,respawn_at:0,variant:'normal',is_boss:0,despawn_at:0,spawn_round:1,is_stone:0,wave_stage:0,summoned:0,parent_stone_id:'',cycle:1,private_spawn_seed:'never-shared'};monsters.set(m.id,m);state.put('monsters',m);
 const core=new WorldProjection({state,view,globals,waveView:()=>null,epoch:'projection-test',clock:()=>time});core.setWorld({cycle:1,health:64},count);
 const oracle=new WorldPush(null,{enabled:false,channel:0,now:()=>time,watchWrites:false});oracle.players=players;oracle.world={cycle:1,health:64};oracle.totalOnline=count;oracle.worldLoop=core.native.worldLoop;
 for(const [id,m]of core.native.monsters)oracle.monsters.set(id,m);
 const oracleRoom={staticPlayers:new Map(),playerRows:new Map()};
 const dataFor=id=>({world:{cycle:1,health:64},channel,area,players:[...players.values()].map(p=>p.id===id?{...p,privateOwner:'secret-'+id,rank:{tier:2,bonuses:{hp:1,privateKey:'hidden'},privateKey:'hidden'}}:publicWorldPlayer(p)),monsters:[],combatEvents:[],inventory:[{id:'inventory-'+id,player_id:id,power:1}],drops:[{id:'drop-'+id,player_id:id,expires_at:100}],regionalMessages:[{id:1,created_at:96}],party:{id:'party',viewerId486:id,members:[...players.values()].slice(0,2)},partyInvite:{created_at:0},globalAnnouncement:{expires_at_ms:100350},gmAnnouncement:{announcement_expires_at_ms:100500},friends:[{id:'friend',name:'Friend',online:true}],bossNextAt:0,bossEndsAt:0});
 function seed(id,data=dataFor(id)){
  core.update(id,data,{friends:[{id:'friend',name:'Friend',last_seen:70,is_gm:0,gm_invisible:0}]});const room=oracleRoom,sub={id,data,room,ownerRow:data.players.find(p=>p.id===id)};for(const p of data.players)room.staticPlayers.set(p.id,publicWorldPlayer(p));oracle.subscribers.set(id,sub);oracle.seedFriends487(id,[{id:'friend',name:'Friend',last_seen:70,is_gm:0,gm_invisible:0}]);return sub;
 }
 for(const p of players.values())seed(p.id);
 const received=new Map();
 function tick(){const changes=state.changes(),packets=new Map();for(const id of core.subscribers.keys()){const p=core.project({id,now:time,changes,results:[],lastApplied:0});if(p){assert.equal(core.wire.encode(p),JSON.stringify(p),'shared bytes '+id);packets.set(id,p);if(p.world?.type==='world_snapshot')received.set(id,p.world.data);else if(p.world?.type==='world_delta')received.set(id,applyWorldDelta(received.get(id),p.world));}}return packets;}
 function check(){for(const [id,sub]of oracle.subscribers){const expected=oracle.project(sub),actual=received.get(id),clean=x=>{const{worldPush,serverTime,snapshotAtMs,...rest}=x;return json(rest);};assert.deepEqual(clean(actual),clean(expected),id);assert.equal(actual.monsters.some(m=>'private_spawn_seed' in m),false);for(const p of actual.players)if(p.id!==id){assert.equal('privateOwner' in p,false);assert.equal('account_id' in p,false);assert.equal('privateToken' in p,false);assert.equal('quest_kills438' in p,false);assert.equal(p.rank?.privateKey,undefined);}}}
 return {core,oracle,state,players,view,globals,received,tick,check,seed,dataFor,setTime:v=>{time=v;}};
}
test('native world projection shares one room image and skips unchanged projection/diff; original private boundaries remain',t=>{
 const f=fixture(t);f.tick();f.check();assert.equal(f.core.metrics.commonBuilds,1);assert.equal(f.core.metrics.privateBuilds,25);
 const builds={...f.core.metrics};for(let i=1;i<=6;i++){f.setTime(100000+i*50);assert.equal(f.tick().size,0);}
 assert.equal(f.core.metrics.commonBuilds,builds.commonBuilds);assert.equal(f.core.metrics.privateBuilds,builds.privateBuilds);assert.equal(f.core.metrics.privateDiffs,0);
 f.state.patch('players','player-0',{x:1080,hp:80,hp_revision:2,quest_kills438:77});f.setTime(100301);f.tick();f.check();assert.equal(f.core.metrics.commonBuilds,2);assert.equal(f.core.metrics.commonDiffs,1);
 f.setTime(100350);f.tick();f.check();assert.equal(f.core.metrics.commonBuilds,2,'announcement expiry does not rebuild common entities');
 f.setTime(100500);f.tick();f.check();f.setTime(101000);f.tick();f.check();assert.equal(f.received.get('player-0').drops.length,0);assert.equal(f.received.get('player-0').friends[0].online,false);
 f.setTime(102000);f.tick();f.check();assert.equal(f.received.get('player-0').regionalMessages.length,0);
});
test('clock expiry, GM visibility, combat targets and scope reset match the pinned native projection',t=>{
 const f=fixture(t,{count:3});f.state.patch('players','player-2',{is_gm:1,gm_invisible:1});
 const row={player_id:'player-0',next_hit_at_ms:100100,monster_id:'golge-projection',spawn_round:1,expires_at_ms:100100};f.view.engagements.set('player-0',Object.freeze(row));
 const e={id:1,player_id:'player-0',target_id:'golge-projection',role:'avci',ability:0,created_at:100000};f.core.event(e);f.oracle.events.set(1,e);f.tick();f.check();
 assert.equal(f.received.get('player-0').players.length,2);assert.equal(f.received.get('player-2').players.length,3);assert.deepEqual(f.received.get('player-0').monsters[0].targetIds,['player-0']);
 f.setTime(100101);f.tick();f.check();assert.deepEqual(f.received.get('player-0').monsters[0].targetIds,[]);
 f.setTime(102201);f.tick();f.check();assert.equal(f.received.get('player-0').combatEvents.length,0);
 f.state.patch('players','player-2',{gm_invisible:0,gm_visibility_revision:2});f.tick();f.check();assert.equal(f.received.get('player-0').players.length,3);
 f.state.patch('players','player-0',{area:'frozen'});const packet=f.tick().get('player-0');assert.equal(packet.world.type,'world_reset');assert.equal(f.core.subscribers.has('player-0'),false);
});
test('channel four keeps the native projection contract and stationary-player expiry does not cache forever',t=>{
 const f=fixture(t,{channel:4,count:2});f.tick();f.check();f.setTime(131000);f.tick();f.check();
 assert.equal(f.received.get('player-0').players.length,1);assert.equal(f.received.get('player-0').players[0].id,'player-0');
 f.state.patch('players','player-0',{last_seen:131});f.setTime(131001);f.tick();f.check();
});

test('stationary public and private premium, pumpkin, wings and guild views expire at native deadlines',t=>{
 const f=fixture(t,{count:2}),id='player-0';
 f.state.patch('players',id,{ration_until:100450,radiant_enabled:1,radiant_until:100500,essence_until:100550,pumpkin_enabled499:1,pumpkin_until499:100600,arena_wings_equipped:1,arena_wings_expires_at_ms:100650});
 for(const viewer of ['player-0','player-1']){const data=f.dataFor(viewer);data.players=data.players.map(p=>p.id!==id?p:timedPlayerView({...p,rank:{tier:2,arenaWings:true,...(viewer===id?{xp:123,privateKey:'owner-only'}:{})},premiumBuff:{},guildBuff:{attack:7,hp:50,xp:10,level:1,cost:1,until:100700}},f.players.get(id),100000));f.seed(viewer,data);}
 f.tick();const initial=f.received.get(id).players.find(p=>p.id===id);assert.equal(initial.premiumBuff.attack,45);assert.equal(initial.rank.xp,123);
 for(const time of [100450,100500,100550,100600,100650,100700,100000,100700]){
  f.setTime(time);f.tick();
  for(const viewer of ['player-0','player-1']){const actual=f.received.get(viewer).players.find(p=>p.id===id),expected=timedPlayerView(initial,f.players.get(id),time);assert.deepEqual(actual.premiumBuff,expected.premiumBuff);assert.equal(actual.rank.arenaWings,expected.rank.arenaWings);assert.deepEqual(actual.guildBuff,expected.guildBuff);if(viewer!==id)assert.equal(actual.rank.privateKey,undefined);}
 }
 assert.equal(f.received.get(id).players.find(p=>p.id===id).premiumBuff.attack,0);assert.equal(f.received.get(id).players.find(p=>p.id===id).rank.xp,123);
});

test('native market lifetime SQL expires the visible shop at the exact second without overwriting movement or reviving stale snapshots',t=>{
 const proof=JSON.parse(fs.readFileSync(new URL('../generated/market-clock-proof.json',import.meta.url))),source=fs.readFileSync(path.join(BASE,proof.source),'utf8');assert.equal(hash(source),proof.sourceSha256);assert.equal(hash(fs.readFileSync(new URL('../generated/market-clock-rules.mjs',import.meta.url))),proof.generatedSha256);assert(source.slice(proof.start,proof.end).includes(proof.predicate));
 const sql=new DatabaseSync(':memory:');t.after(()=>sql.close());sql.exec('CREATE TABLE market_shops(id TEXT PRIMARY KEY,created_at INTEGER)');
 const rows=[{id:'expired',created_at:100-proof.lifetimeSeconds},{id:'deadline',created_at:101-proof.lifetimeSeconds},{id:'future',created_at:900}];for(const row of rows)sql.prepare('INSERT INTO market_shops VALUES(?,?)').run(row.id,row.created_at);
 const original=sql.prepare('SELECT id FROM market_shops WHERE '+proof.predicate.replace("strftime('%s','now')",'?')+' ORDER BY id');
 for(const now of [99999,100000,100999,101000,101001])assert.deepEqual(liveMarketShops(rows,now).map(r=>r.id).sort(),original.all(Math.floor(now/1000)).map(r=>r.id));
 assert.equal(marketShopDeadline(rows[1]),101000);assert.equal(liveMarketShops(rows,99000),rows);
 const f=fixture(t,{count:2});f.state.patch('players','player-1',{is_gm:1,gm_invisible:1});const data=new Map();
 for(const id of ['player-0','player-1']){const snapshot={...f.dataFor(id),shops:rows,listings:[{id:'native-global-listing',shop_id:'deadline'}]};data.set(id,snapshot);f.seed(id,snapshot);}
 f.tick();for(const id of data.keys())assert.deepEqual(f.received.get(id).shops.map(r=>r.id),['deadline','future']);
 f.state.patch('players','player-0',{x:1480,hp:77});f.setTime(100999);f.tick();assert(f.received.get('player-0').shops.some(r=>r.id==='deadline'));
 const common=f.core.metrics.commonBuilds;f.setTime(101000);f.tick();assert.equal(f.core.metrics.commonBuilds,common,'market expiry is private projection work');
 for(const id of data.keys()){assert.deepEqual(f.received.get(id).shops.map(r=>r.id),['future']);assert.equal(f.received.get(id).listings.length,1,'native global listings remain unchanged');}
 const own=f.received.get('player-0').players.find(p=>p.id==='player-0');assert.equal(own.x,1480);assert.equal(own.hp,77);
 f.seed('player-0',data.get('player-0'));f.tick();assert.deepEqual(f.received.get('player-0').shops.map(r=>r.id),['future'],'an older cold image cannot revive expired shops');assert.equal(f.players.get('player-0').x,1480);
});

test('committed market closure removes cached shops without replacing player state; newer cold reopen survives an older market point',t=>{
 const f=fixture(t,{count:1}),id='player-0',shop={id:'closed-empty',created_at:1,active:1},data={...f.dataFor(id),shops:[shop]};f.core.update(id,data,{marketRevision:3});f.tick();assert.equal(f.received.get(id).shops.length,1);f.state.patch('players',id,{x:1590});
 f.core.setMarket({revision:4,shops:[{...shop,active:0}]});f.tick();assert.equal(f.received.get(id).shops.length,0);assert.equal(f.received.get(id).players.find(p=>p.id===id).x,1590);
 f.core.update(id,data,{marketRevision:3});f.tick();assert.equal(f.received.get(id).shops.length,0,'old cold snapshot cannot revive closed shop');
 f.core.update(id,data,{marketRevision:5});f.tick();assert.equal(f.received.get(id).shops.length,1,'a newer native cold reopen is not hidden by an older closure');f.core.setMarket({revision:3,shops:[]});f.tick();assert.equal(f.received.get(id).shops.length,1);
 f.core.setMarket({revision:5,shops:[shop]});f.tick();assert.equal(f.received.get(id).shops.length,1);assert.throws(()=>f.core.setMarket({revision:5,shops:[]}),/market_point_reused/);assert.equal(f.players.get(id).x,1590);
});
