import {parse} from '../perf-r11/tests/parser.mjs';
import {createHash} from 'node:crypto';
const hash=value=>createHash('sha256').update(value).digest('hex');
function walk(n,visit){if(!n||typeof n!=='object')return;if(n.type)visit(n);for(const v of Object.values(n))if(Array.isArray(v))v.forEach(x=>walk(x,visit));else if(v?.type)walk(v,visit);}

export function patchNativeHttpAction(source){
 const ast=parse(source,{ecmaVersion:'latest',sourceType:'module'}),fn=ast.body.find(n=>n.id?.name==='runTimedAction'),found=[],edits=[];
 walk(fn,n=>{if(n.type==='VariableDeclarator'&&n.id.name==='executeLoadLabScoped')found.push(n.init);});
 if(found.length!==1||found[0].type!=='ArrowFunctionExpression'||!source.slice(found[0].start,found[0].end).includes("runEntryAdmission477('characterJoin'"))throw Error('native_http_action_dispatch_changed');
 const n=found[0],replacement=`()=>db().core511HttpAction.action(auth,payload,async()=>{
 const current=await requireGameSession(request);await assertCsrf(request,current);
 if(current.account.id!==auth.account.id||current.player?.id!==auth.player?.id||current.tokenHash!==auth.tokenHash)throw new AuthRequestError(409,'game_instance_expired','Oyun oturumunu yenile.');
 auth=current;return current;
},executeAuthorized)`;
 edits.push({start:n.start,end:n.end,original:source.slice(n.start,n.end),replacement});
 for(const name of ['publishRealtimeRoomEvent','publishRealtimeRoomEventToChannels','publishRealtimePlayerEvent','publishRealtimeWorldEvent']){
  const f=ast.body.find(n=>n.id?.name===name);if(!f?.async||f.params.some(p=>p.type!=='Identifier'))throw Error('native_http_action_publisher_changed');
  const args=f.params.map(p=>p.name);if(name==='publishRealtimeRoomEventToChannels')args.pop();
  edits.push({start:f.body.start+1,end:f.body.start+1,original:'',replacement:'\n if(db().core511HttpAction?.active)return db().core511HttpAction.publish(['+args.join(',')+']);\n if(db().core511Gm?.active)return db().core511Gm.event(['+args.join(',')+']);\n'});
 }
 let output=source;for(const e of [...edits].sort((a,b)=>b.start-a.start))output=output.slice(0,e.start)+e.replacement+output.slice(e.end);parse(output,{ecmaVersion:'latest',sourceType:'module'});
 return {source:output,proof:{sourceSha256:hash(source),patchedSha256:hash(output),edits,scope:'Cold action ownership dispatch and four scoped notification hooks; all native action bodies, SQL, authentication/CSRF/rates/results unchanged'}};
}
