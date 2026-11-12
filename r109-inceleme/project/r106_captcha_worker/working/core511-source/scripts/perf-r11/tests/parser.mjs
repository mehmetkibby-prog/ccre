// Test tooling only, never included in the native runtime.
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const file=process.env.COL_TEST_ACORN_MODULE ?? '/tmp/col-perf-r11-dependencies/node_modules/acorn/dist/acorn.mjs';
const bytes=await readFile(file);
if(createHash('sha256').update(bytes).digest('hex')!=='b4c8c70200e72bae33cf1085e0ecb1e792c1b6924ed50cab817caf14f51bb249')throw Error('Expected exact Acorn 8.15.0 parser bytes');
export const {parse}=await import(pathToFileURL(file));
