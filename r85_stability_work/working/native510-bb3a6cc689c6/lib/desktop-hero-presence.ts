// Subtle body motion shares the weapon/rod transform and stays anchored at the feet.
// The mobile and reduced-motion paths remain exactly neutral.
export function desktopHeroPresence(now:number,seed:number,enabled:boolean,moving:boolean,attacking:boolean,defeated:boolean){
 if(!enabled||moving||attacking||defeated)return {breath:0,sway:0};
 return {breath:Math.sin(now/920+seed*.17)*.82,sway:Math.sin(now/1540+seed*.11)*.8};
}
