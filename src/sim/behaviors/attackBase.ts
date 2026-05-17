/**
 * Phase 2.4 — Pure AttackBase AI behavior.
 *
 * Always chases the nearest base on the map. The chase mechanic, state
 * machine, and three-phase tick come unchanged from src/sim/behaviors/chase.ts;
 * the only AttackBase-specific rule is "given a list of base positions, pick
 * the nearest", which lives below.
 *
 * Base positions are passed in by the adapter — they are level-config data
 * (where each map places its base) and not part of per-tick observation.
 */

import { pickBestRotation } from './chase';

export {
  ChaseMode as AttackBaseMode,
  ChaseState as AttackBaseState,
  ChaseObservation as AttackBaseObservation,
  ChaseDecideResult as AttackBaseDecideResult,
  ChaseFireResult as AttackBaseFireResult,
  ChaseStuckResult as AttackBaseStuckResult,
  chasePhaseDecide as attackBasePhaseDecide,
  chasePhaseFire as attackBasePhaseFire,
  chasePhaseStuck as attackBasePhaseStuck,
  initChase as initAttackBase,
} from './chase';

export interface Point {
  x: number;
  y: number;
}

/**
 * Pick the base nearest to (tankX, tankY) by Euclidean distance.
 *
 * Returns null when the list is empty — that signals the adapter to fall
 * back to a default (or to do nothing). We avoid hard-coding the default
 * here because it is a level-config value, not a behavior rule.
 *
 * Distance is compared without `sqrt` (compare squared distances) to keep
 * the math integer-friendly and avoid the float library call entirely.
 */
export function pickNearestBase(
  bases: readonly Point[],
  tankX: number,
  tankY: number,
): Point | null {
  if (bases.length === 0) return null;

  let nearest = bases[0];
  let bestSq = sqDist(tankX, tankY, nearest.x, nearest.y);
  for (let i = 1; i < bases.length; i++) {
    const sq = sqDist(tankX, tankY, bases[i].x, bases[i].y);
    if (sq < bestSq) {
      bestSq = sq;
      nearest = bases[i];
    }
  }
  return nearest;
}

function sqDist(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

// Re-export so the adapter (or future tests) can score a rotation against the
// chosen base without importing chase directly.
export { pickBestRotation };
