/**
 * Phase 2.4 — Pure "chase" AI behavior template.
 *
 * Shared by Hunter (target = player position) and Ambush (target = N tiles
 * ahead of the player in their facing direction). The only variation
 * between them is HOW the target is computed; the three-phase tick, mode
 * machine, and rotation scoring are identical, so they live here once.
 *
 * Three modes — Moving, Thinking, Firing — and the same three-phase tick
 * split as the basic Ai behavior:
 *
 *   - No UnstuckThinking mode — straight back to Moving after a thinking
 *     pause.
 *   - Rotation pick is a deterministic greedy chase: score each candidate
 *     by how much it closes the diff-to-target, take the max. Falls back
 *     to a random pick only when no target is supplied (no player tank
 *     alive).
 *   - Adds a redirect timer that fires periodically during Moving so the
 *     pursuer re-evaluates direction even on straight corridors.
 *
 * Target coordinates flow in through the observation. The adapter is
 * responsible for computing them (and for any tree walking required to
 * find the player). That is exactly the kind of side effect that has to
 * live in the adapter for this function to remain pure.
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

export enum ChaseMode {
  Moving = 0,
  Thinking = 1,
  Firing = 2,
}

export interface ChaseState {
  mode: ChaseMode;
  lastX: number;
  lastY: number;
  thinkTicksLeft: number;
  fireTicksLeft: number;
  redirectTicksLeft: number;
}

export function initChase(): ChaseState {
  return {
    mode: ChaseMode.Moving,
    lastX: Number.NEGATIVE_INFINITY,
    lastY: Number.NEGATIVE_INFINITY,
    thinkTicksLeft: 0,
    fireTicksLeft: 0,
    redirectTicksLeft: 0,
  };
}

/**
 * `targetX`/`targetY` are null when no chase target is available (e.g. no
 * player alive). On null, rotation falls back to a random pick.
 */
export interface ChaseObservation {
  x: number;
  y: number;
  rotation: Dir;
  targetX: number | null;
  targetY: number | null;
}

// ---- Rotation scoring (pure helpers) --------------------------------------

/**
 * Score how well a given direction closes distance to a target offset.
 * Higher score = better.
 *
 * IMPORTANT: screen-coord based, NOT y-up world space. Right scores +dx,
 * Down scores +dy. This is the opposite sign convention from stepBullet,
 * because the legacy AI scoring runs in the same space as the engine's
 * screen-space rotation. Preserved verbatim — flipping it would silently
 * change chase behavior on every map.
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
 *   - target coordinates: if both are non-null we chase; otherwise pick
 *     uniformly at random from candidates.
 *
 * RNG is consumed ONLY in the fallback branch.
 */
export function pickChaseRotation(
  rand: Random,
  candidates: readonly Dir[],
  obs: ChaseObservation,
): Dir {
  if (obs.targetX === null || obs.targetY === null) {
    return rand.pick(candidates.slice());
  }
  return pickBestRotation(candidates, obs.targetX - obs.x, obs.targetY - obs.y);
}

// ---- Three-phase tick -----------------------------------------------------

export interface ChaseFireResult {
  state: ChaseState;
  tryFire: boolean;
}

export function chasePhaseFire(state: ChaseState, rand: Random): ChaseFireResult {
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

export interface ChaseDecideResult {
  state: ChaseState;
  rotate: Dir | null;
  willMove: boolean;
}

export function chasePhaseDecide(
  stateIn: ChaseState,
  obs: ChaseObservation,
  hadFired: boolean,
  rand: Random,
): ChaseDecideResult {
  let state = stateIn;

  if (hadFired && state.mode === ChaseMode.Firing) {
    state = { ...state, mode: ChaseMode.Moving };
  }

  if (state.mode === ChaseMode.Firing) {
    return { state, rotate: null, willMove: false };
  }

  if (state.mode === ChaseMode.Thinking) {
    if (state.thinkTicksLeft > 0) {
      return {
        state: { ...state, thinkTicksLeft: state.thinkTicksLeft - 1 },
        rotate: null,
        willMove: false,
      };
    }
    if (rand.probability(STUCK_FIRE_CHANCE_PCT)) {
      return {
        state: { ...state, mode: ChaseMode.Firing },
        rotate: null,
        willMove: false,
      };
    }
    const candidates = ROTATIONS.filter((r) => r !== obs.rotation);
    const next = pickChaseRotation(rand, candidates, obs);
    return {
      state: { ...state, mode: ChaseMode.Moving },
      rotate: next,
      willMove: false,
    };
  }

  return { state, rotate: null, willMove: true };
}

export interface ChaseStuckResult {
  state: ChaseState;
  /** Non-null when the periodic redirect timer fires this tick. */
  rotate: Dir | null;
}

export function chasePhaseStuck(
  stateIn: ChaseState,
  postObs: ChaseObservation,
  rand: Random,
): ChaseStuckResult {
  if (stateIn.mode !== ChaseMode.Moving) {
    return { state: stateIn, rotate: null };
  }

  const x = Math.round(postObs.x);
  const y = Math.round(postObs.y);
  const isStuck = stateIn.lastX === x && stateIn.lastY === y;

  if (isStuck) {
    return {
      state: {
        ...stateIn,
        mode: ChaseMode.Thinking,
        thinkTicksLeft: THINK_DURATION_TICKS,
      },
      rotate: null,
    };
  }

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
