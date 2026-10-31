import { GRID_CELL, TILE } from '@col/shared';

export interface GridEntity { id: number; x: number; y: number; cell: number }

/** Sabit hücreli uzamsal ızgara. Ekleme/çıkarma O(1) (swap-remove). */
export class Grid<T extends GridEntity> {
  cols: number; rows: number;
  cells: T[][];
  constructor(wTiles: number, hTiles: number) {
    this.cols = Math.ceil((wTiles * TILE) / GRID_CELL) + 1;
    this.rows = Math.ceil((hTiles * TILE) / GRID_CELL) + 1;
    this.cells = Array.from({ length: this.cols * this.rows }, () => []);
  }
  cellOf(x: number, y: number) {
    const cx = Math.max(0, Math.min(this.cols - 1, Math.floor(x / GRID_CELL)));
    const cy = Math.max(0, Math.min(this.rows - 1, Math.floor(y / GRID_CELL)));
    return cy * this.cols + cx;
  }
  insert(e: T) { e.cell = this.cellOf(e.x, e.y); this.cells[e.cell].push(e); }
  remove(e: T) {
    if (e.cell < 0) return;
    const arr = this.cells[e.cell];
    const i = arr.indexOf(e);
    if (i >= 0) { arr[i] = arr[arr.length - 1]; arr.pop(); }
    e.cell = -1;
  }
  move(e: T) {
    const c = this.cellOf(e.x, e.y);
    if (c === e.cell) return;
    this.remove(e); e.cell = c; this.cells[c].push(e);
  }
  /** Dikdörtgen içindeki hücreleri ziyaret et. */
  query(x0: number, y0: number, x1: number, y1: number, fn: (e: T) => void) {
    const cx0 = Math.max(0, Math.floor(x0 / GRID_CELL)), cy0 = Math.max(0, Math.floor(y0 / GRID_CELL));
    const cx1 = Math.min(this.cols - 1, Math.floor(x1 / GRID_CELL)), cy1 = Math.min(this.rows - 1, Math.floor(y1 / GRID_CELL));
    for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) {
      const arr = this.cells[cy * this.cols + cx];
      for (let i = 0; i < arr.length; i++) fn(arr[i]);
    }
  }
  radius(x: number, y: number, r: number, fn: (e: T, d2: number) => void) {
    const r2 = r * r;
    this.query(x - r, y - r, x + r, y + r, (e) => { const dx = e.x - x, dy = e.y - y; const d2 = dx * dx + dy * dy; if (d2 <= r2) fn(e, d2); });
  }
}
