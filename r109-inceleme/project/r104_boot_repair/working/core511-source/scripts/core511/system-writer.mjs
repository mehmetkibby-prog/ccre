import {compactCheckpointAckR53} from './checkpoint-ack-r53.mjs';
import {prepareServerStatement} from './server-statements.mjs';
import {eventDigest} from './durable-ledger.mjs';
import {demand,validChannel} from './contract.mjs';
import {timedAtomicR51} from './stage-timing-r51.mjs';

const identity=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{1,80}$/.test(value);
export function systemService(peer){
 demand(identity(peer?.realm)&&identity(peer?.incarnation),'system_peer_identity');
 if(peer.channel===0){demand(peer.role==='world','system_world_identity');return 'world';}
 demand(validChannel(peer.channel)&&(!peer.role||peer.role==='channel'),'system_channel_identity');return 'channel:'+peer.channel;
}

// Timers and shared monster state have an explicit process owner. They never
// borrow a player's admission, session or economy sequence, including at zero
// online players. Registration is parent-only; no wire request can claim it.
export class SystemWriter {
 constructor(database,{realmId,authority,clock=Date.now}){
  demand(identity(realmId)&&authority&&database?.atomic,'system_writer_dependencies');
  Object.assign(this,{database,realmId,authority,clock});this.operations=new Map();this.pending=0;
 }
 initialize(){return this.database.atomic(db=>db.exec(`
  CREATE TABLE IF NOT EXISTS kernel511_system_owners(
   service TEXT PRIMARY KEY,incarnation TEXT NOT NULL,epoch INTEGER NOT NULL,
   sequence INTEGER NOT NULL DEFAULT 0,online INTEGER NOT NULL CHECK(online IN(0,1)));
  CREATE TABLE IF NOT EXISTS kernel511_system_receipts(
   operation_id TEXT PRIMARY KEY,service TEXT NOT NULL,epoch INTEGER NOT NULL,
   sequence INTEGER NOT NULL,digest TEXT NOT NULL,response TEXT NOT NULL,created_ms INTEGER NOT NULL,
   UNIQUE(service,epoch,sequence));
 `));}
 add(kind,execute){demand(/^[a-z_]{1,80}$/.test(kind)&&typeof execute==='function'&&execute.constructor.name!=='AsyncFunction'&&!this.operations.has(kind),'system_operation_registration');this.operations.set(kind,execute);}
 owner(service,db=this.database.sqlite){return prepareServerStatement(db,'SELECT * FROM kernel511_system_owners WHERE service=?').get(service)??null;}
 register(peer){
  const service=systemService(peer);demand(peer.realm===this.realmId,'system_realm_fenced');
  return this.database.atomic(db=>{
   if(peer.channel!==0)this.authority.assertProcess(peer.channel,peer.incarnation,db);
   const old=this.owner(service,db);
   if(old?.online&&old.incarnation===peer.incarnation)return old;
   // A world replacement requires a recorded actual child exit. Channel exit
   // authority is already enforced by the channel supervisor/authority pair.
   demand(peer.channel!==0||!old?.online,'system_process_still_live');
   prepareServerStatement(db,`INSERT INTO kernel511_system_owners VALUES(?,?,1,0,1)
    ON CONFLICT(service) DO UPDATE SET incarnation=excluded.incarnation,epoch=epoch+1,sequence=0,online=1`).run(service,peer.incarnation);
   return this.owner(service,db);
  });
 }
 disconnect(peer){const service=systemService(peer);demand(peer.realm===this.realmId,'system_realm_fenced');return this.database.atomic(db=>{prepareServerStatement(db,'UPDATE kernel511_system_owners SET online=0 WHERE service=? AND incarnation=?').run(service,peer.incarnation);return {offline:true};});}
 assert(db,peer,epoch){
  const service=systemService(peer);demand(peer.realm===this.realmId,'system_realm_fenced');
  if(peer.channel!==0)this.authority.assertProcess(peer.channel,peer.incarnation,db);
  const owner=this.owner(service,db);demand(owner?.online===1&&owner.incarnation===peer.incarnation&&owner.epoch===epoch,'system_epoch_fenced');return owner;
 }
 async command(peer,request){
  demand(this.pending<128,'system_writer_backpressure');
  const service=systemService(peer),{epoch,sequence,key,kind,payload}=request??{};
  demand(Number.isSafeInteger(epoch)&&epoch>0&&Number.isSafeInteger(sequence)&&sequence>0&&typeof key==='string'&&/^[A-Za-z0-9:_.-]{1,240}$/.test(key)&&this.operations.has(kind),'system_command_fields');
  demand(Buffer.byteLength(JSON.stringify(payload)??'')<=262144,'system_command_size');
  const digest=eventDigest({realm:this.realmId,service,incarnation:peer.incarnation,epoch,sequence,kind,payload});this.pending++;
  try{return await timedAtomicR51(this.database,db=>{
   const owner=this.assert(db,peer,epoch);if(this.commandGuard)demand(this.commandGuard(db,peer,request)===true,'system_command_fenced');const prior=prepareServerStatement(db,'SELECT * FROM kernel511_system_receipts WHERE operation_id=?').get(key);
   if(prior){demand(prior.digest===digest,'system_key_reused');return JSON.parse(prior.response);}
   demand(sequence===owner.sequence+1,sequence<=owner.sequence?'system_operation_retired':'system_sequence_gap');
   const nativeResult=this.operations.get(kind)(db,payload,{peer,service,epoch,key,realm:this.realmId});demand(!nativeResult?.then,'system_async_operation');
   const result=compactCheckpointAckR53(kind,payload,nativeResult);
   const ack={key,sequence,result},response=JSON.stringify(ack);demand(response&&Buffer.byteLength(response)<=262144,'system_response_size');
   prepareServerStatement(db,'INSERT INTO kernel511_system_receipts VALUES(?,?,?,?,?,?,?)').run(key,service,epoch,sequence,digest,response,this.clock());
   prepareServerStatement(db,'UPDATE kernel511_system_owners SET sequence=? WHERE service=?').run(sequence,service);return ack;
  },kind);}finally{this.pending--;}
 }
}

