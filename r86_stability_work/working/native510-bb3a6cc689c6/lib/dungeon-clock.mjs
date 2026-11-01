// Network snapshots anchor deadlines; only the monotonic game clock advances them.
// Repeated packets must never restart a cooldown or a character animation.
export class DungeonClock {
  deadlines = [0, 0, 0];
  serverDeadlines = [0, 0, 0];
  predictions = new Map();
  accept(deadlines, serverTime, now, ack=0, latency=0) {
    for (let i=0;i<3;i++) {
      const predicted=this.predictions.get(i);
      if (predicted && ack < predicted.sequence) continue;
      if (predicted || deadlines[i] !== this.serverDeadlines[i]) {
        this.deadlines[i]=deadlines[i]>0 ? now+Math.max(0,deadlines[i]-serverTime-latency) : 0;
        this.serverDeadlines[i]=deadlines[i];
        this.predictions.delete(i);
      }
    }
  }
  reserve(skill, duration, sequence, now) {
    this.deadlines[skill]=now+Math.max(120,duration);
    this.predictions.set(skill,{sequence});
  }
}
