type DeviceNavigator = {
  userAgent?: string;
  userAgentData?: { platform?: string; getHighEntropyValues?: (hints: string[]) => Promise<{model?: string}> };
};

// Intentionally one model only. Never infer a device from screen dimensions.
export function isF971bModel(model: string) {
  return /^SM-F971B(?:\/DS)?$/i.test(model.trim());
}

export async function detectF971b(nav: DeviceNavigator): Promise<boolean> {
  const ua = nav.userAgent ?? '';
  if (!/Android/i.test(ua) && nav.userAgentData?.platform !== 'Android') return false;
  const model = ua.match(/\bSM-F971B(?:\/DS)?(?=[\s;)\/]|$)/i)?.[0];
  if (model && isF971bModel(model)) return true;
  try {
    const hints = await nav.userAgentData?.getHighEntropyValues?.(['model']);
    return isF971bModel(hints?.model ?? '');
  } catch { return false; }
}

export function f971bInnerLayout(target: boolean, coarse: boolean, width: number, height: number) {
  // Exclude the tall cover screen and its short landscape orientation.
  return target && coarse && Math.min(width,height) >= 500 && Math.max(width,height) / Math.min(width,height) < 1.7;
}

// Fullscreen must not force this foldable's cover display into landscape.
// Model detection runs after requestFullscreen so the user gesture is preserved.
export async function settleF971bFullscreen(nav: DeviceNavigator, orientation: {unlock?: () => void}) {
  if (!await detectF971b(nav)) return false;
  try { orientation.unlock?.(); } catch { /* Keep the device's current orientation. */ }
  return true;
}
