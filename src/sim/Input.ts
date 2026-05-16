/**
 * Phase 2 — Per-tick input for one player.
 *
 * Lockstep design: every peer broadcasts its own `Input` for tick N; the sim
 * advances only when ALL peers' inputs for tick N have arrived. Inputs are
 * intentionally small and bitmask-friendly so the wire format is a few bytes
 * per player per tick.
 *
 * Only intentional player actions live here. Anything else — AI decisions,
 * powerup spawn rolls, enemy fire — must be derived inside simulate() from
 * the shared RNG, never from per-peer local state.
 */

export const enum InputBits {
  Up = 1 << 0,
  Right = 1 << 1,
  Down = 1 << 2,
  Left = 1 << 3,
  Fire = 1 << 4,
  Pause = 1 << 5,
}

/** Single byte per player per tick — easy to pack into a Uint8Array. */
export type PlayerInputBits = number;

/** Tick-aligned input frame for the whole match. Index = partyIndex. */
export interface InputFrame {
  tick: number;
  players: PlayerInputBits[];
}

export function makeInput(bits: Partial<Record<keyof typeof InputBits, boolean>>): PlayerInputBits {
  let v = 0;
  if (bits.Up) v |= InputBits.Up;
  if (bits.Right) v |= InputBits.Right;
  if (bits.Down) v |= InputBits.Down;
  if (bits.Left) v |= InputBits.Left;
  if (bits.Fire) v |= InputBits.Fire;
  if (bits.Pause) v |= InputBits.Pause;
  return v;
}

export function has(input: PlayerInputBits, bit: InputBits): boolean {
  return (input & bit) !== 0;
}
