import {parse} from '../perf-r11/tests/parser.mjs';
import {createHash} from 'node:crypto';
const hash=x=>createHash('sha256').update(x).digest('hex');

// Candidate assembler calls this on SHA-verified V510 bytes, never on the live
// bundle. The native database session/account checks and validateGameSession's
// Origin/CSRF/ban/realm/bot/instance predicates remain byte-for-byte intact.
export function patchNativeAuth(source){
 const ast=parse(source,{ecmaVersion:'latest',sourceType:'module'}),fn=ast.body.find(n=>n.type==='FunctionDeclaration'&&n.id.name==='getGameSessionByHash');
 if(!fn)throw Error('native_session_function_missing');
 const body=fn.body.body,ret=body.at(-1);if(ret?.type!=='ReturnStatement'||ret.argument?.name!=='session')throw Error('native_session_return_changed');
 const original=source.slice(fn.start,fn.end),replacement='return globalThis.__colCore511Presence?.augment(session) ?? session;';
 const changed=source.slice(0,ret.start)+replacement+source.slice(ret.end);
 parse(changed,{ecmaVersion:'latest',sourceType:'module'});
 return {source:changed,proof:{function:'getGameSessionByHash',sourceSha256:hash(source),nativeBodySha256:hash(original),patchedSha256:hash(changed),edit:'Only final session return overlays same-session, same-instance, epoch-fenced authenticated WS presence; all original authorization follows unchanged'}};
}
