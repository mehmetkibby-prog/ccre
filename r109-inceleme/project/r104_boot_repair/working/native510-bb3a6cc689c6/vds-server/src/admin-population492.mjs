// Administrative reads only. Identity comes from durable ownership markers,
// never a username, email suffix, current test mode, or in-memory registry.
const ident=value=>{if(!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value))throw Error('invalid_admin_alias492');return value;};
function schema(db){return new Set(db.prepare("SELECT name FROM sqlite_schema WHERE type='table' AND name IN ('players','loadlab_accounts_v1','loadlab_admissions_v1','loadlab_entities_v1')").all().map(row=>row.name));}
function playerTerms(db,alias,tables){
 const clauses=[];
 if(tables.has('players')&&db.prepare('PRAGMA table_info(players)').all().some(row=>row.name==='loadlab_run_id'))clauses.push(`COALESCE(${alias}.loadlab_run_id,'')=''`);
 if(tables.has('loadlab_entities_v1'))clauses.push(`NOT EXISTS(SELECT 1 FROM loadlab_entities_v1 lab492 WHERE lab492.kind='player' AND lab492.id=${alias}.id)`);
 if(tables.has('loadlab_admissions_v1'))clauses.push(`NOT EXISTS(SELECT 1 FROM loadlab_admissions_v1 admission492 WHERE admission492.account_id=${alias}.account_id)`);
 if(tables.has('loadlab_accounts_v1'))clauses.push(`NOT EXISTS(SELECT 1 FROM loadlab_accounts_v1 account492 WHERE account492.account_id=${alias}.account_id)`);
 return clauses;
}
export function humanPlayerWhere492(db,alias='players'){
 ident(alias);const terms=playerTerms(db,alias,schema(db));return terms.length?'('+terms.join(' AND ')+')':'1';
}
export function humanAccountWhere492(db,alias='a'){
 ident(alias);const tables=schema(db),clauses=[];
 if(tables.has('loadlab_accounts_v1'))clauses.push(`NOT EXISTS(SELECT 1 FROM loadlab_accounts_v1 account492 WHERE account492.account_id=${alias}.id)`);
 if(tables.has('loadlab_admissions_v1'))clauses.push(`NOT EXISTS(SELECT 1 FROM loadlab_admissions_v1 admission492 WHERE admission492.account_id=${alias}.id)`);
 if(tables.has('loadlab_entities_v1'))clauses.push(`NOT EXISTS(SELECT 1 FROM loadlab_entities_v1 entity492 WHERE entity492.kind='player' AND entity492.account_id=${alias}.id)`);
 if(tables.has('players')&&db.prepare('PRAGMA table_info(players)').all().some(row=>row.name==='loadlab_run_id'))clauses.push(`NOT EXISTS(SELECT 1 FROM players player492 WHERE player492.account_id=${alias}.id AND COALESCE(player492.loadlab_run_id,'')<>'')`);
 return clauses.length?'('+clauses.join(' AND ')+')':'1';
}
