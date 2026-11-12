export const STATUS_CAP=64;
export const STATUS_FIELDS=['attack','defense','hp'];
export const STATUS_TYPES={attack:{label:'Güç',effect:'Saldırı',color:'#ff8c86',icon:'sword'},defense:{label:'Direnç',effect:'Savunma',color:'#85bdff',icon:'shield'},hp:{label:'Canlılık',effect:'Maksimum can',color:'#7ae8b4',icon:'heart'}};
export function defaultStatusConfig(){return {enabled:true,attack:10,defense:10,hp:12};}
export function validateStatusConfig(input){
 if(!input||typeof input.enabled!=='boolean')throw Error('Statü ayarı geçersiz.');
 const out={enabled:input.enabled};for(const k of STATUS_FIELDS){const n=input[k];if(typeof n!=='number'||!Number.isFinite(n)||n<0||n>30)throw Error('Statü bonusları %0–30 arasında olmalı.');out[k]=Math.round(n*100)/100;}return out;
}
export function statusBudget(level){return Math.max(0,Math.min(65,Math.floor(Number(level)||1))-1)*3;}
export function statusBonus(player,stat,config){
 if(!config?.enabled||!player)return 0;
 const a=Math.max(0,Math.min(64,Number(player.stat_attack)||0)),d=Math.max(0,Math.min(64,Number(player.stat_defense)||0)),h=Math.max(0,Math.min(64,Number(player.stat_hp)||0));
 const sum=a+d+h,ratio=Math.min(1,statusBudget(player.level)/Math.max(1,sum));
 return (stat==='attack'?a:stat==='defense'?d:h)*ratio/64*(Number(config[stat])||0)/100;
}
export function validateStatusPoints(input,level){
 const out={};for(const k of STATUS_FIELDS){const n=input?.[k];if(!Number.isInteger(n)||n<0||n>64)throw Error('Her statü 0–64 tam puan olmalı.');out[k]=n;}
 if(out.attack+out.defense+out.hp>statusBudget(level))throw Error('Yeterli statü puanın yok.');return out;
}
