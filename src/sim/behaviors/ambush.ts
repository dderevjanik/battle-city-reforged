/**
 * Phase 2.4 — Pure Ambush AI behavior.
 *
 * Ambush is Pinky-style pursuit: target a point N tiles ahead of the player
 * in the player's facing direction, not the player itself. The chase
 * mechanic, state machine, and three-phase tick are otherwise identical to
 * Hunter — they share src/sim/behaviors/chase.ts. The only ambush-specific
 * logic lives in `projectAmbushTarget` below.
 *
 * Re-exports from chase are intentional so the AmbushTankBehavior adapter
 * has a single import path and does not need to know which module owns each
 * phase function.
 */

import { Dir } from '../GameState';

export {
  ChaseMode as AmbushMode,
  ChaseState as AmbushState,
  ChaseObservation as AmbushObservation,
  ChaseDecideResult as AmbushDecideResult,
  ChaseFireResult as AmbushFireResult,
  ChaseStuckResult as AmbushStuckResult,
  chasePhaseDecide as ambushPhaseDecide,
  chasePhaseFire as ambushPhaseFire,
  chasePhaseStuck as ambushPhaseStuck,
  initChase as initAmbush,
} from './chase';

/**
 * Project the player's position N tiles ahead in their facing direction.
 *
 * Uses SCREEN-COORD convention (matches the legacy implementation): Up
 * subtracts from Y, Down adds to Y. This is the opposite sign convention
 * from bullet movement (which is y-up world space) — preserved so that the
 * ambush point lands in the same visual spot as the legacy version.
 *
 * `playerRotation` is the live Dir enum. `offsetPx` is total displacement
 * in pixels — typically TILES_AHEAD * TILE_SIZE.
 */
export function projectAmbushTarget(
  playerX: number,
  playerY: number,
  playerRotation: Dir,
  offsetPx: number,
): { x: number; y: number } {
  switch (playerRotation) {
    case Dir.Up: return { x: playerX, y: playerY - offsetPx };
    case Dir.Down: return { x: playerX, y: playerY + offsetPx };
    case Dir.Left: return { x: playerX - offsetPx, y: playerY };
    case Dir.Right: return { x: playerX + offsetPx, y: playerY };
  }
}
