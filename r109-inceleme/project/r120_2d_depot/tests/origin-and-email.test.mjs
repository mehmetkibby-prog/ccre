import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {parse} from 'acorn';
import {siteUrlsR120} from '../../r109_latency_completion/working/core511-source/scripts/core511/site-origin-r120.mjs';
const work=new URL('../../r109_latency_completion/working/',import.meta.url);
test('exact URL migration preserves query, protocol, child hosts and JWT issuer',()=>{
 const before='https://coreoflife.net/voice/?a=1%202&w=3 wss://www.coreoflife.net/ws https://accounts.coreoflife.net/reset-password?token=a https://coreoflife.net.evil';
 assert.equal(siteUrlsR120(before),'https://2d.coreoflife.net/voice/?a=1%202&w=3 wss://2d.coreoflife.net/ws https://accounts.coreoflife.net/reset-password?token=a https://coreoflife.net.evil');
});
for(const runtime of ['http-runtime','accounts-runtime'])test(runtime+' actual email token builder uses trusted new origin; accounts stays unchanged',()=>{
 const source=fs.readFileSync(new URL(runtime+'/dist-vds/server/index.js',work),'utf8');
 const ast=parse(source,{ecmaVersion:'latest',sourceType:'module'}),names=['requiredEnvironmentValue','trustedPublicOrigin','validateResetToken','buildPasswordResetUrl'];
 const declarations=names.map(name=>{const n=ast.body.find(n=>n.type==='FunctionDeclaration'&&n.id.name===name);assert(n,name);return source.slice(n.start,n.end);}).join('\n');
 const context=vm.createContext({env:{AUTH_PUBLIC_ORIGIN:'https://2d.coreoflife.net'},URL,AuthEmailError:Error,RESET_PATH:'/reset-password'});vm.runInContext(declarations,context);
 const token='a'.repeat(64),url=vm.runInContext(`buildPasswordResetUrl('${token}')`,context);
 assert.equal(url,'https://2d.coreoflife.net/reset-password?token='+token);
 context.env.AUTH_PUBLIC_ORIGIN='https://accounts.coreoflife.net';assert.equal(vm.runInContext(`buildPasswordResetUrl('${token}')`,context),'https://accounts.coreoflife.net/reset-password?token='+token);
 context.env.AUTH_PUBLIC_ORIGIN='http://2d.coreoflife.net';assert.throws(()=>vm.runInContext(`buildPasswordResetUrl('${token}')`,context));
 assert(source.includes('iss: "coreoflife.net"'));assert(!/Domain\s*[=:]\s*["']?\.?coreoflife\.net/i.test(source));
 assert(!/serviceWorker\s*\.\s*register\s*\(/.test(source));assert(!/challenges\.cloudflare\.com\/turnstile|google\.com\/recaptcha|discord\.com\/api\/oauth2\/authorize/.test(source));
});
