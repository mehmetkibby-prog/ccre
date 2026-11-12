import {WORLD_PUSH_VOLATILE_PLAYER} from './world-push.mjs';
const quote=s=>'"'+s.replaceAll('"','""')+'"';
// Changed keys only. For the async writer they are released after its existing
// WAL durability promise. Native admin/economy connections use FULL commits.
export function observeChannelCommits(sqlite,definitions,{afterCommit,onChanges,ignore=()=>false}){
 let pending=new Map();
 sqlite.function('col_channel_observed',{varargs:true},(table,id,owner,peer,staticChanged,...keys)=>{
  if(ignore())return 0;
  const key=table+'\u001e'+JSON.stringify(keys),old=pending.get(key);
  pending.set(key,{table,id,owner,peer,keys,staticChanged:staticChanged||old?.staticChanged||''});return 0;
 });
 for(const [table,{columns,keys,id,owner,peer}]of definitions)for(const [op,ref]of [['INSERT','NEW'],['UPDATE','NEW'],['DELETE','OLD']]){
  const fields=columns.filter(c=>!WORLD_PUSH_VOLATILE_PLAYER.includes(c));
  const changed=table==='players'&&op==='UPDATE'?(fields.length?`CASE ${fields.map(c=>`WHEN OLD.${quote(c)} IS NOT NEW.${quote(c)} THEN '${c}'`).join(' ')} ELSE '' END`:"''"):'1';
  sqlite.exec(`CREATE TEMP TRIGGER col_observed_${table}_${op} AFTER ${op} ON main.${quote(table)} BEGIN SELECT col_channel_observed('${table}',${ref}.${quote(id)},${owner?`${ref}.${quote(owner)}`:'NULL'},${peer?`${ref}.${quote(peer)}`:'NULL'},${changed},${keys.map(k=>`${ref}.${quote(k)}`).join(',')}); END;`);
 }
 const release=durable=>{const rows=[...pending.values()];pending.clear();if(!rows.length)return;if(durable)void durable.then(()=>onChanges(rows),()=>{});else onChanges(rows);};
 if(afterCommit){const original=afterCommit.durableAfterCommit.bind(afterCommit);afterCommit.durableAfterCommit=()=>{const durable=original();release(durable);return durable;};return;}
 if(sqlite.prepare('PRAGMA synchronous').get().synchronous!==2)throw Error('Native observer requires FULL durability');
 const exec=sqlite.exec.bind(sqlite),prepare=sqlite.prepare.bind(sqlite);
 sqlite.exec=sql=>{try{const result=exec(sql);if(/^\s*ROLLBACK\b(?!\s+TO)/i.test(sql))pending.clear();if(!sqlite.isTransaction)release();return result;}catch(e){if(!sqlite.isTransaction)pending.clear();throw e;}};
 sqlite.prepare=sql=>{const s=prepare(sql);if(!/^\s*(?:INSERT|UPDATE|DELETE|REPLACE|WITH)\b/i.test(sql))return s;for(const method of ['run','get','all']){const call=s[method].bind(s);s[method]=(...args)=>{try{const result=call(...args);if(!sqlite.isTransaction)release();return result;}catch(e){if(!sqlite.isTransaction)pending.clear();throw e;}};}return s;};
}
