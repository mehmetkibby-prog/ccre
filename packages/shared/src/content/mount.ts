/**
 * Binek: Pazar Köyü'ndeki Seyis Arda'nın görevi.
 * 10. seviyede görev alınır → görev alındıktan sonra 100 canavar öldür → 10 Kor Mührü ve 500 Mücevher ile teslim et
 * → temel binek (Savaş Atı). Binekteyken hareket hızı artar ve +5 saldırı; binekte yalnız düz saldırı yapılır.
 */
export const MOUNT = {
  npc: 'arda',
  level: 10,
  kills: 100,
  sealKey: 'kor_seal',
  seals: 10,
  gems: 500,
  atk: 5,
  speedMul: 1.25,
  name: 'Savaş Atı',
} as const;

export interface MountState { owned?: boolean; riding?: boolean; quest?: { kills: number } }
