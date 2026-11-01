import {castleEnabled,CASTLE_AREA,CASTLE_CHANNEL} from './castle-model-r59.mjs';
import {prepareCached477} from './writer-statements.mjs';
import {createHash,randomUUID} from 'node:crypto';
import {demand} from './contract.mjs';
import {TRANSIENT_EVENTS} from './performance-options.mjs';
import {r35Options} from './r35-options.mjs';
import {skipInvalidNotification} from './cosmetic-notification.mjs';
import {splitCombatNotifications} from './bounded-combat-output.mjs';

const transientTypes=new Set(['player_hit','player_state','monster_preview','monster_result']);
// ChannelRuntime.publish relays explicit foreign channel room routes. Its
// actor route has no such guarantee: private/world/unknown routes stay durable.
export function transientNotification(route,context,immediatePublisher){
 return TRANSIENT_EVENTS&&immediatePublisher===true&&[1,2,3,4].includes(context.peer?.channel)&&
  (transientTypes.has(route.event.type)||(castleEnabled()&&route.area===CASTLE_AREA&&route.channels?.length===1&&route.channels[0]===CASTLE_CHANNEL&&['pvp_result','pvp_reject','guardian_control'].includes(route.event.type)))&&!route.actors&&!route.rooms&&
  Array.isArray(route.channels)&&route.channels.length>0&&route.channels.every(ch=>[1,2,3,4].includes(ch));
}

// Only durable game results enter this outbox. Ordinary movement/hit frames
// remain transient. Native room/player event arguments are retained verbatim;
// recipient resolution uses the commit's presence/scope snapshot.
export function nativeNotification(args){
 demand(Array.isArray(args)&&Number.isSafeInteger(args[0]),'notification_arguments');
 const [cycle,scope,third,fourth,fifth,sixth]=args;
 const clean=value=>{demand(value&&typeof value==='object'&&!Array.isArray(value),'notification_event');const {__combatAudit,...event}=value;return event;};
 if(Number.isSafeInteger(scope)&&typeof third==='string'&&Array.isArray(fourth))return {cycle,channels:[scope],area:third,actors:fourth,event:clean(fifth),arena:sixth??null};
 if(Number.isSafeInteger(scope)&&typeof third==='string')return {cycle,channels:[scope],area:third,event:clean(fourth),arena:fifth??null};
 if(Array.isArray(scope)&&typeof third==='string')return {cycle,channels:scope,area:third,event:clean(fourth)};
 if(Array.isArray(scope)&&third&&typeof third==='object')return {cycle,rooms:scope,event:clean(third)};
 throw Error('notification_route_unbound');
}

