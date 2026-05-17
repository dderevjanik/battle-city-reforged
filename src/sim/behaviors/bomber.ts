/**
 * Phase 2.4 — Pure bomb-drop scheduler used by FastBomberTankBehavior.
 *
 * FastBomber is a wrapper: it composes any base tank behavior and adds a
 * periodic bomb drop on top. The base behavior itself stays in the adapter
 * (composition lives at the GameObject level); only the bomb scheduler is
 * pure here.
 *
 * Bomb timing rolls a uniform integer in [MIN_DELAY, MAX_DELAY) seconds —
 * matches the legacy `RandomUtils.number(min, max)` call where min/max are
 * seconds and the result is in seconds (no /1000 trick this time, unlike
 * fire delays).
 */

import { Random } from '../../core/Random';

const SIM_HZ = 60;

const BOMB_DROP_MIN_DELAY_SEC = 3;
const BOMB_DROP_MAX_DELAY_SEC = 8;

export interface BomberState {
  /** Ticks remaining until the next scheduled bomb drop. */
  bombTicksLeft: number;
  /** Whether a bomb has ever been dropped — used for "drop on death" parity. */
  hasDroppedBomb: boolean;
}

/**
 * Initial state with the timer pre-rolled. Matches legacy behavior, which
 * also rolled the first delay in the field initializer.
 */
export function initBomber(rand: Random): BomberState {
  const delaySec = rand.int(BOMB_DROP_MIN_DELAY_SEC, BOMB_DROP_MAX_DELAY_SEC);
  return {
    bombTicksLeft: Math.max(1, Math.round(delaySec * SIM_HZ)),
    hasDroppedBomb: false,
  };
}

export interface BomberDecision {
  state: BomberState;
  /** Adapter should call its dropBomb side effect iff this is true. */
  dropBomb: boolean;
}

export function stepBomber(state: BomberState, rand: Random): BomberDecision {
  if (state.bombTicksLeft > 1) {
    return {
      state: { ...state, bombTicksLeft: state.bombTicksLeft - 1 },
      dropBomb: false,
    };
  }

  // Timer fires this tick: drop and reroll the next delay.
  const nextDelaySec = rand.int(BOMB_DROP_MIN_DELAY_SEC, BOMB_DROP_MAX_DELAY_SEC);
  return {
    state: {
      bombTicksLeft: Math.max(1, Math.round(nextDelaySec * SIM_HZ)),
      hasDroppedBomb: true,
    },
    dropBomb: true,
  };
}
