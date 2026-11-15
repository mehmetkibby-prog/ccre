import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import {createHash,randomBytes,randomInt,scrypt as scryptCallback,timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
import {CaptchaRendererR106} from './lib/captcha-renderer-r106.mjs';
import {categories,samples} from './catalog.mjs';

const scrypt=promisify(scryptCallback),root=path.dirname(fileURLToPath(import.meta.url));
const digest=s=>createHash('sha256').update(s).digest('hex');
const token=()=>randomBytes(32).toString('hex');
const recoveryToken=()=>randomBytes(24).toString('hex').match(/.{8}/g).join('-');
const recoveryDigest=code=>digest(String(code??'').trim().toLowerCase().replaceAll('-',''));
const safeEqual=(a,b)=>{if(typeof a!=='string'||typeof b!=='string')return false;const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y);};
const issue=(status,message)=>Object.assign(new Error(message),{status});
const publicUser=u=>u?{id:u.id,name:u.name,role:u.role}:null;
const roleAllowed=(u,c)=>!!u&&(!c.adminOnly||u.role==='admin');
const cookieNames={session:'col_forum_session',captcha:'col_forum_captcha'};

export async function createForum({dbPath=':memory:',origin='http://127.0.0.1:8114',allowedOrigins=[origin],demo=false,trustProxy=false,renderer=new CaptchaRendererR106()}={}){
 const normalizedOrigins=[...new Set(allowedOrigins)];if(!normalizedOrigins.includes(origin)||normalizedOrigins.some(s=>{try{return new URL(s).origin!==s;}catch{return true;}}))throw Error('forum_allowed_origins_invalid');allowedOrigins=normalizedOrigins;
 if(dbPath!==':memory:')fs.mkdirSync(path.dirname(path.resolve(dbPath)),{recursive:true,mode:0o700});
 const db=new DatabaseSync(dbPath);
 if(dbPath!==':memory:')fs.chmodSync(dbPath,0o600);
 db.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=3000;
 CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY,name TEXT NOT NULL,name_key TEXT UNIQUE NOT NULL,email TEXT UNIQUE NOT NULL,password TEXT NOT NULL,role TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('member','admin')),created INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS sessions(hash TEXT PRIMARY KEY,user_id INTEGER NOT NULL REFERENCES users(id),csrf TEXT NOT NULL,expires INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS recovery(user_id INTEGER PRIMARY KEY REFERENCES users(id),hash TEXT UNIQUE NOT NULL);
 CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);
 CREATE TABLE IF NOT EXISTS topics(id INTEGER PRIMARY KEY,category TEXT NOT NULL,title TEXT NOT NULL,body TEXT NOT NULL,user_id INTEGER NOT NULL REFERENCES users(id),realm TEXT NOT NULL,pinned INTEGER NOT NULL DEFAULT 0,locked INTEGER NOT NULL DEFAULT 0,hidden INTEGER NOT NULL DEFAULT 0,created INTEGER NOT NULL,updated INTEGER NOT NULL);
 CREATE INDEX IF NOT EXISTS topics_category ON topics(category,hidden,pinned DESC,updated DESC);
 CREATE TABLE IF NOT EXISTS replies(id INTEGER PRIMARY KEY,topic_id INTEGER NOT NULL REFERENCES topics(id),user_id INTEGER NOT NULL REFERENCES users(id),body TEXT NOT NULL,created INTEGER NOT NULL);
 CREATE INDEX IF NOT EXISTS replies_topic ON replies(topic_id,id);
 CREATE TABLE IF NOT EXISTS challenges(hash TEXT PRIMARY KEY,answer_hash TEXT NOT NULL,expires INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS moderation(id INTEGER PRIMARY KEY,admin_id INTEGER NOT NULL,topic_id INTEGER NOT NULL,action TEXT NOT NULL,created INTEGER NOT NULL);`);
 const statements=new Map();
 const sql=s=>{if(!statements.has(s))statements.set(s,db.prepare(s));return statements.get(s);};
 if(demo&&!sql('SELECT id FROM topics LIMIT 1').get()){
   const put=sql('INSERT INTO users(name,name_key,email,password,role,created) VALUES(?,?,?,?,?,?)');
   const admin=Number(put.run('Core Yönetim','sample-admin','admin@example.invalid','!disabled','admin',Date.now()).lastInsertRowid);
   const member=Number(put.run('Gezgin','sample-player','player@example.invalid','!disabled','member',Date.now()).lastInsertRowid);
   samples.forEach(([category,title,body,realm,pinned],i)=>{
     const c=categories.find(c=>c.id===category),now=Date.now()-(i+1)*3600000;
     sql('INSERT INTO topics(category,title,body,user_id,realm,pinned,created,updated) VALUES(?,?,?,?,?,?,?,?)').run(category,title,body,c.adminOnly?admin:member,realm,pinned,now,now);
   });
 }
 const rates=new Map();let lastSweep=0,hashing=0;
 function budget(key,max,window=60000){
   const now=Date.now();let row=rates.get(key);
   if(!row||row.until<now){row={count:0,until:now+window};rates.set(key,row);}
   if(++row.count>max)throw Object.assign(issue(429,'Çok hızlı işlem yapıyorsun. Biraz bekleyip tekrar dene.'),{retryAfter:Math.max(1,Math.ceil((row.until-now)/1000))});
   if(rates.size>10000)throw issue(503,'Forum şu anda yoğun. Biraz sonra tekrar dene.');
 }
 async function passwordHash(password,salt=randomBytes(16).toString('hex')){
   if(hashing>=4)throw issue(503,'Üyelik işlemleri şu anda yoğun. Tekrar dene.');
   hashing++;try{return salt+':'+(await scrypt(password,salt,64,{N:32768,r:8,p:1,maxmem:64*1024*1024})).toString('hex');}finally{hashing--;}
 }
 const dummyHash=await passwordHash(token());
 async function passwordMatches(password,stored){
   const ref=stored?.includes(':')?stored:dummyHash;
   const candidate=await passwordHash(password,ref.split(':')[0]);
   return safeEqual(ref,candidate)&&ref===stored;
 }
 async function createAdmin(name,password,email){
   if(!/^[a-zA-Z0-9_]{3,24}$/.test(name)||password.length<12||password.length>128||!/^\S+@\S+\.\S+$/.test(email))throw Error('Admin için geçerli ad, e-posta ve en az 12 karakter parola gerekli.');
   const encoded=await passwordHash(password);
   return sql('INSERT INTO users(name,name_key,email,password,role,created) VALUES(?,?,?,?,?,?)').run(name,name.toLowerCase(),email.toLowerCase(),encoded,'admin',Date.now());
 }
 function cookies(req){return Object.fromEntries((req.headers.cookie??'').split(';').map(s=>s.trim().split('=')).filter(a=>a.length===2));}
 function setCookie(res,name,value,seconds){const list=res.getHeader('Set-Cookie')??[];res.setHeader('Set-Cookie',[...list,`${name}=${value}; Path=/forum; HttpOnly; SameSite=Strict; Max-Age=${seconds}${origin.startsWith('https:')?'; Secure':''}`]);}
 function userSession(req){const raw=cookies(req)[cookieNames.session];if(!/^[a-f0-9]{64}$/.test(raw??''))return null;return sql('SELECT u.id,u.name,u.role,s.csrf FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.hash=? AND s.expires>?').get(digest(raw),Date.now())??null;}
 function startSession(req,res,u){
   const old=cookies(req)[cookieNames.session];if(old)sql('DELETE FROM sessions WHERE hash=?').run(digest(old));
   const raw=token(),csrf=token();sql('INSERT INTO sessions VALUES(?,?,?,?)').run(digest(raw),u.id,csrf,Date.now()+7*86400000);
   setCookie(res,cookieNames.session,raw,7*86400);return{user:publicUser(u),csrf};
 }
 function consumeCaptcha(req,res,answer){
   const raw=cookies(req)[cookieNames.captcha]??'',key=digest(raw);
   const challenge=sql('SELECT * FROM challenges WHERE hash=?').get(key);
   sql('DELETE FROM challenges WHERE hash=?').run(key);setCookie(res,cookieNames.captcha,'',0);
   if(!challenge||challenge.expires<Date.now()||typeof answer!=='string'||!safeEqual(challenge.answer_hash,digest(raw+':'+answer.trim())))throw issue(400,'Güvenlik kodu yanlış veya süresi dolmuş. Yeni kodla tekrar dene.');
 }
 async function body(req){
   if(req.headers['content-type']!=='application/json')throw issue(415,'JSON istek gerekli.');
   let size=0;const chunks=[];
   for await(const chunk of req){size+=chunk.length;if(size>24000)throw issue(413,'Gönderi çok uzun.');chunks.push(chunk);}
   try{const value=JSON.parse(Buffer.concat(chunks));if(!value||typeof value!=='object'||Array.isArray(value))throw Error();return value;}catch{throw issue(400,'İstek okunamadı.');}
 }
 function json(res,status,value){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(value));}
 function textField(value,min,max,label){if(typeof value!=='string'||value.trim().length<min||value.trim().length>max)throw issue(400,`${label} ${min}–${max} karakter olmalı.`);return value.trim();}
 const topicSelect='SELECT t.*,u.name,u.role,(SELECT count(*) FROM replies r WHERE r.topic_id=t.id) AS replies FROM topics t JOIN users u ON u.id=t.user_id';
 const server=http.createServer(async(req,res)=>{
   res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');res.setHeader('X-Frame-Options','DENY');res.setHeader('Cache-Control','no-store');
   res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
   try{
     const now=Date.now();if(now-lastSweep>60000){lastSweep=now;for(const[k,v]of rates)if(v.until<now)rates.delete(k);sql('DELETE FROM challenges WHERE expires<?').run(now);sql('DELETE FROM sessions WHERE expires<?').run(now);}
     const address=req.socket.remoteAddress??'unknown',loopback=['127.0.0.1','::1','::ffff:127.0.0.1'].includes(address);
     const ip=trustProxy&&loopback?String(req.headers['x-real-ip']??address).slice(0,64):address;
     const url=new URL(req.url,origin),route=url.pathname;
     budget(ip+':all',240);
     if(req.method==='POST'&&!allowedOrigins.includes(req.headers.origin))throw issue(403,'İstek kaynağı doğrulanamadı. Sayfayı yenile.');
     const user=userSession(req);
     if(req.method==='GET'&&route==='/forum/api/health')return json(res,200,{ok:sql('SELECT 1 AS ok').get().ok===1,version:'R114_RUNE_FORUM1',demo});
     if(req.method==='GET'&&route==='/forum/api/session')return json(res,200,{user:publicUser(user),csrf:user?.csrf??null,demo});
     if(req.method==='GET'&&route==='/forum/api/captcha'){
       budget(ip+':captcha',15);
       const raw=token(),answer=String(randomInt(100000,1000000));
       let png;try{png=await renderer.render(answer);}catch{throw issue(503,'Güvenlik kodu oluşturulamadı. Yenile düğmesiyle tekrar dene.');}
       const old=cookies(req)[cookieNames.captcha];if(old)sql('DELETE FROM challenges WHERE hash=?').run(digest(old));
       sql('INSERT INTO challenges VALUES(?,?,?)').run(digest(raw),digest(raw+':'+answer),now+180000);
       setCookie(res,cookieNames.captcha,raw,180);
       return json(res,200,{image:'data:image/png;base64,'+Buffer.from(png).toString('base64')});
     }
     if(req.method==='POST'&&['/forum/api/register','/forum/api/login','/forum/api/recover'].includes(route)){
       budget(ip+':auth',10,600000);const data=await body(req);consumeCaptcha(req,res,data.captcha);
       const name=textField(data.name,3,24,'Kullanıcı adı'),password=data.password;
       if(typeof password!=='string'||password.length<10||password.length>128)throw issue(400,'Parola 10–128 karakter olmalı.');
       if(!/^[a-zA-Z0-9_]{3,24}$/.test(name))throw issue(400,'Kullanıcı adında yalnız harf, rakam ve alt çizgi kullan.');
       const key=name.toLowerCase();
       if(route.endsWith('/recover')){
         const existing=sql('SELECT u.id,u.name,u.role,r.hash FROM users u JOIN recovery r ON r.user_id=u.id WHERE u.name_key=?').get(key);
         const hash=recoveryDigest(data.recovery);
         if(!existing||!safeEqual(existing.hash,hash))throw issue(401,'Kullanıcı adı veya kurtarma anahtarı yanlış.');
         const encoded=await passwordHash(password),recoveryCode=recoveryToken();
         db.exec('BEGIN IMMEDIATE');try{
           const consumed=sql('DELETE FROM recovery WHERE user_id=? AND hash=?').run(existing.id,hash);
           if(consumed.changes!==1)throw issue(401,'Bu kurtarma anahtarı kullanılmış.');
           sql('UPDATE users SET password=? WHERE id=?').run(encoded,existing.id);
           sql('DELETE FROM sessions WHERE user_id=?').run(existing.id);
           sql('INSERT INTO recovery VALUES(?,?)').run(existing.id,recoveryDigest(recoveryCode));
           db.exec('COMMIT');
         }catch(e){db.exec('ROLLBACK');throw e;}
         return json(res,200,{...startSession(req,res,existing),recoveryCode});
       }
       if(route.endsWith('/register')){
         if(['admin','administrator','coreadmin','coreyonetim','moderator','system'].includes(key))throw issue(400,'Bu kullanıcı adı kullanılamaz.');
         if(data.role!==undefined)throw issue(400,'Üyelik rolü istemciden belirlenemez.');
         const email=textField(data.email,5,254,'E-posta').toLowerCase();
         if(!/^\S+@\S+\.\S+$/.test(email)||data.terms!==true)throw issue(400,'Geçerli e-posta gir ve forum kurallarını kabul et.');
         if(sql('SELECT id FROM users WHERE name_key=? OR email=?').get(key,email))throw issue(409,'Bu bilgilerle kayıt oluşturulamadı. Giriş yapmayı dene.');
         const encoded=await passwordHash(password);
         let id;const recoveryCode=recoveryToken();db.exec('BEGIN IMMEDIATE');
         try{id=Number(sql('INSERT INTO users(name,name_key,email,password,role,created) VALUES(?,?,?,?,?,?)').run(name,key,email,encoded,'member',now).lastInsertRowid);sql('INSERT INTO recovery VALUES(?,?)').run(id,recoveryDigest(recoveryCode));db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');if(String(e.message).includes('UNIQUE'))throw issue(409,'Bu bilgilerle kayıt oluşturulamadı.');throw e;}
         return json(res,201,{...startSession(req,res,{id,name,role:'member'}),recoveryCode});
       }
       const existing=sql('SELECT * FROM users WHERE name_key=?').get(key);
       if(!await passwordMatches(password,existing?.password))throw issue(401,'Kullanıcı adı veya parola yanlış.');
       return json(res,200,startSession(req,res,existing));
     }
     if(req.method==='GET'&&route==='/forum/api/categories'){
       const rows=categories.map(c=>({...c,...sql('SELECT count(*) AS topics,COALESCE(sum((SELECT count(*) FROM replies r WHERE r.topic_id=t.id)),0) AS replies FROM topics t WHERE category=? AND hidden=0').get(c.id),latest:sql(topicSelect+' WHERE t.category=? AND t.hidden=0 ORDER BY t.updated DESC LIMIT 1').get(c.id)??null}));
       return json(res,200,{categories:rows,topicCount:sql('SELECT count(*) AS n FROM topics WHERE hidden=0').get().n,memberCount:sql('SELECT count(*) AS n FROM users').get().n});
     }
     if(req.method==='GET'&&route==='/forum/api/topics'){
       const category=url.searchParams.get('category')??'',search=(url.searchParams.get('search')??'').slice(0,100),page=Math.max(0,Math.min(1000,Number.parseInt(url.searchParams.get('page'),10)||0));
       const rows=sql(topicSelect+" WHERE t.hidden=0 AND (?='' OR t.category=?) AND (?='' OR instr(lower(t.title),lower(?))>0) ORDER BY t.pinned DESC,t.updated DESC LIMIT 31 OFFSET ?").all(category,category,search,search,page*30);
       return json(res,200,{topics:rows.slice(0,30),hasMore:rows.length>30,page});
     }
     const topicMatch=route.match(/^\/forum\/api\/topics\/(\d+)$/);
     if(req.method==='GET'&&topicMatch){
       const t=sql(topicSelect+' WHERE t.id=? AND t.hidden=0').get(Number(topicMatch[1]));if(!t)throw issue(404,'Konu bulunamadı.');
       const page=Math.max(0,Math.min(10000,Number.parseInt(url.searchParams.get('page'),10)||0));
       const replies=sql('SELECT r.id,r.body,r.created,u.name,u.role FROM replies r JOIN users u ON u.id=r.user_id WHERE r.topic_id=? ORDER BY r.id LIMIT 51 OFFSET ?').all(t.id,page*50);
       return json(res,200,{topic:t,replies:replies.slice(0,50),hasMore:replies.length>50,page});
     }
     if(req.method==='POST'){
       if(!user)throw issue(401,'Paylaşım yapmak için giriş yap.');
       if(!safeEqual(req.headers['x-csrf-token'],user.csrf))throw issue(403,'Oturum doğrulanamadı. Sayfayı yenile.');
       const data=await body(req);
       if(route==='/forum/api/logout'){sql('DELETE FROM sessions WHERE hash=?').run(digest(cookies(req)[cookieNames.session]));setCookie(res,cookieNames.session,'',0);return json(res,200,{ok:true});}
       if(route==='/forum/api/topics'){
         budget(ip+':post',8,600000);const c=categories.find(c=>c.id===data.category);
         if(!c)throw issue(400,'Bölüm seç.');if(!roleAllowed(user,c))throw issue(403,'Bu bölümde yalnız yönetici paylaşım yapabilir.');
         const title=textField(data.title,5,140,'Başlık'),bodyText=textField(data.body,10,10000,'Mesaj');
         if(!['Efsane','Akademi','Tüm sunucular'].includes(data.realm))throw issue(400,'Sunucu seçimi geçersiz.');
         if((data.pinned||data.locked)&&user.role!=='admin')throw issue(403,'Yönetici yetkisi gerekiyor.');
         const result=sql('INSERT INTO topics(category,title,body,user_id,realm,pinned,locked,created,updated) VALUES(?,?,?,?,?,?,?,?,?)').run(c.id,title,bodyText,user.id,data.realm,data.pinned?1:0,data.locked?1:0,now,now);
         return json(res,201,{id:Number(result.lastInsertRowid)});
       }
       const reply=route.match(/^\/forum\/api\/topics\/(\d+)\/reply$/);
       if(reply){
         budget(ip+':reply',20,600000);const t=sql('SELECT * FROM topics WHERE id=? AND hidden=0').get(Number(reply[1]));if(!t)throw issue(404,'Konu bulunamadı.');
         if(!roleAllowed(user,categories.find(c=>c.id===t.category))||(t.locked&&user.role!=='admin'))throw issue(403,'Bu konuya yalnız yönetici yanıt verebilir.');
         const message=textField(data.body,2,10000,'Mesaj');
         db.exec('BEGIN IMMEDIATE');try{sql('INSERT INTO replies(topic_id,user_id,body,created) VALUES(?,?,?,?)').run(t.id,user.id,message,now);sql('UPDATE topics SET updated=? WHERE id=?').run(now,t.id);db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}
         return json(res,201,{ok:true});
       }
       const moderation=route.match(/^\/forum\/api\/topics\/(\d+)\/moderate$/);
       if(moderation){
         if(user.role!=='admin')throw issue(403,'Yönetici yetkisi gerekiyor.');
         const t=sql('SELECT * FROM topics WHERE id=? AND hidden=0').get(Number(moderation[1]));if(!t)throw issue(404,'Konu bulunamadı.');
         const column={pin:'pinned',lock:'locked',hide:'hidden'}[data.action];if(!column)throw issue(400,'İşlem geçersiz.');
         db.exec('BEGIN IMMEDIATE');try{sql(`UPDATE topics SET ${column}=? WHERE id=?`).run(data.action==='hide'?1:t[column]?0:1,t.id);sql('INSERT INTO moderation(admin_id,topic_id,action,created) VALUES(?,?,?,?)').run(user.id,t.id,data.action,now);db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}
         return json(res,200,{ok:true});
       }
       throw issue(404,'İşlem bulunamadı.');
     }
     if(req.method!=='GET'&&req.method!=='HEAD')throw issue(405,'Yöntem desteklenmiyor.');
     const relative=route==='/forum'||route==='/forum/'?'index.html':route.startsWith('/forum/')?decodeURIComponent(route.slice(7)):'';
     const file=path.resolve(root,'public',relative),base=path.resolve(root,'public')+path.sep;
     if(!relative||!file.startsWith(base)||!fs.existsSync(file)||!fs.statSync(file).isFile())throw issue(404,'Sayfa bulunamadı.');
     const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.webp':'image/webp','.woff2':'font/woff2'};
     res.writeHead(200,{'Content-Type':types[path.extname(file)]??'application/octet-stream'});if(req.method==='HEAD')res.end();else fs.createReadStream(file).pipe(res);
   }catch(e){if(res.headersSent){res.destroy();return;}if(e.status===429)res.setHeader('Retry-After',String(e.retryAfter??60));if(!e.status)console.error('forum_request_failed',e.code??e.name);json(res,e.status??500,{error:e.status?e.message:'İşlem tamamlanamadı. Biraz sonra tekrar dene.'});}
 });
 server.headersTimeout=10000;server.requestTimeout=15000;
 return{server,createAdmin,close:async()=>{await new Promise(resolve=>{server.close(resolve);});renderer.close();db.close();}};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const port=Number(process.env.FORUM_PORT??8114),origin=process.env.FORUM_ORIGIN??`http://127.0.0.1:${port}`,demo=process.argv.includes('--demo');
 const app=await createForum({dbPath:process.env.FORUM_DB??path.join(root,'var/forum.sqlite'),origin,allowedOrigins:(process.env.FORUM_ALLOWED_ORIGINS??origin).split(',').map(s=>s.trim()).filter(Boolean),demo,trustProxy:process.env.FORUM_TRUST_PROXY==='1'});
 app.server.listen(port,'127.0.0.1',()=>console.log(`Forum ${demo?'preview':'ready'}: ${origin}/forum`));
 for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>app.close().then(()=>process.exit(0)));
}
