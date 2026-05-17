import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  VictoryMode,
  initVictory,
  stepVictory,
  victoryAfterFire,
} from './victory.ts';

describe('stepVictory', () => {
  it('starts in Moving with the full move timer', () => {
    const s = initVictory();
    assert.equal(s.mode, VictoryMode.Moving);
    assert.ok(s.moveTicksLeft > 0);
  });

  it('moves and decrements moveTicksLeft each tick while Moving', () => {
    const before = initVictory();
    const { state, willMove } = stepVictory(before);
    assert.equal(willMove, true);
    assert.equal(state.moveTicksLeft, before.moveTicksLeft - 1);
  });

  it('transitions Moving → Prefire on timer expiry, notifies stopped', () => {
    const expired = { ...initVictory(), moveTicksLeft: 0 };
    const { state, willIdle, willMove, notifyStopped } = stepVictory(expired);
    assert.equal(state.mode, VictoryMode.Prefire);
    assert.equal(willIdle, true);
    assert.equal(willMove, false);
    assert.equal(notifyStopped, true);
  });

  it('ticks down prefire timer in Prefire, no notifications', () => {
    const s = { ...initVictory(), mode: VictoryMode.Prefire, prefireTicksLeft: 10 };
    const out = stepVictory(s);
    assert.equal(out.state.prefireTicksLeft, 9);
    assert.equal(out.notifyStopped, false);
    assert.equal(out.willMove, false);
  });

  it('transitions Prefire → Firing when prefire timer expires', () => {
    const s = { ...initVictory(), mode: VictoryMode.Prefire, prefireTicksLeft: 0 };
    const out = stepVictory(s);
    assert.equal(out.state.mode, VictoryMode.Firing);
    assert.equal(out.tryFire, false); // Firing decision is on the NEXT tick
  });

  it('asks the adapter to try firing while in Firing mode', () => {
    const s = { ...initVictory(), mode: VictoryMode.Firing };
    const out = stepVictory(s);
    assert.equal(out.tryFire, true);
  });

  it('Done mode is a complete no-op', () => {
    const s = { ...initVictory(), mode: VictoryMode.Done };
    const out = stepVictory(s);
    assert.deepEqual(out.state, s);
    assert.equal(out.willMove, false);
    assert.equal(out.tryFire, false);
  });
});

describe('victoryAfterFire', () => {
  it('does nothing when fire failed', () => {
    const s = { ...initVictory(), mode: VictoryMode.Firing };
    const out = victoryAfterFire(s, false);
    assert.deepEqual(out.state, s);
    assert.equal(out.notifyFired, false);
  });

  it('increments fireCounter and transitions to Done after the limit (=1)', () => {
    const s = { ...initVictory(), mode: VictoryMode.Firing, fireCounter: 0 };
    const out = victoryAfterFire(s, true);
    assert.equal(out.state.mode, VictoryMode.Done);
    assert.equal(out.state.fireCounter, 1);
    assert.equal(out.notifyFired, true);
  });
});

describe('Victory full sequence', () => {
  it('completes Moving → Prefire → Firing → Done with no RNG', () => {
    let s = initVictory();
    // Cache loop bounds — the for-loop test re-evaluates s.field every
    // iteration as the state mutates, so reading s.moveTicksLeft inline
    // would shrink the bound as the timer counts down (subtle JS gotcha).
    const moveTicks = s.moveTicksLeft + 1;
    for (let i = 0; i < moveTicks; i++) s = stepVictory(s).state;
    assert.equal(s.mode, VictoryMode.Prefire);

    const prefireTicks = s.prefireTicksLeft + 1;
    for (let i = 0; i < prefireTicks; i++) s = stepVictory(s).state;
    assert.equal(s.mode, VictoryMode.Firing);

    // One successful fire → Done.
    s = victoryAfterFire(s, true).state;
    assert.equal(s.mode, VictoryMode.Done);
  });
});
