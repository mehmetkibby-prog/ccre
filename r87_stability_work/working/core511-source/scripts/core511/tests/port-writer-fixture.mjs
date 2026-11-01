import {parentPort,workerData} from 'node:worker_threads';
import {native} from './helpers.mjs';
import {DurableLedger} from '../durable-ledger.mjs';
import {MessagePortStream} from '../message-port-stream.mjs';
import {acceptStreamSocket} from '../reliable-stream.mjs';
const {LocalDatabase}=await native('vds-server/src/database.mjs'),database=new LocalDatabase(workerData.file,{groupWrites:true,asyncDurable:true});
const ledger=new DurableLedger(database,{authorize:(_,peer,event)=>peer.realm==='test'&&event.realm==='test',handlers:new Map([['fixture',(sqlite,payload)=>{sqlite.prepare('UPDATE fixture SET amount=amount+? WHERE id=1').run(payload.amount);return {amount:sqlite.prepare('SELECT amount FROM fixture').get().amount};}]])});
let disconnected=false;const sockets=new Set();
parentPort.on('message',message=>{
 if(message.port){const socket=new MessagePortStream(message.port);sockets.add(socket);socket.on('close',()=>sockets.delete(socket));
  acceptStreamSocket(socket,{authenticate:hello=>{if(hello.proof!==workerData.proof)throw Error('proof');return {realm:'test'};},dispatch:async(peer,method,event)=>{
   if(method!=='economy')throw Error('method');const result=await ledger.submit(peer,event);
   if(workerData.dropAck&&!disconnected){disconnected=true;socket.destroy();}return result;
  }});
 }else if(message.stop){for(const socket of sockets)socket.destroy();database.close();parentPort.postMessage({stopped:true});parentPort.close();}
});parentPort.postMessage({ready:true});
