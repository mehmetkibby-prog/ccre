import {parse} from '../perf-r11/tests/parser.mjs';
import {createHash} from 'node:crypto';
const hash=s=>createHash('sha256').update(s).digest('hex');
export function patchNativeMistAdmin(source){
 const ast=parse(source,{ecmaVersion:'latest',sourceType:'module'}),fn=ast.body.find(n=>n.type==='FunctionDeclaration'&&n.id.name==='POST$45'),body=fn?.body.body[0]?.block?.body;
 if(!body||!source.slice(body[0].start,body[0].end).includes('requireAdmin()')||source.slice(body[1].start,body[1].end)!=='assertSameOrigin(request);'||!source.slice(fn.start,fn.end).includes('async function readTowerJsonObject511'))throw Error('mist_admin_security_anchor');
 const at=body[1].end,insert=`
  if(new URL(request.url).searchParams.get('core511')==='mist'){
   try{const payload=await readTowerJsonObject511(request);
    if(!['sis_mist_get','sis_mist_save','sis_mist_spawn','sis_mist_schedule','sis_mist_cancel'].includes(payload.action))return Response.json({error:'Geçersiz Sis Yarığı işlemi.'},{status:400});
    const service=db().core511MistAdmin;if(!service)return Response.json({error:'Sis Yarığı hizmeti hazır değil.'},{status:503});
    const mist=await service.act(payload);return Response.json({...await snapshot$1(),mist},{headers:{'cache-control':'no-store'}});
   }catch(error){return Response.json({error:[400,413,409,422,503].includes(error?.status)?error.message:'Sis Yarığı ayarı işlenemedi.'},{status:[400,413,409,422,503].includes(error?.status)?error.status:500,headers:{'cache-control':'no-store'}});}
  }`;
 const output=source.slice(0,at)+insert+source.slice(at);parse(output,{ecmaVersion:'latest',sourceType:'module'});return {source:output,proof:{sourceSha256:hash(source),patchedSha256:hash(output),scope:'Dedicated authenticated same-origin Sis Yarığı admin route; bounded input; durable configuration barrier.'}};
}
