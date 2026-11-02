import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {nativeHttpHost} from '../working/core511-source/scripts/core511/tests/native-http-host-fixture.mjs';
import {realmStartupConfig} from '../working/core511-source/scripts/core511/tests/native-realm-startup-fixture.mjs';
import {NativeHttpServer} from '../working/core511-source/scripts/core511/native-http-server.mjs';
import {BASE,temporary,until} from '../working/core511-source/scripts/core511/tests/helpers.mjs';

test('exact R91 HTTP rejects stale proof; corrected package opens actual HTTP listener with four ready channels', {timeout:60000}, async t => {
  const s = await nativeHttpHost(t, {realmSetup: async (host) => {
    await realmStartupConfig(t, host).prepare();
  }});
  await s.world.stopJobs();
  const root = temporary(t), outDir = path.join(root, 'dist-vds'), serverDir = path.join(outDir, 'server');
  fs.mkdirSync(serverDir, {recursive:true});
  fs.mkdirSync(path.join(outDir, 'client/assets'), {recursive:true});
  fs.writeFileSync(path.join(root, 'package.json'), '{"type":"module"}');
  for (const name of ['lib','vds-server','node_modules']) fs.symlinkSync(path.join(BASE, name), path.join(root, name), 'dir');
  fs.cpSync(path.join(BASE, 'dist-vds/server'), serverDir, {recursive:true});
  // The source handoff lacks the SSR asset map. This test uses the real HTTP
  // listener/API; no page rendering or complete client asset claim is made.
  fs.writeFileSync(path.join(serverDir, '__vite_rsc_assets_manifest.js'), 'export default {serverResources:{},clientReferenceDeps:{}};\n');
  fs.copyFileSync(new URL('../r91-package/payload/http-runtime/dist-vds/server/index.js', import.meta.url), path.join(serverDir,'index.js'));
  const proofPath = new URL('../working/core511-source/scripts/core511/generated/native-http-composition-proof.json', import.meta.url);
  const fixed = fs.readFileSync(proofPath);
  const old = fs.readFileSync('/tmp/core511-r90-startup-fix/working/core511-source/scripts/core511/generated/native-http-composition-proof.json');
  t.after(() => fs.writeFileSync(proofPath, fixed));
  fs.writeFileSync(proofPath, old);
  await assert.rejects(NativeHttpServer.start(s.host, {outDir,port:0,hosts:['game.invalid']}), {code:'native_http_server_entry_changed'});
  assert.equal(s.host.nativeHttpServer, undefined);
  t.diagnostic('R90 proof with R91 HTTP correctly rejected before HTTP listener opens.');
  fs.writeFileSync(proofPath, fixed);
  const priorProxy=process.env.VINEXT_TRUST_PROXY, priorHosts=process.env.VINEXT_TRUSTED_HOSTS;
  process.env.VINEXT_TRUST_PROXY='1';process.env.VINEXT_TRUSTED_HOSTS='game.invalid';
  t.after(() => {
    if(priorProxy===undefined)delete process.env.VINEXT_TRUST_PROXY;else process.env.VINEXT_TRUST_PROXY=priorProxy;
    if(priorHosts===undefined)delete process.env.VINEXT_TRUSTED_HOSTS;else process.env.VINEXT_TRUSTED_HOSTS=priorHosts;
  });
  const server = await NativeHttpServer.start(s.host, {outDir,port:0,hosts:['game.invalid']});
  const health = () => new Promise((resolve,reject) => {
    const req = http.get({host:'127.0.0.1',port:server.port,path:'/api/vds-health',headers:{host:'game.invalid','x-forwarded-host':'game.invalid','x-forwarded-proto':'https'},agent:false}, res => {
      let text='';res.on('data',b=>text+=b);res.on('end',()=>{try{resolve({status:res.statusCode,body:JSON.parse(text)});}catch(e){reject(e);}});
    });req.on('error',reject);
  });
  let result=await health();
  const deadline=Date.now()+8000;
  while (!(result.status===200&&result.body.checkpointR79?.ready===true) && Date.now()<deadline) {
    await new Promise(resolve=>setTimeout(resolve,50));
    result=await health();
  }
  assert.equal(result.status,200);
  assert.equal(result.body.updateVersion,'R91_GAMEPLAY');
  assert.equal(result.body.durable,true);
  assert.equal(result.body.kernel511.ready,true);
  assert.equal(result.body.checkpointR79.ready,true);
  assert.equal(result.body.runtimeDiagnosticsR80.available,true);
  assert.equal(result.body.runtimeDiagnosticsR80.protocol,'runtime-diagnostics-r80-v1');
  assert.equal(result.body.channelProcesses.channels.length,4);
  for(const [i,row] of result.body.channelProcesses.channels.entries()) {
    assert.equal(row.channel,i+1);assert.equal(row.ready,true);assert.equal(row.online,0);assert.equal(row.capacity,25);
  }
  assert.equal(s.faults.length,0,s.faults.map(f=>f.error?.stack).join('\n'));
  t.diagnostic('Corrected package: actual HTTP 200, R91 version, four channels ready, checkpoint worker ready, runtime diagnostics ready, no faults.');
});
