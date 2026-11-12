const {ProcessStream}=await import(process.argv[2]);
const stream=new ProcessStream(process,{stream:'bench'});
stream.on('error',()=>{});
stream.on('data',bytes=>stream.write(bytes));
stream.on('end',()=>stream.end(()=>process.disconnect()));
process.send({type:'bench-ready'});
