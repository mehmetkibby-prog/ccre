import {parse} from '../perf-r11/tests/parser.mjs';
import {createHash} from 'node:crypto';
const hash=s=>createHash('sha256').update(s).digest('hex');
function walk(n,visit){if(!n||typeof n!=='object')return;if(n.type)visit(n);for(const v of Object.values(n))if(Array.isArray(v))v.forEach(x=>walk(x,visit));else if(v?.type)walk(v,visit);}
export function patchNativeHttpPremium(source){
 const tree=parse(source,{ecmaVersion:'latest',sourceType:'module'}),fn=tree.body.find(n=>n.id?.name==='POST$11'),found=[];
 walk(fn,n=>{if(n.type==='CallExpression'&&n.callee.name==='channelPermanent'&&n.arguments.length===2&&n.arguments[1].type==='ArrowFunctionExpression'&&source.slice(n.arguments[1].start,n.arguments[1].end)==='() => service$3().command(auth.player.id, input)')found.push(n);});
 if(found.length!==1)throw Error('native_http_premium_command_changed');const n=found[0],replacement=`db().core511HttpAction.premium(auth,input,async()=>{
 const current=await requireGameSession(request);await assertCsrf(request,current);
 if(current.account.id!==auth.account.id||current.player?.id!==auth.player?.id||current.tokenHash!==auth.tokenHash)throw new AuthRequestError(409,'game_instance_expired','Oyun oturumunu yenile.');
 return current;
},${source.slice(n.arguments[1].start,n.arguments[1].end)})`,edits=[{start:n.start,end:n.end,original:source.slice(n.start,n.end),replacement}],output=source.slice(0,n.start)+replacement+source.slice(n.end);parse(output,{ecmaVersion:'latest',sourceType:'module'});
 return {source:output,proof:{sourceSha256:hash(source),patchedSha256:hash(output),edits,scope:'Only premium command participant binding; native auth/CSRF/rates/service/SQL/receipts/results and read-only wheel status unchanged'}};
}
