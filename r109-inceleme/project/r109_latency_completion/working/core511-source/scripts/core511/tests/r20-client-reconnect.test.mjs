import test from 'node:test';
import assert from 'node:assert/strict';
import {Core511Transport,CLIENT_PROTOCOL as protocol} from '../client-transport.mjs';
import {until} from './helpers.mjs';

function fixture(){
 class Socket extends EventTarget {
  static all=[];
  constructor(){super();this.sent=[];this.bufferedAmount=0;this.readyState=1;Socket.all.push(this);queueMicrotask(()=>this.dispatchEvent(new Event('open')));}
  send(text){this.sent.push(JSON.parse(text));}
  packet(value){this.dispatchEvent(new MessageEvent('message',{data:JSON.stringify(value)}));}
  close(){if(this.readyState===3)return;this.readyState=3;this.dispatchEvent(new Event('close'));}
 }
 const core=new Core511Transport({fetch:async()=>Response.json({protocol,playerId:'p',channel:1,epoch:1,url:'/game/channel/1',ticket:'fixture'}),WebSocket:Socket,origin:'https://fixture.invalid',headers:()=>({})});
 async function connect({accepted=0,applied=0,results=[]}={}){
  clearTimeout(core.reconnectTimer);core.reconnectTimer=null;
  const count=Socket.all.length,task=core.ensure();await until(()=>Socket.all.length>count&&Socket.all.at(-1).sent.some(p=>p.type==='auth'));
  const socket=Socket.all.at(-1);socket.packet({type:'ready',protocol,channel:1,epoch:1,lastAccepted:accepted,lastApplied:applied,results});await task;return socket;
 }
 const result=(sequence,body={ok:true})=>({type:'action',sequence,status:200,body});
 return {core,connect,result};
}

test('reconnect with a committed attack and queued loot sends the next input exactly once',async()=>{
 const f=fixture();try{
  let ws=await f.connect();const attack=f.core.command({action:'attack',targetId:'monster',ability:0}),loot=f.core.command({action:'claim_rewards'});
  await until(()=>f.core.active&&f.core.queue.length===1);assert.equal(ws.sent.filter(p=>p.type==='input').length,1);ws.close();
  ws=await f.connect({accepted:1,applied:1,results:[f.result(1,{ok:true,hp:0})]});assert.equal((await attack).body.hp,0);
  const inputs=ws.sent.filter(p=>p.type==='input');assert.equal(inputs.length,1,'replayed result must not send a fresh queued command twice');assert.equal(inputs[0].sequence,2);assert.equal(inputs[0].payload.action,'claim_rewards');
  ws.packet({type:'frame',protocol,results:[f.result(2)]});assert.equal((await loot).status,200);
 }finally{f.core.dispose();}
});

test('reconnect never replays an accepted pending command and keeps queued commands behind its result',async()=>{
 const f=fixture();try{
  let ws=await f.connect();const attack=f.core.command({action:'attack',targetId:'monster',ability:0}),loot=f.core.command({action:'claim_rewards'});await until(()=>f.core.active&&f.core.queue.length===1);ws.close();
  ws=await f.connect({accepted:1,applied:0});assert.equal(ws.sent.filter(p=>p.type==='input').length,0,'accepted work waits for its original result');
  ws.packet({type:'frame',protocol,results:[f.result(1)]});assert.equal((await attack).status,200);assert.equal(ws.sent.filter(p=>p.type==='input').length,1);assert.equal(ws.sent.at(-1).sequence,2);
  ws.packet({type:'frame',protocol,results:[f.result(2)]});await loot;
 }finally{f.core.dispose();}
});
