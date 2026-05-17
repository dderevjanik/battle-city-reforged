/**
 * Phase 2.4 — Pure Hunter AI behavior.
 *
 * Hunter is "Blinky-style" pursuit: at every grid intersection (and on a
 * redirect timer) re-orient toward the nearest player. Three modes — Moving,
 * Thinking, Firing — and the same three-phase tick split as the basic Ai
 * behavior. The differences from src/sim/behaviors/ai.ts are:
 *
 *   - No UnstuckThinking mode — Hunter goes straight back to Moving after a
 *     thinking pause.
 *   - Rotation pick is deterministic chase ("score" each candidate by the
 *     dot product of its direction vector with the diff-to-player vector),
 *     not random. Falls back to random pick only when no player is observed.
 *   - Adds a redirect timer that fires periodically during Moving to re-pick
 *     the best chase rotation.
 *
 * Player position is supplied through the observation, NOT discovered by
 * tree traversal — that is exactly the kind of side effect that has to live
 * in the adapter for the function to remain pure. The adapter walks the
 * tree and passes coordinates in.
 */

import { Random } from '../../core/Random';
import { Dir } from '../GameState';

const SIM_HZ = 60;

const THINK_DURATION_TICKS = Math.round(0.3 * SIM_HZ);
const REDIRECT_INTERVAL_TICKS = Math.round(0.4 * SIM_HZ);
const FIRE_MIN_DELAY_MS = 0;
const FIRE_MAX_DELAY_MS = 1500;
const STUCK_FIRE_CHANCE_PCT = 30;

const ROTATIONS: readonly Dir[] = [Dir.Up, Dir.Down, Dir.Left, Dir.Right];

export enum HunterMode {
  Moving = 0,
  Thinking = 1,
  Firing = 2,
}

export interface HunterState {
  mode: HunterMode;
  lastX: number;
  lastY: number;
  thinkTicksLeft: number;
  fireTicksLeft: number;
  redirectTicksLeft: number;
}

export function initHunter(): HunterState {
  return {
    mode: HunterMode.Moving,
    lastX: Number.NEGATIVE_INFINITY,
    lastY: Number.NEGATIVE_INFINITY,
    thinkTicksLeft: 0,
    fireTicksLeft: 0,
    redirectTicksLeft: 0,
  };
}

/**
 * `playerX`/`playerY` are null when no player tank exists (e.g. between
 * deaths/respawns). On null, rotation falls back to a random pick.
 */
export interface HunterObservation {
  x: number;
  y: number;
  rotation: Dir;
  playerX: number | null;
  playerY: number | null;
}

// ---- Rotation scoring (pure helpers) --------------------------------------

/**
 * Score how well a given direction closes distance to a target offset.
 * Higher score = better. Used by pickBestRotation to greedily chase.
 *
 * IMPORTANT: matches the legacy implementation, which is screen-coord-based:
 * Right scores +dx (right tank wants base east), Down scores +dy (down tank
 * wants base south), with the y-axis convention of "Down means y increases"
 * coming from the engine's screen-space rotation, not the y-up world space
 * used by stepBullet. This is intentional — preserves legacy chase behavior
 * verbatim.
 */
export function scoreRotation(rotation: Dir, dx: number, dy: number): number {
  switch (rotation) {
    case Dir.Right: return dx;
    case Dir.Left: return -dx;
    case Dir.Down: return dy;
    case Dir.Up: return -dy;
  }
}

export function pickBestRotation(
  candidates: readonly Dir[],
  dx: number,
  dy: number,
): Dir {
  let best = candidates[0];
  let bestScore = -Infinity;
  for (const r of candidates) {
    const s = scoreRotation(r, dx, dy);
    if (s > bestScore) {
      bestScore = s;
      best = r;
    }
  }
  return best;
}

/**
 * Choose the next rotation. Two inputs gate the behavior:
 *   - candidates: which rotations are allowed (caller may exclude the
 *     currently-stuck direction).
 *   - player coordinates: if both are non-null we chase; otherwise pick
 *     uniformly at random from candidates.
 *
 * RNG is consumed ONLY in the fallback branch. Both peers seeing the same
 * (state, obs) will consume the same amount.
 */
