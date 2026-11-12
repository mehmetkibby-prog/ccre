import {parse} from '../perf-r11/tests/parser.mjs';
import {createHash} from 'node:crypto';
const hash=value=>createHash('sha256').update(value).digest('hex');
export function patchNativeTowerAdminRoutes(source){
 const ast=parse(source,{ecmaVersion:'latest',sourceType:'module'}),fn=ast.body.find(n=>n.type==='FunctionDeclaration'&&n.id.name==='POST$45'),body=fn?.body.body[0]?.block?.body;
 if(!body||source.slice(body[0].start,body[0].end)!=='if (!await requireAdmin()) return Response.json({ error: "Bu alan yalnızca oyun yöneticisine açık." }, { status: 403 });'||source.slice(body[1].start,body[1].end)!=='assertSameOrigin(request);'||source.slice(body[2].start,body[2].end)!=='const payload = await readJsonObject(request);')throw Error('tower_admin_security_anchor_changed');
 const readerNode=ast.body.find(n=>n.type==='FunctionDeclaration'&&n.id.name==='readJsonObject');if(!readerNode)throw Error('tower_admin_reader_missing');
 const nativeReader=source.slice(readerNode.start,readerNode.end);if(!nativeReader.startsWith('async function readJsonObject(request, maxBytes = 16384) {')||!nativeReader.includes('maxBytes > 65536'))throw Error('tower_admin_reader_anchor_changed');
 // A separate bounded reader is used ONLY for the new authenticated tower
 // configuration document. Every original native route keeps its byte limits.
 const towerReader=nativeReader.replace('readJsonObject(request, maxBytes = 16384)','readTowerJsonObject511(request, maxBytes = 262144)').replace('maxBytes > 65536','maxBytes > 262144');
 const at=body[2].end,original=source.slice(body[2].start,body[2].end),read=`const towerRequest511=new URL(request.url).searchParams.get('core511')==='tower';
  ${towerReader}
  const payload = towerRequest511?await readTowerJsonObject511(request):await readJsonObject(request);
  if(towerRequest511&&payload.action!=='kadim_tower_get'&&payload.action!=='kadim_tower_save')return Response.json({error:'Bu adres yalnız Kadim Kulesi ayarları içindir.'},{status:400});`,insert=`
  if(payload.action==='kadim_tower_get'||payload.action==='kadim_tower_save'){
   try{const service=db().core511TowerAdmin;if(!service)return Response.json({error:'Kule hizmeti henüz hazır değil.'},{status:503});
    const tower=payload.action==='kadim_tower_save'?await service.save(payload.config,payload.revision):service.get();
    return Response.json({...await snapshot$1(),tower},{headers:{'cache-control':'no-store'}});
   }catch(error){return Response.json({error:error instanceof Error?error.message:'Kule ayarı kaydedilemedi.'},{status:[409,422,503].includes(error?.status)?error.status:500,headers:{'cache-control':'no-store'}});}
  }
 `;
 const output=source.slice(0,body[2].start)+read+insert+source.slice(at);parse(output,{ecmaVersion:'latest',sourceType:'module'});
 return {source:output,proof:{sourceSha256:hash(source),patchedSha256:hash(output),edits:[{start:body[2].start,end:at,original,replacement:read+insert}],scope:'Two additive tower admin actions after unchanged authentication and same-origin guards; separate bounded262144-byte JSON reader only dedicated tower query, original native reader and legacy16KiB requests untouched; configuration barrier and durable ACK retained'}};
}
