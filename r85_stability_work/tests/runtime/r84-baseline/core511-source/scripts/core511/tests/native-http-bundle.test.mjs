import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {BASE,hash,temporary} from './helpers.mjs';
import {composeNativeHttp,NATIVE_HTTP_PATCHES} from '../compose-native-http.mjs';
import {patchNativeDatabase} from '../patch-native-database.mjs';
import {stageNativeHttp} from './native-http-bundle-fixture.mjs';
import {nativeHttpHost} from './native-http-host-fixture.mjs';
import {clientAssetPaths} from '../client-assets.mjs';

test('exact native HTTP composition retains twenty-seven commuting patches and rejects changed source',()=>{
 const original=fs.readFileSync(path.join(BASE,'dist-vds/server/index.js'),'utf8'),composed=composeNativeHttp(),changed=patchNativeDatabase(original);
 assert.equal(changed.proof.edits.length,1);assert.equal(changed.source.replace(changed.proof.edits[0].replacement,changed.proof.edits[0].original),original);assert.throws(()=>patchNativeDatabase(changed.source),/native_http_database_changed/);
 assert.equal(composed.proof.patches.length,27);assert.equal(composed.proof.generatedSha256,hash(composed.source));assert.equal(clientAssetPaths(NATIVE_HTTP_PATCHES.toReversed().reduce((s,p)=>p(s).source,original)),composed.source);
 const root=temporary();try{fs.mkdirSync(path.join(root,'dist-vds/server'),{recursive:true});fs.copyFileSync(path.join(BASE,'realm-package-manifest.json'),path.join(root,'realm-package-manifest.json'));fs.writeFileSync(path.join(root,'dist-vds/server/index.js'),original+'\n');assert.throws(()=>composeNativeHttp(root),/native_http_source_changed/);fs.writeFileSync(path.join(root,'realm-package-manifest.json'),'{}');assert.throws(()=>composeNativeHttp(root),/native_http_manifest_changed/);}finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('actual native bundle cannot open its fallback writer when the sole host binding is absent',async t=>{
 const module=stageNativeHttp(t),old=process.env.CORE_DATABASE_PATH,file=path.join(module.root,'must-not-exist.sqlite');process.env.CORE_DATABASE_PATH=file;
 try{await assert.rejects(module.load(),/native_http_binding_required/);assert.equal(fs.existsSync(file),false);}finally{if(old===undefined)delete process.env.CORE_DATABASE_PATH;else process.env.CORE_DATABASE_PATH=old;}
});

test('actual native router retains session authorization and exposes four-channel bootstrap on the sole DB',{timeout:30000},async t=>{
 const h=await nativeHttpHost(t),module=stageNativeHttp(t),m=await module.load();assert.equal(typeof m.default,'function');const db=h.host.database,originals=[h.world.row,...h.supervisor.rows.values()];
 assert.equal(globalThis[Symbol.for('coreoflife.localDatabase')],db);assert.equal(h.bindings.database(),db);
 const call=async(path,options={})=>{const r=await m.default(h.f.request({path,method:'GET',...options}));return {status:r.status,body:await r.json()};};
 const me=await call('/api/auth/me');assert.equal(me.status,200);assert.equal(me.body.authenticated,true);assert.equal(me.body.account.id,h.f.account.id);
 const anonymous=await call('/api/auth/me',{headers:{Cookie:''}});assert.equal(anonymous.body.authenticated,false);
 const denied=await call('/api/admin');assert.equal(denied.status,403);
 const locked=await call('/api/channels');assert.equal(locked.status,403);assert.equal(locked.body.code,'launch_locked');await db.atomic(()=>globalThis.__colLaunch.grant(h.f.account.id,true));
 const channels=await call('/api/channels');assert.equal(channels.status,200);assert.equal(channels.body.capacity,25);assert.deepEqual(channels.body.channels.map(c=>c.id),[1,2,3,4]);
 assert.equal(db.worldLoop,undefined);assert.equal(db.channelCompute,undefined);assert.equal(db.worldReadPool,undefined);assert.deepEqual([h.world.row,...h.supervisor.rows.values()],originals);
});
