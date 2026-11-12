import vm from 'node:vm';
import assert from 'node:assert/strict';
import {parse} from '../../perf-r11/tests/parser.mjs';
import {native} from './helpers.mjs';
import {nativePresenceSource} from './native-presence-fixture.mjs';
import {patchNativeBootstrap} from '../patch-native-bootstrap.mjs';
export const nativeBootstrapSource=nativePresenceSource;
export const patchedBootstrapSource=patchNativeBootstrap(nativeBootstrapSource).source;
const snippets=new Map(),{channelCapacity510}=await native('vds-server/src/channel-capacity510.mjs');
export function bootstrapHandler({f,source=patchedBootstrapSource,onLegacySeed=()=>{}}){
 let code=snippets.get(source);if(!code){const ast=parse(source,{ecmaVersion:'latest',sourceType:'module'}),fn=ast.body.find(n=>n.type==='FunctionDeclaration'&&n.id.name==='col422ChannelBootstrap');assert(fn);code=source.slice(fn.start,fn.end)+'\ncol422ChannelBootstrap';snippets.set(source,code);}
 // Native schema/seed is already present in the isolated fixture. No legacy
 // seed/migration is allowed to run after the five owners have started.
 return vm.runInNewContext(code,{ensureWorldSeed:async()=>onLegacySeed(),db:()=>f.f.database,nowSeconds$1:()=>Math.floor(f.clock()/1000),getGameSettings:f.auth.rules.getGameSettings,channelCapacity510});
}
