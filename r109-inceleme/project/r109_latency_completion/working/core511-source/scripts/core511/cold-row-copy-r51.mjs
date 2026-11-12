// SQLite result rows contain scalar columns. Remember that property once per
// owned cache entry, after structuredClone has removed accessors/prototypes.
// Every hit still returns independent row objects; nested/BLOB values retain
// the original deep-copy path. This is not a cache-validity decision.
export function flatSqlRowsR51(rows){
 return Array.isArray(rows)&&rows.every(row=>row!==null&&typeof row==='object'&&!Array.isArray(row)&&Object.getPrototypeOf(row)===Object.prototype&&Object.values(row).every(value=>value===null||['string','number','boolean','bigint','undefined'].includes(typeof value)));
}
export const copyFlatSqlRowsR51=rows=>rows.map(row=>({...row}));
