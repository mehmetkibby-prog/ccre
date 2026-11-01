export const WHEEL_SPIN_MS=7200;
export function wheelRotation(start,index,count){const step=360/count,target=(360-index*step)%360;return start+8*360+(target-start%360+360)%360;}
// Same ease-out cubic as CSS cubic-bezier(1/3,1,2/3,1). One tick per separator.
export function wheelTickTimes(start,end,count,duration=WHEEL_SPIN_MS){
 const step=360/count,times=[];
 for(let boundary=(Math.floor(start/step+.5)+.5)*step;boundary<end;boundary+=step){const fraction=(boundary-start)/(end-start);if(fraction>0&&fraction<1)times.push(duration*(1-Math.cbrt(1-fraction)));}
 return times;
}
