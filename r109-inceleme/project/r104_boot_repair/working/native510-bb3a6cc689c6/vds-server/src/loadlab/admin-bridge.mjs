import {localCall} from './control-rpc.mjs';
import {loadRuntimeConfig} from './registry.mjs';

// This helper is called only after the existing compiled admin authority and
// same-origin gates. It never accepts a destination, port, header or credential
// from the browser and never exposes the private runtime key.
const OPERATIONS=new Set(['status','enable','pair','disable','cleanup','start','stop','reports','report']);
const HEADERS={'cache-control':'no-store, private','x-content-type-options':'nosniff'};
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const ownKeys=(value,allowed)=>Object.keys(value).every(key=>allowed.includes(key));
function validate(operation,payload){
 if(!OPERATIONS.has(operation)||!object(payload)||Buffer.byteLength(JSON.stringify(payload))>8192)return false;
 if(operation==='enable')return ownKeys(payload,['minutes'])&&Number.isInteger(payload.minutes)&&payload.minutes>=1&&payload.minutes<=60;
 if(operation==='start')return ownKeys(payload,['settings','expectedEpoch'])&&object(payload.settings)&&Number.isSafeInteger(payload.expectedEpoch)&&payload.expectedEpoch>=0;
 if(operation==='report')return ownKeys(payload,['id','format'])&&typeof payload.id==='string'&&/^[A-Za-z0-9_.:-]{1,160}$/.test(payload.id)&&['json','txt'].includes(payload.format);
 return Object.keys(payload).length===0;
}
function safeResult(operation,result){
 // A compromised or mismatched backend must not accidentally return native
 // sessions or the control capability through an otherwise valid admin read.
 const serialized=JSON.stringify(result);
 if(typeof serialized!=='string'||Buffer.byteLength(serialized)>8*1024*1024+65536)throw Error('loadlab_response_size');
 const inspect=(value,depth=0)=>{
  if(depth>30)throw Error('loadlab_response_depth');
  if(!value||typeof value!=='object')return;
  for(const [key,child]of Object.entries(value)){
   if(/^(?:capability|controlKey|privateKey|privateKeyPem|sessionToken|csrfToken|sessionTokenHash|csrfHash|tokenHash|certificatePem)$/i.test(key))throw Error('loadlab_response_secret');
   if(key==='pairingToken'&&!(depth===0&&(operation==='enable'||operation==='pair')))throw Error('loadlab_response_pairing_scope');
   inspect(child,depth+1);
  }
 };
 inspect(result);return result;
}
export async function loadLabAdminResponse(operation,payload={}){
 if(!validate(operation,payload))return Response.json({error:'Bot testi komutu geçersiz.',code:'invalid_loadlab_admin_command'},{status:400,headers:HEADERS});
 try{
  const runtime=loadRuntimeConfig(process.env.CORE_LOADLAB_RUNTIME_FILE);
  if(!runtime)return Response.json({error:'Bot testi canlı sunucu eklentisi kurulu değil.',code:'loadlab_not_installed'},{status:503,headers:HEADERS});
  // Only the authenticated admin bridge may select these internal bounded commands.
  // CLI/installers keep the original blocking durable-cleanup contract.
  const command=['stop','disable','cleanup'].includes(operation)?'panel_'+operation:operation;
  const result=await localCall({port:44474,key:runtime.controlKey,operation:command,payload,timeoutMs:operation==='status'?5000:15000});
  return Response.json(safeResult(operation,result),{headers:HEADERS});
 }catch(error){
  const status=Number.isInteger(error?.status)&&error.status>=400&&error.status<=599?error.status:503;
  const code=typeof error?.code==='string'&&/^[a-zA-Z0-9_.:-]{1,100}$/.test(error.code)?error.code:'loadlab_control_unavailable';
  return Response.json({error:status<500?'Bot testi komutu kabul edilmedi. Durumu yenileyin.':'Bot testi hizmetine ulaşılamadı. Durumu yenileyin; devam eden temizlik bitmeden yeni test başlamaz.',code},{status,headers:HEADERS});
 }
}
