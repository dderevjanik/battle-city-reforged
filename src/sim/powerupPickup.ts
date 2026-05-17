/**
 * Phase 2.4 — Pure powerup-pickup intersection rule.
 *
 * A powerup is collected only when a tank's collision box overlaps it by
 * more than PICKUP_MIN_INTERSECTION_SIZE pixels on BOTH axes. This guards
 * against the "ghost pickup" where a tank's corner barely clips the
 * powerup but visually does not look like it touches.
 *
 * The rule is shape-only: no notion of which tank, no side effects. The
 * adapter is responsible for picking the contact, calling the rule, and —
 * if the rule says picked — destroying the powerup and notifying.
 */

import { Box } from './wallHit';

const PICKUP_MIN_INTERSECTION_SIZE = 16;

/**
 * Intersection rectangle of two AABBs. Returns null when they do not
 * overlap (width or height <= 0). Sizes are inclusive of the overlap
 * geometry — matches BoundingBox.intersectWith semantics.
 */
function intersect(a: Box, b: Box): { w: number; h: number } | null {
  const minX = Math.max(a.min.x, b.min.x);
  const minY = Math.max(a.min.y, b.min.y);
  const maxX = Math.min(a.max.x, b.max.x);
  const maxY = Math.min(a.max.y, b.max.y);
  const w = maxX - minX;
  const h = maxY - minY;
  if (w <= 0 || h <= 0) return null;
  return { w, h };
}

/**
 * Decide whether a tank with the given collision box should pick up the
 * powerup. Returns true only when both axes of the intersection rectangle
 * exceed the threshold — matches the legacy
 * `rect.width > MIN && rect.height > MIN` test exactly (strict, not >=).
 */
export function shouldPickupPowerup(
  powerupBox: Box,
  tankBox: Box,
): boolean {
  const r = intersect(powerupBox, tankBox);
  if (r === null) return false;
  return r.w > PICKUP_MIN_INTERSECTION_SIZE && r.h > PICKUP_MIN_INTERSECTION_SIZE;
}
