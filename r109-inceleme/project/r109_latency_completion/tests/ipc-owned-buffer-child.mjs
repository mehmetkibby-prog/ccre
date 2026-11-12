import {ProcessStream} from '../working/core511-source/scripts/core511/process-stream.mjs';
const stream=new ProcessStream(process,{stream:'test'});
stream.on('error',()=>{});
stream.on('data',bytes=>stream.write(bytes));
stream.on('end',()=>stream.end(()=>process.disconnect()));
