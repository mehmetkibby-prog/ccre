import {feature510} from "./features510.mjs";
import {isDeepStrictEqual} from 'node:util';
import {channelError} from './channel-protocol.mjs';

const read = sql => /^\s*SELECT\b/i.test(sql);
const mutation = sql => /^\s*(INSERT|UPDATE|DELETE|REPLACE)\b/i.test(sql);
const plain = value => value === undefined ? null : JSON.parse(JSON.stringify(value));

// Native dungeon helpers calculate rules synchronously in a private in-memory
// workspace. This journal carries SQL and its observed decisions, not callbacks
// or a game tick, to the sole durable writer. Replaying a stale decision rolls
// back the entire operation (including earlier reward writes).
export class NativeSqlPlan {
  constructor(sqlite) { this.sqlite=sqlite; this.trace=[]; this.depth=0; this.mark=0; this.writes=0;this.readCache510=new Map(); }
  get isTransaction(){return this.sqlite.isTransaction;}
  prepare(sql){
    const statement=this.sqlite.prepare(sql);
    if(/^\s*PRAGMA table_info\(/i.test(sql))return statement;
    if(!read(sql)&&!mutation(sql))throw channelError('unsupported_native_statement');
    const invoke=(method,params)=>{
      const cacheable510=feature510("scopedReads")&&method!=='run'&&/^\s*SELECT\s+[A-Za-z_*,\s]+\s+FROM\s+(?:players|player_items|player_pets|player_stones|dungeon_materials|dungeon_wings|game_settings|combat_settings|dungeon_settings)\s+WHERE\s+[A-Za-z_]+\s*=\s*\?\s*$/i.test(sql)&&params.every(p=>typeof p==='string'||typeof p==='number'||p===null);
      if(mutation(sql))this.readCache510.clear();
      const key510=cacheable510?JSON.stringify([sql,method,params]):null;
      let result,expected;
      const cached510=cacheable510?this.readCache510.get(key510):null;
      if(cached510){
        const copy=row=>Object.assign(Object.create(null),row);
        expected=cached510.expected;
        result=cached510.absent?undefined:method==='all'?expected.map(copy):copy(expected);
      }else{
        result=statement[method](...params);
        expected=method==='run'?{changes:Number(result.changes)}:plain(result);
        const rows510=method==='all'?result:result?[result]:[];
        if(cacheable510&&this.readCache510.size<128&&rows510.every(row=>Object.values(row).every(v=>v===null||typeof v==='string'||typeof v==='number')))
          this.readCache510.set(key510,{expected,absent:result===undefined});
      }
      this.trace.push({sql,method,params:plain(params),expected});
      if(mutation(sql))this.writes++;
      if(method==='run')return {changes:result.changes,get lastInsertRowid(){throw channelError('native_rowid_not_reserved');}};
      return result;
    };
    return {get:(...params)=>invoke('get',params),all:(...params)=>invoke('all',params),run:(...params)=>invoke('run',params)};
  }
  exec(sql){
    this.readCache510.clear();
    const action=sql.trim().replace(/;$/,'').toUpperCase();
    if(action==='BEGIN IMMEDIATE'||action==='BEGIN'){
      if(this.depth)throw channelError('nested_native_transaction');
      this.sqlite.exec('BEGIN');this.mark=this.trace.length;this.priorWrites=this.writes;this.depth=1;return;
    }
    if(action==='COMMIT'&&this.depth){this.sqlite.exec('COMMIT');this.depth=0;return;}
    if(action==='ROLLBACK'&&this.depth){this.sqlite.exec('ROLLBACK');this.trace.length=this.mark;this.writes=this.priorWrites;this.depth=0;return;}
    throw channelError('unsupported_native_transaction');
  }
  finish(){
    if(this.depth)throw channelError('unclosed_native_transaction');
    // Read-only snapshots/movement never visit the writer.
    return this.writes?this.trace:null;
  }
}

export function compactNativePlan(trace){
 const statements=[],indices=new Map();
 const steps=trace.map(step=>{
  let index=indices.get(step.sql);if(index===undefined){index=statements.length;indices.set(step.sql,index);statements.push(step.sql);}
  return [index,step.method,step.params,step.expected];
 });return {version:1,statements,steps};
}

export function replayNativePlan(database,trace){
  if(!Array.isArray(trace)){
    if(trace?.version!==1||!Array.isArray(trace.statements)||trace.statements.length>1024||trace.statements.some(sql=>typeof sql!=='string')||!Array.isArray(trace.steps)||trace.steps.length>8192)throw channelError('invalid_native_plan');
    const statements=trace.statements;
    trace=trace.steps.map(step=>{
      if(!Array.isArray(step)||step.length!==4||!Number.isInteger(step[0])||step[0]<0||step[0]>=statements.length)throw channelError('invalid_native_plan');
      return {sql:statements[step[0]],method:step[1],params:step[2],expected:step[3]};
    });
  }
  if(!trace.length||trace.length>8192)throw channelError('invalid_native_plan');
  for(const [index,step] of trace.entries()){
    if(!step||typeof step.sql!=='string'||!Array.isArray(step.params)||!['get','all','run'].includes(step.method)||(!read(step.sql)&&!mutation(step.sql)))throw channelError('invalid_native_plan');
    // WITH mutations are deliberately not accepted: the plan format remains
    // a narrow native-helper SQL API, never an arbitrary SQLite script.
    const statement=database.compiled(step.sql);
    const value=statement[step.method](...step.params);
    const actual=step.method==='run'?{changes:Number(value.changes)}:plain(value);
    if(!isDeepStrictEqual(actual,step.expected))return {committed:false,reason:'native_snapshot_changed',step:index};
  }
  return {committed:true};
}
