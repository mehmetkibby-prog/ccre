import React from 'react';

/** El çizimi SVG arayüz ikonları (dış kaynak yok). */
const G = (p: { children: React.ReactNode; size?: number }) => (
  <svg viewBox="0 0 48 48" width={p.size ?? 38} height={p.size ?? 38} fill="none" strokeLinecap="round" strokeLinejoin="round">{p.children}</svg>
);
const gold = '#f0cf78', dark = '#1a120a';

export function ClassIcon({ cls, size = 30 }: { cls: string; size?: number }) {
  if (cls === 'guardian') return <G size={size}><path d="M24 6 L38 11 V23 C38 32 31 39 24 42 C17 39 10 32 10 23 V11 Z" fill="#8fa6c2" stroke={dark} strokeWidth="2.5" /><path d="M24 12 V36 M15 21 H33" stroke="#c8414f" strokeWidth="3.5" /></G>;
  if (cls === 'hunter') return <G size={size}><path d="M12 40 C30 34 36 18 30 6" stroke="#b07a44" strokeWidth="4" /><path d="M12 40 L30 6" stroke="#eee" strokeWidth="1.5" /><path d="M8 26 L38 20" stroke="#6a4426" strokeWidth="3" /><path d="M38 20 L32 16 M38 20 L33 24" stroke="#ddd" strokeWidth="2.5" /></G>;
  return <G size={size}><path d="M14 42 L30 14" stroke="#7a4a2a" strokeWidth="4" /><circle cx="32" cy="11" r="7" fill="#7cf3ff" stroke={dark} strokeWidth="2" /><circle cx="30" cy="9" r="2" fill="#fff" /></G>;
}

export function SkillIcon({ id }: { id: string }) {
  switch (id) {
    case 'g_basic': return <G><path d="M10 38 L34 10 L38 14 L14 42 Z" fill="#dfe6ee" stroke={dark} strokeWidth="2" /><path d="M9 33 L17 41 M12 40 L7 45" stroke={gold} strokeWidth="3.5" /></G>;
    case 'g_pull': return <G><circle cx="12" cy="24" r="5" stroke="#b8c0c8" strokeWidth="3" /><circle cx="22" cy="24" r="5" stroke="#b8c0c8" strokeWidth="3" /><circle cx="32" cy="24" r="5" stroke="#b8c0c8" strokeWidth="3" /><path d="M38 16 L44 24 L38 32" stroke={gold} strokeWidth="3.5" /></G>;
    case 'g_dash': return <G><path d="M24 6 L36 11 V22 C36 30 30 36 24 39 C18 36 12 30 12 22 V11 Z" fill="#8fa6c2" stroke={dark} strokeWidth="2" /><path d="M4 18 H10 M2 26 H10 M4 34 H10" stroke="#ffd27a" strokeWidth="3" /></G>;
    case 'g_steel': return <G><circle cx="24" cy="24" r="16" fill="#9fd8ff" fillOpacity=".3" stroke="#9fd8ff" strokeWidth="3" /><path d="M24 12 V36 M12 24 H36" stroke={gold} strokeWidth="3" /></G>;
    case 'g_judge': return <G><path d="M24 4 L28 30 H20 Z" fill="#ffe680" stroke={dark} strokeWidth="2" /><path d="M8 40 Q24 28 40 40" stroke="#ff9a3a" strokeWidth="4" /></G>;
    case 'h_basic': return <G><path d="M8 40 L36 12" stroke="#7a5232" strokeWidth="3.5" /><path d="M36 12 L28 12 M36 12 L36 20" stroke="#dfe6ee" strokeWidth="3.5" /><path d="M8 40 L4 36 M8 40 L12 44" stroke="#e65b5b" strokeWidth="3" /></G>;
    case 'h_multi': return <G>{[0, 1, 2].map((i) => <path key={i} d={`M${8 + i * 6} 40 L${30 + i * 6} 10`} stroke="#9dff6a" strokeWidth="3" />)}</G>;
    case 'h_pierce': case 'h_root': return <G><path d="M6 24 H40" stroke="#7a5232" strokeWidth="3.5" /><path d="M42 24 L34 18 V30 Z" fill="#dfe6ee" /><path d="M12 34 Q16 40 24 38 Q30 42 36 36" stroke="#5aa040" strokeWidth="3" /></G>;
    case 'h_dawn': return <G><circle cx="24" cy="24" r="10" fill="#ffe680" /><path d="M6 24 H42" stroke="#fff6c2" strokeWidth="3" /></G>;
    case 'a_basic': return <G><circle cx="24" cy="24" r="10" fill="#7cf3ff" stroke={dark} strokeWidth="2" /><circle cx="21" cy="21" r="3" fill="#fff" /></G>;
    case 'a_nova': return <G><circle cx="24" cy="24" r="16" stroke="#b28bff" strokeWidth="4" /><circle cx="24" cy="24" r="7" fill="#e4d4ff" /></G>;
    case 'a_frost': return <G><path d="M24 6 V42 M8 15 L40 33 M40 15 L8 33" stroke="#bff6ff" strokeWidth="3.5" /></G>;
    case 'a_burst': return <G><path d="M24 4 L28 18 L42 14 L32 26 L42 38 L26 32 L20 44 L18 30 L6 32 L14 22 L6 10 L20 16 Z" fill="#c58bff" stroke={dark} strokeWidth="2" /></G>;
    case 'a_wave': return <G><path d="M6 30 Q14 20 24 30 Q34 40 42 30" stroke="#7dffb0" strokeWidth="4" /><path d="M24 8 V22 M17 15 H31" stroke="#7dffb0" strokeWidth="3.5" /></G>;
    default: return <G><circle cx="24" cy="24" r="12" stroke={gold} strokeWidth="3" /></G>;
  }
}

