import {createHash} from 'node:crypto';
import {parse} from '../perf-r11/tests/parser.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex');
export function patchTradeIdleR72(source){
 const from='db().core511HttpAction.player(auth,async()=>{const current=await requireGameSession(request);if(current.account.id!==auth.account.id||current.player?.id!==auth.player?.id||current.tokenHash!==auth.tokenHash)throw new AuthRequestError(409,\'game_instance_expired\',\'Oyun oturumunu yenile.\');return current;},()=>(service().snapshot(auth.player.id, new URL(request.url).searchParams.get("id"))))';
 const to=from.replace('core511HttpAction.player(auth,','core511HttpAction.tradeSnapshot(auth,new URL(request.url).searchParams.get("id"),');
 if(source.split(from).length!==2)throw Error('r72_trade_idle_anchor');
 const output=source.replace(from,to);parse(output,{ecmaVersion:'latest',sourceType:'module'});
 if(output.replace(to,from)!==source)throw Error('r72_trade_idle_inverse');
 return {source:output,proof:{sourceSha256:hash(source),patchedSha256:hash(output),edits:[{from,to}],inverseEqual:true,scope:'Authenticated idle trade invitation reads avoid actor drain; active, expired and explicit-ID snapshots retain original permanent gate and native trade service.'}};
}
