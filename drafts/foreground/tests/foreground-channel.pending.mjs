// Pending integration gate: current hash-matched nonlethal-rewards-r56.mjs is
// absent from the recovered source tree. Do not stub it or report these tests
// as passed; run this file after the real dependency graph is recovered.
import test from 'node:test';
import assert from 'node:assert/strict';
import {SharedCombatChannel} from '../r80-work/core511-source/scripts/core511/shared-combat-channel.mjs';
import {ResourceLanes} from '../r80-work/core511-source/scripts/core511/resource-lanes.mjs';
import {ChannelMailbox} from '../r80-work/core511-source/scripts/core511/channel-mailbox.mjs';

function fixture(){
 const events=[],owners=new Map(['caller','recipient','bystander'].map(id=>[id,{epoch:1,passive:0}])),players=new Map([...owners].map(([id])=>[id,{epoch:1,suspended:false,externalHold:null,barrier:null}]));
 const channel={peer:{channel:1,incarnation:'ch1'},owners,kernel:{players},lanes:new ResourceLanes(),control:{entries:new Map()},identities:new Map(),quarantines:{entries:new Map()},
  checkpoints:{drain:async id=>events.push('drain:'+id),hydrate:p=>events.push('hydrate:'+p.id)},combatCheckpoints:{drain:async()=>events.push('combat-drain')},writer:{finalSequence:()=>1},
  state:{assertOwner:(id,epoch)=>assert.equal(owners.get(id).epoch,epoch)},loadActor:async id=>({player:{id}}),applyBundle:b=>events.push('apply:'+b.player.id),encounters:{hydrate:id=>events.push('encounter:'+id)},revision:0};
 const mailbox=new ChannelMailbox({request:async()=>{throw Error('unexpected mailbox RPC');},send:()=>false,identity:()=>null});
 const failures=[],runtime={channel,mailbox,globalControl:{held:null},rates:{snapshot:()=>null},flushPresence:async()=>{},commandRecovery:{hasActor:()=>false},fail:error=>failures.push(error)};
 return {channel,runtime,mailbox,events,failures,shared:new SharedCombatChannel(runtime)};
}
const selected={token:'foreground-hold',except:[{id:'caller',epoch:1}],only:[{id:'caller',epoch:1},{id:'recipient',epoch:1}]};
test('selected hold ignores unrelated barriers/mailbox reads and leaves their real resource lane available',async()=>{
 const f=fixture(),never=new Promise(()=>{});f.channel.kernel.players.get('bystander').barrier=never;f.mailbox.pending.set('bystander',never);
 const ack=await f.shared.hold(selected);assert.deepEqual(ack.actors.map(a=>a.id),['recipient']);
 assert.equal(f.channel.kernel.players.get('bystander').suspended,false);assert.equal(f.mailbox.held('bystander'),false);
 const lease=f.channel.lanes.acquire(['player:bystander'],'unrelated movement');assert(lease);f.channel.lanes.release(lease);
 assert.deepEqual(f.events,['drain:recipient','combat-drain']);await f.shared.release({token:selected.token,refreshActors:['recipient']});
 assert.equal(f.channel.kernel.players.get('recipient').suspended,false);assert(!f.channel.lanes.busy(['player:recipient']));assert.deepEqual(f.failures,[]);
});
test('selected recipient still waits for its prior lane and never resumes before committed refresh',async()=>{
 const f=fixture(),prior=f.channel.lanes.acquire(['player:recipient'],'earlier accepted input');let done=false;
 const pending=f.shared.hold(selected).then(x=>{done=true;return x;});await new Promise(r=>setImmediate(r));assert.equal(done,false);
 f.channel.lanes.release(prior);await pending;let release;const refresh=new Promise(r=>release=r);f.channel.loadActor=async id=>{await refresh;return {player:{id}};};
 const releasing=f.shared.release({token:selected.token,refreshActors:['recipient']});await new Promise(r=>setImmediate(r));assert(f.channel.lanes.busy(['player:recipient']));assert.equal(f.channel.kernel.players.get('recipient').suspended,true);
 release();await releasing;assert.equal(f.channel.kernel.players.get('recipient').suspended,false);
});
test('empty channel selection does not flush unrelated journals or wait for their barriers',async()=>{
 const f=fixture();f.channel.kernel.players.get('bystander').barrier=new Promise(()=>{});const ack=await f.shared.hold({token:'empty',except:[],only:[]});
 assert.deepEqual(ack.actors,[]);assert.deepEqual(f.events,[]);await f.shared.release({token:'empty',refreshActors:[]});
});
test('a stale selected epoch is rejected before any actor or mailbox is held',async()=>{
 const f=fixture();await assert.rejects(f.shared.hold({...selected,only:[{id:'recipient',epoch:2}]}),{code:'shared_hold_selected_scope'});
 assert.equal(f.shared.held,null);assert.equal(f.mailbox.holds.size,0);assert.equal(f.channel.lanes.tokens.size,0);
});
test('unknown refresh failure keeps selected owner fenced without freezing unrelated owners',async()=>{
 const f=fixture();await f.shared.hold(selected);f.channel.loadActor=async()=>{throw Error('lost refresh');};
 await assert.rejects(f.shared.release({token:selected.token,refreshActors:['recipient']}),/lost refresh/);
 assert.equal(f.channel.kernel.players.get('recipient').suspended,true);assert.equal(f.channel.kernel.players.get('bystander').suspended,false);assert(f.channel.lanes.busy(['player:recipient']));assert.equal(f.failures.length,1);
});
test('passive simulation owner is held and refreshed without inventing an ingress session',async()=>{
 const f=fixture();f.channel.owners.get('recipient').passive=1;f.runtime.rates.snapshot=()=>{throw Error('passive owner has no live session');};
 const ack=await f.shared.hold(selected);assert.equal(ack.actors[0].rates,null);assert.equal(f.channel.kernel.players.get('recipient').suspended,true);
 await f.shared.release({token:selected.token,refreshActors:['recipient']});assert.equal(f.channel.kernel.players.get('recipient').suspended,false);
});
test('authenticated stopped proof is preserved without resuming the retired actor',async()=>{
 const f=fixture(),proof={actor:'recipient',epoch:1,token:'stopped-token',session:'stopped-session',finalSequence:1};
 f.channel.quarantines.entries.set('recipient',{epoch:1,proof});Object.assign(f.channel.kernel.players.get('recipient'),{accepting:false,suspended:true,queue:[]});f.channel.writer.pending=new Map();
 const ack=await f.shared.hold({...selected,stopped:[proof]});assert.deepEqual(ack.actors,[]);assert.equal(ack.stoppedActors[0].actor,'recipient');
 await f.shared.release({token:selected.token,refreshActors:[]});assert.equal(f.channel.kernel.players.get('recipient').suspended,true);assert.equal(f.channel.kernel.players.get('recipient').accepting,false);
});
test('owner epoch changing during hold prevents release of the old memory image',async()=>{
 const f=fixture();await f.shared.hold(selected);f.channel.owners.get('recipient').epoch=2;
 await assert.rejects(f.shared.release({token:selected.token,refreshActors:['recipient']}));assert.equal(f.channel.kernel.players.get('recipient').suspended,true);assert(f.channel.lanes.busy(['player:recipient']));assert.equal(f.failures.length,1);
});
