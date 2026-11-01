import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root=new URL('../../',import.meta.url),base=new URL('working/core511-source/scripts/core511/',root),candidate=new URL('candidates/motion-tail-r85/core511-source/scripts/core511/',root),pins=JSON.parse(readFileSync(new URL('./baseline-pins.json',import.meta.url),'utf8'));
function nameOf(url){return url.startsWith(base.href)?url.slice(base.href.length):null;}
export async function resolve(specifier,context,next){
 if(context.parentURL&&specifier.startsWith('.')){const url=new URL(specifier,context.parentURL),name=nameOf(url.href);if(name&&Object.hasOwn(pins,name)&&pins[name]===null&&existsSync(new URL(name,candidate)))return {url:url.href,shortCircuit:true};}
 return next(specifier,context);
}
export async function load(url,context,next){
 const name=nameOf(url);if(!name||!Object.hasOwn(pins,name))return next(url,context);
 if(pins[name]!==null){const result=await next(url,context),before=String(result.source);if(createHash('sha256').update(before).digest('hex')!==pins[name])throw Error('motion_tail_baseline_drift:'+name);}
 return {format:'module',source:readFileSync(new URL(name,candidate),'utf8'),shortCircuit:true};
}
