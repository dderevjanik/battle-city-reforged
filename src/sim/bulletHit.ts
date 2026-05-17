/**
 * Phase 2.4 — Pure rule for "bullet hits a tank".
 *
 * The legacy code threaded shield/friendly-fire/already-stunned/self-bullet
 * checks into one nested branch. Pulled out as a single classifier the
 * decision is a small lookup; the adapter dispatches each case to its
 * side effects (explode, nullify, damage, stun).
 *
 * Inputs are intentionally narrowed: each is a boolean or a `Side` so the
 * rule does not depend on engine tag enums or live GameObjects.
 */

import { Side } from './GameState';

/**
 * Discriminated outcome of a single bullet contact against a tank. Each
 * case maps 1:1 to a legacy branch:
 *
 *   'self-bullet'                — tank's own bullet; ignored entirely.
 *   'shield-absorbs'             — shield is up; nullify the bullet, no damage.
 *   'enemy-vs-enemy'             — enemy bullet on enemy tank; pass through.
 *   'friendly-fire-disabled'     — player bullet, player tank, FF off in
 *                                  session: bullet explodes (visual) and
 *                                  is then nullified; no damage.
 *   'friendly-fire-already-stunned' — bullet explodes but no further stun.
 *   'friendly-fire-stun'         — bullet explodes; tank gets stunned + idle.
 *   'damage'                     — bullet explodes; tank receives damage.
 *
 * Order of checks matches legacy exactly. Reordering them would silently
 * change behavior — e.g. swapping `self-bullet` and `shield-absorbs` would
 * let a tank's own bullet be eaten by its own shield (currently a no-op).
 */
export type BulletHitCase =
  | 'self-bullet'
  | 'shield-absorbs'
  | 'enemy-vs-enemy'
  | 'friendly-fire-disabled'
  | 'friendly-fire-already-stunned'
  | 'friendly-fire-stun'
  | 'damage';

export interface BulletHitInput {
  /** Tank.weapon.hasBullet(bullet) — the bullet was fired by this tank. */
  isSelfBullet: boolean;
  /** Tank has an active Shield GameObject. */
  hasShield: boolean;
  bulletSide: Side;
  tankSide: Side;
  /** Per-session toggle — Session.isFriendlyFireEnabled(). */
  friendlyFireEnabled: boolean;
  /** Tank is currently stunned (suppresses re-stun). */
  alreadyStunned: boolean;
}

export function classifyBulletHit(input: BulletHitInput): BulletHitCase {
  if (input.isSelfBullet) return 'self-bullet';
  if (input.hasShield) return 'shield-absorbs';
  if (input.bulletSide === Side.Enemy && input.tankSide === Side.Enemy) {
    return 'enemy-vs-enemy';
  }
  // From here the bullet always explodes (legacy unconditionally called
  // bullet.explode() at this point). The rest decides what happens TO the
  // tank.
  if (input.bulletSide === Side.Player && input.tankSide === Side.Player) {
    if (!input.friendlyFireEnabled) return 'friendly-fire-disabled';
    if (input.alreadyStunned) return 'friendly-fire-already-stunned';
    return 'friendly-fire-stun';
  }
  return 'damage';
}
