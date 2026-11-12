import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {parse} from '../../perf-r11/tests/parser.mjs';
import {BASE,manifest,hash,native} from './helpers.mjs';

const file='dist-vds/server/index.js',source=fs.readFileSync(path.join(BASE,file),'utf8');assert.equal(hash(source),manifest.files.find(r=>r.path===file).sha256);
const ast=parse(source,{ecmaVersion:'latest',sourceType:'module'}),code=['POST$20','channelPermanent'].map(name=>{const n=ast.body.find(n=>n.type==='FunctionDeclaration'&&n.id.name===name);assert(n);return source.slice(n.start,n.end);}).join('\n')+'\nPOST$20';
const {createGuildSkill}=await native('vds-server/src/guild-skill.mjs');

// Exact native route/helper/service/guards against the isolated database.
// The explicit coordinator hook models the pending production host binding.
export function guildSkillHandler({f,core,service=createGuildSkill(f.sql,{now:f.clock}),permanent=(ids,operation)=>core.permanentPlayers(ids,operation)}){
 const r=f.auth.rules;
 return vm.runInNewContext(code,{Response,Error,AuthRequestError:r.AuthRequestError,requireGameSession:r.requireGameSession,assertCsrf:r.assertCsrf,enforceRateLimit:r.enforceRateLimit,readJsonObject:r.readJsonObject,authErrorResponse:r.authErrorResponse,noStoreHeaders:r.noStoreHeaders,guildSkillService:()=>service,__colChannelPermanent:permanent});
}
export function guildSkillService(f,database=f.sql){return createGuildSkill(database,{now:f.clock});}
