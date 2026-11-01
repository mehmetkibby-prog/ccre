import {writeFileSync} from 'node:fs';
import {threadId} from 'node:worker_threads';
import {statementBootPoolStatsR61} from '../../working/core511-source/scripts/core511/statement-boot-pool-r61.mjs';
import {preparedStatementsStats477} from '../../working/native510-bb3a6cc689c6/vds-server/src/prepared-statements477.mjs';

// Fixture-only state counters. No command warmup, query timing or SQL observers.
export function createBootProbeR85(sql){
 const rows=[],schema=sql.prepare('PRAGMA main.schema_version'),temp=sql.prepare('PRAGMA temp.schema_version'),data=sql.prepare('PRAGMA main.data_version');
 const file=new URL('../../evidence/worker-boot-probe-r85-'+process.pid+'-'+threadId+'.json',import.meta.url);
 return {snapshot(phase,current=null,ack=null){
  rows.push({phase,operationId:current?.request?.operationId??null,operation:current?.request?.operation??null,status:ack?.result?.result?.status??null,schemaVersion:schema.get().schema_version,tempSchemaVersion:temp.get().schema_version,dataVersion:data.get().data_version,pool:statementBootPoolStatsR61(sql),prepared:preparedStatementsStats477(sql)});
  writeFileSync(file,JSON.stringify({pid:process.pid,threadId,scope:'Counter-only actual native worker during nativeHttpHost startup and first real lethal command. Three diagnostic PRAGMA preparations add three pool lookups. No performance claim.',rows},null,2)+'\n');
 }};
}
