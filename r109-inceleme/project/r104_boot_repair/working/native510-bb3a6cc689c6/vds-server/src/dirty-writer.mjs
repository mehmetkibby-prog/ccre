// Compile a changed-column shape once per connection, then reuse it. Keys and
// columns come only from the runtime schema/allowlist, never client input.
const quote=s=>'"'+s.replaceAll('"','""')+'"';
export function dirtyWriter(prepare,{table,keys,fields,columns=fields,guard='',insert=false}){
 const updates=new Map(),where=keys.map(k=>quote(k)+'=?').join(' AND ')+guard;
 const mutable=fields.filter(k=>!keys.includes(k));
 const add=insert?prepare(`INSERT INTO ${table}(${columns.map(quote).join(',')}) VALUES(${columns.map(()=>'?').join(',')}) ON CONFLICT(${keys.map(quote).join(',')}) DO UPDATE SET ${mutable.map(k=>quote(k)+'=excluded.'+quote(k)).join(',')}`):null;
 const remove=prepare(`DELETE FROM ${table} WHERE ${keys.map(k=>quote(k)+'=?').join(' AND ')}`);
 return {
  updates,
  write(current,base,keyValues,guardValues=[]){
   if(!current)return {result:base?remove.run(...keyValues):{changes:0},columns:0};
   if(!base&&add)return {result:add.run(...columns.map(k=>current[k])),columns:columns.length};
   const changed=[];for(const field of mutable)if(!base||current[field]!==base[field])changed.push(field);
   if(!changed.length)return {result:{changes:0},columns:0};
   const shape=changed.join(',');let statement=updates.get(shape);
   if(!statement){statement=prepare(`UPDATE ${table} SET ${changed.map(k=>quote(k)+'=?').join(',')} WHERE ${where}`);updates.set(shape,statement);}
   return {result:statement.run(...changed.map(k=>current[k]),...keyValues,...guardValues),columns:changed.length};
  },
 };
}
