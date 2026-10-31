/** Küçük, sıfır bağımlılıklı ikili yazıcı/okuyucu. Snapshot'lar bununla kodlanır. */
const te = new TextEncoder();
const td = new TextDecoder();

export class BinWriter {
  buf: ArrayBuffer;
  view: DataView;
  u8: Uint8Array;
  pos = 0;
  constructor(size = 4096) {
    this.buf = new ArrayBuffer(size);
    this.view = new DataView(this.buf);
    this.u8 = new Uint8Array(this.buf);
  }
  private ensure(n: number) {
    if (this.pos + n <= this.buf.byteLength) return;
    let size = this.buf.byteLength * 2;
    while (size < this.pos + n) size *= 2;
    const nb = new ArrayBuffer(size);
    new Uint8Array(nb).set(this.u8.subarray(0, this.pos));
    this.buf = nb; this.view = new DataView(nb); this.u8 = new Uint8Array(nb);
  }
  reset() { this.pos = 0; return this; }
  wU8(v: number) { this.ensure(1); this.view.setUint8(this.pos, v); this.pos += 1; }
  wU16(v: number) { this.ensure(2); this.view.setUint16(this.pos, v, true); this.pos += 2; }
  wI16(v: number) { this.ensure(2); this.view.setInt16(this.pos, v, true); this.pos += 2; }
  wU32(v: number) { this.ensure(4); this.view.setUint32(this.pos, v >>> 0, true); this.pos += 4; }
  wF32(v: number) { this.ensure(4); this.view.setFloat32(this.pos, v, true); this.pos += 4; }
  wStr(s: string) {
    const b = te.encode(s);
    const n = Math.min(b.length, 255);
    this.ensure(1 + n); this.view.setUint8(this.pos++, n); this.u8.set(b.subarray(0, n), this.pos); this.pos += n;
  }
  /** Yerinde u16 yazmak için konum ayır (sayıları sonradan doldurmak için). */
  reserveU16(): number { const p = this.pos; this.wU16(0); return p; }
  patchU16(at: number, v: number) { this.view.setUint16(at, v, true); }
  /** Kopya: worker'dan transfer edilebilir ayrık buffer */
  finish(): ArrayBuffer { return this.buf.slice(0, this.pos); }
}

export class BinReader {
  view: DataView;
  u8: Uint8Array;
  pos = 0;
  constructor(buf: ArrayBuffer) { this.view = new DataView(buf); this.u8 = new Uint8Array(buf); }
  get left() { return this.view.byteLength - this.pos; }
  u8_() { const v = this.view.getUint8(this.pos); this.pos += 1; return v; }
  u16() { const v = this.view.getUint16(this.pos, true); this.pos += 2; return v; }
  i16() { const v = this.view.getInt16(this.pos, true); this.pos += 2; return v; }
  u32() { const v = this.view.getUint32(this.pos, true); this.pos += 4; return v; }
  f32() { const v = this.view.getFloat32(this.pos, true); this.pos += 4; return v; }
  str() { const n = this.u8_(); const s = td.decode(this.u8.subarray(this.pos, this.pos + n)); this.pos += n; return s; }
}
