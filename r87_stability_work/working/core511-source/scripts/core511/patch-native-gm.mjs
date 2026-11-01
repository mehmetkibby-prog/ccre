import {parse} from '../perf-r11/tests/parser.mjs';
import {createHash} from 'node:crypto';
const hash=s=>createHash('sha256').update(s).digest('hex');
export function patchNativeGm(source){
 const ast=parse(source,{ecmaVersion:'latest',sourceType:'module'}),edits=[];
 for(const name of ['POST$23','POST$43','POST$40','POST$44']){
  const fn=ast.body.find(n=>n.id?.name===name),body=fn?.body.body.find(n=>n.type==='TryStatement')?.block.body,first=body?.find(n=>n.type==='VariableDeclaration'&&n.declarations.some(d=>d.id.name===(name==='POST$44'?'body':'payload'))),last=body?.at(-1);
  if(!first||last?.type!=='ReturnStatement')throw Error('native_gm_route_changed:'+name);
  const original=source.slice(first.start,last.end),identity=name==='POST$40'?'id':name==='POST$44'?'actor':'identity',owner=name==='POST$40'?'owner':name==='POST$44'?'admin$1':'owner$1',auth=name==='POST$23'?`player(session,async()=>{const current=await requireGameSession(request);await assertCsrf(request,current);return current;}`:`admin(${identity},async()=>{const current=await ${owner}();assertSameOrigin(request);return current;}`;
  const next=name==='POST$40'?original.replace('dedicatedRealtimeReady("ancient")','db().core511Bootstrap.dedicatedReady("ancient")'):original;
  if(name==='POST$40'&&next===original)throw Error('native_update_readiness_changed');
  edits.push({start:first.start,end:last.end,original,replacement:`return await db().core511Gm.${auth},async()=>{${next}});`});
 }
 const fn=ast.body.find(n=>n.id?.name==='publishGmVisibility');if(!fn?.async||!source.slice(fn.start,fn.end).includes('setPlayerVisibility'))throw Error('native_gm_publisher_changed');edits.push({start:fn.body.start,end:fn.body.end,original:source.slice(fn.body.start,fn.body.end),replacement:'{return db().core511Gm.visibility(player);}'});
 let output=source;for(const e of edits.toSorted((a,b)=>b.start-a.start))output=output.slice(0,e.start)+e.replacement+output.slice(e.end);parse(output,{ecmaVersion:'latest',sourceType:'module'});
 return {source:output,proof:{sourceSha256:hash(source),patchedSha256:hash(output),edits,scope:'Original GM, owner-GM, community configuration and expansion gate route bodies under exact private async global barrier; original SQL/revisions/rollback retained. Expansion readiness uses the four current owners, native visibility uses acknowledged channel+dungeon control.'}};
}
