export function guardianDashDirection(from, selected, facing) {
  const toward=selected?{x:selected.x-from.x,y:selected.y-from.y}:facing;
  const length=Math.hypot(toward.x,toward.y);
  if(!Number.isFinite(length)||length<.01)return facing;
  return {x:toward.x/length,y:toward.y/length};
}
