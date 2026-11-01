import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {stageNativeHttp} from '../core511/tests/native-http-bundle-fixture.mjs';
import {BASE} from '../core511/tests/helpers.mjs';
// Use the accepted composer and already-built immutable client; no rebuild.
export function prepareHttpRuntime(destination){
 const cleanup=[],staged=stageNativeHttp({after:fn=>cleanup.push(fn)});
 try{
  fs.mkdirSync(destination,{recursive:true});fs.cpSync(path.join(staged.root,'dist-vds'),path.join(destination,'dist-vds'),{recursive:true,mode:fs.constants.COPYFILE_FICLONE});
  fs.writeFileSync(path.join(destination,'package.json'),'{"type":"module"}\n');
  for(const name of ['lib','vds-server','node_modules'])fs.symlinkSync('../native510-bb3a6cc689c6/'+name,path.join(destination,name),'dir');
 }finally{for(const fn of cleanup.toReversed())fn();}
}
// Only module locations change. The original accounts entry and every security,
// registration/owner/CAS operation are preserved byte-for-byte after reversal.
export function prepareAccountsEntry(destination){
 const source=fs.readFileSync(path.join(BASE,'vds-server/src/accounts-app.mjs'),'utf8'),dir=path.dirname(destination);
 const runtime=path.resolve(import.meta.dirname,'../core511/generated/native-realm-runtime.mjs');
 let transformed=source.replace("import {initializeRealmRuntime,installRealmRouteGuard} from './realm-runtime.mjs';",`import {initializeRealmRuntime} from ${JSON.stringify('./'+path.relative(dir,runtime))};\nimport {installRealmRouteGuard} from './realm-runtime.mjs';`);
 if(transformed===source)throw Error('accounts_runtime_import_missing');
 transformed=transformed.replace(/from (['"])(\.\/[^'"\n]+)\1/g,(_all,_quote,specifier)=>{
  if(specifier.includes('core511/generated'))return `from ${JSON.stringify(specifier)}`;
  const target=path.join(BASE,'vds-server/src',specifier);return `from ${JSON.stringify('./'+path.relative(dir,target))}`;
 });
 fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(destination,transformed);
 return {sourceBytes:Buffer.byteLength(source),changedOnlyImportLocations:true};
}
