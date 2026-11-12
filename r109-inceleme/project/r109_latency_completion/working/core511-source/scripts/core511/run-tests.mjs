import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {sourceIdentity} from './source-identity.mjs';
const here=import.meta.dirname,testDir=path.join(here,'tests'),evidence=path.join(here,'evidence');fs.mkdirSync(evidence,{recursive:true});
const prefix=process.env.CORE511_TEST_EVIDENCE_PREFIX??'component-tests';if(!/^[a-z0-9-]{1,100}$/.test(prefix))throw Error('Invalid evidence prefix');
if(process.env.CORE511_TEST_EVIDENCE_PREFIX&&['json','tap'].some(ext=>fs.existsSync(path.join(evidence,prefix+'.'+ext))))throw Error('Evidence already exists');
const identity=sourceIdentity();
const files=fs.readdirSync(testDir).filter(name=>name.endsWith('.test.mjs')).sort().map(name=>path.join(testDir,name));
// The growing full suite needs an outer execution budget independent of each
// test's own deadline. This is not a gameplay latency or acceptance threshold.
const suiteTimeoutMs=600000;
const result=spawnSync(process.execPath,['--test',...files],{encoding:'utf8',maxBuffer:20*1024*1024,timeout:suiteTimeoutMs});
const output=(result.stdout??'')+'\n'+(result.stderr??'');fs.writeFileSync(path.join(evidence,prefix+'.tap'),output);
const summary={scope:'component and selected-rule tests only; not complete-game acceptance',suiteTimeoutMs,exitCode:result.status,signal:result.signal,runnerError:result.error?{code:result.error.code,message:result.error.message}:null,files:files.map(file=>path.relative(here,file)),tests:Number(/^# tests (\d+)$/m.exec(output)?.[1]),pass:Number(/^# pass (\d+)$/m.exec(output)?.[1]),fail:Number(/^# fail (\d+)$/m.exec(output)?.[1]),skipped:Number(/^# skipped (\d+)$/m.exec(output)?.[1]),tapSha256:createHash('sha256').update(output).digest('hex')};
summary.sourceIdentity=identity;summary.sourceUnchanged=sourceIdentity().sha256===identity.sha256;
fs.writeFileSync(path.join(evidence,prefix+'.json'),JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify({prefix,tests:summary.tests,pass:summary.pass,fail:summary.fail,skipped:summary.skipped,exitCode:summary.exitCode,sourceUnchanged:summary.sourceUnchanged,tapSha256:summary.tapSha256}));process.exitCode=result.status??1;
