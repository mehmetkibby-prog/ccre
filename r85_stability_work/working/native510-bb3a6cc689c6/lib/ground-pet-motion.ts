export type GroundPetFollow = {
  kind: string; x: number; y: number; at: number; facing: number; phase: number;
  ownerX: number; ownerY: number; travel: number; walking: boolean; idleSince: number;
};
// Advance by distance travelled, not by wall-clock time: idle pets keep their feet still.
export function advanceGroundPet(previous: GroundPetFollow | undefined, kind: string,
  ownerX: number, ownerY: number, now: number, airborne = false): GroundPetFollow {
  const reset = !previous || previous.kind !== kind || now - previous.at > 1000
    || Math.hypot(ownerX - previous.ownerX, ownerY - previous.ownerY) > 650;
  if (reset) return {kind,x:ownerX-(airborne?105:94),y:ownerY+(airborne?-65:34),at:now,facing:1,phase:0,
    ownerX,ownerY,travel:0,walking:false,idleSince:now};
  const p = previous!;
  // A fixed trailing offset avoids a 188px target jump on every left/right turn.
  // Limit travel speed even after dropped frames; only actual map teleports reset.
  const side = 1;
  const tx = ownerX-(airborne?105:94), ty = ownerY+(airborne?-65:34);
  const dt = Math.min(80,Math.max(0,now-p.at));
  const lag = Math.hypot(tx-p.x,ty-p.y);
  const distanceLimit = Math.min(lag*(1-Math.exp(-dt/180)),dt*.48);
  const ratio = lag>0 ? distanceLimit/lag : 0;
  const x = p.x+(tx-p.x)*ratio, y = p.y+(ty-p.y)*ratio;
  const distance = Math.hypot(x-p.x,y-p.y);
  const walking = distance>.03 && Math.hypot(tx-p.x,ty-p.y)>.5;
  return {kind,x,y,at:now,facing:Math.abs(x-p.x)>.03?Math.sign(x-p.x):p.facing,
    phase:side,ownerX,ownerY,travel:p.travel+(walking?distance:0),walking,
    idleSince:walking?now:p.walking?now:p.idleSince};
}
export function groundPetFrame(pet: GroundPetFollow) {
  return pet.walking ? Math.floor(pet.travel/18)%5 : 0;
}

// One clock from the existing render loop; no pet timers or extra animation loop.
// Positions and feet never move during idle. Moving cancels the pose immediately.
export function groundPetIdlePose(pet: GroundPetFollow, now: number, seed: number, reducedMotion = false) {
  if (pet.walking || reducedMotion) return {sit:0,shake:0,look:0};
  const elapsed=Math.max(0,now-pet.idleSince);
  const cycle=14500+(seed%7)*600;
  const t=elapsed%cycle, start=2000+(seed%4)*450;
  const ease=(v:number)=>{const x=Math.max(0,Math.min(1,v));return x*x*(3-2*x);};
  const sit=ease((t-start)/400)*(1-ease((t-start-3800)/400));
  const shakeT=t-start-5900;
  const shake=shakeT>0&&shakeT<650?Math.sin(shakeT*.065)*Math.sin(shakeT/650*Math.PI):0;
  const look=sit*Math.sin(Math.max(0,t-start-700)/1300)*.025;
  return {sit,shake,look};
}
