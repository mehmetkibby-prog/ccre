import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {adaptNonlethalR56} from './adapt-nonlethal-r56.mjs';
const [input,output]=process.argv.slice(2),hash=s=>createHash('sha256').update(s).digest('hex');
if(!input||!output)throw Error('usage: node apply-nonlethal-port-r56.mjs R55-writer.mjs output.mjs');
const source=fs.readFileSync(input,'utf8');
if(hash(source)!=='13ee4bcf2ca2204432723766e88cc7f5e86a7f8f47cf08a4672f93e3a37e4628')throw Error('r56_unrecognized_R55_writer');
const generated=adaptNonlethalR56(source);fs.writeFileSync(output,generated);console.log(JSON.stringify({inputSha256:hash(source),outputSha256:hash(generated)}));
