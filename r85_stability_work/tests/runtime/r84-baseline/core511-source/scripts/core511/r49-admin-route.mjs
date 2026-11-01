import {createHash} from 'node:crypto';
import {parse} from '../perf-r11/tests/parser.mjs';
const hash=source=>createHash('sha256').update(source).digest('hex');
const walk=(node,visit)=>{if(!node||typeof node!=='object')return;visit(node);for(const value of Object.values(node))if(Array.isArray(value))value.forEach(child=>walk(child,visit));else if(value?.type)walk(value,visit);};
const ADMIN_MOUNT_ROUTE_R49=`
  if(new URL(request.url).searchParams.get('core511')==='mounts'){
   try{
    const payload=await readJsonObject(request);
    if(payload.action!=='grant_mount_material_r49')return Response.json({error:'Geçersiz binek malzemesi gönderme işlemi.'},{status:400,headers:{'cache-control':'no-store'}});
    const identity=await getChatGPTUser();if(typeof identity?.id!=='string'||!identity.id)return Response.json({error:'Yönetici kimliği doğrulanamadı.'},{status:403,headers:{'cache-control':'no-store'}});
    const service=db().core511MountGrantR49;if(!service)return Response.json({error:'Binek malzemesi gönderimi henüz hazır değil.'},{status:503,headers:{'cache-control':'no-store'}});
    const mountGrant=await service.grant(payload,{adminId:identity.id,reauthorize:async()=>{assertSameOrigin(request);if(!await requireAdmin())return null;return (await getChatGPTUser())?.id??null;}});
    return Response.json({adminRefreshRequired508:true,mountGrant},{headers:{'cache-control':'no-store'}});
   }catch(error){const status=[400,401,403,404,409,413,415,422,423,429,503].includes(error?.status)?error.status:500;return Response.json({error:status===500?'Gönderim doğrulanamadı. Aynı işlemi yeniden sorgula.':error.message,...(status!==500&&typeof error?.gameCode==='string'?{code:error.gameCode}:{})},{status,headers:{'cache-control':'no-store'}});}
  }`;
export function patchAdminR49Routes(source){
 const ast=parse(source,{ecmaVersion:'latest',sourceType:'module'}),route=ast.body.find(node=>node.type==='FunctionDeclaration'&&node.id.name==='POST$45'),body=route?.body.body[0]?.block?.body,admin=ast.body.find(node=>node.type==='FunctionDeclaration'&&node.id.name==='requireAdmin');
 if(!body||source.slice(body[0].start,body[0].end)!=='if (!await requireAdmin()) return Response.json({ error: "Bu alan yalnızca oyun yöneticisine açık." }, { status: 403 });'||source.slice(body[1].start,body[1].end)!=='assertSameOrigin(request);'||source.includes("core511')==='mounts'"))throw Error('admin_r49_security_anchor_changed');
 let identityCalls=0;walk(admin,node=>{if(node.type==='CallExpression'&&node.callee?.name==='getChatGPTUser'){if(node.arguments.length)throw Error('admin_r49_identity_contract_changed');identityCalls++;}});if(identityCalls!==1)throw Error('admin_r49_identity_contract_missing');
 const at=body[1].end,insert=ADMIN_MOUNT_ROUTE_R49,output=source.slice(0,at)+insert+source.slice(at);parse(output,{ecmaVersion:'latest',sourceType:'module'});
 return {source:output,proof:{sourceSha256:hash(source),patchedSha256:hash(output),edits:[{start:at,end:at,original:'',replacement:insert}],scope:'Additive mount-material grant after unchanged native admin/same-origin guards, original bounded JSON reader, provider identity rechecked inside serial queue, target-only durable writer and shared mount receipt.'}};
}
export function unpatchAdminR49Routes(source){
 if(source.split(ADMIN_MOUNT_ROUTE_R49).length!==2)throw Error('admin_r49_reverse_anchor_changed');
 const original=source.replace(ADMIN_MOUNT_ROUTE_R49,'');
 if(patchAdminR49Routes(original).source!==source)throw Error('admin_r49_reverse_proof_changed');
 return original;
}

