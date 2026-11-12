// Test-only single-flight adapter. No game rule, limit or durable ACK changes.
// Match the server's admission distinction: rejected/retry did not consume a
// sequence, whereas a frame result did. This adapter does not negotiate the
// real browser's two-slot movement pipeline.
const failure=code=>Object.assign(new Error(code),{code});
const requireValue=(ok,code)=>{if(!ok)throw failure(code);};
const retryMilliseconds=value=>{
 const seconds=value===undefined?1:Number(value);
 requireValue(Number.isFinite(seconds)&&seconds>=0&&seconds<=Number.MAX_SAFE_INTEGER/1000,'validation_retry_after');
 return seconds*1000;
};

export class SingleFlightInput {
 constructor({socket,clock=()=>performance.now(),schedule=setTimeout,cancel=clearTimeout,onRejected=()=>{},onRetry=()=>{},onIgnored=()=>{},onSendError=()=>{}}){
  requireValue(socket&&typeof socket.send==='function','validation_socket');
  Object.assign(this,{socket,clock,schedule,cancel,onRejected,onRetry,onIgnored,onSendError});
  this.pending=new Map();this.lastAccepted=0;this.nextAllowedAt=0;this.disposed=false;
 }
 ready(lastAccepted=0){
  requireValue(Number.isSafeInteger(lastAccepted)&&lastAccepted>=0&&!this.pending.size,'validation_ready_watermark');
  this.lastAccepted=lastAccepted;
 }
 canSend(at=this.clock()){
  return !this.disposed&&this.socket.readyState===1&&!this.pending.size&&at>=this.nextAllowedAt;
 }
 send(payload,{measured=false,onStart=()=>{}}={}){
  requireValue(this.canSend(),'validation_client_busy');
  const sequence=this.lastAccepted+1;
  requireValue(Number.isSafeInteger(sequence),'validation_sequence');
  const row={sequence,payload,at:this.clock(),measured,wireAttempts:0,retryTimer:null};
  this.pending.set(sequence,row);onStart(row);this.write(row);return row;
 }
 write(row){
  // One timer can never write a later attempt merely because it reused the
  // rejected sequence. Compare the pending object identity, not just its key.
  if(this.disposed||this.socket.readyState!==1||this.pending.get(row.sequence)!==row)return false;
  row.wireAttempts++;this.socket.send(JSON.stringify({type:'input',sequence:row.sequence,payload:row.payload}));return true;
 }
 clearRetry(row){if(row.retryTimer!==null)this.cancel(row.retryTimer);row.retryTimer=null;}
 complete(sequence){
  const row=this.pending.get(sequence);if(!row)return null;
  requireValue(sequence===this.lastAccepted+1,'validation_result_sequence');
  this.clearRetry(row);this.pending.delete(sequence);this.lastAccepted=sequence;return row;
 }
 handle(packet){
  if(packet?.type!=='rejected'&&packet?.type!=='retry')return false;
  requireValue(Number.isSafeInteger(packet.sequence)&&packet.sequence>0,'validation_reply_sequence');
  const row=this.pending.get(packet.sequence);
  // Same handling as the browser for a known-wire reply with no current slot:
  // ignore it, but preserve its kind/count for this test's diagnostics.
  if(!row){this.onIgnored({type:packet.type,sequence:packet.sequence,code:packet.code??null});return true;}
  requireValue(typeof packet.code==='string'&&packet.code.length>0&&packet.code.length<=128,'validation_reply_code');
  if(packet.type==='rejected'){
   requireValue(packet.code==='rate_limited','validation_rejection_code');
   const waitMs=retryMilliseconds(packet.retryAfter),at=this.clock();
   this.clearRetry(row);this.pending.delete(packet.sequence);
   // Never consume an unaccepted sequence. The next NEW input uses the same
   // lastAccepted+1 after the advertised backoff, just as the browser does.
   this.nextAllowedAt=Math.max(this.nextAllowedAt,at+waitMs);
   this.onRejected({row,packet,at,latencyMs:Math.max(0,at-row.at),waitMs});return true;
  }
  this.clearRetry(row);this.onRetry({row,packet});
  const delay=packet.retryAfter===undefined?150:Math.max(150,retryMilliseconds(packet.retryAfter));
  row.retryTimer=this.schedule(()=>{
   row.retryTimer=null;
   if(this.disposed||this.pending.get(row.sequence)!==row)return;
   try{this.write(row);}catch(error){this.onSendError(error,row);}
  },delay);
  return true;
 }
 snapshot({actor,channel},at=this.clock()){
  return [...this.pending.values()].map(row=>({actor,channel,action:row.payload.action,sequence:row.sequence,ageMs:Math.max(0,at-row.at),measured:row.measured,wireAttempts:row.wireAttempts}));
 }
 dispose(){this.disposed=true;for(const row of this.pending.values())this.clearRetry(row);}
}

