/**
 * Phase 2.4 — Pure rules for bullet-vs-wall collision response.
 *
 * The original Bullet.collideWalls method intermixed three concerns:
 *   1. geometry — which wall contact is the "real" hit (closest swept-box)
 *   2. classification — does this wall break? which sound plays?
 *   3. positioning — where the bullet stops, where the TerrainTileDestroyer
 *      spawns to chip the wall
 *
 * Each is extracted here as a pure function. The Bullet adapter still owns
 * the live side effects (spawning destroyers, playing sounds, removing
 * itself), but every numeric decision now lives in a tested rule.
 *
 * Boxes are passed as plain `{ min: {x,y}, max: {x,y} }` so the rules don't
 * depend on the core BoundingBox class — both peers must compute identical
 * geometry from snapshot state.
 */

import { Dir } from './GameState';

export interface Box {
  min: { x: number; y: number };
  max: { x: number; y: number };
}

/**
 * Discriminated wall kind. Maps from engine tag enum to a serializable
 * string so the rules don't depend on Tag values.
 */
export type WallKind = 'brick' | 'steel' | 'border' | 'other';

/**
 * Pick the contact closest to the bullet's previous-box center (the
 * swept-box trick that prevents tunneling). Ties are broken by FIRST
 * occurrence — important for determinism, since the order of `contacts` is
 * already deterministic once the collision system sorts by entity id.
 *
 * Returns null on empty input rather than throwing — caller handles "no
 * walls hit" separately and we don't want to mix flow control with
 * geometry.
 */
export interface ContactGeo<T> {
  box: Box;
  data: T;
}

export function pickClosestWallContact<T>(
  prevBox: Box,
  contacts: readonly ContactGeo<T>[],
): ContactGeo<T> | null {
  if (contacts.length === 0) return null;

  const pcx = (prevBox.min.x + prevBox.max.x) / 2;
  const pcy = (prevBox.min.y + prevBox.max.y) / 2;

  let best = contacts[0];
  let bestSq = sqDistToBoxCenter(pcx, pcy, best.box);
  for (let i = 1; i < contacts.length; i++) {
    const sq = sqDistToBoxCenter(pcx, pcy, contacts[i].box);
    // Strict `<` so ties keep the first contact — matches the original
    // `distance === minDistance` filter that selected the first item.
    if (sq < bestSq) {
      bestSq = sq;
      best = contacts[i];
    }
  }
  return best;
}

function sqDistToBoxCenter(x: number, y: number, b: Box): number {
  const cx = (b.min.x + b.max.x) / 2;
  const cy = (b.min.y + b.max.y) / 2;
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy;
}

/** Wall damage tiers from the bullet. Matches TankBulletWallDamage values. */
export const enum WallDamage {
  Normal = 0,
  High = 1,
}

export type HitSound = 'brick' | 'steel' | null;

export interface WallHitClassification {
  /** A TerrainTileDestroyer should be spawned. */
  destroysWall: boolean;
  /** Which sound to play (or null when no sound — enemy bullets are silent). */
  sound: HitSound;
}

/**
 * Decide what happens when a bullet hits a wall of a given kind. Pure rule:
 *
 *   brick                 → destroy + brick sound
 *   steel + high damage   → destroy + brick sound (yes — original used the
 *                            brick sound on a high-damage steel break)
 *   steel + normal damage → no destroy + steel sound
 *   border                → no destroy + steel sound
 *   other                 → no destroy, no sound
 *
 * Sound is suppressed entirely when the bullet is enemy-fired (matches the
 * legacy "only player bullets make sound" check).
 */
export function classifyWallHit(
  wallKind: WallKind,
  bulletWallDamage: WallDamage,
  isPlayerBullet: boolean,
): WallHitClassification {
  const canDestroySteel = bulletWallDamage === WallDamage.High;
  const destroysWall =
    wallKind === 'brick' || (wallKind === 'steel' && canDestroySteel);

  let sound: HitSound = null;
  if (isPlayerBullet) {
    if (destroysWall) sound = 'brick';
    else if (wallKind === 'steel' || wallKind === 'border') sound = 'steel';
  }

  return { destroysWall, sound };
}

/**
 * Compute the scalar argument to pass to `translateY` to push self flush
 * against wall along the axis of motion. The legacy collision code passed
 * one of four direction-specific expressions; this function names them.
 *
 *   Up:    self.max.y - wall.max.y
 *   Down:  wall.min.y - self.min.y
 *   Left:  self.max.x - wall.max.x
 *   Right: wall.min.x - self.min.x
 *
 * Returned value goes directly into `obj.translateY(...)` while the object
 * is rotated to `rotation`. We keep the translateY-scalar shape (rather
 * than a world-space {dx, dy}) because the live game still applies motion
 * via translateY — preserving the exact legacy math without having to
 * reason about parent-matrix composition.
 *
 * Phase 2.4-endgame note: once GameState is the source of truth and views
 * read world positions directly from snapshots, replace this with a
 * world-displacement variant. The math is the same; only the application
 * site changes.
 */
export function alignAgainstWallScalar(
  selfBox: Box,
  wallBox: Box,
  rotation: Dir,
): number {
  switch (rotation) {
    case Dir.Up: return selfBox.max.y - wallBox.max.y;
    case Dir.Down: return wallBox.min.y - selfBox.min.y;
    case Dir.Left: return selfBox.max.x - wallBox.max.x;
    case Dir.Right: return wallBox.min.x - selfBox.min.x;
  }
}
