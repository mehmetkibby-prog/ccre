// Isolated infrastructure fault injection. This is not a game reward handler.
import fs from 'node:fs';
import {native} from './helpers.mjs';
import {DurableLedger} from '../durable-ledger.mjs';
const [file,mode,marker]=process.argv.slice(2);
const {LocalDatabase}=await native('vds-server/src/database.mjs');
const database=new LocalDatabase(file,{groupWrites:true,asyncDurable:true});
const kill=phase=>{fs.writeFileSync(marker,phase);process.kill(process.pid,'SIGKILL');};
const ledger=new DurableLedger(database,{authorize:(_,peer,event)=>peer.realm==='test'&&event.realm==='test',handlers:new Map([['fixture',sqlite=>{
 sqlite.prepare('UPDATE fixture SET amount=amount+7 WHERE id=1').run();
 if(mode==='before')kill('uncommitted');
 return {amount:sqlite.prepare('SELECT amount FROM fixture WHERE id=1').get().amount};
}]])});
await ledger.submit({realm:'test'},{realm:'test',key:'reward:1',actor:'test-player',kind:'fixture',payload:{}});
if(mode==='after')kill('committed_before_ack');
database.close();