export class OrderedSystemClient {
 constructor({owner,request,onUnknown=()=>{}}){demand(owner?.online===1&&Number.isSafeInteger(owner.epoch)&&Number.isSafeInteger(owner.sequence)&&typeof request==='function','system_client_boot');Object.assign(this,{epoch:owner.epoch,sequence:owner.sequence,request,onUnknown});this.tail=Promise.resolve();this.pending=0;this.failure=null;}
 submit({key,kind,payload}){
  demand(!this.failure&&this.pending<128,'system_client_fenced');this.pending++;
  const work=this.tail.then(async()=>{
   demand(!this.failure,'system_client_fenced');const sequence=this.sequence+1;
   const ack=await this.request({epoch:this.epoch,sequence,key,kind,payload});demand(ack?.key===key&&ack.sequence===sequence,'system_ack_mismatch');this.sequence=sequence;return ack;
  }).catch(error=>{if(!this.failure){this.failure=error;this.onUnknown(error);}throw error;}).finally(()=>this.pending--);
  this.tail=work.catch(()=>{});return work;
 }
 // At most eight existing, independently bounded system requests. IPC arrival
 // order and the single writer FIFO retain exact consecutive owner sequences.
 // The tail excludes every other system operation until ALL outcomes are known.
 submitBatch(commands){
  demand(!this.failure&&Array.isArray(commands)&&commands.length>0&&commands.length<=8&&this.pending+commands.length<=128&&new Set(commands.map(c=>c.key)).size===commands.length,'system_client_batch_fenced');
  this.pending+=commands.length;
  const work=this.tail.then(async()=>{
   demand(!this.failure,'system_client_fenced');const start=this.sequence;
   const outcomes=await Promise.allSettled(commands.map((command,i)=>this.request({...command,epoch:this.epoch,sequence:start+i+1})));
   const rejected=outcomes.find(r=>r.status==='rejected');if(rejected)throw rejected.reason;
   const acks=outcomes.map(r=>r.value);for(let i=0;i<acks.length;i++)demand(acks[i]?.key===commands[i].key&&acks[i].sequence===start+i+1,'system_ack_mismatch');
   this.sequence=start+acks.length;return acks;
  }).catch(error=>{if(!this.failure){this.failure=error;this.onUnknown(error);}throw error;}).finally(()=>this.pending-=commands.length);
  this.tail=work.catch(()=>{});return work;
 }
 async drain(){await this.tail;demand(!this.failure&&!this.pending,'system_client_fenced');return this.sequence;}
}
