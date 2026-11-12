import {createHash} from 'node:crypto';
import {parse} from '../perf-r11/tests/parser.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
const route=`
  if(new URL(request.url).searchParams.get('core511')==='gameplay-r55'){
   try{
    const payload=await readJsonObject(request);
    const material=payload.action==='grant_enhancement_material_r55',drops=['mount_drop_get_r55','mount_drop_save_r55'].includes(payload.action);
    if(!material&&!drops)return Response.json({error:'Geçersiz yönetici işlemi.'},{status:400,headers:{'cache-control':'no-store'}});
    const identity=await getChatGPTUser();if(typeof identity?.id!=='string'||!identity.id)return Response.json({error:'Yönetici kimliği doğrulanamadı.'},{status:403,headers:{'cache-control':'no-store'}});
    const service=material?db().core511MaterialGrantR55:db().core511MountDropsR55;
    if(!service)return Response.json({error:'Hizmet henüz hazır değil.'},{status:503,headers:{'cache-control':'no-store'}});
    const authorization={adminId:identity.id,reauthorize:async()=>{assertSameOrigin(request);if(!await requireAdmin())return null;return (await getChatGPTUser())?.id??null;}};
    const result=material?await service.grant(payload,authorization):await service.execute(payload,authorization);
    return Response.json({adminRefreshRequired508:true,...(material?{materialGrant:result}:{mountDrops:result})},{headers:{'cache-control':'no-store'}});
   }catch(error){const status=[400,401,403,404,409,413,415,422,423,429,503].includes(error?.status)?error.status:500;return Response.json({error:status===500?'İşlem sonucu doğrulanamadı. Aynı işlemi yeniden sorgula.':error.message,...(status!==500&&typeof error?.gameCode==='string'?{code:error.gameCode}:{})},{status,headers:{'cache-control':'no-store'}});}
  }`;
export function patchAdminR55Routes(source){
 const ast=parse(source,{ecmaVersion:'latest',sourceType:'module'}),fn=ast.body.find(x=>x.type==='FunctionDeclaration'&&x.id.name==='POST$45'),body=fn?.body.body[0]?.block?.body;
 if(!body||source.slice(body[0].start,body[0].end)!=='if (!await requireAdmin()) return Response.json({ error: "Bu alan yalnızca oyun yöneticisine açık." }, { status: 403 });'||source.slice(body[1].start,body[1].end)!=='assertSameOrigin(request);'||source.includes(route))throw Error('admin_r55_security_anchor_changed');
 const at=body[1].end,output=source.slice(0,at)+route+source.slice(at);parse(output,{ecmaVersion:'latest',sourceType:'module'});
 return {source:output,proof:{sourceSha256:hash(source),patchedSha256:hash(output),edits:[{start:at,end:at,original:'',replacement:route}],scope:'Only authenticated, same-origin admin materials and mount settings routes; same identity rechecked in the writer queue.'}};
}
export function unpatchAdminR55Routes(source){if(source.split(route).length!==2)throw Error('admin_r55_reverse_anchor_changed');return source.replace(route,'');}