export class NotificationOutbox {
 constructor(database,{resolveRecipients,captureRoute=(_sql,route)=>route,clock=Date.now}={}){
  demand(typeof resolveRecipients==='function'&&typeof captureRoute==='function','notification_recipients_required');Object.assign(this,{database,resolveRecipients,captureRoute,clock});
  this.pendingPages=new Map();this.pageBytes=0;this.pageSerial=0;this.pagePrefix=randomUUID();this.pageMetrics={reads:0,hits:0};
 }
 async initialize(){await this.database.atomic(sql=>sql.exec(`
  CREATE TABLE IF NOT EXISTS kernel511_notifications(
   event_id TEXT PRIMARY KEY,operation_id TEXT NOT NULL,ordinal INTEGER NOT NULL,
   payload TEXT NOT NULL,created_ms INTEGER NOT NULL,UNIQUE(operation_id,ordinal));
  CREATE TABLE IF NOT EXISTS kernel511_notification_audience(
   actor TEXT NOT NULL,event_id TEXT NOT NULL REFERENCES kernel511_notifications(event_id),
   acknowledged INTEGER NOT NULL DEFAULT 0 CHECK(acknowledged IN(0,1)),
   PRIMARY KEY(actor,event_id)) WITHOUT ROWID;
  CREATE INDEX IF NOT EXISTS kernel511_notification_pending ON kernel511_notification_audience(actor,acknowledged,event_id);
  CREATE INDEX IF NOT EXISTS kernel511_notification_event ON kernel511_notification_audience(event_id,actor);
 `));}
 append(sql,context,result,{immediatePublisher=false}={}){
  demand(sql.isTransaction,'notification_requires_game_transaction');
  const events=result.events??[];demand(Array.isArray(events)&&events.length<=512,'notification_count');
  const notifications=[],notificationActors=new Set(),transient=[];
  // Keep the original producer event-count guard. Splitting one valid event
  // does not manufacture a new notification_count failure for that command.
  for(const [ordinal,args]of splitCombatNotifications(events).entries()){
   let route,actors,payload;try{const parsed=nativeNotification(args);
   if(transientNotification(parsed,context,immediatePublisher)){
    demand(Buffer.byteLength(JSON.stringify(parsed))<=196608,'notification_too_large');transient.push(args);continue;
   }
   route=this.captureRoute(sql,parsed,context);actors=[...new Set(this.resolveRecipients(sql,route,context))].sort();
   demand((r35Options.outboxV2||actors.length<=100)&&actors.every(id=>typeof id==='string'&&id.length>0&&id.length<=80),'notification_audience');
   payload=JSON.stringify(route);demand(Buffer.byteLength(payload)<=196608,'notification_too_large');
   }catch(error){if(skipInvalidNotification(error,{actor:context.actor,channel:context.peer?.channel}))continue;throw error;}
   for(const actor of actors)notificationActors.add(actor);
   const eventId=createHash('sha256').update(JSON.stringify([context.realm,context.key,ordinal])).digest('hex');
   prepareCached477(sql,'INSERT INTO kernel511_notifications VALUES(?,?,?,?,?)').run(eventId,context.key,ordinal,payload,this.clock());
   // Same sorted, server-derived recipients and same transaction. One bounded
   // INSERT avoids crossing JS/SQLite once per recipient; no row is omitted.
   const batch=r35Options.outboxV2?64:Math.max(1,actors.length);
   for(let offset=0;offset<actors.length;offset+=batch){const page=actors.slice(offset,offset+batch);prepareCached477(sql,'INSERT INTO kernel511_notification_audience(actor,event_id) VALUES '+page.map(()=>'(?,?)').join(',')).run(...page.flatMap(actor=>[actor,eventId]));}
   if(r35Options.outboxV2)for(const actor of actors)this.invalidatePending(actor);
   notifications.push(eventId);
  }
  // Only transient events reach the existing post-commit publisher. Durable
  // events retain their original ordinal, event ID, audience and ACK path.
  return {...result,events:transient,notifications,notificationActors:[...notificationActors]};
 }
 pending(sql,actor,limit=32){
  demand(typeof actor==='string'&&Number.isSafeInteger(limit)&&limit>0&&limit<=64,'notification_read');
  return prepareCached477(sql,`SELECT n.event_id AS id,n.payload,n.created_ms AS createdMs FROM kernel511_notification_audience a
   JOIN kernel511_notifications n ON n.event_id=a.event_id WHERE a.actor=? AND a.acknowledged=0 ORDER BY n.created_ms,n.operation_id,n.ordinal LIMIT ?`).all(actor,limit).map(row=>({...row,payload:JSON.parse(row.payload)}));
 }
 invalidatePending(actor){const old=this.pendingPages.get(actor);if(old){this.pageBytes-=old.bytes;this.pendingPages.delete(actor);}}
 pendingPage(sql,actor,cursor,scope){
  let page=this.pendingPages.get(actor);
  if(page&&page.scope!==scope){this.invalidatePending(actor);page=null;}
  if(!page){
   const messages=this.pending(sql,actor),bytes=Buffer.byteLength(JSON.stringify(messages));this.pageMetrics.reads++;
   page={scope,messages,bytes,cursor:this.pagePrefix+':'+(++this.pageSerial),more:messages.length===32};
   while(this.pendingPages.size&&(this.pageBytes+bytes>8*1024*1024||this.pendingPages.size>=128))this.invalidatePending(this.pendingPages.keys().next().value);
   if(bytes<=8*1024*1024){this.pendingPages.set(actor,page);this.pageBytes+=bytes;}
  }else this.pageMetrics.hits++;
  return {messages:cursor===page.cursor?[]:page.messages,cursor:page.cursor,more:page.more};
 }
 async acknowledge(actor,ids,authorize){
  demand(Array.isArray(ids)&&ids.length>0&&ids.length<=64&&ids.every(id=>typeof id==='string'&&/^[a-f0-9]{64}$/.test(id))&&typeof authorize==='function','notification_ack');
  return this.database.atomic(sql=>{
   demand(authorize(sql,actor)===true,'notification_ack_owner');
   const unique=[...new Set(ids)];const result=prepareCached477(sql,(r35Options.outboxV2?'DELETE FROM kernel511_notification_audience':'UPDATE kernel511_notification_audience SET acknowledged=1')+' WHERE actor=? AND event_id IN ('+unique.map(()=>'?').join(',')+') AND acknowledged=0').run(actor,...unique);if(r35Options.outboxV2)this.invalidatePending(actor);return {acknowledged:result.changes};
  });
 }
 async acknowledgeBatch(entries,authorize){
  demand(r35Options.outboxV2&&Array.isArray(entries)&&entries.length>0&&entries.length<=25&&typeof authorize==='function','notification_ack_batch');
  for(const row of entries)demand(typeof row.actor==='string'&&Number.isSafeInteger(row.epoch)&&Array.isArray(row.ids)&&row.ids.length>0&&row.ids.length<=64&&row.ids.every(id=>typeof id==='string'&&/^[a-f0-9]{64}$/.test(id)),'notification_ack');
  return this.database.atomic(sql=>{
   const results=[];for(const row of entries){
    if(!authorize(sql,row)){results.push({actor:row.actor,stale:true,acknowledged:0});continue;}
    const ids=[...new Set(row.ids)],result=prepareCached477(sql,'DELETE FROM kernel511_notification_audience WHERE actor=? AND event_id IN ('+ids.map(()=>'?').join(',')+') AND acknowledged=0').run(row.actor,...ids);
    this.invalidatePending(row.actor);results.push({actor:row.actor,acknowledged:result.changes});
   }return {results};
  });
 }
 async prune(limit=128){
  demand(Number.isSafeInteger(limit)&&limit>=1&&limit<=128,'notification_prune_limit');
  return this.database.atomic(sql=>{
   const rows=prepareCached477(sql,'SELECT event_id FROM kernel511_notifications n WHERE NOT EXISTS(SELECT 1 FROM kernel511_notification_audience a WHERE a.event_id=n.event_id AND a.acknowledged=0) ORDER BY created_ms LIMIT ?').all(limit);
   for(const {event_id:id}of rows){prepareCached477(sql,'DELETE FROM kernel511_notification_audience WHERE event_id=?').run(id);prepareCached477(sql,'DELETE FROM kernel511_notifications WHERE event_id=?').run(id);}return rows.length;
  });
 }
}

// Each tab retains recent IDs across a short reconnect. Apply returns only
// after the presentation event is consumed; then ACK may be sent. Currency,
// items and rewards are never applied by this code (they are server state).
export class NotificationReceiver {
 constructor({apply,ack,remember=new Map(),max=4096}){demand(typeof apply==='function'&&typeof ack==='function','notification_receiver');Object.assign(this,{apply,ack,remember,max});this.pending=new Map();}
 async receive(message){
  demand(typeof message?.id==='string'&&/^[a-f0-9]{64}$/.test(message.id),'notification_id');
  let work=this.pending.get(message.id);
  if(!work){work=Promise.resolve().then(async()=>{if(!this.remember.has(message.id)){await this.apply(message.payload);this.remember.set(message.id,true);while(this.remember.size>this.max)this.remember.delete(this.remember.keys().next().value);}await this.ack([message.id]);});this.pending.set(message.id,work);}
  try{await work;}finally{if(this.pending.get(message.id)===work)this.pending.delete(message.id);}
 }
}
