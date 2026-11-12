import {compactCombatIpcR52} from './r52-options.mjs';
import {replyWireR57} from './r57-options.mjs';
import {REPLY_WIRE_MARKER_R57,encodeReplyWireR57,decodeReplyWireR57} from './reply-wire-r57.mjs';
import {COMPACT_COMBAT_MARKER_R52,COMPACT_COMBAT_WIRE_BYTES_R52,compactCombatMethodR52,encodeCompactCombatReplyR52,decodeCompactCombatReplyR52} from './compact-combat-ipc-r52.mjs';
import {stageStartR51,observeStageR51} from './stage-timing-r51.mjs';
import net from 'node:net';
import {randomUUID} from 'node:crypto';
import {demand,kernelError,PROTOCOL} from './contract.mjs';
import {actorRejection,receiveActorRejection} from './actor-rejection.mjs';
import {r35Options} from './r35-options.mjs';
import {ProcessStream} from './process-stream.mjs';
import {ipcSafeStream,ipcDiagnostic} from './ipc-safe-stream.mjs';
import {ReadResultParts,beginReadParts,appendReadPart,readPartsMethod} from './ipc-read-parts.mjs';
import {markTransportNotSent} from './transport-not-sent.mjs';
import {controlIsolationFor,receiveActorIsolation} from './actor-isolation-proof.mjs';
import {controlFreezeFailureForR85,receiveFreezeFailureR85} from './freeze-failure-r85.mjs';
import {unprovenFreezeR85} from './freeze-outcomes-r85.mjs';
import {controlGlobalFreezeAbortFor,receiveGlobalFreezeAbort} from './global-freeze-abort-proof.mjs';
import {markIpcRequestError} from './ipc-request-context.mjs';
const MAX_FRAME=1048576;
// RegExp.test coerces undefined to the valid-looking string "undefined".
// Require an actual code string before selecting it; JSON must never omit the
// reason for a negative result, including plain Error or primitive rejections.
const failureCode=(error,fallback,method)=>{if(typeof error?.code==='string'&&/^[a-z0-9_]{1,80}$/.test(error.code))return error.code;if(ipcSafeStream)ipcDiagnostic(fallback,{method,error});return fallback;};
let framingObserver=null;
export function observeFraming(observer){demand(typeof observer==='function','framing_observer');const prior=framingObserver;framingObserver=observer;return()=>{framingObserver=prior;};}
export function framed(value) {
 const observe=framingObserver,started=observe?performance.now():0,text=JSON.stringify(value),encoded=observe?performance.now():0,size=Buffer.byteLength(text);if(ipcSafeStream&&!(size>0&&size<=MAX_FRAME))throw Object.assign(kernelError('ipc_frame_size'),{bytes:size,frameText:text});demand(size>0&&size<=MAX_FRAME,'ipc_frame_size');
 // One exact owned buffer; preserve the original length prefix and JSON bytes.
 const result=Buffer.allocUnsafe(size+4);result.writeUInt32BE(size);result.write(text,4);
 if(observe){const ended=performance.now();observe({type:value?.type,method:value?.method??null,startedAtMs:performance.timeOrigin+started,endedAtMs:performance.timeOrigin+ended,ms:ended-started,jsonMs:encoded-started,bufferMs:ended-encoded,bytes:size});}
 return result;
}
// A response can exceed the frame limit AFTER its handler committed. Return a
// coded transport failure, never forge a not_executed actor-rejection marker.
function replyBytes(frame,method,parts=null,compact=null){
 let outgoing=compact??frame;
 try{return framed(outgoing);}catch(error){
  // Compact envelopes above 4 MiB use the original bounded R50 transfer. With
  // at most 4 MiB of template expansion the decoder never exceeds its 8 MiB cap.
  if(outgoing!==frame&&error?.code==='ipc_frame_size'&&error.bytes>COMPACT_COMBAT_WIRE_BYTES_R52){outgoing=frame;try{return framed(frame);}catch(original){error=original;}}
  if(!ipcSafeStream||error?.code!=='ipc_frame_size')throw error;
  ipcDiagnostic('ipc_frame_size',{method,bytes:error.bytes});
  const retry=parts?.offer(frame.id,error.frameText);
  // Do not retain the oversized JSON text while waiting for cache capacity.
  if(retry===false)throw Object.assign(kernelError('ipc_read_parts_wait'),{bytes:error.bytes});
  const failure=outgoing===frame?frame:{...outgoing};delete failure.value;delete failure.actorRejection;delete failure[COMPACT_COMBAT_MARKER_R52];failure.ok=false;failure.code='ipc_frame_size';if(retry)failure.readParts=retry;return framed(failure);
 }
}
export function receiveFrames(socket,onFrame,onFailure) {
 const empty=Buffer.alloc(0);let buffer=empty;
 socket.on('data',bytes=>{
  try {
   buffer=buffer.length?Buffer.concat([buffer,bytes]):bytes;
   for(;;) {
    if(buffer.length<4)return;
    const size=buffer.readUInt32BE();demand(size>0&&size<=MAX_FRAME,'ipc_frame_size');
    if(buffer.length<size+4)return;
    const frame=JSON.parse(buffer.toString('utf8',4,size+4));buffer=buffer.length===size+4?empty:buffer.subarray(size+4);
    onFrame(frame,size);
   }
  } catch(error){onFailure(error);socket.destroy();}
 });
}
// A single connection authenticates at handshake. Unacknowledged operations
// retain their IDs and replay after reconnect. The receiver's durable ledger,
// not an ephemeral socket cache, decides whether an event has been applied.
export class ReliableStream {
 constructor({path,open,handshake,maxPending=128,retryMs=100,onState=()=>{},control=null}) {
  demand(typeof open==='function'||typeof path==='string'&&path.startsWith('/'),'ipc_transport_required');
  this.path=path;this.open=open??(()=>net.createConnection(this.path));this.handshake=handshake;this.maxPending=maxPending;this.retryMs=retryMs;this.onState=onState;
  this.pending=new Map();this.socket=null;this.ready=false;this.closed=false;this.timer=null;this.serial=0;this.requestPrefix=randomUUID();this.control=control;this.controls=new Map();this.controlCompleted=new Map();
 }
 start(){demand(!this.closed,'ipc_closed');this.connect();}
 connect() {
  if(this.closed||this.socket)return;
  const socket=this.open();this.socket=socket;
  const deadline=setTimeout(()=>socket.destroy(),5000);
  socket.on('connect',()=>{try{socket.write(framed({...this.handshake(),type:'hello',protocol:PROTOCOL}));}catch(error){this.onState('error',error.code);socket.destroy();}});
  receiveFrames(socket,(frame,wireBytes)=>{
   if(this.socket!==socket)return;
   if(!this.ready){
    demand(frame.type==='ready'&&frame.protocol===PROTOCOL,'ipc_auth_failed');clearTimeout(deadline);this.ready=true;this.onState('ready');
    for(const row of this.pending.values()){row.sent=false;delete row.parts;}this.flush();return;
   }
   if(frame.type==='control'){
    demand(typeof this.control==='function'&&typeof frame.id==='string'&&frame.id.length<=160&&typeof frame.method==='string','invalid_ipc_control');
    const completed=this.controlCompleted.get(frame.id),pending=this.controls.get(frame.id),fingerprint=JSON.stringify([frame.method,frame.payload]);
    if(completed||pending)demand((completed??pending).fingerprint===fingerprint,'ipc_control_id_reused');
    const send=value=>{if(this.socket===socket&&this.ready&&!socket.destroyed)socket.write(ipcSafeStream?replyBytes(value,frame.method):framed(value));};
    if(completed){send(completed.frame);return;}
    demand(pending||this.controls.size<this.maxPending,'ipc_control_backpressure');
    let task=pending;
    if(!task){task={fingerprint,promise:null};this.controls.set(frame.id,task);task.promise=Promise.resolve().then(()=>this.control(frame.method,frame.payload,frame.id)).then(value=>({type:'control_result',id:frame.id,ok:true,value}),error=>{const unproven=unprovenFreezeR85(error),isolation=unproven?null:controlIsolationFor(error,frame.method,frame.payload),freezeFailure=unproven?null:controlFreezeFailureForR85(error,frame.method,frame.payload),aborted=controlGlobalFreezeAbortFor(error,frame.method,frame.payload);return {type:'control_result',id:frame.id,ok:false,code:failureCode(error,'ipc_control_failed',frame.method),...(isolation?{actorIsolation:isolation}:{}),...(freezeFailure?{freezeFailureR85:freezeFailure}:{}),...(aborted?{globalFreezeAbort:aborted}:{})};}).then(result=>{this.controls.delete(frame.id);this.controlCompleted.set(frame.id,{fingerprint,frame:result});if(this.controlCompleted.size>512)this.controlCompleted.delete(this.controlCompleted.keys().next().value);return result;});}
    void task.promise.then(send).catch(()=>socket.destroy());return;
   }
   if(ipcSafeStream&&frame.type==='result_part'){
    const row=this.pending.get(frame.id);wireBytes=row?.parts?.buffer.length;const result=appendReadPart(row,frame);
    if(!result){socket.write(framed({type:'result_part_request',id:frame.id,index:row.parts.index}));return;}frame=result;
   }
   demand(frame.type==='result'&&typeof frame.id==='string','invalid_ipc_result');
   const row=this.pending.get(frame.id);if(!row)return;
   if(ipcSafeStream&&frame.ok===false&&frame.code==='ipc_frame_size'&&frame.readParts&&row.readParts){beginReadParts(row,frame.readParts);socket.write(framed({type:'result_part_request',id:frame.id,index:0}));return;}
   if(Object.hasOwn(frame,REPLY_WIRE_MARKER_R57)){demand(row.replyWireR57&&compactCombatMethodR52(row.method),'ipc_reply_wire_not_negotiated');const decoded=decodeReplyWireR57(frame);frame=decoded.frame;wireBytes=decoded.wireBytes;}
   if(Object.hasOwn(frame,COMPACT_COMBAT_MARKER_R52)){demand(row.compactCombatR52&&compactCombatMethodR52(row.method),'ipc_compact_not_negotiated');frame=decodeCompactCombatReplyR52(frame,wireBytes);}
   const rejection=frame.ok===true?null:receiveActorRejection(kernelError(typeof frame.code==='string'?frame.code:'ipc_rejected'),frame.actorRejection,row.method,row.payload);
   this.pending.delete(frame.id);
   frame.ok===true?row.resolve(frame.value):row.reject(markIpcRequestError(rejection,row.method,row.payload));
   this.flush();
  },error=>this.onState('error',error.code));
  socket.on('drain',()=>this.flush());socket.on('error',()=>{});
  socket.on('close',()=>{
   clearTimeout(deadline);if(this.socket!==socket)return;
   this.socket=null;this.ready=false;this.onState('disconnected');
   if(!this.closed)this.timer=setTimeout(()=>{this.timer=null;this.connect();},this.retryMs);
  });
 }
 request(method,payload,{id,readParts=false}={}) {
  if(this.closed)return Promise.reject(kernelError('ipc_closed'));
  if(this.pending.size>=this.maxPending)return Promise.reject(markTransportNotSent(kernelError('ipc_backpressure'),method,payload));
  const allocate=id===undefined;if(allocate)id=this.requestPrefix+':'+(this.serial+1);
  if(this.pending.has(id))return Promise.reject(kernelError('ipc_duplicate_pending_id'));
  readParts=ipcSafeStream&&readParts===true&&readPartsMethod(method);
  const compactCombatR52=compactCombatIpcR52&&compactCombatMethodR52(method);
  const compressedR57=ipcSafeStream&&replyWireR57&&compactCombatMethodR52(method);
  let bytes;try{bytes=framed({type:'request',id,method,payload,...(readParts?{readParts:true}:{}),...(compactCombatR52?{compactCombatR52:1}:{}),...(compressedR57?{replyWireR57:1}:{})});}catch(e){return Promise.reject(markTransportNotSent(e,method,payload));}
  if(allocate)this.serial++;
  return new Promise((resolve,reject)=>{this.pending.set(id,{bytes,resolve,reject,sent:false,method,payload,readParts,compactCombatR52,replyWireR57:compressedR57});this.flush();});
 }
 flush() {
  if(!this.ready||!this.socket||this.socket.writableNeedDrain)return;
  for(const row of this.pending.values())if(!row.sent){
   row.sent=true;if(!this.socket.write(row.bytes))break;
  }
 }
 close() {
  this.closed=true;clearTimeout(this.timer);this.socket?.destroy();this.socket=null;this.ready=false;
  for(const [id,row]of this.pending)row.reject(markIpcRequestError(Object.assign(kernelError('ipc_outcome_unknown'),{operationId:id}),row.method,row.payload));
  this.pending.clear();
 }
}
export function createStreamServer(options) {
 return net.createServer(socket=>acceptStreamSocket(socket,options));
}
// The parent retains this object per process incarnation while the physical
// socket reconnects. Freeze/refresh/admission calls retain IDs on ACK loss.
export class StreamControl {
 constructor({maxPending=128}={}){this.pending=new Map();this.send=null;this.maxPending=maxPending;this.closed=false;}
 attach(send){demand(!this.closed,'ipc_control_closed');this.send=send;for(const task of this.pending.values())send(task.frame,task.bytes);}
 detach(send){if(this.send===send)this.send=null;}
 // Only bounded diagnostics may abandon an unanswered request. Durable
 // freeze/admission/refresh controls retain their existing replay semantics.
 request(method,payload,{id=randomUUID(),timeoutMs=null}={}){demand(!this.closed,'ipc_control_closed');demand(this.pending.size<this.maxPending,'ipc_control_backpressure');demand(!this.pending.has(id),'ipc_control_duplicate_pending_id');demand(timeoutMs===null||['metrics','profile','load_measure'].includes(method)&&Number.isSafeInteger(timeoutMs)&&timeoutMs>0&&timeoutMs<=5000,'ipc_control_timeout_scope');const stage=stageStartR51(),frame={type:'control',id,method,payload},encoded=framed(frame),bytes=r35Options.writerHygiene?encoded:undefined;return observeStageR51('control.'+method,stage,new Promise((resolve,reject)=>{const row={frame,bytes,resolve,reject,timer:null};this.pending.set(id,row);if(timeoutMs!==null){row.timer=setTimeout(()=>{if(this.pending.get(id)!==row)return;this.pending.delete(id);reject(kernelError('ipc_control_timeout'));},timeoutMs);row.timer.unref();}this.send?.(frame,bytes);}));}
 receive(frame){demand(frame.type==='control_result'&&typeof frame.id==='string','invalid_control_result');const row=this.pending.get(frame.id);if(!row)return;const error=frame.ok===true?null:receiveFreezeFailureR85(receiveGlobalFreezeAbort(receiveActorIsolation(kernelError(typeof frame.code==='string'?frame.code:'ipc_control_failed'),frame.actorIsolation,row.frame.method,row.frame.payload),frame.globalFreezeAbort,row.frame.method,row.frame.payload),frame.freezeFailureR85,row.frame.method,row.frame.payload);this.pending.delete(frame.id);clearTimeout(row.timer);frame.ok===true?row.resolve(frame.value):row.reject(markIpcRequestError(error,row.frame.method,row.frame.payload));}
 close(){this.closed=true;this.send=null;for(const row of this.pending.values()){clearTimeout(row.timer);row.reject(markIpcRequestError(kernelError('ipc_control_outcome_unknown'),row.frame.method,row.frame.payload));}this.pending.clear();}
}
export function acceptStreamSocket(socket,{authenticate,dispatch,maxInflight=128,maxInflightFor=null,controlFor=null,onClose=()=>{}}) {
  let peer=null,pending=0,closed=false,authenticating=false;const readParts=ipcSafeStream?new ReadResultParts():null;
  const deadline=setTimeout(()=>socket.destroy(),5000);
  let control=null;
  socket.on('error',()=>{});socket.on('close',()=>{closed=true;clearTimeout(deadline);readParts?.clear();control?.detach(send);onClose(peer);});
  const send=(frame,encoded)=>{if(!closed){const bytes=encoded??framed(frame);if(socket.writableLength+bytes.length>(ipcSafeStream&&peer&&socket instanceof ProcessStream&&socket.name==='kernel511'?64:4)*MAX_FRAME){socket.destroy();return;}socket.write(bytes);}};
  const sendResult=(result,method,parts,compact=null)=>{
   if(closed)return;
   try{send(result,replyBytes(result,method,parts,compact));}catch(error){if(error.code!=='ipc_read_parts_wait'||!parts)throw error;return parts.wait(result.id,error.bytes).then(()=>sendResult(result,method,parts,compact));}
  };
  receiveFrames(socket,frame=>{
   if(!peer){
    if(authenticating||frame.type!=='hello'||frame.protocol!==PROTOCOL){socket.destroy();return;}
    authenticating=true;
    Promise.resolve().then(()=>authenticate(frame,socket)).then(value=>{
     if(!value||closed){socket.destroy();return;}peer=value;clearTimeout(deadline);send({type:'ready',protocol:PROTOCOL});control=controlFor?.(peer)??null;control?.attach(send);
    },()=>socket.destroy()).catch(()=>socket.destroy());return;
   }
   if(ipcSafeStream&&frame.type==='result_part_request'){
    demand(socket instanceof ProcessStream&&socket.name==='kernel511','ipc_read_part_transport');send(readParts.take(frame.id,frame.index));return;
   }
   if(frame.type==='control_result'){if(!control){socket.destroy();return;}control.receive(frame);return;}
   if(frame.type!=='request'||typeof frame.id!=='string'||frame.id.length>160||typeof frame.method!=='string'||++pending>(maxInflightFor?.(peer)??maxInflight)){socket.destroy();return;}
   Promise.resolve().then(()=>dispatch(peer,frame.method,frame.payload,frame.id))
    .then(value=>{if(closed)return;const result={type:'result',id:frame.id,ok:true,value};if(ipcSafeStream){const nativePipe=socket instanceof ProcessStream&&socket.name==='kernel511',compact=compactCombatIpcR52&&frame.compactCombatR52===1&&compactCombatMethodR52(frame.method)&&nativePipe?encodeCompactCombatReplyR52(result):null;const compressed=replyWireR57&&frame.replyWireR57===1&&compactCombatMethodR52(frame.method)&&nativePipe?encodeReplyWireR57(compact??result):null;return sendResult(result,frame.method,frame.readParts===true&&readPartsMethod(frame.method)&&nativePipe?readParts:null,compressed??compact);}send(result);},error=>{if(closed)return;const result={type:'result',id:frame.id,ok:false,code:failureCode(error,'ipc_handler_failed',frame.method),...(actorRejection(error)?{actorRejection:actorRejection(error)}:{})};send(result,ipcSafeStream?replyBytes(result,frame.method):undefined);})
    .finally(()=>pending--).catch(()=>socket.destroy());
  },()=>socket.destroy());
}
