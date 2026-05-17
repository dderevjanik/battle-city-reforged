/**
 * Phase 2.4 — Pure behavior: patrol.
 *
 * Demonstrates the path A + option 2 pattern for tank AI: behavior logic
 * lives in pure (state, observation) → (state, decision) functions. The
 * existing PatrolTankBehavior class becomes a thin adapter that:
 *
 *   1. Observes the live Tank's position/rotation.
 *   2. Calls the pure function.
 *   3. Applies the resulting decision via the live Tank's mutators.
 *
 * Each behavior owns:
 *   - its own State type — gets serialized into TankState.ai for network sync
 *   - its own Observation type — read-only inputs from the world this tick
 *   - its own Decision type — instructions for the adapter / view layer
 *
 * Nothing here imports from gameObjects/. If something does, the behavior is
 * no longer pure and the migration broke.
 */

import { Dir } from '../GameState';

/**
 * Stored state — survives across ticks. Must be JSON-serializable: this is
 * the slice that goes into TankState.ai for network replication.
 *
 * `lastX`/`lastY` are integer-rounded so two peers comparing positions agree
 * on equality without float jitter.
 */
export interface PatrolState {
  lastX: number | null;
  lastY: number | null;
}

export function initPatrol(): PatrolState {
  return { lastX: null, lastY: null };
}

/** Single-tick observation passed to the behavior. */
export interface PatrolObservation {
  x: number;
  y: number;
  rotation: Dir;
}

/**
 * Decision returned to the adapter. The adapter applies these by calling
 * the corresponding methods on the live Tank.
 *
 * `rotate` — flip facing direction (180°) before the move when stuck.
 * `move`   — true means consume one move step this tick.
 * `secondMove` — when we rotated, the original code calls `tank.move()` a
 *                second time the same tick to immediately commit motion in
 *                the new direction. Preserved for behavioral parity.
 */
export interface PatrolDecision {
  rotate: Dir | null;
  move: boolean;
  secondMove: boolean;
}

/**
 * The opposite cardinal for each direction. Indexed by Dir enum value.
 */
const OPPOSITE: readonly Dir[] = [Dir.Down, Dir.Left, Dir.Up, Dir.Right];

export function stepPatrol(
  state: PatrolState,
  obs: PatrolObservation,
): { state: PatrolState; decision: PatrolDecision } {
  const x = Math.round(obs.x);
  const y = Math.round(obs.y);

  // Stuck: rounded position unchanged since last tick. Flip facing and move
  // twice — once for "this tick's" already-failed move and once in the new
  // direction. This matches the original PatrolTankBehavior exactly.
  const isStuck = state.lastX === x && state.lastY === y;

  if (isStuck) {
    // Intentional parity with the original: lastPosition is NOT updated on
    // the stuck branch, so next tick still compares against the same
    // baseline. Without this, a tank that flip-and-stays-stuck would
    // flip-flop every other tick instead of pushing through.
    return {
      state,
      decision: {
        rotate: OPPOSITE[obs.rotation],
        move: true,
        secondMove: true,
      },
    };
  }

  return {
    state: { lastX: x, lastY: y },
    decision: { rotate: null, move: true, secondMove: false },
  };
}
