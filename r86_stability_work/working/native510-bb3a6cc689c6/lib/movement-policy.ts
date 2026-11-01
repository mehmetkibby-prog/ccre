export type MovementBudget = {
  speed: number;
  elapsedMs: number;
  travelMs: number;
  nextDebtMs: number;
  maxSingleDistance: number;
  allowed: boolean;
  severe: boolean;
};

export function movementSpeedForRole(role: string) {
  return (role === "avci" ? 265 : 239) * 1.07;
}

export function evaluateMovementBudget(
  role: string,
  distance: number,
  nowMs: number,
  checkedAtMs: number,
  debtMs: number,
): MovementBudget {
  const speed = movementSpeedForRole(role);
  const elapsedMs = checkedAtMs > 0
    ? Math.max(0, Math.min(1_600, nowMs - checkedAtMs))
    : 520;
  const travelMs = Math.ceil(Math.max(0, distance) / speed * 1_000);
  const nextDebtMs = Math.max(0, Math.max(0, debtMs) + travelMs - elapsedMs);
  const maxSingleDistance = speed * 1.84;
  // Mobil bağlantıda yoldaki ilk hareket isteği gecikince istemci sonraki
  // kontrol noktasını biriktirir. Sunucu iki paketi kısa aralıkla görse de
  // konum, oyuncunun daha uzun sürede yürüdüğü gerçek mesafedir. Tek seferlik
  // bu ağ sıkışmasını kabul eder; hız kalıcıysa borç büyümeye devam edip kısa
  // sürede sınırı aşar. Tek paketlik ışınlanma mesafe sınırında ayrıca kesilir.
  // VDS'de anlık kontrol noktaları bazen aynı TCP turunda kümelenebiliyor.
  // Bir saniyelik küçük bir ağ payı bu tekil kümeyi yumuşatır; tek paket
  // mesafe tavanı ve kalıcı hız borcu denetimi ise sunucu otoritesini korur.
  const maxJitterDebtMs = 1_000;
  return {
    speed,
    elapsedMs,
    travelMs,
    nextDebtMs,
    maxSingleDistance,
    allowed: distance <= maxSingleDistance && nextDebtMs <= maxJitterDebtMs,
    severe: distance > maxSingleDistance * 1.5 || nextDebtMs > maxJitterDebtMs * 2,
  };
}
