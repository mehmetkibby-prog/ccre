export type MobileFrameRate = 30 | 50 | 60;
export type DesktopFrameRate = 60 | 120;
export const DESKTOP_FRAME_RATE: DesktopFrameRate = 60;
export function readDesktopFrameRate(value: unknown): DesktopFrameRate {
  return value === 120 || value === "120" ? 120 : DESKTOP_FRAME_RATE;
}

export function readMobileFrameRate(value: unknown): MobileFrameRate {
  return value === 30 || value === "30" ? 30 : value === 60 || value === "60" ? 60 : 50;
}

export type RenderQualityTier = 0 | 1 | 2;

export type RenderQualityState = {
  tier: RenderQualityTier;
  averageCostMs: number;
  samples: number;
  lastChangedAt: number;
};

export type RenderProfile = {
  targetFps: number;
  pixelBudget: number;
  particleScale: number;
  ambientLights: number;
};

export function initialRenderQuality(
  compact: boolean,
  _devicePixelRatio = 1,
  _hardwareConcurrency = 4,
): RenderQualityState {
  const constrained = compact;
  return {
    tier: constrained ? 1 : 2,
    averageCostMs: constrained ? 10 : 8,
    samples: 0,
    lastChangedAt: 0,
  };
}

export function observeRenderCost(
  state: RenderQualityState,
  renderCostMs: number,
  now: number,
  compact: boolean,
): RenderQualityState {
  // Desktop always uses the complete artwork/effects, regardless of load,
  // Retina density, reported CPU count or a saved mobile power preference.
  if (!compact) return { ...state, tier: 2 };
  const safeCost = Math.max(.1, Math.min(80, renderCostMs));
  const samples = Math.min(240, state.samples + 1);
  const averageCostMs = state.samples === 0
    ? safeCost
    : state.averageCostMs * .94 + safeCost * .06;
  const maxTier: RenderQualityTier = compact ? 1 : 2;

  if (samples < (compact ? 30 : 75)) return { ...state, averageCostMs, samples };
  const overload = compact ? 10 : 17.8;
  const changeCooldownMs = averageCostMs > overload ? (compact ? 1200 : 2400) : (compact ? 60_000 : 30_000);
  if (now - state.lastChangedAt < changeCooldownMs) return { ...state, averageCostMs, samples };
  if (averageCostMs > overload && state.tier > 0) {
    return { tier: (state.tier - 1) as RenderQualityTier, averageCostMs, samples: 0, lastChangedAt: now };
  }
  if (averageCostMs < 9.2 && state.tier < maxTier) {
    return { tier: (state.tier + 1) as RenderQualityTier, averageCostMs, samples: 0, lastChangedAt: now };
  }
  return { ...state, averageCostMs, samples };
}

export type FrameDeadline = { shouldPaint: boolean; nextPaintAt: number };

export function advanceFrameDeadline(now: number, nextPaintAt: number, targetFps: number): FrameDeadline {
  const frameMs = 1000 / Math.max(1, targetFps);
  if (!Number.isFinite(nextPaintAt) || nextPaintAt <= 0 || now - nextPaintAt > frameMs * 4) {
    return { shouldPaint: true, nextPaintAt: now + frameMs };
  }
  if (now < nextPaintAt - .35) return { shouldPaint: false, nextPaintAt };
  const elapsedIntervals = Math.max(1, Math.floor((now - nextPaintAt) / frameMs) + 1);
  return { shouldPaint: true, nextPaintAt: nextPaintAt + elapsedIntervals * frameMs };
}

export function combinedRenderCost(renderCostMs: number, paintGapMs: number, frameBudgetMs: number) {
  const safeRenderCost = Math.max(0, renderCostMs);
  const safeFrameBudget = Math.max(1, frameBudgetMs);
  const toleratedGap = Math.max(safeFrameBudget * 1.35, safeFrameBudget + 6);
  const frameDelay = Math.max(0, paintGapMs - toleratedGap);
  return safeRenderCost + frameDelay * .9;
}

export function renderProfile(tier: RenderQualityTier, compact: boolean, powerSaving = compact, mobileFps: MobileFrameRate = 50, desktopFps: DesktopFrameRate = DESKTOP_FRAME_RATE): RenderProfile {
  if (!compact) return {
    targetFps: desktopFps,
    pixelBudget: 8_000_000,
    particleScale: 1,
    ambientLights: 3,
  };
  if (tier === 0) return {
    targetFps: mobileFps,
    pixelBudget: powerSaving ? 650_000 : 900_000,
    particleScale: powerSaving ? .18 : .28,
    ambientLights: 1,
  };
  return {
    targetFps: mobileFps,
    pixelBudget: powerSaving ? 900_000 : 1_500_000,
    particleScale: powerSaving ? .25 : .5,
    ambientLights: powerSaving ? 1 : 2,
  };
}

// Scene resolution stays fixed while moving or changing effect tiers. Heat
// protection lightens effects, not the artwork; only viewport/DPR changes resize.
export function scenePixelRatio(width: number, height: number, devicePixelRatio: number,
  coarse: boolean, _powerSaving: boolean, _profile: RenderProfile): number {
  const compact = coarse;
  const desired = Math.min(devicePixelRatio || 1, compact ? 1.75 : 2);
  const pixels = compact ? 3_800_000 : 8_000_000;
  return Math.max(1, Math.min(desired, Math.sqrt(pixels / Math.max(1, width * height))));
}

// Align the entire world together, never individual actors or simulation state.
// Stable pixel phase prevents static details from swimming with a smooth camera.
export function sceneTranslation(width:number,height:number,cameraX:number,cameraY:number,zoom:number,pixelRatio:number,coarse:boolean) {
 const x=pixelRatio*(width/2-cameraX*zoom),y=pixelRatio*(height/2-cameraY*zoom);
 return coarse ? {x:Math.round(x),y:Math.round(y)} : {x,y};
}

export function advancePresentationDeadline(now:number,next:number,fps:number):FrameDeadline {
 const interval=1000/Math.max(1,fps);
 if(!Number.isFinite(next)||next<=0||now-next>interval*4)return {shouldPaint:true,nextPaintAt:now+interval};
 if(now<next-2)return {shouldPaint:false,nextPaintAt:next};
 return {shouldPaint:true,nextPaintAt:next+Math.max(1,Math.floor((now-next)/interval)+1)*interval};
}
