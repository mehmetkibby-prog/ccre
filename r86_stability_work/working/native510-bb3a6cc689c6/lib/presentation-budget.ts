type TextEffect={life:number};
type Missile=TextEffect&{x:number;y:number;tx:number;ty:number;local?:boolean};
export type EffectViewport={x:number;y:number;width:number;height:number};
export function appendPresentationText<T extends TextEffect>(list:T[],text:T,visible:boolean) {
 if(!visible){text.life=0;return false;}
 if(list.length>=256){for(const old of list.splice(0,list.length-255))old.life=0;}
 list.push(text);return true;
}
function pathVisible(p:Missile,view:EffectViewport) {
 if(!view.width||!view.height)return true;
 const left=view.x-view.width/2-160,right=view.x+view.width/2+160;
 const top=view.y-view.height/2-160,bottom=view.y+view.height/2+160;
 return Math.max(p.x,p.tx)>=left&&Math.min(p.x,p.tx)<=right&&Math.max(p.y,p.ty)>=top&&Math.min(p.y,p.ty)<=bottom;
}
export function admitProjectile<T extends Missile>(list:T[],projectile:T,visible:boolean,view:EffectViewport) {
 if(!visible||projectile.life<=0)return false;
 // An admitted visible flight is never evicted by a newer remote effect.
 // Reserve sixteen of the bounded pool for the local player's attacks.
 const limit=projectile.local?128:112;
 if(list.length>=limit){
  for(let i=list.length-1;i>=0&&list.length>=limit;i--)
   if(list[i].life<=0||(!list[i].local&&!pathVisible(list[i],view)))list.splice(i,1);
 }
 if(list.length>=limit)return false;
 list.push(projectile);return true;
}
