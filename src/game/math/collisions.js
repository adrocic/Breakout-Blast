export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Circle vs axis-aligned rectangle.
 * Circle is defined by center (cx, cy) + radius.
 * Rect is defined by top-left (rx, ry) + width/height.
 */
export function circleRectIntersect(cx, cy, radius, rx, ry, rw, rh) {
  const closestX = clamp(cx, rx, rx + rw);
  const closestY = clamp(cy, ry, ry + rh);
  const dx = cx - closestX;
  const dy = cy - closestY;
  return dx * dx + dy * dy <= radius * radius;
}

/**
 * Axis-aligned rectangle vs rectangle.
 * Rect is defined by top-left (x, y) + width/height.
 */
export function rectRectIntersect(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}
