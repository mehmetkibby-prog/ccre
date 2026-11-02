import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import vm from 'node:vm';
import {verificationRoomR90,deferRoomBotCheckR90} from '../working/core511-source/scripts/core511/verification-room-r90.mjs';
import {SessionMirror} from '../working/core511-source/scripts/core511/session-mirror.mjs';
import {afkQuestionEligible} from '../working/core511-source/scripts/core511/afk-policy.mjs';
import {mapArea} from '../working/core511-source/scripts/core511/adventure-maps.mjs';
import {native} from '../working/core511-source/scripts/core511/tests/helpers.mjs';
const {createBotCheck}=await native('vds-server/src/bot-check.mjs');
const rooms=[...Array.from({length:10},(_,i)=>mapArea('tower','a'.repeat(32),i+1)),mapArea('mist','b'.repeat(32))];

test('all ten tower floors, mist and native dungeon memberships defer without resetting the native deadline',t=>{
 const sql=new DatabaseSync(':memory:');t.after(()=>sql.close());let now=100000;
 sql.exec("CREATE TABLE players(id TEXT PRIMARY KEY,account_id TEXT,area TEXT); CREATE TABLE dungeon_members(player_id TEXT PRIMARY KEY,run_id TEXT); INSERT INTO players VALUES('p','a','forest');");
 const raw=createBotCheck(sql,{now:()=>now,exempt:()=>sql.prepare('SELECT area FROM players WHERE id=?').get('p').area==='afk'}),bot=deferRoomBotCheckR90(sql,raw,{now:()=>now});
 const deadline=bot.deadline('a');now=deadline+1;
 for(const area of rooms){
  sql.prepare('UPDATE players SET area=?').run(area);
  assert.equal(raw.required('a'),true);assert.equal(bot.required('a'),false,area);
  assert.equal(bot.deadline('a',true),0);assert(bot.deadline('a')>now);
  assert.equal(sql.prepare('SELECT due_ms FROM bot_due').get().due_ms,deadline);
  assert.equal(afkQuestionEligible({player:{area,hp:100}}),false,'four-image question stays deferred');
 }
 sql.prepare("UPDATE players SET area='bazaar'").run();
 for(const run of ['solo-room','group-room','legacy-tower']){
  sql.prepare('INSERT OR REPLACE INTO dungeon_members VALUES(?,?)').run('p',run);
  assert.equal(bot.required('a'),false);assert.equal(afkQuestionEligible({player:{area:'bazaar',hp:100},dungeon:true}),false);
 }
 sql.exec('DELETE FROM dungeon_members');
 for(const area of ['bazaar','forest','coast','kadim_invalid_10']){
  sql.prepare('UPDATE players SET area=?').run(area);assert.equal(bot.required('a'),true,area);assert.equal(bot.deadline('a'),deadline);
 }
 sql.prepare("UPDATE players SET area='afk'").run();assert.equal(bot.required('a'),false,'existing AFK-island exemption');
 assert.equal(bot.verify,raw.verify);assert.equal(bot.challenge,raw.challenge,'registration and answer/attempt logic untouched');
});

test('room deferral does not relax bans, security expiry, owner epochs or maintenance; exit restores the due check immediately',()=>{
 let area=rooms[9],dungeon=false,now=1000;
 const identity={actor:'p',account:'a',session:'s',epoch:1,securityVersion:1},owner={channel:1,incarnation:'b',epoch:1};
 const mirror=new SessionMirror({peer:{channel:1,incarnation:'b'},owner:()=>owner,player:()=>({area}),dungeonLocked:()=>dungeon,clock:()=>now});
 const base={...identity,channel:1,incarnation:'b',revision:1,accountVersion:1,botDueMs:500,sessionExpiresMs:10000,securityValidUntil:9000,blocked:false,canPlay:true,maintenanceAllowed:true,realmOpen:true,guildDeadlineMs:null};
 mirror.update(base);assert.equal(mirror.check(identity),true);
 let revision=1;
 for(const [patch,code]of [[{blocked:true},'account_suspended'],[{sessionExpiresMs:now},'security_verification_required'],[{securityValidUntil:now},'security_verification_required'],[{maintenanceAllowed:false},'game_maintenance'],[{realmOpen:false},'realm_closed']]){
  mirror.update({...base,...patch,revision:++revision});assert.equal(mirror.check(identity).code,code);
 }
 mirror.update({...base,revision:++revision});owner.epoch=2;assert.equal(mirror.check(identity).code,'session_epoch_fenced');owner.epoch=1;
 area='bazaar';dungeon=true;assert.equal(mirror.check(identity),true);dungeon=false;assert.equal(mirror.check(identity).code,'bot_check_required');
 area=rooms[0];assert.equal(mirror.check(identity),true);
 assert.equal(verificationRoomR90(null,true),false);assert.equal(verificationRoomR90({area:'forest'},false),false);
});

test('HTTP challenge creation rechecks membership after a queued room entry instead of reusing the earlier required result',async()=>{
 const source=fs.readFileSync(new URL('../working/http-runtime/dist-vds/server/index.js',import.meta.url),'utf8');
 const start=source.indexOf('async function GET$25(request) {'),end=source.indexOf('async function POST$30(request) {',start);
 assert(start>0&&end>start);
 let inRoom=false,calls=0,generated=0;
 const bot={required:()=>!inRoom,deadline:()=>99999,challenge:()=>{generated++;return {id:'must-not-be-created'};}};
 const context=vm.createContext({Response,AuthRequestError:Error,__colBotCheck:bot,requireGameSession:async()=>({account:{id:'a'},player:{id:'p'},tokenHash:'s'}),enforceRateLimit:async()=>{},authErrorResponse:e=>{throw e;},db:()=>({core511BotCheck:{call:async(_a,reauthorize,_b,operation)=>{await reauthorize();if(++calls===2)inRoom=true;return operation();}}})});
 const response=await vm.runInContext(source.slice(start,end)+'\nGET$25({});',context);
 assert.deepEqual(await response.json(),{required:false,dueAt:99999});assert.equal(calls,2);assert.equal(generated,0);
});
