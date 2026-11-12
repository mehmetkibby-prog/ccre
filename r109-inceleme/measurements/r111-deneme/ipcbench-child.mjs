import net from 'node:net';
let n=0,bytes=0;
process.on('message',m=>{if(m?.type==='kernel511-bytes'){n++;bytes+=m.bytes.length;}else if(m==='report'){process.send({n,bytes});n=0;bytes=0;}});
const raw=new net.Socket({fd:3,readable:true,writable:false});
let rn=0,rb=0;raw.on('data',b=>{rb+=b.length;});
process.on('message',m=>{if(m==='rawreport'){process.send({rawBytes:rb});rb=0;}});
