// Test-only diagnostic: retain the production worker implementation and expose
// its already-caught SQLite message solely in this disposable fixture process.
// Never part of the shipped runtime or acceptance performance measurements.
export async function load(url,context,nextLoad){
 const result=await nextLoad(url,context);
 if(process.env.R108_FIXTURE_PREREQS==='1'&&url.endsWith('/scripts/core511/tests/pvp-fixture.mjs')&&result.format==='module'){
  const source=String(result.source),marker='createContentSchemaR102(sql);';if(!source.includes(marker))throw Error('cold_fixture_prerequisite_target_changed');
  return {...result,source:"import {createTowerSchema} from '../tower-config.mjs';\nimport {createAdventureSchema} from '../adventure-schema.mjs';\nimport {createCastleSchema} from '../castle-schema-r59.mjs';\n"+source.replace(marker,marker+'createTowerSchema(sql);createAdventureSchema(sql);createCastleSchema(sql);')};
 }
 if(process.env.R108_FIXTURE_DIAGNOSTIC!=='1'||!url.endsWith('/scripts/core511/read-worker.mjs')||result.format!=='module')return result;
 const source=String(result.source),marker='}catch(error){post({id:message.id,ok:false,code:error.code';
 if(!source.includes(marker))throw Error('cold_fixture_diagnostic_target_changed');
 return {...result,source:source.replace(marker,"}catch(error){console.error(JSON.stringify({diagnostic:'cold_fixture_sql',query:message.name,message:error.message,code:error.code,stack:error.stack}));post({id:message.id,ok:false,code:error.code")};
}
