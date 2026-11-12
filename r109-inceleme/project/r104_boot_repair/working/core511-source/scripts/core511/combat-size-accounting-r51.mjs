// Native events are JSON records. Count their large array rows once, then
// reuse those exact sizes in the existing splitter. No wire schema changes.
export function combatArraySizeR51(event,keys){
 const length=Math.max(...keys.map(key=>event[key].length));
 if(length<128||length>4096||Object.hasOwn(event,'toJSON')||Object.values(Object.getOwnPropertyDescriptors(event)).some(d=>d.get||d.set))return null;
 const empty={...event,...Object.fromEntries(keys.map(key=>[key,[]]))},sizes=new Map();
 let bytes=Buffer.byteLength(JSON.stringify(empty));
 for(const key of keys){const rows=event[key],values=Array.from(rows,row=>Buffer.byteLength(JSON.stringify(row)??'null'));sizes.set(key,values);bytes+=values.reduce((a,b)=>a+b,0)+Math.max(0,rows.length-1);}
 return {bytes,sizes};
}
