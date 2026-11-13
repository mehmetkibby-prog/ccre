import {prepareCached477} from './writer-statements.mjs';
const available=new WeakMap();
export function readCommitRevisionR113(sql,actor){
 let exists=available.get(sql);
 if(exists===undefined){exists=Boolean(prepareCached477(sql,"SELECT 1 FROM sqlite_schema WHERE name='kernel511_actor_revision_r113'").get());if(exists)available.set(sql,true);}
 return exists?prepareCached477(sql,'SELECT revision FROM kernel511_actor_revision_r113 WHERE actor=?').get(actor)?.revision??0:null;
}

