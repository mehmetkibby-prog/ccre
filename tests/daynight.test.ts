import { it, expect } from 'vitest';
import { dayNightAt, trHour, sanitizeDayNight, DAYNIGHT_DEFAULT, sanitizeTuning } from '@col/shared';

it('Gece-gündüz: Türkiye saati ve dilimler', () => {
  // 2026-11-19 12:00 UTC = 15:00 TR
  expect(trHour(Date.UTC(2026, 10, 19, 12, 0))).toBeCloseTo(15);
  expect(trHour(Date.UTC(2026, 10, 19, 21, 30))).toBeCloseTo(0.5); // gece yarısını geçer
  const T = DAYNIGHT_DEFAULT;
  expect(dayNightAt(T, 12)).toMatchObject({ night: 0, dusk: 0, label: 'Gündüz' });
  const dusk = dayNightAt(T, 19); // akşamüstünün ortası: en kızıl
  expect(dusk.dusk).toBeGreaterThan(0.9); expect(dusk.night).toBe(0); expect(dusk.label).toBe('Akşamüstü');
  expect(dayNightAt(T, 2)).toMatchObject({ night: 1, label: 'Gece' });
  expect(dayNightAt(T, 23)).toMatchObject({ night: 1 });
  const dawn = dayNightAt(T, 6.5);
  expect(dawn.label).toBe('Şafak'); expect(dawn.night).toBeLessThan(0.1);
  // akşamüstü → gece geçişi yumuşak
  const a = dayNightAt(T, 19.6), b = dayNightAt(T, 20.2);
  expect(a.night).toBeGreaterThan(0); expect(b.night).toBeGreaterThan(a.night); expect(b.night).toBeLessThan(1);
  expect(dayNightAt({ ...T, force: 'night' }, 12).night).toBe(1);
});

it('Gece-gündüz ayarı: koyuluk en çok %85, bozuk saat sırası varsayılana döner', () => {
  expect(sanitizeDayNight({ dark: 5 }).dark).toBe(0.85);
  expect(sanitizeDayNight({ dawn: 20, day: 7, dusk: 17, night: 21 }).dawn).toBe(DAYNIGHT_DEFAULT.dawn);
  expect(sanitizeDayNight({ dusk: 18, night: 21.5, force: 'dusk' })).toMatchObject({ dusk: 18, night: 21.5, force: 'dusk' });
  expect(sanitizeTuning({}).dayNight).toEqual(DAYNIGHT_DEFAULT);
});