export function MenuIcon({ k }: { k: string }) {
  const p: Record<string, React.ReactNode> = {
    admin: <><path d="M10 34 L8 16 L17 24 L24 10 L31 24 L40 16 L38 34 Z" fill="#e8b838" stroke={dark} strokeWidth="2" /><rect x="10" y="35" width="28" height="6" rx="2" fill="#c8962e" stroke={dark} strokeWidth="2" /></>,
    bag: <><path d="M12 18 H36 L34 42 H14 Z" fill="#a07040" stroke={dark} strokeWidth="2" /><path d="M18 18 C18 8 30 8 30 18" stroke="#d8b25a" strokeWidth="3" /></>,
    char: <><circle cx="24" cy="15" r="8" fill="#e8c8a0" stroke={dark} strokeWidth="2" /><path d="M10 42 C10 28 38 28 38 42 Z" fill="#6a8ab0" stroke={dark} strokeWidth="2" /></>,
    skills: <><path d="M24 6 L29 18 L42 19 L32 27 L35 40 L24 33 L13 40 L16 27 L6 19 L19 18 Z" fill="#f0c860" stroke={dark} strokeWidth="2" /></>,
    map: <><path d="M6 12 L18 8 L30 12 L42 8 V36 L30 40 L18 36 L6 40 Z" fill="#d8c8a0" stroke={dark} strokeWidth="2" /><path d="M18 8 V36 M30 12 V40" stroke="#8a7a50" strokeWidth="2" /></>,
    tp: <><ellipse cx="24" cy="38" rx="14" ry="4" fill="#3ef09a" opacity=".5" /><path d="M16 38 V14 Q24 2 32 14 V38" stroke="#7cf3ff" strokeWidth="3.5" /></>,
    gear: <><circle cx="24" cy="24" r="8" stroke="#c8c0b0" strokeWidth="4" /><path d="M24 6 V12 M24 36 V42 M6 24 H12 M36 24 H42 M11 11 L15 15 M33 33 L37 37 M37 11 L33 15 M15 33 L11 37" stroke="#c8c0b0" strokeWidth="4" /></>,
    potion: <><path d="M20 6 H28 V14 C36 18 38 26 36 32 C34 40 14 40 12 32 C10 26 12 18 20 14 Z" fill="#ff4d5a" stroke={dark} strokeWidth="2" /><ellipse cx="19" cy="24" rx="3" ry="6" fill="#fff" opacity=".6" /></>,
    pick: <><path d="M10 30 L24 16 L38 30" stroke={gold} strokeWidth="4" /><path d="M24 16 V42" stroke={gold} strokeWidth="4" /></>,
    camera: <><rect x="6" y="14" width="36" height="24" rx="4" fill="#4a3a2a" stroke={gold} strokeWidth="2.5" /><path d="M16 14 L19 9 H29 L32 14" fill="#4a3a2a" stroke={gold} strokeWidth="2.5" /><circle cx="24" cy="26" r="7" fill="#1a1410" stroke="#c8c0b0" strokeWidth="2.5" /><circle cx="26" cy="24" r="2" fill="#fff" opacity=".7" /></>,
    chat: <><path d="M8 10 H40 V32 H22 L12 40 V32 H8 Z" fill="#2a3a2a" stroke={gold} strokeWidth="2.5" /></>,
    exit: <><path d="M20 8 H8 V40 H20" stroke="#c8c0b0" strokeWidth="3.5" /><path d="M18 24 H42 M34 16 L42 24 L34 32" stroke="#ff8a7a" strokeWidth="3.5" /></>,
  };
  return <G size={26}>{p[k]}</G>;
}
