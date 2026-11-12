/** Presentation only. Admission and capacity remain authoritative on the server. */
export function channelLoad(online: number, capacity: number) {
  if (online >= capacity) return { kind: 'full', label: 'Dolu' } as const;
  if (online === 0) return { kind: 'empty', label: 'Boş' } as const;
  if (online >= 10) return { kind: 'busy', label: 'Yoğun' } as const;
  return { kind: 'normal', label: 'Normal' } as const;
}
