/**
 * Phase 2.4 — Pure AI behavior (the "basic" enemy AI).
 *
 * This is the migrated version of AiTankBehavior. Six other enemy behaviors
 * (Hunter, Ambush, AttackBase, FastBomber, …) are variants of this template,
 * so the patterns established here — three-phase tick split, RNG via injected
 * Random, timers as integer ticks in serializable state — are intended to be
 * the model for migrating those too.
 *
 * Why three phases? The original behavior performs three operations
 * intermixed with side effects on the live Tank: it may call tank.fire(), it
 * may call tank.rotate(), it may call tank.move(). The fire and move both
 * affect what the rest of the tick should do — fire success can flip the
 * mode out of Firing; move changes the position used for stuck detection.
 * Splitting into three pure phases bracketed by adapter side-effects keeps
 * each pure function reasoning about only one window of the tick.
 *
 * The phases:
 *
 *   aiPhaseFire(state, rand) → { state, tryFire }
 *     Decrement / reset the fire timer. If the timer fired this tick, ask
 *     the adapter to attempt tank.fire(). RNG consumed for the new delay.
 *
 *   aiPhaseDecide(state, obs, hadFired, rand) → { state, rotate, willMove }
 *     Apply the fire result (Firing → Moving on success), then either tick
 *     the think timer down, pick a rotation when thinking is done, or
 *     decide to move.
 *
 *   aiPhaseStuck(state, postObs, rand) → { state }
 *     After the adapter has moved the tank, compare post-move position to
 *     last-tick position to detect being stuck against a wall.
 *
 * RNG ordering is preserved exactly: any RNG call the original made on any
 * branch happens here on the same branch in the same order.
 */

import { Random } from '../../core/Random';
import { Dir } from '../GameState';

// ---- Tuning constants ------------------------------------------------------
// These are intentionally module-private. If you need to tune AI feel,
// change them here and reload — they are not part of the wire format because
// they are shared code, not runtime state.

const SIM_HZ = 60;

const THINK_DURATION_TICKS = Math.round(0.3 * SIM_HZ); // 18
const FIRE_MIN_DELAY_MS = 0;
const FIRE_MAX_DELAY_MS = 1500;

const STUCK_FIRE_CHANCE_PCT = 30;
const UNSTUCK_THINK_CHANCE_PCT = 5;
const ROTATE_TOWARDS_BASE_CHANCE_PCT = 30;
const ROTATE_UP_CHANCE_PCT = 10;

const ROTATIONS: readonly Dir[] = [Dir.Up, Dir.Down, Dir.Left, Dir.Right];

// ---- State / observation / decision types ---------------------------------

export enum AiMode {
  Moving = 0,
  Thinking = 1,
  UnstuckThinking = 2,
  Firing = 3,
}

/**
 * Behavior state. Goes into TankState.ai for network replication. Fully
 * JSON-serializable.
 *
 * `lastX`/`lastY` are integer-rounded positions (parity with original) and
 * are sentineled to a guaranteed-not-equal value before first observation.
 * `fireTicksLeft` of 0 means "fire timer expired — try to fire this tick".
 */
export interface AiState {
  mode: AiMode;
  lastX: number;
  lastY: number;
  thinkTicksLeft: number;
  fireTicksLeft: number;
}

export function initAi(): AiState {
  return {
    mode: AiMode.Moving,
    // Sentinel: original used `new Vector(-1, -1)` — any real tank position
    // will round to something different, so first-tick stuck check fails as
    // intended.
    lastX: Number.NEGATIVE_INFINITY,
    lastY: Number.NEGATIVE_INFINITY,
    thinkTicksLeft: 0,
    fireTicksLeft: 0,
  };
}

export interface AiObservation {
  x: number;
  y: number;
  rotation: Dir;
  baseX: number;
  baseY: number;
  tileSize: number;
}

// ---- Pure helpers (rules, no orchestration) -------------------------------

/**
 * Pick a fire delay in seconds, matching the original
 *   `RandomUtils.number(0, 1500) / 1000`
 * — i.e. uniform in [0, 1.5) seconds at millisecond granularity.
 */
export function pickFireDelaySeconds(rand: Random): number {
  return rand.int(FIRE_MIN_DELAY_MS, FIRE_MAX_DELAY_MS) / 1000;
}

export function getRotationTowardsBase(
  baseX: number,
  baseY: number,
  tankX: number,
  tankY: number,
): Dir {
  // Reproduces the original's "normalize direction, snap to axis" trick.
  // Note that the original used `Math.max(direction.x, direction.y)` (signed),
  // not abs — preserved verbatim for behavioral parity. The math reduces to:
  //   maxValue := max(dx, dy) / hypot(dx, dy)
  //   if |dx/hypot| == |maxValue|: pick Right or Left by dx sign
  //   else: pick Down (legacy default — Battle City base is at the bottom)
  const dx = baseX - tankX;
  const dy = baseY - tankY;
  const length = Math.hypot(dx, dy) || 1;
  const nx = dx / length;
  const ny = dy / length;
  const maxValue = Math.max(nx, ny);

  if (Math.abs(nx) === Math.abs(maxValue)) {
    if (nx > 0) return Dir.Right;
    if (nx < 0) return Dir.Left;
  }
  return Dir.Down;
}

export function getRandomRotationExcept(rand: Random, except: Dir): Dir {
  const candidates = ROTATIONS.filter((r) => r !== except);
  return rand.pick(candidates.slice());
}

