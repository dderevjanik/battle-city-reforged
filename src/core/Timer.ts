import { Subject } from './Subject';

// Must match GameScene's fixed-step rate. Hardcoded (not imported) to avoid a
// circular dependency between core/ and scenes/. If you change the sim Hz,
// change both places.
const SIM_HZ = 60;

/**
 * Tick-based countdown timer.
 *
 * Callers still pass durations in seconds via `reset(seconds)` / the
 * constructor — the timer converts to integer simulation ticks at the boundary.
 * Internally everything is integer math, so timers cannot accumulate
 * floating-point drift over the course of a long match.
 *
 * `update(deltaTime)` keeps its signature for callsite compatibility but the
 * argument is ignored: this timer assumes it is called exactly once per sim
 * tick by the fixed-timestep loop in GameScene.update().
 *
 * The legacy `timeLeft` field is still exposed (in seconds, derived from the
 * integer tick count) so existing read sites continue to work unchanged. New
 * code should prefer `getTicksLeft()` or `isActive()`.
 */
export class Timer {
  public done = new Subject();
  private ticksLeft: number | null = null;

  constructor(seconds: number | null = null) {
    this.ticksLeft = seconds === null ? null : Math.max(0, Math.round(seconds * SIM_HZ));
  }

  /** Remaining time in seconds (derived view of the integer tick count). */
  public get timeLeft(): number | null {
    return this.ticksLeft === null ? null : this.ticksLeft / SIM_HZ;
  }

  public reset(seconds: number): this {
    this.ticksLeft = Math.max(0, Math.round(seconds * SIM_HZ));
    return this;
  }

  public stop(): this {
    this.ticksLeft = null;
    return this;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public update(_deltaTime?: number): void {
    if (this.ticksLeft === null) {
      return;
    }

    this.ticksLeft -= 1;

    if (this.ticksLeft <= 0) {
      this.ticksLeft = null;
      this.done.notify(null);
    }
  }

  public isActive(): boolean {
    return this.ticksLeft !== null;
  }

  public isDone(): boolean {
    return this.ticksLeft === null;
  }

  public getTicksLeft(): number | null {
    return this.ticksLeft;
  }
}
