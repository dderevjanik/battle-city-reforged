/**
 * Phase 2.4 — Pure Victory choreography.
 *
 * Drives a tank through the end-of-level victory animation:
 *   Moving  — drive forward for 3 seconds
 *   Prefire — brief pause (1 second) once stopped
 *   Firing  — fire FIRE_LIMIT shots
 *   Done    — sit still
 *
 * No RNG, no observation needed. Pure state machine of integer tick
 * counters. The legacy class exposed two Subjects (`stopped`, `fired`) that
 * the adapter still owns — we return boolean flags here and the adapter
 * notifies its Subjects when those flags are true.
 */

const SIM_HZ = 60;

const MOVE_DURATION_TICKS = Math.round(3 * SIM_HZ);
const PREFIRE_DELAY_TICKS = Math.round(1 * SIM_HZ);
const FIRE_LIMIT = 1;

export enum VictoryMode {
  Moving = 0,
  Prefire = 1,
  Firing = 2,
  Done = 3,
}

export interface VictoryState {
  mode: VictoryMode;
  moveTicksLeft: number;
  prefireTicksLeft: number;
  fireCounter: number;
}

export function initVictory(): VictoryState {
  return {
    mode: VictoryMode.Moving,
    moveTicksLeft: MOVE_DURATION_TICKS,
    prefireTicksLeft: PREFIRE_DELAY_TICKS,
    fireCounter: 0,
  };
}

export interface VictoryDecision {
  state: VictoryState;
  /** Adapter should call tank.move(dt). */
  willMove: boolean;
  /** Adapter should call tank.idle(). */
  willIdle: boolean;
  /** Adapter should attempt tank.fire(). */
  tryFire: boolean;
  /** Notify the `stopped` Subject — fires once on the Moving→Prefire edge. */
  notifyStopped: boolean;
  /** Notify the `fired` Subject — fires when a fire attempt succeeded. */
  notifyFired: boolean;
}

/**
 * Phase 1 (pre-fire): decide whether to move, idle, or try to fire this
 * tick. Returns `tryFire: true` only when we are in Firing mode; the
 * adapter performs the side effect and feeds the result back to
 * `victoryAfterFire` to advance the state machine.
 */
export function stepVictory(stateIn: VictoryState): VictoryDecision {
  const noop: VictoryDecision = {
    state: stateIn,
    willMove: false,
    willIdle: false,
    tryFire: false,
    notifyStopped: false,
    notifyFired: false,
  };

  switch (stateIn.mode) {
    case VictoryMode.Done:
      return noop;

    case VictoryMode.Moving: {
      if (stateIn.moveTicksLeft <= 0) {
        return {
          ...noop,
          state: { ...stateIn, mode: VictoryMode.Prefire },
          willIdle: true,
          notifyStopped: true,
        };
      }
      return {
        ...noop,
        state: { ...stateIn, moveTicksLeft: stateIn.moveTicksLeft - 1 },
        willMove: true,
      };
    }

    case VictoryMode.Prefire: {
      if (stateIn.prefireTicksLeft <= 0) {
        return {
          ...noop,
          state: { ...stateIn, mode: VictoryMode.Firing },
        };
      }
      return {
        ...noop,
        state: { ...stateIn, prefireTicksLeft: stateIn.prefireTicksLeft - 1 },
      };
    }

    case VictoryMode.Firing:
      return { ...noop, tryFire: true };
  }
}

/**
 * Phase 2: apply the result of the tank.fire() side effect. Only relevant
 * when stepVictory returned tryFire=true.
 */
export function victoryAfterFire(stateIn: VictoryState, hadFired: boolean): {
  state: VictoryState;
  notifyFired: boolean;
} {
  if (!hadFired) return { state: stateIn, notifyFired: false };

  const fireCounter = stateIn.fireCounter + 1;
  if (fireCounter < FIRE_LIMIT) {
    return { state: { ...stateIn, fireCounter }, notifyFired: true };
  }
  return {
    state: { ...stateIn, fireCounter, mode: VictoryMode.Done },
    notifyFired: true,
  };
}
