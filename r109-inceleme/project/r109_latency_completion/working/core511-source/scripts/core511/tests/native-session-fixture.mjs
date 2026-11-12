import vm from 'node:vm';
import assert from 'node:assert/strict';
import {parse} from '../../perf-r11/tests/parser.mjs';
import {nativeLogoutSource} from './native-logout-fixture.mjs';
import {nativeTokenHash} from '../entry-writer.mjs';
import {patchNativeSession} from '../patch-native-session.mjs';

export const nativeSessionSource=nativeLogoutSource;
export const patchedSessionSource=patchNativeSession(nativeSessionSource).source;
const snippets=new Map();
// Actual native account/ban/realm/session SQL and return/error behavior.
// Opaque-token entropy is the explicit deterministic parity fixture; this
// helper starts AFTER password verification and is not a login-route test.
export function sessionFactory({database,auth,clock=Date.now,realm=null,source=patchedSessionSource}){
 let code=snippets.get(source);if(!code){const ast=parse(source,{ecmaVersion:'latest',sourceType:'module'}),fn=ast.body.find(n=>n.type==='FunctionDeclaration'&&n.id.name==='createSession'),lifetime=ast.body.find(n=>n.type==='VariableDeclaration'&&n.declarations.some(d=>d.id.name==='SESSION_LIFETIME_SECONDS'));assert(fn&&lifetime);code=source.slice(lifetime.start,lifetime.end)+'\n'+source.slice(fn.start,fn.end)+'\ncreateSession';snippets.set(source,code);}
 let serial=0;return vm.runInNewContext(code,{Date:class extends Date{static now(){return clock();}},AuthRequestError:auth.rules.AuthRequestError,authDatabase:()=>database,realmRuntime:()=>realm,sha256:async x=>nativeTokenHash(x),generateOpaqueToken:()=>('native-created-'+(++serial)+'-').padEnd(60,'q')});
}
