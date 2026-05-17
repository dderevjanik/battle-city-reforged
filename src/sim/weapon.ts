/**
 * Phase 2.4 — Pure weapon firing rules.
 *
 * The weapon answers one question per call: given the tank's current state
 * and attributes, is fire allowed this tick? Live concerns (constructing
 * the bullet GameObject, positioning it, attaching it to the tree, wiring
 * the `died` listener) stay in the adapter — they touch Phaser and are
 * not pure.
 *
 * `bulletCount` is passed in by the adapter (which owns the bullets array)
 * rather than stored in WeaponState, because the bullets themselves are
 * already replicated as part of GameState.bullets. Tracking the count
 * twice would let it drift.
 */

const SIM_HZ = 60;

export interface WeaponState {
  /** Ticks until the rapid-fire cooldown lapses; 0 = ready to fire. */
  cooldownTicksLeft: number;
}

export function initWeapon(): WeaponState {
  return { cooldownTicksLeft: 0 };
}

/**
 * Fire is permitted iff both:
 *   - the bullet cap has room (bulletCount < maxBullets)
 *   - the rapid-fire cooldown has lapsed (cooldownTicksLeft === 0)
 *
 * Both checks reproduce the legacy `bullets.length >= max` (strict >=
 * blocked) and `lastFireTimer.isActive()` (blocked while > 0). Phrased as
 * "can" rather than "should" because the adapter still chooses whether to
 * call this — it answers the eligibility question only.
 */
export function canFire(
  state: WeaponState,
  bulletCount: number,
  maxBullets: number,
): boolean {
  if (bulletCount >= maxBullets) return false;
  if (state.cooldownTicksLeft > 0) return false;
  return true;
}

/**
 * Tick the cooldown down by one. Idempotent at zero (returns the same
 * state object, no spurious mutation). Adapter calls this once per sim
 * tick from Tank.update.
 */
export function tickWeapon(state: WeaponState): WeaponState {
  if (state.cooldownTicksLeft <= 0) return state;
  return { cooldownTicksLeft: state.cooldownTicksLeft - 1 };
}

/**
 * Apply the rapid-fire cooldown after a successful fire. `rapidFireDelaySec`
 * comes from the tank's attributes — different tank tiers have different
 * rapid-fire intervals.
 */
export function afterFire(
  state: WeaponState,
  rapidFireDelaySec: number,
): WeaponState {
  return {
    cooldownTicksLeft: Math.max(1, Math.round(rapidFireDelaySec * SIM_HZ)),
  };
}
