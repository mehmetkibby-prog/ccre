import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {parse} from '../../perf-r11/tests/parser.mjs';
import {BASE,manifest,hash,native} from './helpers.mjs';
import {patchNativeAdmin} from '../patch-native-admin.mjs';
const file='dist-vds/server/index.js';
export const nativeAdminSource=fs.readFileSync(path.join(BASE,file),'utf8');
assert.equal(hash(nativeAdminSource),manifest.files.find(row=>row.path===file).sha256);
const {adminCpuProfile507}=await native('vds-server/src/cpu-profile507.mjs');
const {adminLoadSnapshot}=await native('vds-server/src/admin-load.mjs');
const {colLabHttpAuth}=await native('vds-server/src/loadlab/http-auth.mjs');
const {safeLoadLabAuthCodeR12}=await native('vds-server/src/loadlab/auth-preparation-r12.mjs');
const snippets=new Map();

// Execute the actual native route and all of its authorization/body guards.
// Only the external ChatGPT identity provider is a controlled fixture. This
// does not claim real account-provider, HTTP listener or deployed-app coverage.
export function adminHandlers({source=patchedAdminSource,database={},user={id:'admin-fixture',email:'admin@fixture.invalid'},adminUserId='admin-fixture',adminEmail='',realm=null,services={},snapshot=null}={}){
 let code=snippets.get(source);if(!code){const ast=parse(source,{ecmaVersion:'latest',sourceType:'module'}),names=['requireAdmin','GET$35','POST$45','assertSameOrigin','readJsonObject','errorResponse','authErrorResponse','noStoreHeaders'],parts=[];
  for(const name of names){const node=ast.body.find(n=>n.type==='FunctionDeclaration'&&n.id.name===name);assert(node,name);parts.push(source.slice(node.start,node.end));}
  for(const name of ['AuthRequestError','LootProfileRevisionConflictError','LootProfileValidationError','LootTemplateRevisionConflictError','LootTemplateTargetConflictError','MonsterBalanceRevisionConflictError','MonsterBalanceValidationError']){const statement=ast.body.find(n=>n.type==='VariableDeclaration'&&n.declarations.some(d=>d.id.name===name));assert(statement,name);parts.push(source.slice(statement.start,statement.end));}code=parts.join('\n')+'\n({get:GET$35,post:POST$45,requireAdmin})';snippets.set(source,code);
 }
 let identity=user,reads=0;const ctx={Response,Request,Headers,URL,TextDecoder,TextEncoder,Error,colLabHttpAuth,safeLoadLabAuthCodeR12,adminCpuProfile507,adminLoadSnapshot,env:{ADMIN_USER_ID:adminUserId,ADMIN_EMAIL:adminEmail},getChatGPTUser:async()=>identity,db:()=>{reads++;return database;},__colRealm:realm,...services,snapshot$1:snapshot};
 const routes=vm.runInNewContext(code,ctx);
 return {...routes,setUser:value=>identity=value,get reads(){return reads;}};
}
export const patchedAdminSource=patchNativeAdmin(nativeAdminSource).source;
export function adminRequest({method='GET',query='',origin='https://game.invalid',body,headers={}}={}){
 return new Request('https://game.invalid/api/admin'+query,{method,headers:{...(origin===null?{}:{Origin:origin}),'Content-Type':'application/json',...headers},...(body===undefined?{}:{body:typeof body==='string'?body:JSON.stringify(body)})});
}
