import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {parse} from '../../perf-r11/tests/parser.mjs';
import {BASE,manifest,hash} from './helpers.mjs';
import {nativeTokenHash} from '../entry-writer.mjs';
import {patchNativeLogout} from '../patch-native-logout.mjs';
const require=createRequire(import.meta.url),{analyze}=require('/tmp/core511-build-deps/node_modules/eslint-scope');
const file='dist-vds/server/index.js';
export const nativeLogoutSource=fs.readFileSync(path.join(BASE,file),'utf8');assert.equal(hash(nativeLogoutSource),manifest.files.find(r=>r.path===file).sha256);
export const patchedLogoutSource=patchNativeLogout(nativeLogoutSource).source;
const snippets=new Map();

// Actual native logout/cookie helpers; authentication, Origin and CSRF are
// the already extracted original rules against the real isolated database.
export function logoutHandlers({database,auth,clock=Date.now,realm=null,source=patchedLogoutSource}){
 let code=snippets.get(source);if(!code){
  const ast=parse(source,{ecmaVersion:'latest',sourceType:'module',ranges:true}),scopes=analyze(ast,{ecmaVersion:2022,sourceType:'module'}),moduleVars=new Set(scopes.scopes.find(s=>s.type==='module').variables),refs=scopes.scopes.flatMap(s=>s.references).filter(r=>moduleVars.has(r.resolved)),rows=new Map(),selected=new Set();
  const injected=new Set(['getGameSession','assertCsrf','assertSameOrigin','authErrorResponse','authDatabase','realmRuntime','sha256','env']);
  for(const n of ast.body){if(['FunctionDeclaration','ClassDeclaration'].includes(n.type))rows.set(n.id.name,{node:n,text:source.slice(n.start,n.end)});if(n.type==='VariableDeclaration')for(const d of n.declarations)if(d.id.type==='Identifier')rows.set(d.id.name,{node:d,text:n.kind+' '+source.slice(d.start,d.end)+';'});}
  function include(name){if(injected.has(name)||selected.has(name))return;const row=rows.get(name);assert(row,'native logout dependency '+name);selected.add(name);for(const ref of refs)if(ref.identifier.start>=row.node.start&&ref.identifier.end<=row.node.end&&ref.resolved.name!==name)include(ref.resolved.name);}
  for(const name of ['POST$34','deleteCurrentSession'])include(name);code=[...selected].sort((a,b)=>rows.get(a).node.start-rows.get(b).node.start).map(name=>rows.get(name).text).join('\n')+'\n({post:POST$34,deleteSession:deleteCurrentSession})';snippets.set(source,code);
 }
 const ctx={Response,Request,Headers,URL,TextEncoder,TextDecoder,Buffer,env:{},__colRealm:realm,Date:class extends Date{static now(){return clock();}},getGameSession:auth.rules.getGameSession,assertCsrf:auth.rules.assertCsrf,assertSameOrigin:auth.rules.assertSameOrigin,authErrorResponse:auth.rules.authErrorResponse,authDatabase:()=>database,realmRuntime:()=>realm,sha256:async token=>nativeTokenHash(token)};
 return vm.runInNewContext(code,ctx);
}
