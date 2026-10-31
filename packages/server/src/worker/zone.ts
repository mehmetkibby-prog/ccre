import { getLayout, type MapLayout, type MapDef, MONSTERS, type GameEvent } from '@col/shared';
import { Grid } from './grid.ts';
import { Monster, Player, Loot } from './entities.ts';

export interface ZoneEvent { x: number; y: number; ev: GameEvent; only?: number /* yalnız bu oyuncu varlık kimliği */ }

export class Zone {
  layout: MapLayout;
  def: MapDef;
  players = new Grid<Player>(1, 1);
  monsters = new Grid<Monster>(1, 1);
  loot = new Grid<Loot>(1, 1);
  playerSet = new Set<Player>();
  monsterList: Monster[] = [];
  monsterById = new Map<number, Monster>();
  lootById = new Map<number, Loot>();
  events: ZoneEvent[] = [];
  respawnQueue: { at: number; sp: Monster['sp'] }[] = [];
  awakeCells = new Uint8Array(0);

  constructor(public id: string) {
    this.layout = getLayout(id);
    this.def = this.layout.def;
    this.players = new Grid<Player>(this.layout.w, this.layout.h);
    this.monsters = new Grid<Monster>(this.layout.w, this.layout.h);
    this.loot = new Grid<Loot>(this.layout.w, this.layout.h);
    this.awakeCells = new Uint8Array(this.players.cols * this.players.rows);
    const defs = new Map(MONSTERS.map((m) => [m.id, m] as const));
    for (const sp of this.layout.spawnPoints) {
      const d = defs.get(sp.monster);
      if (d) this.addMonster(new Monster(d, sp));
    }
  }
  addMonster(m: Monster) { m.zone = this; this.monsterList.push(m); this.monsterById.set(m.id, m); this.monsters.insert(m); }
  removeMonster(m: Monster) {
    this.monsters.remove(m); this.monsterById.delete(m.id);
    const i = this.monsterList.indexOf(m);
    if (i >= 0) { this.monsterList[i] = this.monsterList[this.monsterList.length - 1]; this.monsterList.pop(); }
  }
  addPlayer(p: Player) { p.zone = this; this.playerSet.add(p); this.players.insert(p); }
  removePlayer(p: Player) { this.players.remove(p); this.playerSet.delete(p); }
  addLoot(l: Loot) { l.zone = this; this.lootById.set(l.id, l); this.loot.insert(l); }
  removeLoot(l: Loot) { this.loot.remove(l); this.lootById.delete(l.id); }
  emit(x: number, y: number, ev: GameEvent, only?: number) { this.events.push({ x, y, ev, only }); }
  /** Oyuncu çevresindeki hücreleri uyanık işaretle: uzak canavarlar hiç işlem görmez. */
  computeAwake() {
    this.awakeCells.fill(0);
    const cols = this.players.cols, rows = this.players.rows;
    for (const p of this.playerSet) {
      const cx = p.cell % cols, cy = (p.cell / cols) | 0;
      for (let y = Math.max(0, cy - 3); y <= Math.min(rows - 1, cy + 3); y++)
        for (let x = Math.max(0, cx - 3); x <= Math.min(cols - 1, cx + 3); x++) this.awakeCells[y * cols + x] = 1;
    }
  }
}
