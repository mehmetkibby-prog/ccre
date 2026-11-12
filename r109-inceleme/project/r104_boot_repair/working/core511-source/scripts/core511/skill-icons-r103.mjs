// Static, cached SVG illustrations. These images have no animation or runtime
// filter work on the world canvas; the existing HUD labels stay authoritative.
import {SKILLS_R103} from './skill-visuals-r103.mjs';
const palette={muhafiz:['#ffbf56','#70411c'],avci:['#64f7ba','#124f43'],arkanist:['#bc98ff','#402066']};
const path=(d,fill='url(#metal)',stroke='#f6edce',w=1)=>`<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${w}" stroke-linejoin="round"/>`;
const arrow=(x,y,rotate=0,color='url(#metal)')=>`<g transform="translate(${x} ${y}) rotate(${rotate})">${path('M-24 17 L10 -17 L7 -23 L27 -27 L23 -7 L17 -10 L-17 24 Z',color)}${path('M-25 9 L-15 13 L-10 23 L-24 25 L-27 12 Z','#24566a','#bdf5ff')}</g>`;
const sword=()=>path('M44 76 L76 23 L76 10 L65 15 L35 67 Z')+path('M45 71 L72 19 L40 69 Z','#faffed','none')+path('M27 65 L49 79 L52 72 L31 58 Z','url(#gold)')+path('M29 69 L39 76 L30 90 L22 83 Z','#372a37','#d6a964',2);
const shield=()=>path('M48 15 L73 26 L69 54 Q64 70 48 81 Q31 70 27 54 L23 26 Z','url(#shield)','#f4ce75',2)+path('M48 23 L65 31 L62 53 Q58 65 48 72 Z','#8ed9ec66','#b1ecff',1)+path('M48 29 L55 46 L48 61 L41 46 Z','url(#gold)','#fff3c0',1.4);
const orb=(cx=49,cy=48,r=17)=>`<circle cx="${cx}" cy="${cy}" r="${r*1.8}" fill="url(#aura)"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#orb)" stroke="#f1d9ff" stroke-width="1.5"/>`+path(`M${cx-7} ${cy+10} L${cx+3} ${cy-5} L${cx-2} ${cy-5} L${cx+6} ${cy-14} L${cx+1} ${cy+1} L${cx+7} ${cy+1} Z`,'#fff4ff','none');
function glyph(style){
  switch(style){
    case 'slash':return path('M13 75 Q16 23 79 16 Q48 34 24 79 Z','#ff822b88','#ffcf77',2)+sword();
    case 'chain':return `<g fill="none" stroke="url(#gold)" stroke-width="3">${Array.from({length:5},(_,i)=>`<ellipse cx="${18+i*10}" cy="${78-i*9}" rx="9" ry="5" transform="rotate(-42 ${18+i*10} ${78-i*9})"/>`).join('')}</g><g transform="translate(20 -6) scale(.8)">${shield()}</g>`;
    case 'dash':return path('M8 77 L55 38 L32 42 L82 12 L65 61 L60 43 L20 90 Z','url(#gold)','#fff1be',1)+path('M10 47 L47 24 M10 61 L35 43 M47 83 L82 49','none','#ffac50',3);
    case 'guard':return `<ellipse cx="48" cy="81" rx="34" ry="9" fill="none" stroke="#66d5ff" stroke-width="2"/>`+path('M15 60 L15 33 M81 60 L81 33 M22 22 L24 12 M74 22 L72 12','none','#c5f7ff',2)+shield();
    case 'judgment':return path('M14 86 L23 66 L31 78 L49 57 L59 77 L75 64 L84 87 Z','#ff652a88','#ffc55e',2)+`<g transform="rotate(-31 48 48) translate(3 -5)">${sword()}</g>`;
    case 'arrow':return path('M9 84 Q26 51 73 27 M17 88 Q28 63 51 50','none','#5af8ab',3)+arrow(47,46);
    case 'pierce':return path('M7 87 L82 13 M8 68 Q19 41 47 39 Q76 35 82 11','none','#6debff',3)+arrow(48,46,0)+path('M22 61 L14 58 M39 43 L33 34 M64 21 L61 12','none','#fff9dc',2);
    case 'rain':return `<ellipse cx="48" cy="79" rx="34" ry="10" fill="none" stroke="#5bffc4" stroke-width="2"/><g transform="translate(3 -9) scale(.7)">${arrow(34,51,90)}${arrow(78,37,90)}${arrow(111,65,90)}</g>`+path('M16 20 L30 36 M44 11 L60 28 M69 18 L82 33','none','#c6ffe4',2);
    case 'dawn':return `<circle cx="67" cy="29" r="18" fill="url(#aura)" stroke="#ffdf8c"/><g stroke="#ffe5a2" stroke-width="2">${Array.from({length:8},(_,i)=>`<path transform="rotate(${i*45} 67 29)" d="M67 7 L67 1"/>`).join('')}</g>`+arrow(45,49,0,'url(#gold)')+path('M16 57 L12 34 L37 39 M39 80 L62 84 L58 59','none','#ffdc7b',3);
    case 'root':return path('M20 85 Q4 60 34 53 Q58 46 43 21 M48 89 Q81 76 64 51 Q51 29 80 17','none','#58ec91',5)+path('M28 58 Q4 32 12 30 Q40 31 28 58 M67 56 Q92 34 87 29 Q63 29 67 56','#33b979','#9dffc3',1)+arrow(48,49,0);
    case 'orb':return path('M9 83 Q18 48 55 44 M13 70 Q18 33 59 30','none','#a47dff',3)+orb(57,40,20)+path('M39 34 L26 24 L29 13 M67 54 L78 59 L83 51','none','#f2c6ff',2);
    case 'spear':return path('M9 88 L62 28 L58 20 L85 9 L77 39 L68 35 L14 90 Z','url(#metal)','#d5ffff',1.3)+path('M13 73 Q39 81 40 53 Q38 28 67 34 Q84 34 80 16','none','#63d9ff',3)+path('M21 87 L69 29','none','#ffffff',1.5);
    case 'storm':return `<ellipse cx="48" cy="73" rx="34" ry="12" fill="none" stroke="#ae8dff" stroke-width="3"/>`+path('M49 12 L35 40 L45 40 L32 74 L66 35 L54 35 L66 12 Z','url(#metal)','#efe5ff',1.5)+path('M17 27 L24 43 L15 43 L24 66 M82 26 L73 42 L82 43 L72 67','none','#ac87ff',2);
    case 'nova':return path('M48 6 L54 29 L75 15 L67 36 L91 43 L68 52 L80 76 L57 65 L49 92 L40 67 L16 80 L29 55 L6 46 L29 38 L18 16 L41 29 Z','url(#burst)','#e8bdff',1)+orb(48,47,17);
    case 'heal':return `<ellipse cx="48" cy="78" rx="33" ry="10" fill="none" stroke="#90ffca" stroke-width="2"/>`+path('M48 77 Q11 65 18 36 Q39 34 48 77 M48 77 Q84 65 78 36 Q57 34 48 77 M48 74 Q28 46 48 12 Q69 45 48 74','url(#life)','#d6ffe0',1.5)+path('M48 28 L48 56 M36 42 L60 42','none','#fffbd5',4);
    default:return '';
  }
}
const icons=new Map();
for(const s of SKILLS_R103){
  let [color,dark]=palette[s.role];if(s.style==='heal'){color='#9affc0';dark='#164434';}if(s.style==='dawn'){color='#ffd981';dark='#5a331b';}
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><defs>
    <radialGradient id="bg"><stop stop-color="${dark}"/><stop offset="1" stop-color="#080e16"/></radialGradient>
    <radialGradient id="aura"><stop stop-color="#ffffff" stop-opacity=".8"/><stop offset=".25" stop-color="${color}" stop-opacity=".7"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient>
    <linearGradient id="metal" x2="1" y2="1"><stop stop-color="#fcffff"/><stop offset=".38" stop-color="#d2eeff"/><stop offset=".5" stop-color="#779baa"/><stop offset=".62" stop-color="#f3fff3"/><stop offset="1" stop-color="${color}"/></linearGradient>
    <linearGradient id="gold" x2="1" y2="1"><stop stop-color="#fff3b8"/><stop offset=".5" stop-color="#cf8a30"/><stop offset="1" stop-color="#ffde85"/></linearGradient>
    <linearGradient id="shield" x2="1" y2="1"><stop stop-color="#3ca5cf"/><stop offset=".5" stop-color="#1a354d"/><stop offset="1" stop-color="#0c1826"/></linearGradient>
    <radialGradient id="orb" cx=".35" cy=".3"><stop stop-color="#ffffff"/><stop offset=".3" stop-color="#e2c1ff"/><stop offset=".65" stop-color="#8a46e5"/><stop offset="1" stop-color="#38106f"/></radialGradient>
    <radialGradient id="burst"><stop stop-color="#fff5ff"/><stop offset=".3" stop-color="#e4a9ff"/><stop offset=".65" stop-color="#a766e8"/><stop offset="1" stop-color="#512b7860"/></radialGradient>
    <linearGradient id="life" x2="0" y2="1"><stop stop-color="#edffd0"/><stop offset=".4" stop-color="#68f5bd" stop-opacity=".8"/><stop offset="1" stop-color="#088765" stop-opacity=".25"/></linearGradient>
  </defs><rect width="96" height="96" rx="9" fill="url(#bg)"/><circle cx="49" cy="47" r="43" fill="url(#aura)" opacity=".35"/>
  <path d="M7 24L24 7M72 7L89 24M7 72L24 89M72 89L89 72" fill="none" stroke="${color}" stroke-opacity=".25"/>
  <circle cx="48" cy="48" r="36" fill="none" stroke="${color}" stroke-opacity=".18"/>
  ${glyph(s.style)}
  <g fill="${color}" opacity=".85"><circle cx="12" cy="48" r="1"/><circle cx="83" cy="72" r="1.3"/><circle cx="30" cy="13" r="1"/><circle cx="61" cy="86" r="1.1"/></g>
  <rect x="1" y="1" width="94" height="94" rx="9" fill="none" stroke="${color}" stroke-opacity=".28"/></svg>`;
  icons.set(s.id,'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg));
}
export function skillIconR103(role,slot,branch){return icons.get(slot===3?(typeof branch==='string'?branch:branch?.id):role+'-'+slot);}
export function allSkillIconsR103(){return Object.fromEntries(icons);}