// Counts never disappear when detail storage fills. Keys, sample lengths and
// per-kind representatives are bounded; overflow/truncation is explicit.
export class FailureEvidence {
 constructor({limit=512,tailLimit=64,keyLimit=128,clock=Date.now}={}){
  requireValue([limit,tailLimit,keyLimit].every(v=>Number.isSafeInteger(v)&&v>0),'validation_evidence_limits');
  Object.assign(this,{limit,tailLimit,keyLimit,clock});this.total=0;this.byKind=new Map();this.byCode=new Map();this.first=[];this.tail=[];this.representatives=new Map();
 }
 increment(map,key){
  if(!map.has(key)&&map.size>=this.keyLimit)key='__other_keys__';
  map.set(key,(map.get(key)??0)+1);
 }
 record(kind,error,context={}){
  kind=String(kind).slice(0,80);
  const code=String(error?.code??error?.message??error).slice(0,1024);
  const row={at:this.clock(),kind,code};
  for(const name of ['actor','channel','action','sequence','status'])if(context[name]!==undefined)row[name]=typeof context[name]==='string'?context[name].slice(0,160):context[name];
  this.total++;this.increment(this.byKind,kind);this.increment(this.byCode,kind+':'+code);
  if(this.first.length<this.limit)this.first.push(row);
  this.tail.push(row);if(this.tail.length>this.tailLimit)this.tail.shift();
  if(!this.representatives.has(kind)&&this.representatives.size<this.keyLimit)this.representatives.set(kind,row);
  return row;
 }
 report(){return {total:this.total,byKind:Object.fromEntries(this.byKind),byCode:Object.fromEntries(this.byCode),first:[...this.first],tail:[...this.tail],firstByKind:[...this.representatives.values()],firstDetailsOmitted:Math.max(0,this.total-this.first.length),limits:{first:this.limit,tail:this.tailLimit,keys:this.keyLimit+1}};}
}

export class ResponseSamples {
 constructor(limit=100000){this.limit=limit;this.rows=[];}
 record(row){requireValue(this.rows.length<this.limit,'validation_response_measurement_full');requireValue(Number.isFinite(row.latencyMs)&&row.latencyMs>=0,'validation_response_latency');this.rows.push({...row});}
 report(){
  const values=this.rows.map(row=>row.latencyMs).sort((a,b)=>a-b),q=p=>values.length?values[Math.min(values.length-1,Math.ceil(values.length*p)-1)]:0;
  return {n:values.length,p50:q(.5),p95:q(.95),p99:q(.99),max:q(1),observations:this.rows};
 }
}

// Measurement counters describe inputs started within the measured window.
// Final pending evidence also includes preparation/disconnect leftovers.
export function inputCompletionAccounting(counters,pending){
 const measuredPending=pending.filter(row=>row.measured===true).length;
 return {sent:counters.sent,nativeResults:counters.acknowledged,rejectedBeforeQueue:counters.rejectedBeforeQueue,pending:measuredPending,balanced:counters.sent===counters.acknowledged+counters.rejectedBeforeQueue+measuredPending};
}
