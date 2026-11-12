// The dirty set owns its oldest timestamp. Deleting/advancing that entry can
// leave a conservative lower bound, recomputed only when it could be overdue.
// New or requeued earlier generations lower the bound immediately through set.
export class CombatDirtyMap extends Map {
 constructor(){super();this.resetOldest();}
 resetOldest(){this.oldestAt=Infinity;this.oldestKey=null;this.oldestEntry=null;}
 set(key,value){
  super.set(key,value);const at=value.e.dirtyAt;
  if(at<=this.oldestAt){this.oldestAt=at;this.oldestKey=key;this.oldestEntry=value.e;}
  return this;
 }
 refresh(key){const value=this.get(key);if(value)this.set(key,value);}
 clear(){super.clear();this.resetOldest();}
 overdue(now,maxAge=1000){
  if(!(now-this.oldestAt>=maxAge))return false;
  const first=this.get(this.oldestKey);
  if(first?.e===this.oldestEntry&&first.e.dirtyAt===this.oldestAt)return true;
  this.resetOldest();
  for(const [key,value]of this){const at=value.e.dirtyAt;if(at<this.oldestAt){this.oldestAt=at;this.oldestKey=key;this.oldestEntry=value.e;}}
  return now-this.oldestAt>=maxAge;
 }
}
