// Entity rows are already authoritative, recipient-scoped projections.
// undefined means use the unchanged legacy algorithm; null means no change.
// Keep duplicate-ID semantics on the legacy path. Inputs are never modified.
export function diffWorldRowsLinear(previous,next,idKey,equal){
 if(!Array.isArray(previous)||!Array.isArray(next)||previous.length+next.length<16)return undefined;
 const before=new Map();
 for(const row of previous){if(!row||typeof row!=='object')return undefined;const id=String(row[idKey]);if(before.has(id))return undefined;before.set(id,row);}
 const seen=new Set(),upsert=[],remove=[],expected=[],added=[];
 for(const row of next){
  if(!row||typeof row!=='object')return undefined;
  const value=row[idKey],id=String(value);if(seen.has(id))return undefined;seen.add(id);expected.push(value);
  const old=before.get(id);before.delete(id);
  if(old===row)continue;
  if(!old){upsert.push(row);added.push(value);continue;}
  const patch={[idKey]:value};let changed=false;
  for(const field of Object.keys(row))if(!equal(old[field],row[field])){patch[field]=row[field];changed=true;}
  if(changed)upsert.push(patch);
 }
 for(const row of before.values())remove.push(row[idKey]);
 // The legacy client retains surviving old-row order and appends new IDs.
 // Compare that order directly, without removed/existing Sets or filter/map
 // and applied-order arrays. ID comparison intentionally remains strict here.
 let at=0,reordered=false;
 for(const row of previous)if(!before.has(String(row[idKey]))){if(expected[at]!==row[idKey])reordered=true;at++;}
 for(const id of added){if(expected[at]!==id)reordered=true;at++;}
 if(at!==expected.length)reordered=true;
 return upsert.length||remove.length||reordered?{upsert,remove,...(reordered?{order:expected}:{})}:null;
}
