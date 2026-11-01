import {readFile,rename,link,unlink,writeFile,open} from 'node:fs/promises';
import {createHash,timingSafeEqual,randomUUID} from 'node:crypto';
const digest=v=>createHash('sha256').update(v).digest('hex');
const equal=(a,b)=>typeof a==='string'&&typeof b==='string'&&/^[a-f0-9]{64}$/.test(a)&&/^[a-f0-9]{64}$/.test(b)&&timingSafeEqual(Buffer.from(a,'hex'),Buffer.from(b,'hex'));
async function syncDir(dir){const f=await open(dir,'r');try{await f.sync();}finally{await f.close();}}
// Atomic rename claims each attempt across processes. A wrong attempt can only
// restore with link (no overwrite), never overwrite a newly issued root code.
export async function redeemPair(dir,state,code,now=Date.now){
 if(typeof code!=='string'||!/^\d{8}$/.test(code))return null;
 const source=dir+'/loadtest-pair.json',claimed=source+'.claimed-'+randomUUID();
 try{await rename(source,claimed);}catch(e){if(e.code==='ENOENT')return null;throw e;}
 try{
  await syncDir(dir);
  const p=JSON.parse(await readFile(claimed,'utf8')),at=now();
  if(p.version!==1||p.batch!==state.batch||!Number.isSafeInteger(p.createdAt)||!Number.isSafeInteger(p.expiresAt)||p.createdAt>at||p.expiresAt<=at||p.expiresAt-p.createdAt>180000||p.expiresAt>state.expiresAt||state.expiresAt<=at||!Number.isInteger(p.attempts)||p.attempts<0||p.attempts>=5||!equal(digest(p.key??''),state.keyHash))return null;
  if(equal(digest(code),p.codeHash))return {key:p.key,expiresAt:state.expiresAt};
  p.attempts++;
  if(p.attempts<5){
   await writeFile(claimed,JSON.stringify(p),{mode:0o600});const f=await open(claimed,'r');try{await f.sync();}finally{await f.close();}
   try{await link(claimed,source);await syncDir(dir);}catch(e){if(e.code!=='EEXIST')throw e;}
  }
  return null;
 }finally{await unlink(claimed).catch(()=>{});}
}
export async function loadtestEntry(req,res,runtime,{read=readFile,now=Date.now}={}) {
 const reply=(status,data)=>{res.writeHead(status,{'content-type':'application/json','cache-control':'no-store','referrer-policy':'no-referrer'});res.end(JSON.stringify(data));};
 if(req.method!=='POST'||runtime?.role!=='game'||runtime.id!=='r1'){reply(404,{error:'not_found'});return;}
 let state;
 try{state=JSON.parse(await read(runtime.realm.dataRoot+'/loadtest-session.json','utf8'));}catch{reply(403,{error:'test_disabled'});return;}
 const at=now(),key=req.headers['x-col-loadtest-key'],pair=req.headers['x-col-loadtest-pair']==='1';
 if(state.version!==1||!Number.isSafeInteger(state.startedAt)||!Number.isSafeInteger(state.expiresAt)||state.startedAt>at||state.expiresAt<=at||state.expiresAt-state.startedAt>3600000||!state.enabled||!pair&&(typeof key!=='string'||!/^[a-f0-9]{64}$/.test(key)||!equal(digest(key),state.keyHash))){reply(403,{error:'test_disabled_or_key_invalid'});return;}
 let bytes=0,body='';
 try{
  for await(const part of req){bytes+=part.length;if(bytes>512){reply(413,{error:'too_large'});return;}body+=part;}
  const input=JSON.parse(body);
  if(pair){const grant=await redeemPair(runtime.realm.dataRoot,state,input.pairCode,now);reply(grant?200:403,grant??{error:'pair_invalid_expired_or_used'});return;}
  const bot=state.bots?.find(b=>b.username===input.username);
  if(!/^loadbot_0(?:[0-8][0-9]|90)$/.test(input.username??'')||!bot||bot.batch!==state.batch||!bot.id?.startsWith('loadtest-')||!Number.isInteger(bot.channel)||bot.channel<1||bot.channel>3)throw Error('not_test_account');
  reply(200,{...bot,expiresAt:state.expiresAt,realmOrigin:runtime.realm.origin,realtimeOrigin:runtime.realm.realtimeOrigin});
 }catch{if(!res.headersSent)reply(400,{error:'invalid_test_request'});}
}
