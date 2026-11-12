// Android tablet defaults: no viewport/screen-size inference and no storage side effects.
export const DEFAULT_PHONE_VIEW_DISTANCE = 4; // Eye 5, unchanged.
export const DEFAULT_ANDROID_TABLET_VIEW_DISTANCE = 2; // Eye 3.

const androidPlatform = (value) => /^Android$/i.test(String(value ?? '').trim());
const foldModel = (value) => /(?:^|[\s;(])SM-F[A-Z0-9]+(?:\/DS)?(?=$|[\s;)/])/i.test(String(value ?? ''))
  || /\b(?:Fold|Flip)\b|\bOnePlus\s+Open\b|\bOPPO\s+Find\s+N\d*\b|\bHonor\s+Magic\s+V\d*\b|\bMIX\s+FOLD\b/i.test(String(value ?? ''));
const samsungTablet = (value) => /(?:^|[\s;(])(?:SM-[XTP]\d[A-Z0-9]*|GT-P\d[A-Z0-9]*)(?:\/DS)?(?=$|[\s;)/])/i.test(String(value ?? ''));
const samsungPhone = (value) => /(?:^|[\s;(])SM-[SAGMN]\d[A-Z0-9]*(?:\/DS)?(?=$|[\s;)/])/i.test(String(value ?? ''));

/** Pure classification after any available UA-CH model hint has resolved. */
export function isAndroidTablet({ coarse = false, userAgent = '', platform = '', mobile, model = '' } = {}) {
  if (!coarse || (!/\bAndroid\b/i.test(userAgent) && !androidPlatform(platform))) return false;
  // Model exclusions precede both a tablet UA and mobile:false fallback.
  if (foldModel(model) || foldModel(userAgent)) return false;
  if (samsungTablet(model) || samsungTablet(userAgent)) return true;
  if (samsungPhone(model) || samsungPhone(userAgent)) return false;
  // Explicit phone evidence wins. A missing Mobile token is the conventional
  // Android tablet UA fallback; it is never inferred from a large viewport.
  if (mobile === true || /\bMobile\b/i.test(userAgent)) return false;
  return mobile === false || /\bAndroid\b/i.test(userAgent);
}

/** Await model hints BEFORE the broad fallback, including on reduced Chrome UA. */
export async function detectAndroidTablet(nav = {}, coarse = false) {
  const userAgent = String(nav.userAgent ?? '');
  const data = nav.userAgentData;
  const base = { coarse, userAgent, platform: data?.platform ?? '', mobile: data?.mobile };
  if (!coarse || (!/\bAndroid\b/i.test(userAgent) && !androidPlatform(base.platform))) return false;
  if (foldModel(userAgent)) return false;
  let model = '';
  try { model = (await data?.getHighEntropyValues?.(['model']))?.model ?? ''; }
  catch { /* UA-only Android tablet detection still works if hints are denied. */ }
  return isAndroidTablet({ ...base, model });
}

/** null means no deliberate, valid persisted choice. */
export function readMobileViewDistance(saved) {
  if (saved === null || saved === undefined || String(saved).trim() === '') return null;
  const value = Number(saved);
  return Number.isInteger(value) && value >= 0 && value < 6 ? value : null;
}

export function mobileViewDistanceForDevice(saved, androidTablet) {
  return readMobileViewDistance(saved) ?? (androidTablet ? DEFAULT_ANDROID_TABLET_VIEW_DISTANCE : DEFAULT_PHONE_VIEW_DISTANCE);
}

