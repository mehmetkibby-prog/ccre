import {DatabaseSync} from 'node:sqlite';
const db=new DatabaseSync(':memory:');db.exec('CREATE TABLE t(id INTEGER PRIMARY KEY,a TEXT,b INTEGER,c REAL);');
const ins=db.prepare('INSERT INTO t VALUES(?,?,?,?)');for(let i=0;i<1000;i++)ins.run(i,'x'+i,i*2,i/3);
function wrap(st){for(const m of ['get','all','run']){const invoke=st[m];st[m]=function(...b){try{return Reflect.apply(invoke,this,b);}catch(e){throw e;}};}return st;}
const raw=db.prepare('SELECT * FROM t WHERE id=?'),w1=wrap(db.prepare('SELECT * FROM t WHERE id=?')),w3=wrap(wrap(wrap(db.prepare('SELECT * FROM t WHERE id=?'))));
const N=500000;
for(const [name,st] of [['raw',raw],['1 wrap',w1],['3 wraps',w3],['raw',raw],['1 wrap',w1],['3 wraps',w3]]){const t=performance.now();for(let i=0;i<N;i++)st.get(i%1000);console.log(name,((performance.now()-t)*1000/N).toFixed(3),'µs/call');}
