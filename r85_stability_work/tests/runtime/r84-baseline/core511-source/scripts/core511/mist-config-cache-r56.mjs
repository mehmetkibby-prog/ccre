// One bounded parsed value. Read the database on every call; callers always get
// their own mutable copy, including nested arrays. Never retain invalid input.
import {mistConfigCacheR56} from './r56-options.mjs';
export function createMistConfigCacheR56(validate,{enabled=mistConfigCacheR56}={}){
 let previous,parsed;
 return raw=>{
  if(!enabled||typeof raw!=='string'||raw.length>65536)return validate(raw);
  if(raw!==previous){
   const value=validate(raw);
   parsed=structuredClone(value);previous=raw;
   return value;
  }
  return structuredClone(parsed);
 };
}
