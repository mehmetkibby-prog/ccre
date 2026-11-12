import {actorFrameConflict} from './actor-frame-rejection.mjs';
import {createRetaliationRules} from './generated/retaliation-rules.mjs';
import {OperationRandom} from './operation-random.mjs';
import {demand} from './contract.mjs';
import {nativeParameterBinder} from './native-parameters.mjs';

// Synchronous D1 statement shape for the UNCHANGED native SQL in an already
// open LocalDatabase.atomic transaction. No nested transaction or early ACK.
const connections=new WeakMap(),statementHandle=Symbol('native-statement'),parameterHandle=Symbol('native-parameters');
const rewardOperationR54=Symbol('native-reward-operation-r54');
// Private server factories only. The callback runs at the original statement's
// position inside its existing native batch savepoint; it cannot acknowledge.
export const nativeRewardOperationR54=run=>({[rewardOperationR54]:run});
const executorsR531=new WeakMap();
export function withNativeStatementExecutorR531(sqlite,executor,work){const old=executorsR531.get(sqlite);executorsR531.set(sqlite,executor);try{return work();}finally{old?executorsR531.set(sqlite,old):executorsR531.delete(sqlite);}}
export function nativeAtomicStatements(sqlite){
 if(connections.has(sqlite))return connections.get(sqlite);
 const cache=new Map();let serial=0;
 const db={prepare(sql){
  let cached=cache.get(sql);if(!cached){cached={prepared:sqlite.prepare(sql),parameters:nativeParameterBinder(sql)};if(cached.parameters)cached.prepared.setAllowBareNamedParameters(false);if(cache.size===512)cache.delete(cache.keys().next().value);cache.set(sql,cached);}
  const {prepared,parameters}=cached;
  const statement=params=>({sql,params,[statementHandle]:prepared,[parameterHandle]:parameters,bind:(...next)=>statement(next),first:()=>prepared.get(...(parameters?parameters(params):params))??null,all:()=>({results:prepared.all(...(parameters?parameters(params):params))}),run:()=>({meta:prepared.run(...(parameters?parameters(params):params))})});return statement([]);
 },batch:statements=>atomicBatch(statements),guardedBatch:(guard,statements)=>atomicBatch(statements,guard),combatHit:(guard,plans)=>atomicBatch(plans.flatMap(plan=>plan.hitStatements),guard)};
 function execute(s){if(s?.[rewardOperationR54]){demand(sqlite.isTransaction,'reward_r54_requires_atomic');return s[rewardOperationR54]();}const p=s?.[statementHandle];demand(p,'foreign_native_statement');const parameters=s[parameterHandle],params=parameters?parameters(s.params):s.params;const original=()=>p.columns().length?{results:p.all(...params)}:{results:[],meta:p.run(...params)};return executorsR531.get(sqlite)?.(s,original)??original();}
 function atomicBatch(statements,guard){
  // Native code sometimes catches a failed batch to defer a reward. Preserve
  // D1 batch atomicity even when that exception is caught by the outer handler.
  // RELEASE inside an outer writer transaction never commits or acknowledges.
  const savepoint='kernel511_batch_'+(++serial);sqlite.exec('SAVEPOINT '+savepoint);
  try{let value;if(guard){const result=execute(guard);value={guard:result,results:result.results.length?statements.map(execute):[]};}else value=statements.map(execute);sqlite.exec('RELEASE '+savepoint);return value;}
  catch(error){sqlite.exec('ROLLBACK TO '+savepoint);sqlite.exec('RELEASE '+savepoint);throw error;}
 }
 connections.set(sqlite,db);
 return db;
}
export function readRetaliationFrame(sqlite,actor,engagements){
 const db=nativeAtomicStatements(sqlite),rules=createRetaliationRules();
 const [player,monsters,armor]=rules.prepareFrame(db,actor,engagements);
 return {player:player.first(),monsters:monsters.all().results,armorItems:armor.all()};
}
const canonical=value=>JSON.stringify(value&&typeof value==='object'?(Array.isArray(value)?value.map(v=>JSON.parse(canonical(v))):Object.fromEntries(Object.keys(value).sort().map(k=>[k,JSON.parse(canonical(value[k]))]))):value??null);

// The caller must checkpoint its nonterminal resident state/engagement in the
// same ordered writer lane first. Every native input is then reread and fenced;
// stale gear, profile, HP, spawn, position or encounter cannot silently win.
export function createRetaliationWriterHandler({globalsFor,settingsFor,assertOwnership,assertResources,randomFor=p=>new OperationRandom(p.seed),clock=Date.now}){
 demand(typeof globalsFor==='function'&&typeof settingsFor==='function'&&typeof assertOwnership==='function'&&typeof assertResources==='function','retaliation_writer_dependencies');
 return (sqlite,payload,context)=>{
  demand(sqlite.isTransaction,'retaliation_requires_atomic');
  demand(assertOwnership(sqlite,context.peer,context.actor,context.epoch)===true,'retaliation_owner_fenced');
  demand(typeof payload.engagement?.monster_id==='string'&&Array.isArray(payload.resources)&&payload.resources.includes('monster:'+payload.engagement.monster_id),'retaliation_monster_unlocked');
  demand(assertResources(sqlite,payload,context)===true,'retaliation_resources_fenced');
  const {nowMs,seed,engagement,frame,settings}=payload;
  demand(Number.isSafeInteger(nowMs)&&nowMs>=0&&nowMs<=clock()+5000,'retaliation_invalid_time');
  const actual=readRetaliationFrame(sqlite,context.actor,[engagement]);
  const actualFrame={player:actual.player,monster:actual.monsters.find(m=>m.id===engagement.monster_id),armorItems:actual.armorItems};
  if(!(canonical(actualFrame)===canonical(frame)))throw actorFrameConflict('retaliation_snapshot_conflict',context,sqlite);
  const row=sqlite.prepare('SELECT * FROM pve_engagements WHERE player_id=?').get(context.actor);
  if(!(row&&canonical(row)===canonical(payload.row)))throw actorFrameConflict('retaliation_engagement_conflict',context,sqlite);
  const actualSettings=settingsFor(sqlite,context.actor);if(!(canonical(actualSettings)===canonical(settings)))throw actorFrameConflict('retaliation_settings_conflict',context,sqlite);
  const random=randomFor(payload),events=[],rules=createRetaliationRules({random:()=>random.roll(),now:()=>nowMs,globals:globalsFor(sqlite,context.actor),fourChannels:true,publish:(...args)=>events.push(args)});
  const result=rules.retaliateWriter(nativeAtomicStatements(sqlite),context.actor,actualSettings,nowMs,engagement,actualFrame);
  demand(result?.dead===true,'retaliation_terminal_changed');
  return {result,events,player:sqlite.prepare('SELECT * FROM players WHERE id=?').get(context.actor),engagement:sqlite.prepare('SELECT * FROM pve_engagements WHERE player_id=?').get(context.actor)??null};
 };
}
