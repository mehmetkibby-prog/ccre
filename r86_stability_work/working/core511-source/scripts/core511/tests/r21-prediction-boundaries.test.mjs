import {test} from 'node:test';
import assert from 'node:assert/strict';
import {OwnPrediction,BufferedInterpolation} from '../movement-prediction.mjs';
const row=(x=0,y=0,r=1)=>({id:'me',x,y,area:'bazaar',position_revision:r});
const walk=(vx=100,vy=0)=>(p,dt)=>({x:p.x+vx*dt,y:p.y+vy*dt});
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);

test('first frame moves before any packet or result',()=>{const p=new OwnPrediction();p.bind(row(),'room',0);const shown=p.advance(1/60,walk(),16.67);near(shown.x,100/60);assert.equal(p.flight,null);});
test('committed sequence drops exactly its inputs, then replays later inputs',()=>{const p=new OwnPrediction();p.bind(row(),'room',0);p.advance(.1,walk(),100);const b=p.batch();p.sent(8,b);p.advance(.1,walk(0,100),200);p.acknowledge(8,200,{ok:true,x:10,y:0,positionRevision:2},200);near(p.predicted.x,10);near(p.predicted.y,10);assert.ok(p.pending.every(x=>x.id>b.through));const next=p.batch();assert.equal(next.payload.basePositionRevision,2);near(next.payload.x,10);near(next.payload.y,10);});
test('unrelated and duplicate ACK cannot consume movement history',()=>{const p=new OwnPrediction();p.bind(row(),'r',0);p.advance(.1,walk(),100);p.sent(2,p.batch());assert.equal(p.acknowledge(1,200,{x:0,y:0,positionRevision:1},100),false);assert.equal(p.pending.length,2);p.acknowledge(2,200,{x:10,y:0,positionRevision:2},100);assert.equal(p.acknowledge(2,200,{x:50,y:0,positionRevision:3},100),false);near(p.predicted.x,10);});
test('small correction decays in 100ms instead of jumping',()=>{const p=new OwnPrediction();p.bind(row(),'r',0);p.advance(.1,walk(),100);p.sent(1,p.batch());p.acknowledge(1,200,{x:9,y:0,positionRevision:2},100);near(p.position(100).x,10);near(p.position(150).x,9.5);near(p.position(200).x,9);});
test('movement rejection discards speculation and snaps immediately',()=>{const p=new OwnPrediction();p.bind(row(),'r',0);p.advance(.25,walk(),250);p.sent(1,p.batch());p.advance(.1,walk(),350);p.acknowledge(1,409,{code:'movement_path_rejected',x:2,y:0,area:'bazaar',positionRevision:1},350);near(p.position(350).x,2);assert.equal(p.pending.length,0);assert.equal(p.batch(),null);});
test('teleport and scope transition never replay old inputs',()=>{const p=new OwnPrediction();p.bind(row(),'r',0);p.advance(.1,walk(),100);p.sent(1,p.batch());p.bind(row(800,400,4),'r',120);near(p.position(120).x,800);assert.equal(p.pending.length,0);p.bind({...row(0,0,5),area:'forest'},'new-map',130);near(p.position(130).x,0);assert.equal(p.flight,null);});
test('old world image cannot undo a newer movement ACK',()=>{const p=new OwnPrediction();p.bind(row(),'r',0);p.advance(.1,walk(),100);p.sent(1,p.batch());p.acknowledge(1,200,{x:10,y:0,positionRevision:2},100);p.bind(row(),'r',110);near(p.position(110).x,10);});
test('V510 collision callback is used for both prediction and replay',()=>{const p=new OwnPrediction();p.bind(row(),'r',0);const wall=(p,dt)=>({x:Math.min(12,p.x+100*dt),y:p.y});p.advance(.1,wall,100);p.sent(1,p.batch());p.advance(.1,wall,200);near(p.predicted.x,12);p.acknowledge(1,200,{x:10,y:0,positionRevision:2},200);near(p.predicted.x,12);});
test('lagged connection has bounded history and no accumulated catch-up sprint',()=>{const p=new OwnPrediction();p.bind(row(),'r',0);for(let i=0;i<6000;i++)p.advance(1/60,walk(),i*1000/60);assert.ok(p.pending.length<=128);near(p.predicted.x,60);assert.ok(p.batch().seconds<=.350001);p.cancel(100000);near(p.predicted.x,0);assert.equal(p.batch(),null);});
test('release keeps a final unsent input batch; idle frames add no movement',()=>{const p=new OwnPrediction();p.bind(row(),'r',0);p.advance(.1,walk(),100);p.advance(.1,p=>p,200);near(p.predicted.x,10);assert.ok(p.batch());near(p.batch().seconds,.1);});
test('remote player and monster use 100ms interpolation, never extrapolate',()=>{const p=new BufferedInterpolation();const world=x=>({world:{cycle:1},channel:1,area:'bazaar',players:[{id:'other',x,y:0}],monsters:[{id:'mob',x,y:0,spawn_round:1}]});p.accept(world(0),0);p.accept(world(10),100);p.accept(world(20),200);near(p.position('players',world(20).players[0],250).x,15);near(p.position('monsters',world(20).monsters[0],250).x,15);near(p.position('players',world(20).players[0],1000).x,20);});
test('remote respawn and large jump snap; despawns are pruned',()=>{const p=new BufferedInterpolation();const w=(x,spawn=1)=>({world:{cycle:1},channel:1,area:'bazaar',players:[],monsters:[{id:'m',x,y:0,spawn_round:spawn}]});p.accept(w(0),0);p.accept(w(500),100);near(p.position('monsters',w(500).monsters[0],100).x,500);p.accept(w(10,2),200);near(p.position('monsters',w(10,2).monsters[0],200).x,10);p.accept({...w(0),monsters:[]},300);assert.equal(p.rows.size,0);});
test('sparse 200ms remote movement does not stall between unchanged world packets',()=>{
 const p=new BufferedInterpolation(),w=x=>({world:{cycle:1},channel:1,area:'bazaar',players:[{id:'other',x,y:0}],monsters:[]});let previous=0;
 for(let t=0;t<=1600;t+=20){const x=Math.floor(t/200)*20;p.accept(w(x),t);const shown=p.position('players',w(x).players[0],t).x;if(t>=420){near(shown-previous,2);}previous=shown;}
 assert.ok(p.rows.get('players:other').samples.length<20);
});
test('remote stop is held without drift, and idle restart does not replay the idle gap',()=>{
 const p=new BufferedInterpolation(),w=x=>({world:{cycle:1},channel:1,area:'bazaar',players:[{id:'other',x,y:0}],monsters:[]});p.accept(w(0),0);p.accept(w(20),200);
 near(p.position('players',w(20).players[0],1000).x,20);p.accept(w(20),2000);near(p.position('players',w(20).players[0],2000).x,20);
 p.accept(w(30),3000);near(p.position('players',w(30).players[0],3000).x,20);near(p.position('players',w(30).players[0],3050).x,25);near(p.position('players',w(30).players[0],3100).x,30);
});

test('nonadmitted dependency clears only its flight and keeps speculative direction order',()=>{const p=new OwnPrediction();p.bind(row(),'r',0);p.advance(.1,walk(),100);p.sent(1,p.batch());p.advance(.1,walk(0,100),200);p.notQueued(2);assert(p.flight);p.notQueued(1);assert.equal(p.flight,null);near(p.predicted.x,10);near(p.predicted.y,10);near(p.batch().seconds,.2);});
