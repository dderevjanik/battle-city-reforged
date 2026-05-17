/**
 * Phase 2 — Canonical serializable simulation state.
 *
 * This module is the authoritative declaration of "what two networked peers
 * must agree on, byte-for-byte, every tick". Anything not in this struct is
 * by definition presentation (sprite frames, screen shake, sound, UI text).
 *
 * Every field is a plain JSON value: numbers, strings, booleans, or arrays/
 * objects of the same. No class instances, no Phaser refs, no functions, no
 * cyclic references. This is what gets hashed, snapshotted, rolled back, and
 * sent over the wire.
 *
 * Phase 2.1: types only. Phase 2.3 will fill these from the live GameObject
 * tree. Phase 2.4 will eventually make these the *source of truth* (replacing
 * fields-on-GameObjects entirely).
 */

/**
 * 4 cardinal directions only. Battle City tanks never move on diagonals; we
 * encode rotation as a small integer rather than degrees to make the wire
 * format compact and to remove float comparison from sim equality.
 */
export enum Dir {
  Up = 0,
  Right = 1,
  Down = 2,
  Left = 3,
}

/** Which side fired this bullet — used for friendly-fire / scoring rules. */
export enum Side {
  Player = 0,
  Enemy = 1,
}

/**
 * Position units are NOT subpixels yet — at Phase 2.1 we mirror the existing
 * float `position.x/y`. If the determinism harness flags float drift in
 * practice (it hasn't so far with fixed timestep), this is the field that
 * flips to integer-subpixel. Centralizing the units here means that switch is
 * a one-place change.
 */
export interface TankState {
  id: number;
  side: Side;
  partyIndex: number;       // -1 for enemies
  x: number;
  y: number;
  rotation: Dir;
  health: number;
  type: string;             // e.g. 'BasicTank', 'PowerTank' — string for now; enum in Phase 2.4
  moving: boolean;
  hasShield: boolean;
  shieldTicksLeft: number;
  isOnIce: boolean;
  slideTicksLeft: number;
  stunTicksLeft: number;
  /**
   * AI scratch — opaque per-behavior blob. Only present on enemy tanks. The
   * shape varies by behavior subclass; Phase 2.4 will narrow it. For now we
   * carry it as `unknown` so two peers running the same behavior code produce
   * identical contents.
   */
  ai?: unknown;
}

export interface BulletState {
  id: number;
  ownerTankId: number;      // -1 if owner already destroyed
  side: Side;
  x: number;
  y: number;
  rotation: Dir;
  speed: number;
  tankDamage: number;
  wallDamage: number;
}

export interface PowerupState {
  id: number;
  type: string;             // PowerupType enum value as string
  x: number;
  y: number;
  ticksLeft: number;        // until it disappears, if applicable
}

export interface TerrainTileState {
  id: number;
  kind: string;             // 'brick' | 'steel' | 'water' | 'tree' | 'ice'
  x: number;
  y: number;
  w: number;
  h: number;
  /** 0..15 mask of which sub-quadrants are still present, for partial walls. */
  fragmentMask?: number;
}

export interface BaseState {
  x: number;
  y: number;
  alive: boolean;
  defenceTicksLeft: number;
}

export interface ExplosionState {
  id: number;
  kind: 'small' | 'large';
  x: number;
  y: number;
  ticksLeft: number;
}

export interface SpawnState {
  id: number;
  x: number;
  y: number;
  ticksLeft: number;
  willSpawnTankId: number;  // id reserved for the tank this spawn becomes
}

/**
 * Top-level state. Field order matters for hashing — keep stable.
 *
 * - `tick` increments by 1 per fixed-step simulate() call. Used as the
 *   serial number when matching peer-exchanged inputs.
 * - `rngState` is the PRNG state at the START of `tick`. After simulate()
 *   returns, it reflects the state at the start of `tick + 1`.
 * - `nextEntityId` is the counter for new entity IDs — included in state so
 *   IDs assigned during this tick are deterministic and recoverable on
 *   rollback.
 */
export interface GameState {
  tick: number;
  rngState: number;
  nextEntityId: number;

  tanks: TankState[];
  bullets: BulletState[];
  powerups: PowerupState[];
  explosions: ExplosionState[];
  spawns: SpawnState[];
  terrain: TerrainTileState[];
  base: BaseState;

  /**
   * Per-party score and lives. Index is partyIndex (0 = P1, 1 = P2, ...).
   * Lives reaching 0 with no spawnable tank ends the match.
   */
  scores: number[];
  lives: number[];
}

/**
 * Convert the engine's degree-based rotation (Rotation enum: 0/90/180/270)
 * into the compact Dir enum used in sim state. Kept here so the rotation/Dir
 * mapping is defined exactly once.
 */
export function rotationToDir(degrees: number): Dir {
  const n = ((Math.round(degrees) % 360) + 360) % 360;
  switch (n) {
    case 0: return Dir.Up;
    case 90: return Dir.Right;
    case 180: return Dir.Down;
    case 270: return Dir.Left;
    default:
      // Off-axis rotations would be a determinism bug; snap to nearest
      // cardinal so callers don't crash, but this should never happen.
      return ((n / 90) | 0) as Dir;
  }
}

/** Identity-typed helper for constructing empty state in tests. */
export function emptyGameState(): GameState {
  return {
    tick: 0,
    rngState: 0,
    nextEntityId: 1,
    tanks: [],
    bullets: [],
    powerups: [],
    explosions: [],
    spawns: [],
    terrain: [],
    base: { x: 0, y: 0, alive: true, defenceTicksLeft: 0 },
    scores: [],
    lives: [],
  };
}
