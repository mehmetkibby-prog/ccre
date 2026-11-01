import {retiredActorIsolation} from './r48_2-options.mjs';
import {actorFrameIsolation} from './r48_3-options.mjs';
// Child stderr is normally retained only in an 8KiB supervisor tail. Forward
// explicit structured diagnostics so the service journal keeps the ORIGINAL
// fault location. Never forward arbitrary stderr, exception text or payloads.
export function createChannelFaultForwarder(write,{channel,clock=Date.now}){
 let pending='',discarding=false,start=clock(),count=0;
 const code=value=>typeof value==='string'&&/^[a-z][a-z0-9_]{0,79}$/.test(value);
 const accept=line=>{
  let input;try{input=JSON.parse(line);}catch{return;}
  if(input?.event!=='core511_fault'||!code(input.code))return;
  const now=clock();if(now-start>=10000){start=now;count=0;}if(count++>=20)return;
  const row={event:'core511_fault',at:typeof input.at==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(input.at)?input.at:new Date(now).toISOString(),code:input.code,channel,source:'channel'};
  for(const key of ['operation','phase','leaseKind','terminalPhase',...(retiredActorIsolation?['requestMethod','requestOperation']:[])])if(typeof input[key]==='string'&&/^[a-zA-Z][a-zA-Z0-9_.:-]{0,79}$/.test(input[key]))row[key]=input[key];
  for(const key of ['requestEpoch','ownerEpoch','sequence'])if(Number.isSafeInteger(input[key])&&input[key]>=0)row[key]=input[key];
  if(actorFrameIsolation&&input.code==='actor_command_outcome_overdue'){
   if(typeof input.operationId==='string'&&/^[A-Za-z0-9_.:-]{1,160}$/.test(input.operationId))row.operationId=input.operationId;
   for(const key of ['ownerSequence','waitMs','statusAgeMs'])if(Number.isSafeInteger(input[key])&&input[key]>=0)row[key]=input[key];
   for(const key of ['receiptPresent','rollbackProven','inFlight'])if(typeof input[key]==='boolean')row[key]=input[key];
   if(['present','absent','unknown'].includes(input.receiptStatus))row.receiptStatus=input.receiptStatus;
  }
  for(const key of ['actorRef','sessionRef','ownerRef','connectionRef'])if(typeof input[key]==='string'&&/^[a-f0-9]{24}$/.test(input[key]))row[key]=input[key];
  if(Array.isArray(input.checkpointColumns))row.checkpointColumns=[...new Set(input.checkpointColumns.filter(k=>typeof k==='string'&&/^[a-z][a-z0-9_]{0,63}$/.test(k)))].slice(0,48);
  if(Array.isArray(input.stack))row.stack=input.stack.slice(0,6).filter(s=>s&&typeof s.file==='string'&&/^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}\.m?js$/.test(s.file)&&Number.isSafeInteger(s.line)&&s.line>0&&Number.isSafeInteger(s.column)&&s.column>0).map(s=>({file:s.file,line:s.line,column:s.column}));
  if(input.detailSuppressed===true)row.detailSuppressed=true;
  try{write(JSON.stringify(row)+'\n');}catch{}
 };
 return bytes=>{
  const text=bytes.toString();let offset=0;
  while(offset<text.length){
   const end=text.indexOf('\n',offset),stop=end<0?text.length:end,part=text.slice(offset,stop);
   if(!discarding){if(pending.length+part.length>8192){pending='';discarding=true;}else pending+=part;}
   if(end<0)return;
   if(!discarding)accept(pending);pending='';discarding=false;offset=end+1;
  }
 };
}
