/**
 * Phase 2.4 — Pure bomb fuse logic.
 *
 * A bomb has two intermixed timers:
 *   - detonateTicksLeft: counts down 2 seconds, then asks the adapter to
 *     spawn an Explosion + BombBlast at the bomb's position.
 *   - blinkTicksLeft: drives a visual flash (gameplay-irrelevant), but the
 *     blink RATE depends on the detonate timer — speeds up to fast-blink
 *     during the final second.
 *
 * Both timers go in the pure state because both are deterministic integer
 * countdowns. The blink is *technically* render-only, but driving it from
 * a separate render-side clock would let it drift across peers, so we keep
 * it serialised.
 */

const SIM_HZ = 60;

const DETONATE_DELAY_TICKS = Math.round(2 * SIM_HZ);
const BLINK_INTERVAL_TICKS = Math.round(0.25 * SIM_HZ);
const BLINK_INTERVAL_FAST_TICKS = Math.round(0.1 * SIM_HZ);
const BLINK_FAST_THRESHOLD_TICKS = Math.round(1 * SIM_HZ);

export interface BombState {
  detonateTicksLeft: number;
  blinkTicksLeft: number;
  blinkVisible: boolean;
}

export function initBomb(): BombState {
  return {
    detonateTicksLeft: DETONATE_DELAY_TICKS,
    blinkTicksLeft: BLINK_INTERVAL_TICKS,
    blinkVisible: true,
  };
}

export interface BombDecision {
  state: BombState;
  /** Sprite opacity for this tick — adapter writes to painter.opacity. */
  opacity: 0 | 1;
  /** Adapter should spawn Explosion + BombBlast and remove the bomb. */
  detonate: boolean;
}

export function stepBomb(stateIn: BombState): BombDecision {
  // Tick the detonate timer first so the blink check below sees this tick's
  // remaining time, matching legacy ordering. We use `> 0` semantics here
  // (and below) so a timer initialised to N fires exactly on the Nth call,
  // consistent with the post-Phase-1.4 Timer convention.
  const detonateNext = Math.max(0, stateIn.detonateTicksLeft - 1);
  const blinkNext = stateIn.blinkTicksLeft - 1;

  // Default: just tick the counters; opacity unchanged.
  let next: BombState = {
    detonateTicksLeft: detonateNext,
    blinkTicksLeft: blinkNext,
    blinkVisible: stateIn.blinkVisible,
  };

  if (blinkNext <= 0) {
    const flipped = !stateIn.blinkVisible;
    const isFinalSecond = detonateNext < BLINK_FAST_THRESHOLD_TICKS;
    next = {
      detonateTicksLeft: detonateNext,
      blinkTicksLeft: isFinalSecond
        ? BLINK_INTERVAL_FAST_TICKS
        : BLINK_INTERVAL_TICKS,
      blinkVisible: flipped,
    };
  }

  return {
    state: next,
    opacity: next.blinkVisible ? 1 : 0,
    detonate: detonateNext <= 0,
  };
}
