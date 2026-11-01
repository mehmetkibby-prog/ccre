import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
export async function load(url,context,next){
 const result=await next(url,context);
 if(!url.endsWith('/core511/writer-lane-r533.mjs'))return result;
 if(createHash('sha256').update(result.source).digest('hex')!=='e87fc32b831222b25196edc0819583ecb50c17b26c499b36b9378cd7fb207ed7')throw Error('inline_lane_baseline_drift');
 return {...result,source:readFileSync(new URL('./candidate/writer-lane-r533.mjs',import.meta.url),'utf8')};
}
