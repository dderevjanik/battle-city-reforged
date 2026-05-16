import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { Timer } from './Timer.ts';

// Timer is tick-based: `reset(seconds)` converts to ticks at SIM_HZ=60, and
// `update()` decrements by exactly one tick regardless of any argument. These
// tests encode that contract — it is load-bearing for lockstep determinism, so
// any change to it is a deliberate decision that should require updating these
// tests in lockstep.
const TICK_SEC = 1 / 60;

describe('Timer', () => {
  it('initializes inactive when constructed without a duration', () => {
    const timer = new Timer();
    assert.equal(timer.isActive(), false);
    assert.equal(timer.isDone(), true);
    assert.equal(timer.timeLeft, null);
  });

  it('initializes active when constructed with a duration', () => {
    const timer = new Timer(2);
    assert.equal(timer.isActive(), true);
    assert.equal(timer.isDone(), false);
    // 2 seconds == 120 ticks; getter reads back as 120/60 = 2.
    assert.equal(timer.timeLeft, 2);
  });

  it('decrements by exactly one tick per update call', () => {
    const timer = new Timer(2);            // 120 ticks
    timer.update();
    assert.equal(timer.getTicksLeft(), 119);
    assert.equal(timer.timeLeft, 119 / 60);

    timer.update();
    assert.equal(timer.getTicksLeft(), 118);
  });

  it('ignores the deltaTime argument (tick semantics)', () => {
    const timer = new Timer(1);            // 60 ticks
    // Passing arbitrarily large or small deltas must not change the rate.
    timer.update(999);
    timer.update(0.0001);
    assert.equal(timer.getTicksLeft(), 58);
  });

  it('completes and notifies when ticks reach zero', () => {
    // 3 ticks ≈ 0.05 seconds. After 3 updates the timer should fire exactly
    // once.
    const timer = new Timer(3 * TICK_SEC);
    let notified = 0;
    timer.done.addListener(() => {
      notified += 1;
    });

    timer.update();
    assert.equal(timer.isActive(), true);
    assert.equal(notified, 0);

    timer.update();
    assert.equal(timer.isActive(), true);

    timer.update();
    assert.equal(timer.isDone(), true);
    assert.equal(timer.timeLeft, null);
    assert.equal(notified, 1);
  });

  it('does nothing when update is called on an inactive timer', () => {
    const timer = new Timer();
    let notified = 0;
    timer.done.addListener(() => {
      notified += 1;
    });

    timer.update();
    assert.equal(timer.isActive(), false);
    assert.equal(notified, 0);
  });

  it('does not notify a second time after completion', () => {
    const timer = new Timer(2 * TICK_SEC); // 2 ticks
    let notified = 0;
    timer.done.addListener(() => {
      notified += 1;
    });

    timer.update();
    timer.update();
    timer.update();
    timer.update();
    assert.equal(notified, 1);
  });

  it('reset() reactivates a completed timer', () => {
    const timer = new Timer(TICK_SEC);     // 1 tick
    timer.update();
    assert.equal(timer.isDone(), true);

    timer.reset(2);                        // 120 ticks
    assert.equal(timer.isActive(), true);
    assert.equal(timer.getTicksLeft(), 120);
    assert.equal(timer.timeLeft, 2);
  });

  it('stop() makes an active timer inactive without notifying', () => {
    const timer = new Timer(5);
    let notified = 0;
    timer.done.addListener(() => {
      notified += 1;
    });

    timer.stop();
    assert.equal(timer.isActive(), false);
    assert.equal(notified, 0);
  });

  it('reset() and stop() return this for chaining', () => {
    const timer = new Timer();
    assert.equal(timer.reset(1), timer);
    assert.equal(timer.stop(), timer);
  });

  it('rounds fractional durations to the nearest whole tick', () => {
    // 0.5 of a tick rounds up to 1; one update completes the timer.
    const timer = new Timer(0.5 * TICK_SEC);
    assert.equal(timer.getTicksLeft(), 1);
    let notified = 0;
    timer.done.addListener(() => {
      notified += 1;
    });
    timer.update();
    assert.equal(notified, 1);
  });
});