export function pickChaseRotation(
  rand: Random,
  candidates: readonly Dir[],
  obs: HunterObservation,
): Dir {
  if (obs.playerX === null || obs.playerY === null) {
    return rand.pick(candidates.slice());
  }
  return pickBestRotation(candidates, obs.playerX - obs.x, obs.playerY - obs.y);
}

// ---- Three-phase tick -----------------------------------------------------

export interface HunterFireResult {
  state: HunterState;
  tryFire: boolean;
}

export function hunterPhaseFire(state: HunterState, rand: Random): HunterFireResult {
  if (state.fireTicksLeft <= 0) {
    const delaySec = rand.int(FIRE_MIN_DELAY_MS, FIRE_MAX_DELAY_MS) / 1000;
    return {
      state: { ...state, fireTicksLeft: Math.max(1, Math.round(delaySec * SIM_HZ)) },
      tryFire: true,
    };
  }
  return {
    state: { ...state, fireTicksLeft: state.fireTicksLeft - 1 },
    tryFire: false,
  };
}

export interface HunterDecideResult {
  state: HunterState;
  rotate: Dir | null;
  willMove: boolean;
}

export function hunterPhaseDecide(
  stateIn: HunterState,
  obs: HunterObservation,
  hadFired: boolean,
  rand: Random,
): HunterDecideResult {
  let state = stateIn;

  if (hadFired && state.mode === HunterMode.Firing) {
    state = { ...state, mode: HunterMode.Moving };
  }

  if (state.mode === HunterMode.Firing) {
    return { state, rotate: null, willMove: false };
  }

  if (state.mode === HunterMode.Thinking) {
    if (state.thinkTicksLeft > 0) {
      return {
        state: { ...state, thinkTicksLeft: state.thinkTicksLeft - 1 },
        rotate: null,
        willMove: false,
      };
    }
    // Think timer expired. May randomly choose to fire instead of rotating.
    if (rand.probability(STUCK_FIRE_CHANCE_PCT)) {
      return {
        state: { ...state, mode: HunterMode.Firing },
        rotate: null,
        willMove: false,
      };
    }
    // Pick best rotation EXCLUDING the direction we were stuck facing.
    // Matches legacy `candidates.filter(r => r !== tank.rotation)`.
    const candidates = ROTATIONS.filter((r) => r !== obs.rotation);
    const next = pickChaseRotation(rand, candidates, obs);
    return {
      state: { ...state, mode: HunterMode.Moving },
      rotate: next,
      willMove: false,
    };
  }

  // mode === Moving — caller will move; redirect/stuck handled in phase 3.
  return { state, rotate: null, willMove: true };
}

export interface HunterStuckResult {
  state: HunterState;
  /** Non-null when the periodic redirect timer fires this tick. */
  rotate: Dir | null;
}

export function hunterPhaseStuck(
  stateIn: HunterState,
  postObs: HunterObservation,
  rand: Random,
): HunterStuckResult {
  if (stateIn.mode !== HunterMode.Moving) {
    return { state: stateIn, rotate: null };
  }

  const x = Math.round(postObs.x);
  const y = Math.round(postObs.y);
  const isStuck = stateIn.lastX === x && stateIn.lastY === y;

  if (isStuck) {
    return {
      state: {
        ...stateIn,
        mode: HunterMode.Thinking,
        thinkTicksLeft: THINK_DURATION_TICKS,
      },
      rotate: null,
    };
  }

  // Not stuck. Either fire the periodic redirect, or just decrement the
  // redirect timer.
  if (stateIn.redirectTicksLeft <= 0) {
    const rot = pickChaseRotation(rand, ROTATIONS, postObs);
    return {
      state: {
        ...stateIn,
        lastX: x,
        lastY: y,
        redirectTicksLeft: REDIRECT_INTERVAL_TICKS,
      },
      rotate: rot,
    };
  }

  return {
    state: {
      ...stateIn,
      lastX: x,
      lastY: y,
      redirectTicksLeft: stateIn.redirectTicksLeft - 1,
    },
    rotate: null,
  };
}
