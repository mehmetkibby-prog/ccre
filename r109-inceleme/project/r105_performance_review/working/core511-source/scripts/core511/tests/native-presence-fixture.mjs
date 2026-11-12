import vm from 'node:vm';
import assert from 'node:assert/strict';
import {parse} from '../../perf-r11/tests/parser.mjs';
import {nativeLogoutSource} from './native-logout-fixture.mjs';
import {patchNativePresence} from '../patch-native-presence.mjs';

export const nativePresenceSource=nativeLogoutSource;
export const patchedPresenceSource=patchNativePresence(nativePresenceSource).source;
const snippets=new Map();
// Exact native presence route/instance parser and original auth guards. Only
// the separate channel-bootstrap response is a marked fixture in these tests.
export function presenceHandler({f,source=patchedPresenceSource,realm=null,bootstrap=null}){
 let code=snippets.get(source);if(!code){const ast=parse(source,{ecmaVersion:'latest',sourceType:'module'}),parts=[];for(const name of ['POST$24','readGameInstance']){const n=ast.body.find(n=>n.type==='FunctionDeclaration'&&n.id.name===name);assert(n);parts.push(source.slice(n.start,n.end));}const ms=ast.body.find(n=>n.type==='VariableDeclaration'&&n.declarations.some(d=>d.id.name==='GAME_PRESENCE_MS'));assert(ms);parts.push(source.slice(ms.start,ms.end));code=parts.join('\n')+'\nPOST$24';snippets.set(source,code);}
 const r=f.auth.rules;return vm.runInNewContext(code,{Response,URL,Date:class extends Date{static now(){return f.clock();}},AuthRequestError:r.AuthRequestError,requireGameSession:r.requireGameSession,assertCsrf:r.assertCsrf,readJsonObject:r.readJsonObject,noStoreHeaders:r.noStoreHeaders,authErrorResponse:r.authErrorResponse,authDatabase:()=>f.f.database,__colRealm:realm,col422ChannelBootstrap:bootstrap??(async()=>({fixtureBootstrap:true}))});
}
