import {createHash} from 'node:crypto';
import {parse} from '../perf-r11/tests/parser.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex');
export function patchCastleAdminR59(source){
 const ast=parse(source,{ecmaVersion:'latest',sourceType:'module'}),route=ast.body.find(n=>n.type==='FunctionDeclaration'&&n.id?.name==='POST$45'),body=route?.body.body[0]?.block?.body;
 if(!body||source.slice(body[0].start,body[0].end)!=='if (!await requireAdmin()) return Response.json({ error: "Bu alan yalnızca oyun yöneticisine açık." }, { status: 403 });'||source.slice(body[1].start,body[1].end)!=='assertSameOrigin(request);')throw Error('castle_admin_security_anchor');
 const insert=`
 if(new URL(request.url).searchParams.get('core511')==='castle-r59'){
  try{const input=await readJsonObject(request),identity=await getChatGPTUser(),service=db().core511CastleR59;if(!service)return Response.json({error:'Kale hizmeti hazırlanıyor.'},{status:503});
   const castle=await service.admin(input,{adminId:identity?.id,reauthorize:async()=>{assertSameOrigin(request);if(!await requireAdmin())return null;return (await getChatGPTUser())?.id??null;}});
   return Response.json({castle},{headers:{'cache-control':'no-store'}});
  }catch(error){const status=[400,401,403,404,409,413,415,422,423,429,503].includes(error?.status)?error.status:500;return Response.json({error:status===500?'Kale ayarları doğrulanamadı.':error.message},{status,headers:{'cache-control':'no-store'}});}
 }
`;const at=body[1].end,output=source.slice(0,at)+insert+source.slice(at);parse(output,{ecmaVersion:'latest',sourceType:'module'});return {source:output,proof:{sourceSha256:hash(source),patchedSha256:hash(output),edits:[{start:at,end:at,original:'',replacement:insert}]}};
}
