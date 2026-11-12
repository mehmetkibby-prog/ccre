import {randomBytes,createHmac} from 'node:crypto';
import {kernelError} from './contract.mjs';
import {actorFaultIsolation} from './r48-options.mjs';
import {ipcRequestContext} from './ipc-request-context.mjs';
import {actorFrameIsolation} from './r48_3-options.mjs';
const sqliteDiagnosticCodes=new Set(['SQLITE_CORRUPT','SQLITE_IOERR','SQLITE_FULL','SQLITE_NOTADB']);
export function demandFence(ok,code,context){if(ok)return;const e=kernelError(code);e.fenceContext=typeof context==='function'?context():context;throw e;}
// Boot-local correlation only. Never print SQL, payload, cookie, token, player
// identity, arbitrary exception text or an absolute filesystem path.
export function createFaultReporter(write,{key=randomBytes(32),clock=Date.now}={}){
 let start=0,count=0;
 const ref=x=>typeof x==='string'&&x.length<=256?createHmac('sha256',key).update(x).digest('hex').slice(0,24):undefined;
 return issue=>{const e=issue?.error??{},now=clock();if(now-start>=10000){start=now;count=0;}const diagnosticCode=actorFaultIsolation&&sqliteDiagnosticCodes.has(e.code)?e.code.toLowerCase():e.code,row={event:'core511_fault',at:new Date(now).toISOString(),code:typeof diagnosticCode==='string'&&/^[a-z][a-z0-9_]{0,79}$/.test(diagnosticCode)?diagnosticCode:'runtime_fault'};
  if(count++<20){const c={actor:issue?.actor,incarnation:issue?.incarnation,channel:issue?.channel,...e.context,...e.fenceContext};
   for(const k of ['operation','phase','leaseKind','terminalPhase'])if(typeof c[k]==='string'&&/^[a-zA-Z][a-zA-Z0-9_.:-]{0,79}$/.test(c[k]))row[k]=c[k];
   Object.assign(row,ipcRequestContext(e));
   for(const k of ['channel','requestEpoch','ownerEpoch','sequence'])if(Number.isSafeInteger(c[k])&&c[k]>=0)row[k]=c[k];
   if(actorFrameIsolation&&e.code==='actor_command_outcome_overdue'){
    if(typeof c.operationId==='string'&&/^[A-Za-z0-9_.:-]{1,160}$/.test(c.operationId))row.operationId=c.operationId;
    for(const k of ['ownerSequence','waitMs','statusAgeMs'])if(Number.isSafeInteger(c[k])&&c[k]>=0)row[k]=c[k];
    for(const k of ['receiptPresent','rollbackProven','inFlight'])if(typeof c[k]==='boolean')row[k]=c[k];
    if(['present','absent','unknown'].includes(c.receiptStatus))row.receiptStatus=c.receiptStatus;
   }
   // Column names only: no old/new values, identities or arbitrary payload.
   if(Array.isArray(c.checkpointColumns))row.checkpointColumns=[...new Set(c.checkpointColumns.filter(k=>typeof k==='string'&&/^[a-z][a-z0-9_]{0,63}$/.test(k)))].slice(0,48);
   for(const [k,out]of [['actor','actorRef'],['session','sessionRef'],['incarnation','ownerRef'],['connection','connectionRef']]){const v=ref(c[k]);if(v)row[out]=v;}
   row.stack=String(e.stack??'').split('\n').slice(1).flatMap(s=>{const m=s.match(/\/([A-Za-z0-9_.-]+\.m?js):(\d+):(\d+)\)?$/);return m?[{file:m[1],line:Number(m[2]),column:Number(m[3])}]:[];}).slice(0,6);
  }else row.detailSuppressed=true;
  try{write(JSON.stringify(row)+'\n');}catch{}return row;
 };
}
