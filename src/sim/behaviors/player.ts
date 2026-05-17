/**
 * Phase 2.4 — Pure player tank behavior.
 *
 * The seam where networked multiplayer plugs in. Today the adapter reads
 * the local InputManager and translates to PlayerInputBits before calling
 * stepPlayer. Tomorrow a network layer will deliver PlayerInputBits over
 * the wire for each remote peer and call the same stepPlayer with no other
 * change — that is the whole reason for the migration.
 *
 * Stateless: every per-tick decision is determined by the current input
 * bits and the current tank state (slide, stun, idle). No history is
 * carried in the behavior — anything that needs to persist (slide timer,
 * stun timer) already lives on the tank and is sim-replicated.
 *
 * Multi-direction handling: when a player holds two direction bits at once
 * the legacy code used "most recently held" (a history-dependent rule).
 * We replace it with a deterministic priority order, Up > Down > Left >
 * Right, which costs us nothing for typical play (players hold one
 * direction at a time) and removes the need to carry input history across
 * ticks for parity in lockstep.
 */

import { Dir } from '../GameState';
import { InputBits, PlayerInputBits, has } from '../Input';

export interface PlayerObservation {
  /** tank.isSliding() — movement is disabled while sliding on ice. */
  isSliding: boolean;
  /** tank.isStunned() — movement is disabled while stunned. */
  isStunned: boolean;
  /** tank.state === TankState.Idle — used to gate the idle transition. */
  isIdle: boolean;
}

export interface PlayerDecision {
  /** Adapter should attempt tank.fire(). */
  tryFire: boolean;
  /** Non-null when the player changed facing direction this tick. */
  rotate: Dir | null;
  /** Adapter should call tank.move(dt). */
  willMove: boolean;
  /** Adapter should call tank.idle() — fires only on the moving→idle edge. */
  willIdle: boolean;
}

/** Internal: pick the rotation for this tick from the held direction bits. */
function pickRotation(input: PlayerInputBits): Dir | null {
  // Priority order matches the legacy enum order (Up=0, Right=1, Down=2,
  // Left=3) but with Up first and Right last — Battle City spawns face Up,
  // so prioritising Up minimises "stuck at spawn" frustration. Right last
  // because Right is the typical secondary-thumb direction.
  if (has(input, InputBits.Up)) return Dir.Up;
  if (has(input, InputBits.Down)) return Dir.Down;
  if (has(input, InputBits.Left)) return Dir.Left;
  if (has(input, InputBits.Right)) return Dir.Right;
  return null;
}

const MOVE_BITS =
  InputBits.Up | InputBits.Down | InputBits.Left | InputBits.Right;

export function stepPlayer(
  input: PlayerInputBits,
  obs: PlayerObservation,
): PlayerDecision {
  // Fire is always considered — the rate limit lives in TankWeaponSystem,
  // which the adapter still calls. A pressed-but-unable-to-fire frame is a
  // legitimate state in the original game and is preserved here.
  const tryFire = has(input, InputBits.Fire);

  // Movement is disabled while sliding or stunned. Note: the legacy code
  // still allowed firing in those states, so the fire decision above is
  // unconditional.
  if (obs.isSliding || obs.isStunned) {
    return { tryFire, rotate: null, willMove: false, willIdle: false };
  }

  const dir = pickRotation(input);
  const anyMoveHeld = (input & MOVE_BITS) !== 0;

  return {
    tryFire,
    rotate: dir,
    willMove: anyMoveHeld,
    // Transition to idle only on the edge — calling tank.idle() while
    // already idle is a no-op but the original guarded against it, so we
    // preserve the same `state !== Idle` check.
    willIdle: !anyMoveHeld && !obs.isIdle,
  };
}
