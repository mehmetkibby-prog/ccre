import {parentPort,workerData} from 'node:worker_threads';
import {LocalDatabase} from '../../../working/native510-bb3a6cc689c6/vds-server/src/database.mjs';
import {ChannelAuthority} from '../../../working/core511-source/scripts/core511/receipt-authority.mjs';

const db=new LocalDatabase(workerData.file,{create:false,groupWrites:true,asyncDurable:false});
const authority=new ChannelAuthority(db,{realmId:'inline-r85',operations:{probe:{execute(sql,{payload,owner}){
 if(owner.sequence!==payload.expectedSequence)throw Error('stale_preflight');
 sql.prepare('UPDATE probe SET value=value+1 WHERE id=1').run();
 if(payload.rollback)throw Error('fixture_rollback');
 return {sequence:owner.sequence+1,value:sql.prepare('SELECT value FROM probe WHERE id=1').get().value};
}}}});
await authority.initialize();await authority.registerProcess(1,'inline-process');await authority.claim('inline-actor',1,'inline-process');
let active=false;parentPort.on('message',async message=>{
 if(message.close){db.close();parentPort.close();return;}
 if(active)throw Error('concurrent_writer_request');active=true;
 const start=performance.now();
 try{const ack=await authority.command({channel:1,incarnation:'inline-process'},message.request);parentPort.postMessage({id:message.id,ok:true,ack,workMs:performance.now()-start});}
 catch(error){parentPort.postMessage({id:message.id,ok:false,error:{message:error.message,code:error.code},workMs:performance.now()-start});}
 finally{active=false;}
});
parentPort.postMessage({ready:true,synchronous:db.sqlite.prepare('PRAGMA synchronous').get().synchronous});
