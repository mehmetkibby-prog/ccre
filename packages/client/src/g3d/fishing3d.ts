import * as THREE from 'three';

/**
 * Balık tutan oyuncunun oltası: elde ince olta kamışı, uçtan suya sarkan misina ve suda sallanan kırmızı-beyaz
 * şamandıra. Bütün oyuncular görür (sunucu FISHING bayrağı). Malzeme ve geometri paylaşılır; oyuncu başına 3 küçük ağ.
 */
const rodMat = new THREE.MeshStandardMaterial({ color: 0x6a4524, roughness: 0.7 });
const rodGeo = new THREE.CylinderGeometry(0.012, 0.028, 1, 6).translate(0, 0.5, 0);
const lineMat = new THREE.LineBasicMaterial({ color: 0xf2f2ea, transparent: true, opacity: 0.85 });
const bobGeo = new THREE.SphereGeometry(0.075, 10, 8);
const bobTop = new THREE.MeshStandardMaterial({ color: 0xe23b2e, roughness: 0.5 });
const bobBot = new THREE.MeshStandardMaterial({ color: 0xf6f6f0, roughness: 0.5 });
const ringGeo = new THREE.RingGeometry(0.12, 0.16, 20).rotateX(-Math.PI / 2);
const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4, depthWrite: false });
const N = 10;
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _q = new THREE.Quaternion(), _up = new THREE.Vector3(0, 1, 0);

export class FishGear {
  obj = new THREE.Group();
  private rod = new THREE.Mesh(rodGeo, rodMat);
  private line: THREE.Line;
  private bob = new THREE.Group();
  private ring = new THREE.Mesh(ringGeo, ringMat);
  constructor() {
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    this.line = new THREE.Line(g, lineMat); this.line.frustumCulled = false;
    const top = new THREE.Mesh(bobGeo, bobTop); top.scale.set(1, 0.6, 1); top.position.y = 0.03;
    const bot = new THREE.Mesh(bobGeo, bobBot); bot.scale.set(1, 0.6, 1); bot.position.y = -0.03;
    this.bob.add(top, bot);
    this.rod.castShadow = true;
    this.obj.add(this.rod, this.line, this.bob, this.ring);
    this.obj.name = 'fishgear';
  }
  /** Dünya koordinatlarında (metre): el, yüz yönü ve şamandıranın düşeceği su noktası. */
  update(hand: THREE.Vector3, water: THREE.Vector3, waterY: number, now: number) {
    const t = now / 1000;
    // kamış: elden suya doğru, yukarı kalkık
    _a.set(water.x - hand.x, 0, water.z - hand.z); const hl = _a.length() || 1; _a.multiplyScalar(1 / hl);
    const tip = _b.copy(hand).addScaledVector(_a, 1.05).add(_up.clone().multiplyScalar(1.15 + Math.sin(t * 1.3) * 0.03));
    const dir = tip.clone().sub(hand); const len = dir.length();
    this.rod.position.copy(hand); this.rod.scale.set(1, len, 1);
    this.rod.quaternion.copy(_q.setFromUnitVectors(_up, dir.normalize()));
    // şamandıra: su yüzeyinde hafif inip kalkar
    const by = waterY + 0.02 + Math.sin(t * 2.6) * 0.025;
    this.bob.position.set(water.x, by, water.z);
    this.ring.position.set(water.x, waterY + 0.01, water.z);
    const k = (t * 0.7) % 1; this.ring.scale.setScalar(0.6 + k * 1.6); ringMat.opacity = 0.45 * (1 - k);
    // misina: uçtan şamandıraya hafif sarkarak
    const p = this.line.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < N; i++) {
      const u = i / (N - 1), sag = Math.sin(u * Math.PI) * 0.35;
      p.setXYZ(i, tip.x + (water.x - tip.x) * u, tip.y + (by + 0.05 - tip.y) * u - sag, tip.z + (water.z - tip.z) * u);
    }
    p.needsUpdate = true;
  }
}
