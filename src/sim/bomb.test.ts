import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { initBomb, stepBomb } from './bomb.ts';

describe('initBomb', () => {
  it('starts visible with 120-tick fuse (2 seconds at 60Hz)', () => {
    const s = initBomb();
    assert.equal(s.detonateTicksLeft, 120);
    assert.equal(s.blinkVisible, true);
    assert.ok(s.blinkTicksLeft > 0);
  });
});

describe('stepBomb', () => {
  it('decrements the detonate timer by exactly 1 tick per call', () => {
    let s = initBomb();
    s = stepBomb(s).state;
    s = stepBomb(s).state;
    assert.equal(s.detonateTicksLeft, 118);
  });

  it('detonates when the timer reaches zero', () => {
    let s = { ...initBomb(), detonateTicksLeft: 1 };
    const result = stepBomb(s);
    assert.equal(result.detonate, true);
    assert.equal(result.state.detonateTicksLeft, 0);
  });

  it('does NOT detonate while ticks remain', () => {
    const s = { ...initBomb(), detonateTicksLeft: 50 };
    assert.equal(stepBomb(s).detonate, false);
  });

  it('flips blink visibility when the blink timer expires', () => {
    const s = { detonateTicksLeft: 100, blinkTicksLeft: 1, blinkVisible: true };
    const { state, opacity } = stepBomb(s);
    assert.equal(state.blinkVisible, false);
    assert.equal(opacity, 0);
  });

  it('reroll on flip uses fast interval in the final second', () => {
    const s = { detonateTicksLeft: 31, blinkTicksLeft: 1, blinkVisible: true };
    // detonateNext = 30 ticks left → < BLINK_FAST_THRESHOLD (60) → fast interval (6 ticks)
    const { state } = stepBomb(s);
    assert.equal(state.blinkTicksLeft, 6);
  });

  it('reroll on flip uses normal interval before the final second', () => {
    const s = { detonateTicksLeft: 100, blinkTicksLeft: 1, blinkVisible: true };
    const { state } = stepBomb(s);
    assert.equal(state.blinkTicksLeft, 15); // 0.25 * 60
  });

  it('opacity tracks the current blinkVisible state', () => {
    const visibleBefore = { detonateTicksLeft: 100, blinkTicksLeft: 5, blinkVisible: true };
    assert.equal(stepBomb(visibleBefore).opacity, 1);
    const hiddenBefore = { detonateTicksLeft: 100, blinkTicksLeft: 5, blinkVisible: false };
    assert.equal(stepBomb(hiddenBefore).opacity, 0);
  });

  it('is pure — does not mutate the input state', () => {
    const s = initBomb();
    const before = { ...s };
    stepBomb(s);
    assert.deepEqual(s, before);
  });

  it('determinism: same state in produces identical output across calls', () => {
    const a = stepBomb(initBomb());
    const b = stepBomb(initBomb());
    assert.deepEqual(a, b);
  });
});
