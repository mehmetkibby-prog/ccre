/** Initial 1/10 in each slot uses the first three points of the 30-point cap. */
export function skillProgression(level: number, skills: readonly number[]) {
  const total = skills.reduce((sum, value) => sum + Math.max(1, Math.min(10, Math.floor(value))), 0);
  const limit = Math.max(3, Math.min(30, Math.floor(level)));
  return { total, limit, available: Math.max(0, limit - total), nextLevel: Math.min(30, total + 1) };
}
