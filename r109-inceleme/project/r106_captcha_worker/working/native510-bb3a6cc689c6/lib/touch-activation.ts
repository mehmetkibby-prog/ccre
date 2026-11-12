export class TouchActivation {
  private touch:{id:number;x:number;y:number;cancelled:boolean}|null=null;
  private lastTouch=-Infinity;
  down(id:number,x:number,y:number){if(!this.touch)this.touch={id,x,y,cancelled:false};}
  move(id:number,x:number,y:number){const t=this.touch;if(t?.id===id&&Math.hypot(x-t.x,y-t.y)>10)t.cancelled=true;}
  cancel(id:number,time:number){if(this.touch?.id===id){this.touch=null;this.lastTouch=time;}}
  up(id:number,x:number,y:number,time:number){const t=this.touch;if(t?.id!==id)return false;this.touch=null;this.lastTouch=time;return !t.cancelled&&Math.hypot(x-t.x,y-t.y)<=10;}
  acceptsClick(detail:number,time:number){return detail===0||time-this.lastTouch>=800;}
}
