import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeBootstrapSource} from './native-bootstrap-fixture.mjs';
import {patchNativeBootstrap} from '../patch-native-bootstrap.mjs';
import {patchNativeAdmin} from '../patch-native-admin.mjs';
import {patchNativeAuth} from '../patch-native-auth.mjs';
import {patchNativeLogout} from '../patch-native-logout.mjs';
import {patchNativeSession} from '../patch-native-session.mjs';
import {patchNativePresence} from '../patch-native-presence.mjs';

test('native bootstrap patch changes only its old display body and preserves every other bundle byte',()=>{
 const result=patchNativeBootstrap(nativeBootstrapSource),[e]=result.proof.edits;assert.equal(result.proof.edits.length,1);assert.equal(result.source.slice(0,e.start)+e.original+result.source.slice(e.start+e.replacement.length),nativeBootstrapSource);assert.throws(()=>patchNativeBootstrap(nativeBootstrapSource.replace('async function col422ChannelBootstrap()','async function differentBootstrap()')),/native_bootstrap_function_changed/);
});

test('native bootstrap composes with all current server auth/presence/admin patches without overlapping edits',()=>{
 const patches=[patchNativeAdmin,patchNativeAuth,patchNativeLogout,patchNativeSession,patchNativePresence,patchNativeBootstrap],apply=sequence=>sequence.reduce((source,patch)=>patch(source).source,nativeBootstrapSource);assert.equal(apply(patches),apply(patches.toReversed()));
});
