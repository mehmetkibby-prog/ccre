import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {temporary} from './helpers.mjs';
import {IsolatedRoots} from '../isolated-root.mjs';
import {runWebSocketValidation} from '../ws-validation.mjs';
test('isolated directory cleanup requires stopped workers and cannot target another root',async t=>{
 const parent=temporary(t),roots=new IsolatedRoots(path.join(parent,'private')),descriptor=await roots.create();
 await fs.writeFile(path.join(descriptor.root,'test.sqlite'),'disposable');
 await assert.rejects(roots.remove(descriptor,{processesStopped:false}),/still_running/);
 await assert.rejects(roots.remove({...descriptor,root:parent},{processesStopped:true}),/unowned/);
 assert.equal(await fs.readFile(path.join(descriptor.root,'test.sqlite'),'utf8'),'disposable');
 await roots.remove(descriptor,{processesStopped:true});await assert.rejects(fs.stat(descriptor.root),{code:'ENOENT'});
});
test('a replaced validation directory symlink is not traversed or removed',async t=>{
 const parent=temporary(t),roots=new IsolatedRoots(path.join(parent,'private')),descriptor=await roots.create(),other=path.join(parent,'keep');
 await fs.mkdir(other);await fs.writeFile(path.join(other,'database.sqlite'),'preserve');await fs.rm(descriptor.root,{recursive:true});await fs.symlink(other,descriptor.root);
 await assert.rejects(roots.remove(descriptor,{processesStopped:true}),/path_replaced/);assert.equal(await fs.readFile(path.join(other,'database.sqlite'),'utf8'),'preserve');
});
test('WS canary cannot start from a component benchmark or incomplete local proof',async()=>{
 const runId='00000000-0000-0000-0000-000000000001';let touched=false;
 const descriptor={purpose:'kernel511-isolated-validation',runId,manifestSha256:'a'.repeat(64),localAcceptance:{workload:'kernel-components'},players:Array.from({length:100},(_,i)=>({id:runId+':'+i,channel:Math.floor(i/25)+1}))};
 await assert.rejects(runWebSocketValidation({descriptor,assertIsolation:()=>{touched=true;},createWebSocket:()=>{touched=true;}}),/complete_game_local_acceptance_required/);assert.equal(touched,false);
});
