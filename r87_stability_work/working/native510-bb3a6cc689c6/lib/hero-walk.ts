// The existing sheets contain a neutral pose and two stride poses. Returning
// through neutral avoids snapping directly between the two extended stances.
const WALK_FRAMES = [0, 1, 0, 2] as const;
export function heroWalkPose(now: number, moving: boolean) {
  const phase = now / 120;
  const gait = moving ? Math.sin(phase * Math.PI / 2) : 0;
  return {
    frame: moving ? WALK_FRAMES[Math.floor(phase) % 4] : 0,
    gait,
    lift: -gait * gait * 1.25,
    lean: gait * .003,
  };
}

// Measured fist centres in the existing 256 x (1024/3) atlas cells. Armour
// paintings share their frame layout, but their hands are not pixel-identical.
// Attack poses retain their existing anchors in game-client.
type Hands = Record<string, ReadonlyArray<readonly [number, number]>>;
const HANDS: Record<string, Hands> = {
  base: {
    muhafiz: [[78,176],[55,170],[78,170]],
    avci: [[170,185],[204,171],[171,184]],
    arkanist: [[65,174],[95,175],[86,174]],
  },
  blue: {
    muhafiz: [[74,176],[60,172],[80,172]],
    avci: [[170,187],[207,174],[170,187]],
    arkanist: [[60,174],[90,173],[85,174]],
  },
  orange: {
    muhafiz: [[68,180],[64,176],[70,175]],
    avci: [[169,183],[199,173],[169,184]],
    arkanist: [[51,165],[76,167],[68,167]],
  },
  red: {
    muhafiz: [[67,178],[57,174],[71,174]],
    avci: [[171,187],[210,175],[173,187]],
    arkanist: [[60,172],[91,173],[79,173]],
  },
  purple: {
    muhafiz: [[67,178],[57,174],[71,174]],
    avci: [[171,187],[210,175],[173,187]],
    arkanist: [[60,172],[91,173],[79,173]],
  },
  unique: {
    muhafiz: [[72,175],[54,173],[74,172]],
    avci: [[170,187],[207,174],[169,187]],
    arkanist: [[56,170],[76,170],[81,172]],
  },
};
export function heroWalkHand(role: string, frame: number, atlasSource: string) {
  if(/rank-costume\.webp/.test(atlasSource)){
    const hands:Hands={muhafiz:[[82,171],[82,170],[83,169],[116,72],[244,88],[85,170]],avci:[[160,174],[166,174],[162,175],[107,72],[239,89],[166,175]],arkanist:[[81,173],[91,173],[86,174],[106,62],[230,79],[83,173]]};
    const point=(hands[role]??hands.muhafiz)[Math.max(0,Math.min(5,frame))];
    const [w,h,b]=role==='avci'?[112,106,-24]:role==='arkanist'?[124,116,-12]:[120,115,-19];
    return {x:(point[0]/256-.5)*w,y:28+b-h+point[1]/(1024/3)*h};
  }
  if (frame < 0 || frame > 2) return null;
  const match = /hero-motion-(blue|orange|red|purple|unique)-armor(?:-v349)?\.webp/.exec(atlasSource);
  const royal = /hero-motion-infinite-v202\.webp/.test(atlasSource);
  if (!match && !royal && !/hero-motion-atlas\.webp/.test(atlasSource)) return null;
  const hands = HANDS[royal ? "unique" : match?.[1] ?? "base"];
  const hand = (hands[role] ?? hands.muhafiz)[frame];
  const [width, height, baseline] = role === "avci" ? [112,106,-24]
    : role === "arkanist" ? [124,116,-12] : [120,115,-19];
  return { x: (hand[0] / 256 - .5) * width, y: 28 + baseline - height + hand[1] / (1024 / 3) * height };
}
