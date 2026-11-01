// Fixed table names and numeric counters only. No player IDs, SQL or bindings.
const round=n=>Math.round(n*1000)/1000;
export class FlushMetrics {
 constructor(names){this.tables=Object.fromEntries(names.map(name=>[name,{rowsPerFlush:0,maxRowsPerFlush:0,totalRows:0,writeMs:0,maxWriteMs:0,columnsPerFlush:0,refreshRows:0,maxRefreshRows:0}]));this.last={rowsPerFlush:0,maxRowsPerFlush:0,commitMs:0,maxCommitMs:0,refreshMs:0,maxRefreshMs:0,writeMs:0,maxWriteMs:0,observedFlushes:0};this.recent=[];}
 begin(){return {tables:Object.create(null)};}
 write(sample,name,columns,run){const at=performance.now();const result=run();const r=sample.tables[name]??={rows:0,columns:0,ms:0};const rows=Number(result.changes??0);r.rows+=rows;r.columns+=rows*columns;r.ms+=performance.now()-at;return result;}
 wrote(sample,name,rows,columns,ms){const r=sample.tables[name]??={rows:0,columns:0,ms:0};r.rows+=Number(rows??0);r.columns+=Number(rows??0)*columns;r.ms+=ms;}
 finish(sample,{commitMs=0,refreshMs=0,touched={}}={}){
  if(!Object.keys(sample.tables).length&&!Object.values(touched).some(Boolean))return;
  commitMs+=refreshMs;
  let rows=0,writeMs=0;
  for(const [name,t]of Object.entries(this.tables)){const r=sample.tables[name]??{rows:0,columns:0,ms:0};t.rowsPerFlush=r.rows;t.totalRows+=r.rows;t.maxRowsPerFlush=Math.max(t.maxRowsPerFlush,r.rows);t.columnsPerFlush=r.columns;t.writeMs=round(r.ms);t.maxWriteMs=Math.max(t.maxWriteMs,t.writeMs);t.refreshRows=touched[name]??0;t.maxRefreshRows=Math.max(t.maxRefreshRows,t.refreshRows);rows+=r.rows;writeMs+=r.ms;}
  Object.assign(this.last,{rowsPerFlush:rows,writeMs:round(writeMs),commitMs:round(commitMs),refreshMs:round(refreshMs)});
  for(const [a,b]of [['maxRowsPerFlush','rowsPerFlush'],['maxWriteMs','writeMs'],['maxCommitMs','commitMs'],['maxRefreshMs','refreshMs']])this.last[a]=Math.max(this.last[a],this.last[b]);
  this.last.observedFlushes++;
  this.recent.push({at:Date.now(),rows,writeMs:round(writeMs),commitMs:round(commitMs),refreshMs:round(refreshMs),tables:Object.fromEntries(Object.entries(this.tables).filter(([,r])=>r.rowsPerFlush||r.refreshRows).map(([n,r])=>[n,{rows:r.rowsPerFlush,columns:r.columnsPerFlush,writeMs:r.writeMs,refreshRows:r.refreshRows}]))});if(this.recent.length>16)this.recent.shift();
 }
 snapshot(){return {...this.last,tables:Object.fromEntries(Object.entries(this.tables).map(([n,r])=>[n,{...r}])),recentFlushes:this.recent.map(r=>({...r}))};}
}
