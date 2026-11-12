import fs from 'node:fs';
import path from 'node:path';
import {canaryIsolation} from './canary-isolation.mjs';
const root=process.env.CORE511_CANARY_ROOT;
let report;
try{report={passed:true,isolation:await canaryIsolation()};}
catch(e){report={passed:false,error:e.code??e.message};process.exitCode=1;}
fs.writeFileSync(path.join(root,'isolation.json'),JSON.stringify(report,null,2)+'\n',{mode:0o600});
