// Bounded, sorted schedules in the existing settings snapshot. Resolving time
// never writes settings, polls a database, or mutates frozen reward snapshots.
const KINDS=new Set(['loot','xp','essence','chest','moonlight','fishing','halloween']);
const CHANCE=new Set(['chest','moonlight','fishing','halloween']);
export const EVENT_QUEUE_LIMIT499=32;
function validRow499(kind,row){
 if(!row||typeof row!=='object'||Array.isArray(row)||typeof row.enabled!=='boolean'||!Number.isSafeInteger(row.start)||!Number.isSafeInteger(row.end)||row.start<=0||row.end<=row.start||row.end>4102444800||!Number.isFinite(row.percent)||row.percent<0||row.percent>(CHANCE.has(kind)?100:500)||typeof row.runId!=='string'||row.runId.length<1||row.runId.length>80)throw Error('Etkinlik takvimi: oranı ve başlangıç/bitiş saatini kontrol et.');
 return {enabled:row.enabled,start:row.start,end:row.end,percent:row.percent,runId:row.runId};
}
export function normalizeEventQueue499(kind,value,primary){
 if(!KINDS.has(kind)||value!==undefined&&!Array.isArray(value))throw Error('Etkinlik takvimi geçersiz.');
 if((value?.length??0)>EVENT_QUEUE_LIMIT499)throw Error('Her etkinlik türü için en fazla 32 tarih planlanabilir.');
 const queue=(value??[]).map(row=>validRow499(kind,row)).filter(row=>row.enabled).sort((a,b)=>a.start-b.start||a.end-b.end||a.runId.localeCompare(b.runId));
 const ids=new Set();for(const row of queue){if(ids.has(row.runId)||row.runId===primary?.runId)throw Error('Aynı etkinlik kaydı iki kez eklenemez.');ids.add(row.runId);}
 const enabled=queue.filter(row=>row.enabled);if(primary?.enabled)enabled.push(primary);enabled.sort((a,b)=>a.start-b.start);
 for(let i=1;i<enabled.length;i++)if(enabled[i].start<enabled[i-1].end)throw Error('Aynı tür etkinliklerin saatleri çakışamaz. Başka bir saat seç.');
 return queue;
}
export function eventOccurrence499(event,now=Date.now()/1000){
 if(event?.enabled&&now>=event.start&&now<event.end)return event;
 const queue=event?.schedule499;if(!Array.isArray(queue)||queue.length===0)return null;
 // Validated queues are sorted and nonoverlapping. Binary search avoids a scan
 // on every combat/loot operation, including queues with many future rows.
 let lo=0,hi=queue.length-1,at=-1;while(lo<=hi){const mid=(lo+hi)>>1;if(queue[mid].start<=now){at=mid;lo=mid+1;}else hi=mid-1;}
 const row=queue[at];return row?.enabled&&now<row.end?row:null;
}
export function eventDisplay499(event,now=Date.now()/1000){
 const current=eventOccurrence499(event,now);if(current)return current;
 let next=event?.enabled&&event.start>now?event:null;
 for(const row of event?.schedule499??[])if(row.enabled&&row.start>now&&(!next||row.start<next.start))next=row;
 return next??event;
}
export function appendEvent499(config,kind,input,now,runId){
 if(!KINDS.has(kind)||!config?.events?.[kind])throw Error('Etkinlik türü geçersiz.');
 const row=validRow499(kind,{...input,enabled:true,runId});
 if(row.end<=now)throw Error('Bitiş tarihi geçmişte olamaz. Yeni bir bitiş seç.');
 const event=config.events[kind],kept=(event.schedule499??[]).filter(old=>old.enabled&&old.end>now);
 event.schedule499=normalizeEventQueue499(kind,[...kept,row],event);
 return row;
}
export function stopEvent499(config,kind,runId,now){
 const event=config.events[kind];if(!event)throw Error('Etkinlik türü geçersiz.');
 if(runId!==undefined&&typeof runId!=='string')throw Error('Etkinlik kaydı geçersiz.');
 const row=runId===undefined?eventOccurrence499(event,now)??event:event.runId===runId?event:(event.schedule499??[]).find(item=>item.runId===runId);
 if(!row)throw Error('Etkinlik kaydı bulunamadı. Paneli yenile.');
 if(row===event)event.enabled=false;else event.schedule499=event.schedule499.filter(item=>item.runId!==row.runId);
}
export function retainEventQueues499(input,old){
 return {...input,events:Object.fromEntries(Object.entries(input?.events??{}).map(([kind,event])=>[kind,{...event,schedule499:old.events[kind]?.schedule499??[]}]))};
}
