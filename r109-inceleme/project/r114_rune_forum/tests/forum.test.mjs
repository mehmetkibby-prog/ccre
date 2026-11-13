import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createForum} from '../forum/server.mjs';
import {CaptchaRendererR106} from '../forum/lib/captcha-renderer-r106.mjs';
const origin='https://forum.example.test';
async function fixture({dbPath=':memory:',demo=false,failCaptcha=false}={}){
 const actual=new CaptchaRendererR106();let answer,fail=failCaptcha;
 const renderer={render:async value=>{answer=value;if(fail){fail=false;throw Error('test crash');}return actual.render(value);},close:()=>actual.close()};
 const app=await createForum({dbPath,origin,demo,renderer});
 await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+app.server.address().port;
 function client(){
   const jar=new Map();let csrf;
   async function call(route,{method='GET',data,headers={}}={}){
     const res=await fetch(base+'/forum/api'+route,{method,headers:{Origin:origin,'Content-Type':'application/json',Cookie:[...jar].map(([k,v])=>k+'='+v).join('; '),...(csrf?{'X-CSRF-Token':csrf}:{}),...headers},...(data?{body:JSON.stringify(data)}:{})});
     for(const cookie of res.headers.getSetCookie()){const [k,v]=cookie.split(';')[0].split('=');if(v)jar.set(k,v);else jar.delete(k);}
     const body=await res.json();if(body.csrf)csrf=body.csrf;
     return{status:res.status,body,headers:res.headers};
   }
   async function code(){const r=await call('/captcha');assert.equal(r.status,200);assert(r.body.image.startsWith('data:image/png;base64,'));assert(!Object.hasOwn(r.body,'answer'));return answer;}
   async function register(name='Player1',extra={}){return call('/register',{method:'POST',data:{name,email:name+'@example.invalid',password:'Test-only-passphrase114',terms:true,captcha:await code(),...extra}});}
   async function login(name,password='Test-only-passphrase114'){return call('/login',{method:'POST',data:{name,password,captcha:await code()}});}
   return{call,code,register,login,jar};
 }
 return{...app,base,client};
}
test('registration: one-use real PNG CAPTCHA, member role, hashed session and private email',async t=>{
 const app=await fixture();t.after(app.close);const client=app.client();
 const code=await client.code();
 const bad=await client.call('/register',{method:'POST',data:{name:'Player1',email:'p@example.invalid',password:'Test-only-passphrase114',terms:true,captcha:'000000'}});assert.equal(bad.status,400);
 const replay=await client.call('/register',{method:'POST',data:{name:'Player1',password:'Test-only-passphrase114',captcha:code}});assert.equal(replay.status,400);
 const good=await client.register();assert.equal(good.status,201);assert.equal(good.body.user.role,'member');assert(!JSON.stringify(good.body).includes('example.invalid'));
 assert(good.headers.getSetCookie().some(c=>/HttpOnly; SameSite=Strict/.test(c)&&c.includes('Secure')));
 const again=await client.call('/register',{method:'POST',data:{name:'Player2',captcha:code}});assert.equal(again.status,400);
 const session=await client.call('/session');assert.equal(session.body.user.name,'Player1');
});
test('players cannot forge admin, publish or reply in any official category, pin or moderate',async t=>{
 const app=await fixture({demo:true});t.after(app.close);const c=app.client();
 assert.equal((await c.register('FakeAdmin',{role:'admin'})).status,400);
 assert.equal((await c.register('Player1')).status,201);
 for(const category of ['duyurular','guncellemeler','bakim','etkinlikler'])assert.equal((await c.call('/topics',{method:'POST',data:{category,title:'Yetkisiz konu',body:'Bu bir yetki denemesidir.',realm:'Efsane'}})).status,403);
 assert.equal((await c.call('/topics/1/reply',{method:'POST',data:{body:'Yetkisiz yanıt'}})).status,403);
 assert.equal((await c.call('/topics/1/moderate',{method:'POST',data:{action:'hide'}})).status,403);
 assert.equal((await c.call('/topics',{method:'POST',data:{category:'meydan',title:'Sabitleme denemesi',body:'Normal üye sabitleyemez.',realm:'Efsane',pinned:true}})).status,403);
});
test('origin, CSRF, authentication and SQL parameters protect writes',async t=>{
 const app=await fixture();t.after(app.close);const c=app.client();
 const post={category:'meydan',title:'Konu başlığı',body:'Bu gerçek bir test mesajıdır.',realm:'Efsane'};
 assert.equal((await c.call('/topics',{method:'POST',data:post})).status,401);
 await c.register();
 assert.equal((await c.call('/topics',{method:'POST',data:post,headers:{Origin:'https://evil.example'}})).status,403);
 assert.equal((await c.call('/topics',{method:'POST',data:post,headers:{'X-CSRF-Token':'forged'}})).status,403);
 const good=await c.call('/topics',{method:'POST',data:{...post,title:"Başlık'); DROP TABLE users; --"}});assert.equal(good.status,201);
 assert.equal((await c.call('/session')).body.user.name,'Player1');
 assert.equal((await c.call('/topics/'+good.body.id+'/reply',{method:'POST',data:{body:'Oyuncu yanıtı'}})).status,201);
 assert.equal((await c.call('/topics/'+good.body.id)).body.replies.length,1);
});
test('administrator publishes announcements and moderates; players cannot reply to locked topics',async t=>{
 const app=await fixture();t.after(app.close);await app.createAdmin('ForumOwner','Admin-test-only-passphrase114','owner@example.invalid');
 const admin=app.client();assert.equal((await admin.login('ForumOwner','Admin-test-only-passphrase114')).body.user.role,'admin');
 const official=await admin.call('/topics',{method:'POST',data:{category:'bakim',title:'Planlı bakım bildirimi',body:'Bu bir bakım duyurusu testidir.',realm:'Tüm sunucular',pinned:true}});assert.equal(official.status,201);
 assert.equal((await admin.call('/topics/'+official.body.id+'/reply',{method:'POST',data:{body:'Bakım tamamlandı.'}})).status,201);
 const member=app.client();await member.register();
 const topic=await member.call('/topics',{method:'POST',data:{category:'meydan',title:'Oyuncu konusu',body:'Merhaba topluluk arkadaşları.',realm:'Akademi'}});
 assert.equal((await admin.call('/topics/'+topic.body.id+'/moderate',{method:'POST',data:{action:'lock'}})).status,200);
 assert.equal((await member.call('/topics/'+topic.body.id+'/reply',{method:'POST',data:{body:'Kapalı konuya yazı'}})).status,403);
 await admin.call('/topics/'+topic.body.id+'/moderate',{method:'POST',data:{action:'hide'}});
 assert.equal((await member.call('/topics/'+topic.body.id)).status,404);
});
test('forum data persists across restart, passwords are not stored in plaintext, logout revokes session',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'col-forum-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));const dbPath=path.join(dir,'forum.sqlite');
 let app=await fixture({dbPath});let closed=false;t.after(async()=>{if(!closed)await app.close();});const c=app.client();await c.register();
 const topic=await c.call('/topics',{method:'POST',data:{category:'rehberler',title:'Kalıcı rehber konusu',body:'Yeniden başlatmada korunmalı.',realm:'Efsane'}});
 const sessionCookie=c.jar.get('col_forum_session');await c.call('/logout',{method:'POST',data:{}});
 c.jar.set('col_forum_session',sessionCookie);assert.equal((await c.call('/session')).body.user,null);
 await app.close();closed=true;
 assert(!fs.readFileSync(dbPath).includes(Buffer.from('Test-only-passphrase114')));assert(!fs.readFileSync(dbPath).includes(Buffer.from(sessionCookie)));
 app=await fixture({dbPath});closed=false;const again=app.client();assert.equal((await again.login('Player1')).status,200);assert.equal((await again.call('/topics/'+topic.body.id)).body.topic.title,'Kalıcı rehber konusu');
});
test('CAPTCHA render failure returns retryable error; the next generation recovers',async t=>{
 const app=await fixture({failCaptcha:true});t.after(app.close);const c=app.client();const failed=await c.call('/captcha');assert.equal(failed.status,503);assert.match(failed.body.error,/tekrar dene/);assert.equal((await c.register()).status,201);
});
test('limits, security headers and nonpublic files',async t=>{
 const app=await fixture();t.after(app.close);const c=app.client();await c.register();
 const large=await c.call('/topics',{method:'POST',data:{body:'x'.repeat(25000)}});assert.equal(large.status,413);
 const page=await fetch(app.base+'/forum');assert.match(page.headers.get('Content-Security-Policy'),/frame-ancestors 'none'/);assert.equal(page.headers.get('X-Content-Type-Options'),'nosniff');
 assert.equal((await fetch(app.base+'/forum/server.mjs')).status,404);
 for(let i=0;i<10;i++)await c.call('/login',{method:'POST',data:{name:'Player1',password:'Wrong-test-passphrase',captcha:'000000'}});
 assert.equal((await c.call('/login',{method:'POST',data:{}})).status,429);
});
test('single-use recovery changes password, rotates key, revokes every prior session and never stores raw key',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'col-forum-recovery-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));const dbPath=path.join(dir,'forum.sqlite');
 const app=await fixture({dbPath});t.after(app.close);const first=app.client(),second=app.client();
 const reg=await first.register();assert.match(reg.body.recoveryCode,/^[a-f0-9-]{53}$/);
 await second.login('Player1');const originalSession=first.jar.get('col_forum_session');
 const recover=app.client();
 const data={name:'Player1',password:'A-new-test-password-114',recovery:reg.body.recoveryCode};
 assert.equal((await recover.call('/recover',{method:'POST',data:{...data,recovery:'forged',captcha:await recover.code()}})).status,401);
 const result=await recover.call('/recover',{method:'POST',data:{...data,captcha:await recover.code()}});assert.equal(result.status,200);assert.notEqual(result.body.recoveryCode,reg.body.recoveryCode);
 assert.equal((await first.call('/session')).body.user,null);assert.equal((await second.call('/session')).body.user,null);
 assert.equal((await second.login('Player1')).status,401);assert.equal((await second.login('Player1',data.password)).status,200);
 assert.equal((await recover.call('/recover',{method:'POST',data:{...data,captcha:await recover.code()}})).status,401);
 assert(!fs.readFileSync(dbPath).includes(Buffer.from(reg.body.recoveryCode)));assert(!fs.readFileSync(dbPath+'-wal').includes(Buffer.from(result.body.recoveryCode)));
 assert.notEqual(first.jar.get('col_forum_session'),recover.jar.get('col_forum_session'));assert(originalSession);
});
test('online backup contains committed topics and preserves damaged old backup for investigation',async t=>{
 const {backupForum}=await import('../forum/backup.mjs');const {DatabaseSync}=await import('node:sqlite');
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'col-forum-backup-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));const dbPath=path.join(dir,'forum.sqlite');
 const app=await fixture({dbPath});t.after(app.close);const c=app.client();await c.register();
 await c.call('/topics',{method:'POST',data:{category:'meydan',title:'Yedekteki canlı konu',body:'Bağlantı açıkken alınan yedek.',realm:'Efsane'}});
 const destination=path.join(dir,'backups');const first=await backupForum(dbPath,destination,{keep:1});
 const db=new DatabaseSync(first.file,{readOnly:true});assert.equal(db.prepare('SELECT title FROM topics').get().title,'Yedekteki canlı konu');assert.equal(db.prepare('PRAGMA quick_check').get().quick_check,'ok');db.close();
 const second=await backupForum(dbPath,destination,{keep:1});assert(!fs.existsSync(first.file));fs.writeFileSync(second.file+'.sha256','invalid\n');
 await backupForum(dbPath,destination,{keep:1});assert(fs.existsSync(second.file));
 assert.equal((await c.call('/health')).body.version,'R114_RUNE_FORUM1');
});
