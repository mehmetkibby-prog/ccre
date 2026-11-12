import {createHash} from 'node:crypto';
import {parse} from '../perf-r11/tests/parser.mjs';
const hash=source=>createHash('sha256').update(source).digest('hex');
const GET_INSERT=`
  if(new URL(request.url).searchParams.get('core511')==='motion'){
   try{
    const identity=await getChatGPTUser();if(typeof identity?.id!=='string'||!identity.id)return Response.json({error:'Yönetici kimliği doğrulanamadı.'},{status:403,headers:{'cache-control':'no-store'}});
    const service=db().core511MotionAdmin;if(!service)return Response.json({error:'Hareket ayarı hizmeti henüz hazır değil.'},{status:503,headers:{'cache-control':'no-store'}});
    const query=Object.fromEntries(new URL(request.url).searchParams);
    if(!['settings'].includes(query.action??'settings'))return Response.json({error:'Geçersiz hareket ayarı sorgusu.'},{status:400,headers:{'cache-control':'no-store'}});
    return Response.json(await service.read(query,{adminId:identity.id,adminName:identity.displayName??identity.id}),{headers:{'cache-control':'no-store'}});
   }catch(error){const status=[400,401,403,404,409,413,422,423,429,503].includes(error?.status)?error.status:500;return Response.json({error:status===500?'Hareket ayarı kayıtları okunamadı.':error.message},{status,headers:{'cache-control':'no-store'}});}
  }`;
const POST_INSERT=`
  if(new URL(request.url).searchParams.get('core511')==='motion'){
   try{
    const payload=await readJsonObject(request);
    if(!['settings'].includes(payload.action))return Response.json({error:'Geçersiz hareket ayarı işlemi.'},{status:400,headers:{'cache-control':'no-store'}});
    const identity=await getChatGPTUser();if(typeof identity?.id!=='string'||!identity.id)return Response.json({error:'Yönetici kimliği doğrulanamadı.'},{status:403,headers:{'cache-control':'no-store'}});
    const service=db().core511MotionAdmin;if(!service)return Response.json({error:'Hareket ayarı hizmeti henüz hazır değil.'},{status:503,headers:{'cache-control':'no-store'}});
    const result=await service.mutate(payload,{adminId:identity.id,adminName:identity.displayName??identity.id,reauthorize:async()=>{assertSameOrigin(request);if(!await requireAdmin())return null;return (await getChatGPTUser())?.id??null;}});
    return Response.json(result?.body??result,{status:result?.status??200,headers:{'cache-control':'no-store'}});
   }catch(error){const status=[400,401,403,404,409,413,415,422,423,429,503].includes(error?.status)?error.status:500;return Response.json({error:status===500?'Hareket ayarı işlemi tamamlanamadı. Kayıtları yenileyerek sonucu kontrol et.':error.message},{status,headers:{'cache-control':'no-store'}});}
  }`;
const GUARD='if (!await requireAdmin()) return Response.json({ error: "Bu alan yalnızca oyun yöneticisine açık." }, { status: 403 });';
export function patchAdminMotionRoutes(source){
 if(source.includes("searchParams.get('core511')==='motion'"))throw Error('admin_motion_routes_already_patched');
 const ast=parse(source,{ecmaVersion:'latest',sourceType:'module'}),edits=[];
 for(const name of ['GET$35','POST$45']){
  const fn=ast.body.find(node=>node.type==='FunctionDeclaration'&&node.id.name===name),body=fn?.body.body[0]?.block?.body;
  if(!body||source.slice(body[0].start,body[0].end)!==GUARD)throw Error('admin_motion_authorization_anchor_changed');
  if(name==='POST$45'&&source.slice(body[1].start,body[1].end)!=='assertSameOrigin(request);')throw Error('admin_motion_origin_anchor_changed');
  const at=body[name==='POST$45'?1:0].end;
  edits.push({start:at,end:at,original:'',replacement:name==='GET$35'?GET_INSERT:POST_INSERT});
 }
 let output=source;for(const edit of [...edits].sort((a,b)=>b.start-a.start))output=output.slice(0,edit.start)+edit.replacement+output.slice(edit.end);
 parse(output,{ecmaVersion:'latest',sourceType:'module'});
 return {source:output,proof:{sourceSha256:hash(source),patchedSha256:hash(output),edits,scope:'Additive admin motion proximity GET/POST branches after unchanged native admin authorization and mutation Origin guard. Original 16 KiB JSON reader and queue-time reauthorization; no snapshot or gameplay mutation.'}};
}
export function unpatchAdminMotionRoutes(source){
 let original=source;for(const insertion of [GET_INSERT,POST_INSERT]){if(original.split(insertion).length!==2)throw Error('admin_motion_reverse_anchor_changed');original=original.replace(insertion,'');}
 if(patchAdminMotionRoutes(original).source!==source)throw Error('admin_motion_reverse_proof_changed');
 return original;
}
