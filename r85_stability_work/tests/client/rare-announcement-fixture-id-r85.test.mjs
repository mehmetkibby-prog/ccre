// Read-only source review: exact unexported producer declarations + real SQLite
// and complete current notification validator. No native process/load rerun.
import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {parse} from '/tmp/core511-build-deps/node_modules/acorn/dist/acorn.mjs';
import {nativeAtomicStatements} from '../../working/core511-source/scripts/core511/retaliation-writer.mjs';
import {createNativeNotificationRules} from '../../working/core511-source/scripts/core511/generated/notification-rules.mjs';
import {nativeNotification} from '../../working/core511-source/scripts/core511/notification-outbox.mjs';
import {notificationViews} from '../../working/core511-source/scripts/core511/notification-audience.mjs';

const sha=value=>createHash('sha256').update(value).digest('hex');
const producerURL=new URL('../../working/core511-source/scripts/core511/generated/attack-writer-rules.mjs',import.meta.url);
const source=await readFile(producerURL,'utf8'),ast=parse(source,{ecmaVersion:'latest',sourceType:'module'});
const factory=ast.body.find(node=>node.type==='ExportNamedDeclaration'&&node.declaration?.id?.name==='createAttackWriterRules').declaration;
const names=['announceRareDrop','broadcastAnnouncement'];
const declarations=names.map(name=>{const node=factory.body.body.find(row=>row.type==='FunctionDeclaration'&&row.id.name===name);assert(node);return {name,start:node.start,end:node.end,source:source.slice(node.start,node.end)};});
const clock=1793520800000,seconds=clock/1000;
const goodId='d067e88b-d92c-4f40-b4b9-ee5660ff5672',fixtureId=goodId+':0';
const evidence={scope:'Exact Acorn-sliced native rare announcement function declarations, actual nativeAtomicStatements adapter and in-memory SQLite, complete generated world validator and notificationViews. Controlled clock and publication port; not native-process/full-load reproduction.',producer:{path:producerURL.pathname,sha256:sha(source),declarations:declarations.map(({name,start,end,source})=>({name,start,end,sha256:sha(source)}))},observedLogPayloadRetained:false,cases:[]};

function produce(id,rarity){
 const sql=new DatabaseSync(':memory:');
 sql.exec(`CREATE TABLE messages(id INTEGER PRIMARY KEY AUTOINCREMENT,player_id TEXT NOT NULL,player_name TEXT NOT NULL,recipient_id TEXT,scope TEXT,area TEXT,channel INTEGER,body TEXT,created_at INTEGER,announcement_expires_at_ms INTEGER,announcement_request_id TEXT,UNIQUE(player_id,announcement_request_id));
  CREATE TABLE world_state(id INTEGER PRIMARY KEY,cycle INTEGER);INSERT INTO world_state VALUES(1,1);
  CREATE TABLE players(id TEXT PRIMARY KEY,channel INTEGER,area TEXT,arena_match_id TEXT,last_seen INTEGER);`);
 sql.prepare('INSERT INTO players VALUES(?,?,?,?,?)').run(id,1,'forest','',seconds);
 const events=[];
 // These are the same synchronous Promise.all and injected Date.now contracts
 // used by the production factory at lines 72-73; producer bodies are untouched.
 const announce=new Function('Date','Promise','publishRealtimeWorldEvent',declarations.map(row=>row.source).join('\n')+'\nreturn announceRareDrop;')({now:()=>clock},{all:values=>values.map(value=>{assert.equal(value?.then,undefined);return value;})},(...args)=>events.push(args));
 const db=nativeAtomicStatements(sql),player={id,name:'Native0'};
 sql.exec('BEGIN');announce(db,player,'Mor Kök Baltası','drop-1',rarity,seconds);announce(db,player,'Mor Kök Baltası','drop-1',rarity,seconds);sql.exec('COMMIT');
 assert.equal(events.length,1,'native ON CONFLICT deduplicates repeat announcement');
 const rows=sql.prepare('SELECT * FROM messages').all();assert.equal(rows.length,1);sql.close();
 return {event:events[0],message:{...rows[0]}};
}

for(const rarity of ['purple','red'])test(`${rarity} native rare announcement: fixture colon actor rejects, sole-field UUID twin delivers`,()=>{
 const invalid=produce(fixtureId,rarity),valid=produce(goodId,rarity);
 const corrected=structuredClone(invalid.event);corrected[2].message.player_id=goodId;
 assert.deepEqual(corrected,structuredClone(valid.event),'player_id is the only event difference');
 const sent=[],socket={readyState:1,bufferedAmount:0,player:{playerId:'viewer',cycle:1,channel:2,area:'forest'}};
 const validator=createNativeNotificationRules({clock:()=>clock,socketsByPlayer:new Map([['viewer',socket]]),hiddenPlayer:()=>false,motionCorkR11:{prepare(){},send(_socket,bytes){sent.push(JSON.parse(bytes));}}});
 assert.throws(()=>validator.broadcastWorldEvent(invalid.event[0],invalid.event[2]),/invalid_world_event/);assert.deepEqual(sent,[]);
 assert.equal(validator.broadcastWorldEvent(valid.event[0],valid.event[2]),1);assert.equal(sent.length,1);
 const players=[{id:'viewer',world_cycle:1,channel:2,area:'forest'}],warnings=[],originalWarn=console.warn;
 console.warn=(...args)=>warnings.push(args.join(' '));let invalidViews,validViews;
 try{invalidViews=notificationViews(nativeNotification(invalid.event),players,{clock:()=>clock});validViews=notificationViews(nativeNotification(valid.event),players,{clock:()=>clock});}finally{console.warn=originalWarn;}
 assert.equal(invalidViews.size,0);assert.equal(validViews.size,1);
 assert.equal(invalid.message.player_id,fixtureId,'persisted announcement is retained despite realtime rejection');
 evidence.cases.push({rarity,fixtureActor:fixtureId,validActor:goodId,soleEventDifference:'message.player_id',fixtureRealtimeRecipients:invalidViews.size,validRealtimeRecipients:validViews.size,persistedMessageCount:1,duplicateProducerCalls:2,producedEvents:1,warnings});
});

after(async()=>{
 evidence.sources={};for(const rel of ['working/core511-source/scripts/core511/generated/notification-rules.mjs','working/core511-source/scripts/core511/notification-audience.mjs','tests/runtime/native-mixed-load-realistic.mjs']){const url=new URL('../../'+rel,import.meta.url),bytes=await readFile(url);evidence.sources[rel]={path:url.pathname,sha256:sha(bytes)};}
 await writeFile(new URL('./rare-announcement-fixture-id-r85-evidence.json',import.meta.url),JSON.stringify(evidence,null,2)+'\n');
});
