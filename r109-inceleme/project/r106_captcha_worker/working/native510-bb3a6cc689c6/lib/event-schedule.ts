import type {GameEvent, EventKind} from './game-events.mjs';

export type EventStartMode = 'schedule' | 'now';

// One explicit mode per card. Never replace a chosen date range with a default duration.
export function eventStartRequest(kind:EventKind, event:GameEvent, mode:EventStartMode,
  hours:number, minutes:number, expectedEvents:string) {
  if (mode === 'schedule') {
    if (!Number.isSafeInteger(event.start) || !Number.isSafeInteger(event.end) || event.start <= 0 || event.end <= event.start)
      throw new Error('Başlangıç ve bitiş tarihini seç. Bitiş, başlangıçtan sonra olmalı.');
    return {action:'event_schedule',eventKind:kind,eventStart:event.start,eventEnd:event.end,percent:event.percent,expectedEvents};
  }
  const durationSeconds = (hours * 60 + minutes) * 60;
  if (!Number.isSafeInteger(hours) || !Number.isSafeInteger(minutes) || hours < 0 || minutes < 0 || minutes > 59 ||
    !Number.isSafeInteger(durationSeconds) || durationSeconds < 60 || durationSeconds > 365 * 86400)
    throw new Error('Süre 1 dakika ile 365 gün arasında olmalı. Dakika alanına 0–59 yaz.');
  return {action:'event_start',eventKind:kind,percent:event.percent,durationSeconds,expectedEvents};
}
