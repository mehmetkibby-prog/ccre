import {parse} from '../perf-r11/tests/parser.mjs';
import {createHash} from 'node:crypto';
const hash=s=>createHash('sha256').update(s).digest('hex');
function walk(n,visit,parent=null){if(!n||typeof n!=='object')return;if(n.type)visit(n,parent);for(const v of Object.values(n))if(Array.isArray(v))v.forEach(x=>walk(x,visit,n));else if(v?.type)walk(v,visit,n);}
export function patchNativeHttpRewards(source){
 const ast=parse(source,{ecmaVersion:'latest',sourceType:'module'}),edits=[],targets=[
  {fn:'POST$25',call:'redeemEpin',asynchronous:true},
  {fn:'POST$3',text:'service.open(auth.account.id, auth.player.id)'},
  {fn:'GET$13',text:'service$4().read(auth.player.id)',read:true},
  {fn:'POST$15',text:'service$4().advance(auth.player.id, String(input.event ?? ""))'},
  {fn:'POST$10',text:'service$2().claim(auth.player.id)'},
  {fn:'POST$9',text:'rankService().equip(auth.player.id, body.slot, body.reward)'},
  {fn:'POST$28',text:'service.claim(auth.account.id, auth.player.id, body.id, body.stage)'}
 ];
 for(const target of targets){const fn=ast.body.find(n=>n.id?.name===target.fn),found=[];walk(fn,(n,parent)=>{if(n.type==='CallExpression'&&(target.call?n.callee.name===target.call:source.slice(n.start,n.end)===target.text))found.push({n,parent});});if(found.length!==1)throw Error('native_http_reward_call_changed:'+target.fn);
  const {n,parent}=found[0],original=source.slice(n.start,n.end),replacement=(parent.type==='AwaitExpression'?'':'await ')+`db().core511HttpAction.player(auth,async()=>{
 const current=await requireGameSession(request);${target.read?'':'await assertCsrf(request,current);'}
 if(current.account.id!==auth.account.id||current.player?.id!==auth.player?.id||current.tokenHash!==auth.tokenHash)throw new AuthRequestError(409,'game_instance_expired','Oyun oturumunu yenile.');return current;
},()=>${original},${target.asynchronous===true})`;edits.push({start:n.start,end:n.end,original,replacement});
 }
 let output=source;for(const e of edits.toSorted((a,b)=>b.start-a.start))output=output.slice(0,e.start)+e.replacement+output.slice(e.end);parse(output,{ecmaVersion:'latest',sourceType:'module'});
 return {source:output,proof:{sourceSha256:hash(source),patchedSha256:hash(output),edits,scope:'Seven native single-player operations: E-PIN, starter chest, onboarding read/advance, legacy first-evolution claim, rank equipment and community reward; original calls/guards/rates/results retained'}};
}
