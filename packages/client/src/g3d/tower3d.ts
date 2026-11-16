import * as THREE from 'three';
import { TUNING, TOWER_FLOORS, SEQ_COLORS, towerRoom, type MapLayout } from '@col/shared';
import { U } from './terrain.ts';
import { glowTexture } from './textures.ts';
import { store, type TowerView } from '../game/store.ts';

/**
 * Kadim Kule 3B öğeleri: her katın kapısı (taş kemer + portal), bulmaca taşları (mühür, bilge taş, sunak)
 * ve kapı üstünde kat yazısı. Kapı ve taşların durumu yalnız bu oyuncunun kat ilerlemesine göre parlar.
 */
interface Gate { f: number; portal: THREE.Mesh; mat: THREE.MeshBasicMaterial; glow: THREE.Sprite; light: THREE.PointLight | null }
interface Plate { f: number; i: number; kind: string; ring: THREE.Mesh; rmat: THREE.MeshBasicMaterial; glow: THREE.Sprite; flame?: THREE.Sprite; label?: THREE.Sprite; labelText?: string }

const textSprite = (text: string, color = '#ffe8b0', size = 64) => {
  const c = document.createElement('canvas'); c.width = 512; c.height = 128;
  const x = c.getContext('2d')!;
  x.font = `800 ${size}px Georgia, serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.lineWidth = 10; x.strokeStyle = 'rgba(10,6,20,.85)'; x.strokeText(text, 256, 66);
  x.fillStyle = color; x.fillText(text, 256, 66);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, fog: false }));
  sp.scale.set(4, 1, 1); sp.renderOrder = 5;
  return sp;
};

export class TowerFx {
  group = new THREE.Group();
  private gates: Gate[] = [];
  /** mühür sırası: kat sahnesi ilk kez çizildiğinde (ve kat değişince) gösterimi başlat */
  private shownFor = '';
  private plates: Plate[] = [];
  private stoneMat = new THREE.MeshStandardMaterial({ color: 0x6a6478, roughness: 0.85, metalness: 0.05 });
  private darkMat = new THREE.MeshStandardMaterial({ color: 0x2a2634, roughness: 0.9 });

  constructor(l: MapLayout, private heightAt: (x: number, y: number) => number) {
    void l;
    const pillarG = new THREE.CylinderGeometry(0.42, 0.55, 4.2, 8);
    const lintelG = new THREE.BoxGeometry(4.6, 0.7, 0.9);
    const portalG = new THREE.CircleGeometry(1.55, 32);
    const plateG = new THREE.CylinderGeometry(1.0, 1.15, 0.22, 24);
    const ringG = new THREE.RingGeometry(0.62, 0.86, 32); ringG.rotateX(-Math.PI / 2);
    const altarG = new THREE.CylinderGeometry(0.6, 0.85, 1.1, 8);
    for (let f = 1; f <= TOWER_FLOORS; f++) {
      const ft = TUNING.tower.floors[f - 1];
      const room = towerRoom(f, ft?.puzzle);
      // kapı: iki taş sütun, üst taş, arada portal
      const gx = room.gate.x * U, gz = room.gate.y * U, gy = this.heightAt(room.gate.x, room.gate.y);
      const arch = new THREE.Group(); arch.position.set(gx, gy, gz - 0.4);
      for (const s of [-1, 1]) { const p = new THREE.Mesh(pillarG, this.stoneMat); p.position.set(s * 1.9, 2.1, 0); p.castShadow = true; arch.add(p); }
      const lt = new THREE.Mesh(lintelG, this.stoneMat); lt.position.set(0, 4.45, 0); lt.castShadow = true; arch.add(lt);
      const mat = new THREE.MeshBasicMaterial({ color: 0x601020, transparent: true, opacity: 0.75, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
      const portal = new THREE.Mesh(portalG, mat); portal.position.set(0, 2.05, 0); portal.scale.set(1, 1.25, 1); arch.add(portal);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xff3040, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.5, fog: false }));
      glow.scale.set(6, 6, 1); glow.position.set(0, 2.1, 0.2); arch.add(glow);
      const label = textSprite(f === TOWER_FLOORS ? 'ZİRVE' : `${f}. KAT`, f === TOWER_FLOORS ? '#ff8a9a' : '#bff6ee', 70);
      label.position.set(0, 5.6, 0); arch.add(label);
      this.group.add(arch);
      this.gates.push({ f, portal, mat, glow, light: null });
      // bulmaca taşları
      room.plates.forEach((pp, i) => {
        const x = pp.x * U, z = pp.y * U, y = this.heightAt(pp.x, pp.y);
        const kind = ft?.puzzle ?? 'kill';
        const g = new THREE.Group(); g.position.set(x, y, z);
        if (kind === 'altar') {
          const a = new THREE.Mesh(altarG, this.darkMat); a.position.y = 0.55; a.castShadow = true; g.add(a);
        } else {
          const b = new THREE.Mesh(plateG, this.darkMat); b.position.y = 0.06; b.receiveShadow = true; g.add(b);
        }
        const col = kind === 'seq' ? SEQ_COLORS[i] : kind === 'altar' ? '#ff9a3a' : '#ffd27a';
        const rmat = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, side: THREE.DoubleSide });
        const ring = new THREE.Mesh(ringG, rmat); ring.position.y = kind === 'altar' ? 1.13 : 0.19; g.add(ring);
        const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: col, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.35, fog: false }));
        gl.scale.set(3, 1.4, 1); gl.position.y = kind === 'altar' ? 1.2 : 0.3; g.add(gl);
        const plate: Plate = { f, i, kind, ring, rmat, glow: gl };
        if (kind === 'altar') {
          const fl = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xff8a20, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0, fog: false }));
          fl.scale.set(1.4, 2.4, 1); fl.position.y = 1.9; g.add(fl); plate.flame = fl;
        }
        this.group.add(g);
        this.plates.push(plate);
      });
    }
  }

  /** Her kare: kendi katının kapısı/taşları oyuncunun durumuna göre. */
  update(now: number, t: TowerView | null, hold: { i: number; at: number } | null, seqShowAt: number) {
    const tt = now / 1000;
    const key = t && t.puzzle === 'seq' && !t.done ? `${t.f}` : '';
    if (key && key !== this.shownFor) { this.shownFor = key; store.set({ towerSeqAt: performance.now() + 1500 }); }
    else if (!key) this.shownFor = '';
    for (const g of this.gates) {
      const mine = t && t.f === g.f;
      const open = !!(mine && t!.done);
      const c = open ? 0x40fff0 : 0x701022;
      g.mat.color.setHex(c); (g.glow.material as THREE.SpriteMaterial).color.setHex(open ? 0x40ffe0 : 0xff3040);
      g.mat.opacity = open ? 0.85 + Math.sin(tt * 4) * 0.1 : 0.45 + Math.sin(tt * 1.5) * 0.08;
      (g.glow.material as THREE.SpriteMaterial).opacity = open ? 0.8 + Math.sin(tt * 3) * 0.15 : 0.35;
      g.portal.rotation.z = tt * (open ? 1.4 : 0.3);
    }
    for (const p of this.plates) {
      const mine = t && t.f === p.f && !t.done;
      let op = 0.45, scale = 1;
      if (p.kind === 'seq' && mine && t!.seq) {
        // gösterim: taşlar sırayla 0,9 sn aralıkla parlar
        const k = Math.floor((now - seqShowAt) / 900);
        if (seqShowAt && k >= 0 && k < t!.seq.length && t!.seq[k] === p.i) { op = 1; scale = 1.25 + Math.sin(tt * 18) * 0.05; }
        else op = 0.4 + Math.sin(tt * 2 + p.i) * 0.08;
      } else if (p.kind === 'altar') {
        const lit = !!(t && t.f === p.f && ((t.alt >> p.i) & 1));
        const holding = !!(mine && hold && hold.i === p.i);
        op = lit ? 1 : holding ? 0.6 + 0.4 * Math.min(1, (performance.now() - hold!.at) / 3000) : 0.35;
        if (p.flame) (p.flame.material as THREE.SpriteMaterial).opacity = lit ? 0.85 + Math.sin(tt * 11 + p.i) * 0.12 : holding ? 0.3 : 0;
        if (p.flame && lit) p.flame.scale.set(1.4 + Math.sin(tt * 9) * 0.1, 2.4 + Math.sin(tt * 13) * 0.25, 1);
      } else if (p.kind === 'riddle') {
        op = mine ? 0.55 + Math.sin(tt * 2.2 + p.i) * 0.1 : 0.25;
        const text = mine && t!.riddle ? t!.riddle.opts[p.i] ?? '' : '';
        if (text !== (p.labelText ?? '')) {
          if (p.label) { p.ring.parent!.remove(p.label); (p.label.material as THREE.SpriteMaterial).map?.dispose(); p.label.material.dispose(); p.label = undefined; }
          if (text) { p.label = textSprite(text, '#ffe8b0', 58); p.label.position.y = 2.2; p.label.scale.set(3.6, 0.9, 1); p.ring.parent!.add(p.label); }
          p.labelText = text;
        }
      } else if (!mine) op = 0.2;
      p.rmat.opacity = op; (p.glow.material as THREE.SpriteMaterial).opacity = op * 0.6;
      p.ring.scale.setScalar(scale);
      p.ring.rotation.y = tt * 0.6;
    }
  }

  dispose() {
    this.group.traverse((o) => { const m = o as THREE.Mesh; if (m.geometry) m.geometry.dispose(); });
    this.stoneMat.dispose(); this.darkMat.dispose();
  }
}
