/**
 * Phase 2.4 — Pure bullet logic (Path A vertical slice).
 *
 * All functions here are pure: they take state in, return state out, and have
 * no side effects (no Phaser refs, no logging, no audio, no random). This is
 * what the future networked simulate() will call. For now, the Bullet
 * GameObject still owns the live data and Phaser tree — it calls into these
 * functions to compute results, then applies them.
 *
 * Once every gameplay class has been migrated this way, the GameObject
 * subclasses become thin views over GameState produced by simulate(), and
 * these pure functions become the single source of truth.
 */

import { BulletState, Dir, Side } from './GameState';

/**
 * Unit displacement vector per facing direction, in the engine's
 * screen-space y-down world (Phaser default: y=0 at top, larger y is down).
 *
 *   Up:    (0, -1)   // smaller y = visually up
 *   Right: (+1, 0)
 *   Down:  (0, +1)
 *   Left:  (-1, 0)
 *
 * These values reproduce what `obj.translateY(d)` produces in the legacy
 * code for each rotation. The legacy `Y_AXIS` is `(0, -1)` (see
 * src/core/GameObject.ts), so `translateY(d)` for Rotation.Up effectively
 * does `position.y -= d` — i.e. moves toward smaller y, which is visually
 * up on screen.
 *
 * Bullets / tanks have only ever used `translateY(speed * dt)` to move, so
 * any new motion code must agree with these vectors exactly or the
 * migration will visibly invert motion (the exact symptom of the original
 * inversion bug: Right arrow moves Left).
 */
export const DIR_DELTA: readonly { dx: number; dy: number }[] = [
  { dx: 0, dy: -1 },   // Dir.Up
  { dx: 1, dy: 0 },    // Dir.Right
  { dx: 0, dy: 1 },    // Dir.Down
  { dx: -1, dy: 0 },   // Dir.Left
];

/**
 * Advance a bullet by one sim step. Returns a new BulletState — does NOT
 * mutate the input. Caller is responsible for applying the new position back
 * to whatever holds the live state (today: a Bullet GameObject; in Phase 2.4
 * end-game: the GameState.bullets array directly).
 */
export function stepBullet(state: BulletState, dtSec: number): BulletState {
  const { dx, dy } = DIR_DELTA[state.rotation];
  const distance = state.speed * dtSec;
  return {
    ...state,
    x: state.x + dx * distance,
    y: state.y + dy * distance,
  };
}

/**
 * Result of resolving a single bullet-vs-bullet contact. Returned as a
 * descriptor so the caller — which still owns the Phaser tree — performs the
 * actual `nullify()` calls; the rule itself is pure.
 *
 * Original behavior (preserved):
 *   - two enemy bullets pass through each other
 *   - two player bullets pass through each other
 *   - a player bullet and an enemy bullet annihilate each other
 */
export interface BulletPairOutcome {
  destroyA: boolean;
  destroyB: boolean;
}

// Narrowed input type: this rule only depends on which side each bullet
// belongs to. Keeping the signature minimal makes the call site explicit
// about what state actually drives the decision.
export function resolveBulletPair(
  a: Pick<BulletState, 'side'>,
  b: Pick<BulletState, 'side'>,
): BulletPairOutcome {
  if (a.side === b.side) {
    return { destroyA: false, destroyB: false };
  }
  return { destroyA: true, destroyB: true };
}
