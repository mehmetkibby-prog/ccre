import {createHmac,randomBytes} from 'node:crypto';
import {ipcRequestContext} from './ipc-request-context.mjs';
import {recoveryCauseR532} from './r532-options.mjs';

// Cold lifecycle events only. A checkpoint-error flood must never suppress the
// reason for an actual OS signal. No payload, credential or raw actor ID leaves
// this module. References are boot-local and cannot identify another session.
const states=new WeakMap(),causes=new WeakSet();
const name=(v,fallback=null)=>typeof v==='string'&&/^[A-Za-z][A-Za-z0-9_.:-]{0,95}$/.test(v)?v:fallback;
const integer=v=>Number.isSafeInteger(v)&&v>=0?v:null;
function state(core){let s=states.get(core);if(!s){s={key:randomBytes(32),next:0,errors:new WeakMap()};states.set(core,s);}return s;}
function ref(s,value){return typeof value==='string'&&value.length<=256?createHmac('sha256',s.key).update(value).digest('hex').slice(0,24):null;}
function locations(error){return String(error?.stack??'').split('\n').slice(1).flatMap(line=>{const m=/([A-Za-z0-9_.-]+\.m?js):(\d+):(\d+)\)?$/.exec(line.trim());return m?[{file:m[1],line:Number(m[2]),column:Number(m[3])}]:[];}).slice(0,8);}
export function recoveryCause(core,issue={},origin='unspecified'){
 if(issue&&typeof issue==='object'&&causes.has(issue))return issue;
 const s=state(core),error=issue?.error??(issue instanceof Error?issue:null),e=error&&typeof error==='object'?error:null;
 const held=core.sharedWorld?.combat?.terminal,row=held?.row,request=row?.commandRequest;
 const c={...e?.context,...e?.fenceContext,...ipcRequestContext(e),...issue};
 let incident=e&&s.errors.get(e);if(!incident){incident=++s.next;if(e)s.errors.set(e,incident);}
 const cause=Object.freeze({incident,reason:name(e?.code??issue?.code,'runtime_fault'),origin:name(origin,'unspecified'),requestMethod:name(c.requestMethod??c.method??(c.operation?'command':null)),operation:name(c.requestOperation??c.operation??request?.operation),actorRef:ref(s,c.actor??c.playerId??row?.source.actor),sourceChannel:integer(c.channel??c.peer?.channel??row?.source.channel),phase:name(c.phase??held?.phase),stack:locations(e??new Error())});
 causes.add(cause);return cause;
}
export function recoveryDiagnostic(core,event,cause,detail={}){
 if(!recoveryCauseR532)return;
 const safe=recoveryCause(core,cause,event),s=state(core),row={event:'core511_recovery_cause',at:new Date().toISOString(),action:name(event,'unspecified'),...safe};
 for(const key of ['channel','pid'])if(integer(detail[key])!==null)row[key]=detail[key];
 for(const key of ['signal','state','role'])if(name(detail[key]))row[key]=detail[key];
 if(detail.incarnation)row.ownerRef=ref(s,detail.incarnation);
 try{process.stderr.write(JSON.stringify(row)+'\n');}catch{}
}
export function signalOwner(core,row,signal,cause){
 if(recoveryCauseR532){
  cause=recoveryCause(core,cause,'owner_signal');
  if(signal==='SIGKILL'){row.failure??=cause.reason;row.failureMethod??=cause.requestMethod;}
  recoveryDiagnostic(core,'signal',cause,{channel:row.peer.channel,incarnation:row.peer.incarnation,pid:row.child.pid,role:row.peer.role??'channel',state:row.state,signal});
 }
 return row.child.kill(signal);
}
