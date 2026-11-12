import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {Worker} from 'node:worker_threads';
import {inflateSync} from 'node:zlib';
import {createBotCheck} from '../working/native510-bb3a6cc689c6/vds-server/src/bot-check.mjs';
import {CaptchaRendererR106} from '../working/native510-bb3a6cc689c6/vds-server/src/captcha-renderer-r106.mjs';

const digest=(id,answer)=>createHash('sha256').update(id+':'+answer).digest('hex');
const fakePng=Buffer.from('test-render-only');
const gate=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function fixture(t,extra={}){
 const db=new DatabaseSync(':memory:');t.after(()=>db.close());let at=1_000_000;
 const codes=[],bot=createBotCheck(db,{now:()=>at,renderCaptcha:async code=>{assert.equal(db.isTransaction,false,'drawing outside transaction');codes.push(code);return fakePng;},...extra});
 const commit=fn=>{db.exec('BEGIN');try{const result=fn();assert(!result?.then);db.exec('COMMIT');return result;}catch(e){db.exec('ROLLBACK');throw e;}};
 return {db,bot,codes,commit,setTime:v=>at=v,rows:()=>db.prepare('SELECT * FROM bot_challenges').all()};
}
test('async registration writes only after rendering; one-use, expiry and attempts retain their rules',async t=>{
 const f=fixture(t),a=await f.bot.challengeAsyncR106('ip','register',{fresh:true,commit:f.commit});
 assert.equal(a.expiresAt,1_300_000);assert.equal(f.rows().length,1);assert.equal(f.bot.verify('wrong','register',a.id,f.codes[0]),false);
 for(let n=0;n<5;n++)assert.equal(f.bot.verify('ip','register',a.id,'000000'),false);
 assert.equal(f.rows()[0].attempts,5);assert.equal(f.bot.verify('ip','register',a.id,f.codes[0]),false);
 const b=await f.bot.challengeAsyncR106('ip','register',{fresh:true,commit:f.commit});
 assert.equal(f.bot.verify('ip','register',b.id,f.codes[1]),true);assert.equal(f.bot.verify('ip','register',b.id,f.codes[1]),false);
 const c=await f.bot.challengeAsyncR106('ip','register',{fresh:true,commit:f.commit});f.setTime(c.expiresAt);
 assert.equal(f.bot.verify('ip','register',c.id,f.codes[2]),false);
});
test('same IP registration forms remain independent and game generation shares in-flight drawing',async t=>{
 const f=fixture(t),[a,b]=await Promise.all([1,2].map(()=>f.bot.challengeAsyncR106('same-ip','register',{fresh:true,commit:f.commit})));
 assert.notEqual(a.id,b.id);assert.equal(f.rows().length,2);assert(f.bot.verify('same-ip','register',a.id,f.codes[0]));assert(f.bot.verify('same-ip','register',b.id,f.codes[1]));
 const delayed=gate();let calls=0;
 const g=fixture(t,{renderCaptcha:async()=>{calls++;await delayed.promise;return fakePng;}});
 const p=g.bot.prepareChallengeR106('account','game'),q=g.bot.prepareChallengeR106('account','game');assert.strictEqual(p,q);assert.equal(calls,1);assert.equal(g.rows().length,0);
 delayed.resolve();const prepared=await p;const x=g.commit(()=>g.bot.challenge('account','game',{prepared}));
 assert.equal(g.commit(()=>g.bot.challenge('account','game',{prepared})).id,x.id);assert.equal(g.rows().length,1);
});
test('prepared images cannot be rebound; concurrent fresh-answer collision preserves the old challenge',async t=>{
 const f=fixture(t),prepared=await f.bot.prepareChallengeR106('account','game');
 assert.throws(()=>f.commit(()=>f.bot.challenge('different','game',{prepared})),/captcha_prepared_invalid/);assert.equal(f.rows().length,0);
 const id='prior',code=f.codes[0];f.db.prepare('INSERT INTO bot_challenges VALUES(?,?,?,?,?,?,?)').run(id,'account','game',digest(id,code),'prior-image',1_200_000,0);
 assert.throws(()=>f.commit(()=>f.bot.challenge('account','game',{fresh:true,prepared})),/captcha_prepare_again/);
 assert.equal(f.rows()[0].id,'prior');assert.equal(f.rows().length,1);
});
test('render or commit failure publishes no challenge; expiry starts at final commit',async t=>{
 const f=fixture(t,{renderCaptcha:async()=>{throw Error('worker failed');}});
 await assert.rejects(f.bot.challengeAsyncR106('ip','register',{fresh:true,commit:f.commit}),/worker failed/);assert.equal(f.rows().length,0);
 const g=fixture(t),prepared=await g.bot.prepareChallengeR106('a','game');g.setTime(2_000_000);
 const item=g.commit(()=>g.bot.challenge('a','game',{prepared}));assert.equal(item.expiresAt,2_300_000);
 await assert.rejects(g.bot.challengeAsyncR106('ip','register',{fresh:true,commit:fn=>g.commit(()=>{fn();throw Error('rollback');})}),/rollback/);
 assert.equal(g.rows().length,1);
});
test('real renderer creates valid independent PNGs while the main event loop continues',async t=>{
 const renderer=new CaptchaRendererR106();t.after(()=>renderer.close());let ticks=0;const timer=setInterval(()=>ticks++,2);t.after(()=>clearInterval(timer));
 const pngs=await Promise.all(Array.from({length:12},(_,n)=>renderer.render(String(123456+n))));
 assert(ticks>=5,'main loop was responsive during drawing');assert.equal(renderer.snapshot().workers,1);assert.equal(renderer.snapshot().completed,12);
 for(const png of pngs){assert.equal(png.readUInt32BE(16),252);assert.equal(png.readUInt32BE(20),88);const chunks=[];for(let at=8;at<png.length;){const n=png.readUInt32BE(at),type=png.subarray(at+4,at+8).toString();if(type==='IDAT')chunks.push(png.subarray(at+8,at+8+n));at+=n+12;}assert.equal(inflateSync(Buffer.concat(chunks)).length,88*(252*3+1));}
 assert.notDeepEqual(pngs[0],pngs[1]);
});
test('renderer queue is bounded, worker termination rejects pending jobs and a new worker recovers',async t=>{
 const renderer=new CaptchaRendererR106({limit:2,retryMs:0});t.after(()=>renderer.close());
 const a=renderer.render('123456'),b=renderer.render('234567');const failed=Promise.allSettled([a,b]);
 await assert.rejects(renderer.render('345678'),/captcha_renderer_busy/);await renderer.worker.terminate();
 assert((await failed).every(r=>r.status==='rejected'));assert.equal(renderer.snapshot().queued,0);
 assert((await renderer.render('456789')).length>64);assert.equal(renderer.snapshot().workers,2);
});
test('unresponsive worker times out without a synchronous fallback and close cancels pending jobs',async t=>{
 const renderer=new CaptchaRendererR106({timeoutMs:60,workerFactory:()=>new Worker('setInterval(()=>{},1000)',{eval:true,execArgv:[]})});t.after(()=>renderer.close());
 await assert.rejects(renderer.render('123456'),/captcha_renderer_timeout/);assert.equal(renderer.snapshot().active,false);assert.equal(renderer.snapshot().queued,0);
 const other=new CaptchaRendererR106();t.after(()=>other.close());const pending=other.render('234567');other.close();await assert.rejects(pending,/captcha_renderer_closed/);
});
