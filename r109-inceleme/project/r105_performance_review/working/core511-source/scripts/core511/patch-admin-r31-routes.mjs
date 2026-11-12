import {createHash} from 'node:crypto';
import {parse} from '../perf-r11/tests/parser.mjs';
const hash=source=>createHash('sha256').update(source).digest('hex');
const walk=(node,visit)=>{if(!node||typeof node!=='object')return;visit(node);for(const value of Object.values(node))if(Array.isArray(value))value.forEach(child=>walk(child,visit));else if(value?.type)walk(value,visit);};
const ADMIN_AZRAIL_ROUTE_INSERT_R31=`
  if(new URL(request.url).searchParams.get('core511')==='azrail-grant'){
   try{
    const payload=await readJsonObject(request);
    if(payload.action!=='grant_azrail_chests')return Response.json({error:'Geçersiz sandık gönderme işlemi.'},{status:400,headers:{'cache-control':'no-store'}});
    const identity=await getChatGPTUser();if(typeof identity?.id!=='string'||!identity.id)return Response.json({error:'Yönetici kimliği doğrulanamadı.'},{status:403,headers:{'cache-control':'no-store'}});
    const service=db().core511AzrailGrant;if(!service)return Response.json({error:'Sandık gönderimi henüz hazır değil.'},{status:503,headers:{'cache-control':'no-store'}});
    const azrailGrant=await service.grant(payload,{adminId:identity.id,reauthorize:async()=>{assertSameOrigin(request);if(!await requireAdmin())return null;return (await getChatGPTUser())?.id??null;}});
    return Response.json({adminRefreshRequired508:true,azrailGrant},{headers:{'cache-control':'no-store'}});
   }catch(error){const status=[400,401,403,404,409,413,415,422,423,429,503].includes(error?.status)?error.status:500;return Response.json({error:status===500?'Sandık gönderimi doğrulanamadı. Aynı işlemi yeniden sorgula.':error.message},{status,headers:{'cache-control':'no-store'}});}
  }`;
export function patchAdminR31Routes(source){
 const ast=parse(source,{ecmaVersion:'latest',sourceType:'module'}),route=ast.body.find(node=>node.type==='FunctionDeclaration'&&node.id.name==='POST$45'),body=route?.body.body[0]?.block?.body,admin=ast.body.find(node=>node.type==='FunctionDeclaration'&&node.id.name==='requireAdmin');
 if(!body||source.slice(body[0].start,body[0].end)!=='if (!await requireAdmin()) return Response.json({ error: "Bu alan yalnızca oyun yöneticisine açık." }, { status: 403 });'||source.slice(body[1].start,body[1].end)!=='assertSameOrigin(request);'||source.includes("core511')==='azrail-grant'"))throw Error('admin_r31_security_anchor_changed');
 let identityCalls=0;walk(admin,node=>{if(node.type==='CallExpression'&&node.callee?.name==='getChatGPTUser'){if(node.arguments.length)throw Error('admin_r31_identity_contract_changed');identityCalls++;}});if(identityCalls!==1)throw Error('admin_r31_identity_contract_missing');
 const at=body[1].end,insert=ADMIN_AZRAIL_ROUTE_INSERT_R31;
 const output=source.slice(0,at)+insert+source.slice(at);parse(output,{ecmaVersion:'latest',sourceType:'module'});
 return {source:output,proof:{sourceSha256:hash(source),patchedSha256:hash(output),edits:[{start:at,end:at,original:'',replacement:insert}],scope:'Additive admin-only Azrail grant after unchanged native requireAdmin and same-Origin guards; original 16KiB JSON reader; authenticated provider identity rechecked inside the serial queue; target-only durable writer service.'}};
}

export function unpatchAdminR31Routes(source){
 if(source.split(ADMIN_AZRAIL_ROUTE_INSERT_R31).length!==2)throw Error('admin_r31_reverse_anchor_changed');
 const original=source.replace(ADMIN_AZRAIL_ROUTE_INSERT_R31,'');
 if(patchAdminR31Routes(original).source!==source)throw Error('admin_r31_reverse_proof_changed');
 return original;
}
