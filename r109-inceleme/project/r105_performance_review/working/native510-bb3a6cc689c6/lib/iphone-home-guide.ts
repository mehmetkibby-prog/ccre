// Stable key: a game update must never re-open this first-entry tip.
export const IPHONE_HOME_GUIDE_SEEN = 'col-iphone-home-guide-seen';
export function iphoneHomeGuideEligible(userAgent: string, standalone: boolean) {
  return /\biPhone\b/i.test(userAgent) && !/iPad|iPod|Android/i.test(userAgent) && !standalone;
}
export function claimIphoneHomeGuide(userAgent: string, standalone: boolean, storage: Pick<Storage,'getItem'|'setItem'>) {
  if (!iphoneHomeGuideEligible(userAgent, standalone)) return false;
  try {
    if (storage.getItem(IPHONE_HOME_GUIDE_SEEN) !== null) return false;
    storage.setItem(IPHONE_HOME_GUIDE_SEEN, '1');
    // If saving is blocked, do not repeatedly interrupt the player on each login.
    return storage.getItem(IPHONE_HOME_GUIDE_SEEN) === '1';
  } catch { return false; }
}
