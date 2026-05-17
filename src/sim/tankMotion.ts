/**
 * Phase 2.4 — Pure rules for tank motion: move, rotate-with-snap, and the
 * ice-slide-on-idle decision.
 *
 * Movement reuses the DIR_DELTA table from sim/bullet.ts — bullets and
 * tanks move in the same cardinal grid, so there is exactly one canonical
 * direction-to-vector lookup for the whole simulation.
 *
 * Rotate-with-snap: when a tank turns 90°, its perpendicular axis gets
 * snapped to the nearest TILE_SIZE_MEDIUM tile. This is the "magnetic
 * doorway" behavior that lets players slip into corridors without
 * pixel-perfect alignment.
 *
 * Ice slide: when a player on ice releases all movement controls, the tank
 * starts a brief slide (`ICE_SLIDE_DURATION`). Pure here is just the
 * boolean decision; the adapter manages the actual slide timer + the
 * `slided` Subject.
 */

import { Dir } from './GameState';
import { DIR_DELTA } from './bullet';

/**
 * Per-tick movement delta for a tank facing `rotation` moving at `speedPx`
 * pixels per second over `dtSec` seconds. Pure — caller adds (dx, dy) to
 * the tank's local position.
 *
 * Identical math to `stepBullet` minus the BulletState plumbing.
 */
export function tankMoveDelta(
  rotation: Dir,
  speedPx: number,
  dtSec: number,
): { dx: number; dy: number } {
  const u = DIR_DELTA[rotation];
  const distance = speedPx * dtSec;
  return { dx: u.dx * distance, dy: u.dy * distance };
}

/**
 * "Snap perpendicular axis to nearest snapSize" rule, applied when the
 * tank changes facing.
 *
 *   Up / Down   → snap x to nearest multiple of snapSize.
 *   Left / Right → snap y to nearest multiple of snapSize.
 *
 * No-op when newRot equals oldRot — matches legacy guard.
 *
 * Uses `Math.round(x / snapSize) * snapSize`, identical to the legacy
 * Vector.snapX/snapY semantics. Negative positions and exact-half cases
 * round to-even per IEEE-754; not a concern in practice because the field
 * is always non-negative.
 */
export function snapPositionOnRotate(
  posX: number,
  posY: number,
  oldRot: Dir,
  newRot: Dir,
  snapSize: number,
): { x: number; y: number } {
  if (newRot === oldRot) {
    return { x: posX, y: posY };
  }
  if (newRot === Dir.Up || newRot === Dir.Down) {
    return { x: Math.round(posX / snapSize) * snapSize, y: posY };
  }
  // Left / Right
  return { x: posX, y: Math.round(posY / snapSize) * snapSize };
}

/**
 * Decide whether `idle()` should trigger an ice-slide.
 *
 * Matches legacy condition (Tank.idle):
 *   checkIce && isPlayer && isOnIce && !isCurrentlySliding
 *
 * Each input is what the adapter knows about the live tank — `isPlayer`
 * comes from the tags, `isOnIce` from the tile under the tank, sliding
 * from the slide timer. The pure layer just composes them so the rule is
 * easy to test in isolation.
 */
export function shouldStartIceSlide(
  checkIce: boolean,
  isPlayer: boolean,
  isOnIce: boolean,
  isCurrentlySliding: boolean,
): boolean {
  return checkIce && isPlayer && isOnIce && !isCurrentlySliding;
}
