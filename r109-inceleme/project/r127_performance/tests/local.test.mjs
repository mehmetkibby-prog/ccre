import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {captureLocalCommitR127,matchesLocalCommitR127} from '../../r109_latency_completion/working/core511-source/scripts/core511/committed-local-r127.mjs';
import {ResidentChannel} from '../../r109_latency_completion/working/core511-source/scripts/core511/resident-channel.mjs';

test('only compatible single-owner revisions may publish pickups and potions; mismatch loads from the current owner',async t=>{
 const sql=new DatabaseSync(':memory:');t.after(()=>sql.close());
 sql.exec(`CREATE TABLE kernel511_channel_owners(player_id TEXT,channel INTEGER,incarnation TEXT,epoch INTEGER,state TEXT);
 CREATE TABLE kernel511_admissions(player_id TEXT,channel INTEGER,epoch INTEGER);
 CREATE TABLE kernel511_actor_revision_r113(actor TEXT PRIMARY KEY,revision INTEGER);
 CREATE TABLE world_state(id INTEGER,cycle INTEGER);
 INSERT INTO kernel511_channel_owners VALUES('p',2,'test',4,'active');
 INSERT INTO kernel511_admissions VALUES('p',2,4);
 INSERT INTO world_state VALUES(1,7); BEGIN`);
 const owner={channel:2,incarnation:'test',epoch:4}, ctx={id:'p',actor:'p',peer:owner,epoch:4,key:'first',input:{action:'use_potion'}};
 const row={id:'p',area:'forest',channel:2,hp:82,potions:2};
 const potion={players:[row],encounters:[['p',null]],result:{status:200,body:{ok:true}},sharedRefresh:{version:1,actors:['p'],tables:['players'],all:false}};
 const capture=(res=potion,context=ctx,payload={input:ctx.input})=>captureLocalCommitR127(sql,'native_action',payload,context,res);
 for(const bad of [{...potion,players:[row,row]},{...potion,sharedRefresh:{...potion.sharedRefresh,all:true}},{...potion,sharedRefresh:{...potion.sharedRefresh,tables:['player_items']}},{...potion,sharedRefresh:{...potion.sharedRefresh,actors:['other']}}])assert.equal(capture(bad),null);
 assert.equal(capture(potion,{...ctx,epoch:99}),null);
 assert.equal(capture(potion,ctx,{input:ctx.input,sharedLease:{}}),null);
 assert.equal(capture(potion,ctx,{input:ctx.input,batchPotionsR61:true}),null);
 const result=capture(),proof=result.committedR113;
 assert.equal(proof.base,0);assert.equal(proof.next,1);
 sql.exec('ROLLBACK; BEGIN');
 assert.equal(capture().committedR113.base,0);sql.exec('COMMIT; BEGIN');
 const pickup={...potion,collectLight:{version:1,actor:'p',target:'d'},sharedRefresh:{...potion.sharedRefresh,tables:['players','world_drops','guild_essence_rewards']}};
 const collect={...ctx,key:'next',input:{action:'collect',targetId:'d'}},payload={input:collect.input,localScope:{kind:'collect',owner:'p'}};
 assert.equal(capture({...pickup,collectLight:{...pickup.collectLight,target:'different'}},collect,payload),null);
 assert.equal(capture({...pickup,sharedRefresh:{...pickup.sharedRefresh,tables:[...pickup.sharedRefresh.tables,'guild_ledger']}},collect,payload),null);
 const picked=capture(pickup,collect,payload);
 assert.equal(picked.committedR113.base,1);assert.equal(picked.committedR113.next,2);sql.exec('COMMIT');
 let refreshes=0,reloads=0,last,engagement;
 const channel={owners:new Map([['p',owner]]),kernel:{players:new Map([['p',{barrier:true,epoch:4}]])},world:{cycle:7},
  lanes:{busy:()=>true},commitRevisionsR113:new Map([['p',0]]),completedClaimHintsR56:{record(){}},
  state:{assertOwner(){}},view:{player:()=>({...row,hp:70,potions:3}),setPlayer:r=>{last=r;},setEngagement:(id,enc)=>{engagement=enc;}},
  presence:{merge:r=>r},ports:{potionRefresh:()=>{refreshes++;return true;},collectRefresh:()=>{refreshes++;return true;}},
  loadActor:async ()=>{reloads++;return {fresh:true,player:row};},applyBundle:b=>{assert(b.fresh);},revision:7,
  finishLocalCommitR127:ResidentChannel.prototype.finishLocalCommitR127};
 assert(matchesLocalCommitR127(channel,proof,result,ctx));
 for(const change of [{id:'q'},{epoch:88},{channel:1},{incarnation:'lost'},{cycle:8},{base:10},{next:7}])assert(!matchesLocalCommitR127(channel,{...proof,...change},result,ctx));
 await ResidentChannel.prototype.applyCommit.call(channel,result,ctx);
 assert.equal(refreshes,1);assert.equal(reloads,0);assert.equal(last.hp,82);assert.equal(engagement,null);assert.equal(channel.commitRevisionsR113.get('p'),1);
 await ResidentChannel.prototype.applyCommit.call(channel,picked,collect);
 assert.equal(refreshes,2);assert.equal(channel.commitRevisionsR113.get('p'),2);
 await ResidentChannel.prototype.applyCommit.call(channel,result,ctx);
 assert.equal(refreshes,2);assert.equal(reloads,1);assert.equal(channel.commitRevisionsR113.get('p'),2);
});
