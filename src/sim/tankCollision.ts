/**
 * Phase 2.4 — Pure tank collision geometry.
 *
 * Two rules in this module — both are pure box math used by the Tank
 * adapter's `collide` path:
 *
 *   isOnIce      — "is the tank's center inside the union of ice tiles
 *                   it currently touches?"
 *
 *   minkowskiResolve
 *                — "given the tank's current and previous positions plus
 *                   the obstacle's current box, on which side did the
 *                   collision come from, and by how much should the tank
 *                   be displaced to escape?"
 *
 * The Minkowski sum trick exists because relying on rotation/direction
 * gives wrong answers in edge cases (e.g. when the tank just started
 * rotating, its facing and motion may disagree by one tick). Using cross
 * products against the Minkowski-sum diagonals identifies the collided
 * side from geometry alone, which is much more robust.
 *
 * The legacy code applied displacements via `position.subX/subY` (signed)
 * — preserved here so the math is bit-for-bit identical. The returned
 * `dx`/`dy` are values to SUBTRACT (note the sign, not add).
 */

import { Box } from './wallHit';

// ---- Ice -------------------------------------------------------------------

function center(b: Box): { x: number; y: number } {
  return { x: (b.min.x + b.max.x) / 2, y: (b.min.y + b.max.y) / 2 };
}

function union(boxes: readonly Box[]): Box | null {
  if (boxes.length === 0) return null;
  let minX = boxes[0].min.x;
  let minY = boxes[0].min.y;
  let maxX = boxes[0].max.x;
  let maxY = boxes[0].max.y;
  for (let i = 1; i < boxes.length; i++) {
    const b = boxes[i];
    if (b.min.x < minX) minX = b.min.x;
    if (b.min.y < minY) minY = b.min.y;
    if (b.max.x > maxX) maxX = b.max.x;
    if (b.max.y > maxY) maxY = b.max.y;
  }
  return { min: { x: minX, y: minY }, max: { x: maxX, y: maxY } };
}

/**
 * Decide whether a tank's world-space center is contained in the union of
 * its current ice contacts.
 *
 * Returns false on empty `iceBoxes` (no ice contacts → no ice). Returns
 * false when the union covers the center on its boundary only — uses
 * strict containment (`<`, not `<=`) to match BoundingBox.containsPoint
 * semantics.
 */
export function isOnIce(selfBox: Box, iceBoxes: readonly Box[]): boolean {
  const u = union(iceBoxes);
  if (u === null) return false;
  const c = center(selfBox);
  return c.x >= u.min.x && c.x <= u.max.x && c.y >= u.min.y && c.y <= u.max.y;
}

// ---- Minkowski resolution -------------------------------------------------

/**
 * Side of impact. The engine uses a y-up world, and the legacy naming has
 * a quirk on the X axis worth calling out:
 *
 *   'top'    — caller approached from larger y (selfPrev above the wall in
 *              y-up coords); displacement is along -y.
 *   'bottom' — caller approached from smaller y (selfPrev below the wall).
 *   'left'   — caller approached from larger x (visually RIGHT of the wall
 *              in screen space; the legacy chose this name based on the
 *              displacement direction, not the approach direction).
 *   'right'  — caller approached from smaller x (visually LEFT of the wall).
 *   'none'   — degenerate (centers coincide); rare; caller should no-op.
 *
 * The Y labels are intuitive ("approached from above" → 'top'); the X
 * labels are inverted from the visual approach. Preserved bit-for-bit
 * because the legacy displacement branches are keyed off these names and
 * any rename would mean inverting the dx/dy assignments too.
 */
export type CollisionSide = 'top' | 'bottom' | 'left' | 'right' | 'none';

export interface MinkowskiResolution {
  side: CollisionSide;
  /** Amount to subtract from self.position.x (signed; 0 when side is top/bottom/none). */
  dx: number;
  /** Amount to subtract from self.position.y (signed; 0 when side is left/right/none). */
  dy: number;
}

/**
 * Compute the side of collision and the displacement to apply.
 *
 * Caller applies via:
 *   position.x -= result.dx;
 *   position.y -= result.dy;
 *
 * Preserves the legacy `subX(currentMin - otherMax)` / `subX(currentMax - otherMin)`
 * sign conventions exactly — the returned `dx`/`dy` are the raw subtractands.
 */
export function minkowskiResolve(
  selfCurrentBox: Box,
  selfPrevBox: Box,
  otherBox: Box,
): MinkowskiResolution {
  // Minkowski sum: dimensions are selfSize + otherSize, center is otherCenter.
  // The "diagonals" we cross-product against describe which side of the
  // sum-box the selfPrev center sits on relative to the other-current
  // center.
  const sumW = (selfCurrentBox.max.x - selfCurrentBox.min.x) + (otherBox.max.x - otherBox.min.x);
  const sumH = (selfCurrentBox.max.y - selfCurrentBox.min.y) + (otherBox.max.y - otherBox.min.y);
  const sumCenter = center(otherBox); // legacy minkowskiSum keeps the "other" box centered

  const prevCenter = center(selfPrevBox);
  const lpx = prevCenter.x - sumCenter.x;
  const lpy = prevCenter.y - sumCenter.y;

  // BL→TR diagonal points at (+w/2, +h/2), TL→BR at (+w/2, -h/2). Cross
  // products of (lpx, lpy) with each diagonal partition the plane into
  // four sectors aligned to the box sides.
  const halfW = sumW / 2;
  const halfH = sumH / 2;
  const blTr = lpx * halfH - lpy * halfW;
  const tlBr = lpx * -halfH - lpy * halfW;

  const isTop = blTr < 0 && tlBr < 0;
  const isBottom = blTr > 0 && tlBr > 0;
  const isLeft = blTr > 0 && tlBr < 0;
  const isRight = blTr < 0 && tlBr > 0;

  if (isTop) {
    return { side: 'top', dx: 0, dy: selfCurrentBox.min.y - otherBox.max.y };
  }
  if (isBottom) {
    return { side: 'bottom', dx: 0, dy: selfCurrentBox.max.y - otherBox.min.y };
  }
  if (isLeft) {
    return { side: 'left', dx: selfCurrentBox.min.x - otherBox.max.x, dy: 0 };
  }
  if (isRight) {
    return { side: 'right', dx: selfCurrentBox.max.x - otherBox.min.x, dy: 0 };
  }
  return { side: 'none', dx: 0, dy: 0 };
}
