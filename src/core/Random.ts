/**
 * Deterministic, seedable PRNG (mulberry32). 32-bit state — small, fast, and
 * stable across JS engines, which is the property we need for lockstep
 * multiplayer.
 *
 * For lockstep determinism, ALL gameplay randomness must flow through a single
 * instance whose state is part of the simulation. Render-only randomness
 * (screen shake, particle jitter) should NOT use this — it would advance the
 * seed differently on every machine.
 */
export class Random {
  private state: number;

  constructor(seed: number) {
    // mulberry32 expects a uint32 state; coerce.
    this.state = (seed | 0) >>> 0;
    // Avoid the degenerate all-zero state.
    if (this.state === 0) this.state = 0x9e3779b9;
  }

  /** Snapshot current internal state (for saving/serializing sim state). */
  public getState(): number {
    return this.state;
  }

  /** Restore from a previously snapshotted state (used by rollback). */
  public setState(state: number): void {
    this.state = state >>> 0;
  }

  /** Uniform float in [0, 1). */
  public next(): number {
    let t = (this.state = (this.state + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Integer in [min, max). */
  public int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min));
  }

  /** True with the given percent chance (1..100). */
  public probability(chancePercent: number): boolean {
    return this.int(1, 101) <= chancePercent;
  }

  /** Pick one element from a non-empty array. */
  public pick<T>(values: T[]): T {
    return values[this.int(0, values.length)];
  }
}

/**
 * Module-level singleton used by RandomUtils and other gameplay callsites.
 * Seeded explicitly at the start of each simulation (level, replay, network
 * match). Anything that calls RandomUtils.* before seedGameRandom() is called
 * will use the default seed below — fine for menus/UI but not for gameplay.
 *
 * In Phase 2, this will move INTO the GameState struct so it can be
 * snapshotted and rolled back along with the rest of the simulation.
 */
let gameRandom = new Random(0xc0ffee);

export function seedGameRandom(seed: number): void {
  gameRandom = new Random(seed);
}

export function getGameRandom(): Random {
  return gameRandom;
}