export function pickNextRotation(
  rand: Random,
  obs: AiObservation,
): Dir {
  if (rand.probability(ROTATE_TOWARDS_BASE_CHANCE_PCT)) {
    return getRotationTowardsBase(obs.baseX, obs.baseY, obs.x, obs.y);
  }
  if (rand.probability(ROTATE_UP_CHANCE_PCT)) {
    return Dir.Up;
  }
  // "Pick any but Up" — same as the legacy code. Up is biased against because
  // the base is south on stock Battle City maps.
  return getRandomRotationExcept(rand, Dir.Up);
}

export function shouldThinkWhenUnstuck(
  obs: AiObservation,
  rand: Random,
): boolean {
  // RNG must be consumed BEFORE the position-check branches because the
  // original consumed it unconditionally on this path. Preserves wire-level
  // RNG sequence.
  const hasChance = rand.probability(UNSTUCK_THINK_CHANCE_PCT);

  const isVertical = obs.rotation === Dir.Up || obs.rotation === Dir.Down;
  const isHorizontal = obs.rotation === Dir.Left || obs.rotation === Dir.Right;

  const onTileX = isHorizontal && obs.x % obs.tileSize === 0;
  const onTileY = isVertical && obs.y % obs.tileSize === 0;

  return hasChance && (onTileX || onTileY);
}

// ---- Three-phase tick ------------------------------------------------------

export interface FirePhaseResult {
  state: AiState;
  /** Adapter should call tank.fire() iff this is true. */
  tryFire: boolean;
}

export function aiPhaseFire(state: AiState, rand: Random): FirePhaseResult {
  if (state.fireTicksLeft <= 0) {
    // Reset the timer with a fresh random delay regardless of whether the
    // fire side-effect succeeds. Matches original `attemptFire()`.
    const delaySec = pickFireDelaySeconds(rand);
    return {
      state: {
        ...state,
        fireTicksLeft: Math.max(1, Math.round(delaySec * SIM_HZ)),
      },
      tryFire: true,
    };
  }
  return {
    state: { ...state, fireTicksLeft: state.fireTicksLeft - 1 },
    tryFire: false,
  };
}

export interface DecidePhaseResult {
  state: AiState;
  /** If non-null, adapter calls tank.rotate(). */
  rotate: Dir | null;
  /** If true, adapter calls tank.move(). */
  willMove: boolean;
}

export function aiPhaseDecide(
  stateIn: AiState,
  obs: AiObservation,
  hadFired: boolean,
  rand: Random,
): DecidePhaseResult {
  let state = stateIn;

  // Apply fire result: leaving Firing requires both an intent (we tried to
  // fire) and success.
  if (hadFired && state.mode === AiMode.Firing) {
    state = { ...state, mode: AiMode.Moving };
  }

  // Still waiting in Firing — no rotate, no move.
  if (state.mode === AiMode.Firing) {
    return { state, rotate: null, willMove: false };
  }

  if (state.mode === AiMode.Thinking || state.mode === AiMode.UnstuckThinking) {
    if (state.thinkTicksLeft > 0) {
      return {
        state: { ...state, thinkTicksLeft: state.thinkTicksLeft - 1 },
        rotate: null,
        willMove: false,
      };
    }
    // Think timer expired. While stuck-thinking, the tank may decide to
    // fire instead of rotating (matches original `shouldFireWhenStuck`).
    if (
      state.mode === AiMode.Thinking &&
      rand.probability(STUCK_FIRE_CHANCE_PCT)
    ) {
      return {
        state: { ...state, mode: AiMode.Firing },
        rotate: null,
        willMove: false,
      };
    }
    const newRot = pickNextRotation(rand, obs);
    return {
      state: { ...state, mode: AiMode.Moving },
      rotate: newRot,
      willMove: false,
    };
  }

  // mode === Moving: caller will move; stuck detection happens in postMove.
  return { state, rotate: null, willMove: true };
}

export interface StuckPhaseResult {
  state: AiState;
}

export function aiPhaseStuck(
  stateIn: AiState,
  postObs: { x: number; y: number; rotation: Dir; tileSize: number; baseX: number; baseY: number },
  rand: Random,
): StuckPhaseResult {
  // Only Moving evaluates stuck — Firing/Thinking never reached this phase
  // because the adapter sees willMove=false and short-circuits.
  if (stateIn.mode !== AiMode.Moving) {
    return { state: stateIn };
  }

  const x = Math.round(postObs.x);
  const y = Math.round(postObs.y);
  const isStuck = stateIn.lastX === x && stateIn.lastY === y;

  if (isStuck) {
    return {
      state: {
        ...stateIn,
        mode: AiMode.Thinking,
        thinkTicksLeft: THINK_DURATION_TICKS,
        // Intentional parity: lastPosition NOT updated on the stuck branch
        // so the next tick still compares against the original baseline.
      },
    };
  }

  // Not stuck — may still randomly decide to pause and think. Note that
  // RNG is consumed here regardless of the on-tile check (matches original).
  if (shouldThinkWhenUnstuck(postObs, rand)) {
    return {
      state: {
        ...stateIn,
        mode: AiMode.UnstuckThinking,
        thinkTicksLeft: THINK_DURATION_TICKS,
      },
    };
  }

  return { state: { ...stateIn, lastX: x, lastY: y } };
}
