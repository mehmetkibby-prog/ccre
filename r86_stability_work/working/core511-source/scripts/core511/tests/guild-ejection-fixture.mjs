import {GameWriter} from '../writer-runtime.mjs';
export async function bindGuildEjection(database,nowMs){
 const writer=new GameWriter(database,{realmId:'guild-ejection-test',clock:()=>nowMs,ports:{guard:()=>true,assertResources:()=>true}});await writer.initialize();return writer;
}