const PLAYER_MOUNT_HELPER_R49=`
async function core511MountHttpRouteR49(request){
 const headers=noStoreHeaders();
 if(!['GET','POST'].includes(request.method)){headers.set('Allow','GET, POST');return Response.json({error:'Geçersiz HTTP yöntemi.'},{status:405,headers});}
 try{
  const auth=await requireGameSession(request);
  if(request.method==='POST')await assertCsrf(request,auth);
  if(!auth.player)return Response.json({error:'Karakter gerekli.',code:'mount_character_required'},{status:409,headers});
  const input=request.method==='GET'?{action:'status'}:await readJsonObject(request,2048);
  await enforceRateLimit(input.action==='status'?'mount-status-r49':'mount-command-r49',auth.account.id,input.action==='status'?{limit:20,windowSeconds:10,blockSeconds:10}:{limit:8,windowSeconds:10,blockSeconds:10});
  const service=db().core511MountR49;
  if(!service)return Response.json({error:'Binek hizmeti henüz hazır değil.',code:'mount_unavailable'},{status:503,headers});
  const result=await service.execute(auth,input,async()=>{const current=await requireGameSession(request);if(request.method==='POST')await assertCsrf(request,current);if(current.account.id!==auth.account.id||current.player?.id!==auth.player.id||current.tokenHash!==auth.tokenHash)throw new AuthRequestError(409,'game_instance_expired','Oyun oturumunu yeniden aç.');return current;});
  const status=result?.ok===false&&[400,403,404,409,422,423,429,503].includes(result.status)?result.status:200;
  return Response.json(result,{status,headers});
 }catch(error){
  if(error instanceof AuthRequestError)return authErrorResponse(error);
  if(error?.mountRule===true){const status=[400,401,403,404,409,422,423,429,503].includes(error.status)?error.status:409;return Response.json({ok:false,error:error.message,code:error.gameCode},{status,headers});}
  return Response.json({ok:false,error:'İşlem sonucu henüz doğrulanamadı. Aynı işlemi yeniden sorgula.',code:'command_outcome_unknown'},{status:503,headers});
 }
}
`;
const PLAYER_MOUNT_FALLBACK_R49='(new URL(args[0].url).pathname===\'/api/mount-r49\'?core511MountHttpRouteR49(args[0]):_virtual_vinext_rsc_entry_default(...args))';
const PLAYER_MOUNT_API_R49="if(path==='/api/mount-r49')return true;";
export function patchMountHttpR49Routes(source){
 const ast=parse(source,{ecmaVersion:'latest',sourceType:'module'}),find=name=>ast.body.find(node=>node.type==='FunctionDeclaration'&&node.id.name===name),wrapper=find('core511NativeHttpDefault'),api=find('isGameApi');
 if(!wrapper||!api||source.includes('function core511MountHttpRouteR49('))throw Error('mount_r49_native_route_anchor_changed');
 for(const name of ['requireGameSession','assertCsrf','readJsonObject','enforceRateLimit','authErrorResponse','noStoreHeaders'])if(!find(name))throw Error('mount_r49_native_guard_missing:'+name);
 const calls=[];walk(wrapper,node=>{if(node.type==='CallExpression'&&node.callee?.name==='_virtual_vinext_rsc_entry_default')calls.push(node);});
 if(calls.length!==1||source.slice(calls[0].start,calls[0].end)!=='_virtual_vinext_rsc_entry_default(...args)')throw Error('mount_r49_native_fallback_changed');
 const edits=[{start:calls[0].start,end:calls[0].end,original:source.slice(calls[0].start,calls[0].end),replacement:PLAYER_MOUNT_FALLBACK_R49},{start:api.body.start+1,end:api.body.start+1,original:'',replacement:PLAYER_MOUNT_API_R49},{start:source.length,end:source.length,original:'',replacement:PLAYER_MOUNT_HELPER_R49}];
 let output=source;for(const edit of [...edits].sort((a,b)=>b.start-a.start))output=output.slice(0,edit.start)+edit.replacement+output.slice(edit.end);parse(output,{ecmaVersion:'latest',sourceType:'module'});
 return {source:output,proof:{sourceSha256:hash(source),patchedSha256:hash(output),edits,scope:'Dedicated mount route inside existing native fallback; unchanged native session/maintenance/bot/CSRF/body/rate helpers; path added to native game-instance validation; fresh auth inside target writer queue.'}};
}
export function unpatchMountHttpR49Routes(source){
 for(const needle of [PLAYER_MOUNT_HELPER_R49,PLAYER_MOUNT_API_R49,PLAYER_MOUNT_FALLBACK_R49])if(source.split(needle).length!==2)throw Error('mount_r49_native_reverse_anchor_changed');
 const original=source.replace(PLAYER_MOUNT_HELPER_R49,'').replace(PLAYER_MOUNT_API_R49,'').replace(PLAYER_MOUNT_FALLBACK_R49,'_virtual_vinext_rsc_entry_default(...args)');
 if(patchMountHttpR49Routes(original).source!==source)throw Error('mount_r49_native_reverse_proof_changed');return original;
}
export function patchR49Routes(source){
 const admin=patchAdminR49Routes(source),player=patchMountHttpR49Routes(admin.source);
 return {source:player.source,proof:{sourceSha256:hash(source),patchedSha256:hash(player.source),admin:admin.proof,player:player.proof,scope:'R49 additive admin grant and authenticated player mount endpoints; exact inverse supplied.'}};
}
export function unpatchR49Routes(source){return unpatchAdminR49Routes(unpatchMountHttpR49Routes(source));}
