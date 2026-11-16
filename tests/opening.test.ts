import { it, expect } from 'vitest';
import { OpeningState } from '../packages/server/src/opening.ts';

it('bakımda/kapalıyken: yalnız yetkili ve "bakımda giriş" izinli hesaplar girer', () => {
  const o = new OpeningState();
  for (const mode of ['maintenance', 'closed'] as const) {
    o.state = { mode, openAt: null, message: '', revision: 0 };
    expect(o.isOpenFor(false, false).ok).toBe(false);
    expect(o.isOpenFor(false, false, true).ok).toBe(true);
    expect(o.isOpenFor(false, true).ok).toBe(true);
  }
  o.state = { mode: 'maintenance', openAt: null, message: '', revision: 0 };
  expect(o.isOpenFor(true, false).ok).toBe(false); // ön kayıt erişimi bakımı aşmaz
});
