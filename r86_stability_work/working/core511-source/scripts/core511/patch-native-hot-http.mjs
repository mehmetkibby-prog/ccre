import {parse} from '../perf-r11/tests/parser.mjs';
import {createHash} from 'node:crypto';
const hash=value=>createHash('sha256').update(value).digest('hex');

// Native auth/CSRF, character and body/rate guards precede upgrade responses.
// The bounded, explicit market detail read remains a cold authenticated read.
export function patchNativeHotHttp(source){
 const ast=parse(source,{ecmaVersion:'latest',sourceType:'module'}),edits=[];
 const body=name=>{const f=ast.body.find(n=>n.id?.name===name),b=f?.body.body.find(n=>n.type==='TryStatement')?.block.body;if(!b)throw Error('native_hot_http_function_changed');return b;};
 const after=(n,replacement='\nreturn db().core511HttpAction.upgrade();\n')=>edits.push({start:n.end,end:n.end,original:'',replacement});
 const world=body('readWorld'),market=world.find(n=>n.type==='IfStatement'&&source.slice(n.start,n.end).startsWith('if(requestUrl.searchParams.has("marketShop506"))'));
 if(!market||market.consequent?.argument?.type!=='AwaitExpression'||market.consequent.argument.argument?.callee?.name!=='readMarketShop506')throw Error('native_hot_http_market_changed');
 const call=market.consequent.argument;edits.push({start:call.start,end:call.end,original:source.slice(call.start,call.end),replacement:'await db().core511HttpAction.readMarket(auth,()=>'+source.slice(call.argument.start,call.argument.end)+')'});after(market);
 const get=body('GET$23'),ret=get.at(-1);if(ret.type!=='ReturnStatement'||!source.slice(ret.start,ret.end).includes('dungeonService().snapshot(auth.player.id)'))throw Error('native_hot_http_dungeon_get_changed');
 edits.push({start:ret.start,end:ret.end,original:source.slice(ret.start,ret.end),replacement:'return db().core511HttpAction.upgrade();'});
 const post=body('POST$26'),input=post.find(n=>source.slice(n.start,n.end)==='const input = await readJsonObject(request, 2048);');if(!input)throw Error('native_hot_http_dungeon_post_changed');after(input);
 const ticket=body('POST$4'),player=ticket.find(n=>n.type==='IfStatement'&&source.slice(n.test.start,n.test.end)==='!session.player');if(!player||!source.slice(ticket[1].start,ticket[1].end).includes('assertCsrf'))throw Error('native_hot_http_ticket_changed');after(player);
 let output=source;for(const e of [...edits].sort((a,b)=>b.start-a.start))output=output.slice(0,e.start)+e.replacement+output.slice(e.end);parse(output,{ecmaVersion:'latest',sourceType:'module'});return {source:output,proof:{sourceSha256:hash(source),patchedSha256:hash(output),edits,scope:'Fence legacy world/dungeon/ticket simulation after original guards; preserve bounded cold market detail under current owner drain'}};
}
